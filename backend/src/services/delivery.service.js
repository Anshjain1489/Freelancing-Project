const config = require('../config/environment');

/**
 * Calculates Haversine distance in kilometers between two lat/lng pairs.
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
  return Math.round(distance * 100) / 100; // Round to 2 decimal places
};

const deliveryDistanceService = require('./deliveryDistance.service');

/**
 * Calculates delivery charge based on exact distance.
 * New Rule: Delivery Charge = Math.round(distanceKm * 10)
 * Maximum delivery radius: 50.0 KM.
 */
const calculateDeliveryFee = (distanceKm) => {
  const maxRadius = config.store.maxDeliveryRadiusKm || 50.0;

  if (distanceKm > maxRadius) {
    return {
      isDeliverable: false,
      reason: `Address is outside maximum delivery radius of ${maxRadius} KM`,
      distanceKm,
      deliveryCharge: 0
    };
  }

  const deliveryCharge = deliveryDistanceService.calculateDeliveryCharge(distanceKm);

  return {
    isDeliverable: true,
    distanceKm,
    deliveryCharge
  };
};

/**
 * Gets delivery details for a customer address against store coordinates.
 */
const getDeliveryDetailsForAddress = (address) => {
  const storeLat = config.store.latitude;
  const storeLng = config.store.longitude;

  // If customer address has lat/lng, calculate exact distance
  if (address.latitude && address.longitude) {
    const distanceKm = calculateHaversineDistance(
      storeLat,
      storeLng,
      parseFloat(address.latitude),
      parseFloat(address.longitude)
    );
    return calculateDeliveryFee(distanceKm);
  }

  // Fallback for Mahruni local town delivery test (Default 0.8 KM = FREE delivery within town)
  const defaultTownDistanceKm = 0.8;
  return calculateDeliveryFee(defaultTownDistanceKm);
};

module.exports = {
  calculateHaversineDistance,
  calculateDeliveryFee,
  getDeliveryDetailsForAddress
};
