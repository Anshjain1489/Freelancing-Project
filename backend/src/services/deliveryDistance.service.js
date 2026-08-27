const axios = require('axios');
const config = require('../config/environment');
const supabase = require('../config/supabase');
const logger = require('../utils/logger');
const AppError = require('../utils/AppError');
const { HTTP_STATUS, ERROR_CODES } = require('../constants/statusCodes');

const distanceCache = new Map();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour TTL for coordinate distance cache

/**
 * Store's canonical location configuration
 * Chaudhary Kirana Store, Near Bada Jain Mandir, Tikamgarh Road, Mahruni
 */
const STORE_LOCATION = {
  name: 'Chaudhary Kirana Store',
  address: 'Near Bada Jain Mandir, Tikamgarh Road, Mahruni, Uttar Pradesh, India',
  latitude: parseFloat(process.env.STORE_LATITUDE) || config.store?.latitude || 24.2381,
  longitude: parseFloat(process.env.STORE_LONGITUDE) || config.store?.longitude || 78.7364,
  chargePerKm: 10.0,
  minDeliveryCharge: 0.0,
  maxDeliveryRadiusKm: parseFloat(process.env.MAX_DELIVERY_RADIUS_KM) || config.store?.maxDeliveryRadiusKm || 50.0
};

/**
 * Calculates Haversine straight-line distance in KM
 */
const calculateHaversineDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth radius in KM
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return Math.round(distance * 100) / 100;
};

/**
 * Central Delivery Charge Formula
 * Delivery Charge = Math.round(distanceKm * 10)
 * 0 km = ₹0
 * 0.5 km = ₹5
 * 1 km = ₹10
 * 2.3 km = ₹23
 * 3.4 km = ₹34
 * 5 km = ₹50
 * 10 km = ₹100
 */
/**
 * Central Delivery Charge Formula (Phase 33 Specification)
 * IF distance <= 0 THEN delivery_charge = 0
 * ELSE delivery_charge = CEILING(distance) * 10
 *
 * Examples:
 * 0 km -> ₹0
 * 0.1 km -> ₹10
 * 0.9 km -> ₹10
 * 1.0 km -> ₹10
 * 1.2 km -> ₹20
 * 2.0 km -> ₹20
 * 2.1 km -> ₹30
 */
const calculateDeliveryCharge = (distanceKm) => {
  if (!Number.isFinite(distanceKm) || distanceKm < 0) {
    throw new AppError('Invalid delivery distance', HTTP_STATUS.BAD_REQUEST, ERROR_CODES.BAD_REQUEST);
  }
  if (distanceKm === 0) return 0;
  return Math.ceil(distanceKm) * 10;
};

/**
 * Loads delivery settings from database or fallback configuration
 */
const getDeliverySettings = async () => {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('delivery_settings')
        .select('*')
        .eq('id', 'default')
        .single();

      if (!error && data && data.is_active) {
        return {
          name: data.store_name,
          address: data.store_address,
          latitude: parseFloat(data.store_latitude),
          longitude: parseFloat(data.store_longitude),
          chargePerKm: parseFloat(data.charge_per_km),
          minDeliveryCharge: parseFloat(data.minimum_delivery_charge),
          maxDeliveryRadiusKm: parseFloat(data.maximum_delivery_radius_km)
        };
      }
    } catch (err) {
      logger.warn('[DELIVERY_SETTINGS_DB_WARN] Falling back to default STORE_LOCATION config');
    }
  }
  return STORE_LOCATION;
};

/**
 * Calculates road distance and delivery fee between store and destination
 */
const calculateRoadDistanceAndFee = async (destLat, destLng) => {
  const latitude = parseFloat(destLat);
  const longitude = parseFloat(destLng);

  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    throw new AppError('Invalid latitude value. Must be numeric between -90 and 90.', HTTP_STATUS.BAD_REQUEST, ERROR_CODES.BAD_REQUEST);
  }
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    throw new AppError('Invalid longitude value. Must be numeric between -180 and 180.', HTTP_STATUS.BAD_REQUEST, ERROR_CODES.BAD_REQUEST);
  }

  const storeSettings = await getDeliverySettings();

  // Check memory cache
  const cacheKey = `delivery-distance:${storeSettings.latitude.toFixed(4)}:${storeSettings.longitude.toFixed(4)}:${latitude.toFixed(4)}:${longitude.toFixed(4)}`;
  if (distanceCache.has(cacheKey)) {
    const cached = distanceCache.get(cacheKey);
    if (Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.data;
    }
  }

  let distanceKm = 0;
  let distanceMeters = 0;
  let calculationMethod = 'ROAD_WINDING_ESTIMATE';

  const apiKey = process.env.GOOGLE_MAPS_SERVER_API_KEY || process.env.GOOGLE_MAPS_API_KEY;

  if (apiKey && apiKey !== 'undefined' && apiKey !== 'null') {
    try {
      const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${storeSettings.latitude},${storeSettings.longitude}&destinations=${latitude},${longitude}&mode=driving&key=${apiKey}`;
      const response = await axios.get(url, { timeout: 4000 });
      const element = response.data?.rows?.[0]?.elements?.[0];

      if (element && element.status === 'OK' && element.distance) {
        distanceMeters = element.distance.value;
        distanceKm = Math.round((distanceMeters / 1000) * 100) / 100;
        calculationMethod = 'GOOGLE_ROUTING_API';
      }
    } catch (err) {
      logger.warn('[GOOGLE_DISTANCE_API_FALLBACK] Falling back to road-winding calculation:', err?.message || err);
    }
  }

  // Fallback road distance calculation (Haversine * 1.25 road winding factor)
  if (distanceKm === 0) {
    const haversineKm = calculateHaversineDistance(storeSettings.latitude, storeSettings.longitude, latitude, longitude);
    distanceKm = Math.round((haversineKm * 1.25) * 100) / 100;
    distanceMeters = Math.round(distanceKm * 1000);
  }

  const deliveryCharge = calculateDeliveryCharge(distanceKm);
  const isDeliverable = distanceKm <= storeSettings.maxDeliveryRadiusKm;

  const result = {
    store: {
      name: storeSettings.name,
      address: storeSettings.address,
      latitude: storeSettings.latitude,
      longitude: storeSettings.longitude
    },
    destination: {
      latitude,
      longitude
    },
    customerLocation: {
      latitude,
      longitude
    },
    distanceMeters,
    distanceKm,
    chargePerKm: storeSettings.chargePerKm,
    deliveryCharge,
    estimatedDeliveryCharge: deliveryCharge,
    isDeliverable,
    withinDeliveryArea: isDeliverable,
    maximumDeliveryRadiusKm: storeSettings.maxDeliveryRadiusKm,
    reason: isDeliverable ? null : `Address is outside maximum delivery radius of ${storeSettings.maxDeliveryRadiusKm} KM`,
    calculationMethod
  };

  distanceCache.set(cacheKey, { timestamp: Date.now(), data: result });
  return result;
};

module.exports = {
  STORE_LOCATION,
  calculateHaversineDistance,
  calculateDeliveryCharge,
  getDeliverySettings,
  calculateRoadDistanceAndFee,
  clearDistanceCacheForTests: () => distanceCache.clear()
};
