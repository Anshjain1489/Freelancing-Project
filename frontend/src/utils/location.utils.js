import { STORE_LOCATION } from '../config/store.config';

/**
 * Validates latitude and longitude values
 */
export const validateCoordinates = (lat, lng) => {
  const latitude = parseFloat(lat);
  const longitude = parseFloat(lng);

  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    return { valid: false, error: 'Latitude must be a valid number between -90 and 90.' };
  }
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    return { valid: false, error: 'Longitude must be a valid number between -180 and 180.' };
  }

  return { valid: true, latitude, longitude };
};

/**
 * Gets user's current GPS location using browser Geolocation API
 */
export const getCurrentPosition = (options = {}) => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      return reject(new Error('Geolocation is not supported by your browser.'));
    }

    const defaultOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
      ...options
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp
        });
      },
      (error) => {
        let message = 'Unable to retrieve location.';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            message = 'Location permission was denied. You can select your delivery location manually on the map.';
            break;
          case error.POSITION_UNAVAILABLE:
            message = 'Location information is unavailable. Please select your location manually on the map.';
            break;
          case error.TIMEOUT:
            message = 'Location request timed out. Please try again or select manually on the map.';
            break;
        }
        const err = new Error(message);
        err.code = error.code;
        reject(err);
      },
      defaultOptions
    );
  });
};

/**
 * Calculates straight-line Haversine distance in kilometers
 */
export const calculateHaversineDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth radius in KM
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100;
};

/**
 * Calculates delivery fee based on Ceiling(distanceKm) * 10 formula
 * 0 km -> ₹0
 * 0.1 km -> ₹10
 * 1.0 km -> ₹10
 * 1.2 km -> ₹20
 * 2.0 km -> ₹20
 */
export const calculateFrontendDeliveryCharge = (distanceKm) => {
  const dist = parseFloat(distanceKm);
  if (!Number.isFinite(dist) || dist <= 0) return 0;
  return Math.ceil(dist) * STORE_LOCATION.chargePerKm;
};

/**
 * Maps reverse geocoded address components to application address fields
 */
export const parseAddressComponents = (components = []) => {
  let streetNumber = '';
  let route = '';
  let sublocality = '';
  let neighborhood = '';
  let locality = 'Mahruni';
  let state = 'Uttar Pradesh';
  let postalCode = '274702';
  let country = 'India';

  components.forEach(comp => {
    const types = comp.types || [];
    if (types.includes('street_number')) streetNumber = comp.long_name;
    if (types.includes('route')) route = comp.long_name;
    if (types.includes('sublocality') || types.includes('sublocality_level_1')) sublocality = comp.long_name;
    if (types.includes('neighborhood')) neighborhood = comp.long_name;
    if (types.includes('locality')) locality = comp.long_name;
    if (types.includes('administrative_area_level_1')) state = comp.long_name;
    if (types.includes('postal_code')) postalCode = comp.long_name;
    if (types.includes('country')) country = comp.long_name;
  });

  const addressLine1 = [streetNumber, route].filter(Boolean).join(' ') || sublocality || neighborhood || 'Main Street';
  const addressLine2 = sublocality || neighborhood || '';

  return {
    addressLine1,
    addressLine2,
    landmark: neighborhood || '',
    city: locality || 'Mahruni',
    state: state || 'Uttar Pradesh',
    postalCode: postalCode || '274702',
    country
  };
};

/**
 * Performs reverse geocoding via Google Maps JS Geocoder or Nominatim API fallback
 */
export const reverseGeocode = async (lat, lng) => {
  const validCheck = validateCoordinates(lat, lng);
  if (!validCheck.valid) {
    throw new Error(validCheck.error);
  }

  // 1. Google Maps Geocoder if loaded in window
  if (window.google && window.google.maps && window.google.maps.Geocoder) {
    try {
      const geocoder = new window.google.maps.Geocoder();
      const response = await geocoder.geocode({ location: { lat: validCheck.latitude, lng: validCheck.longitude } });
      if (response.results && response.results.length > 0) {
        const result = response.results[0];
        const parsed = parseAddressComponents(result.address_components);
        return {
          formattedAddress: result.formatted_address,
          ...parsed
        };
      }
    } catch (err) {
      console.warn('[GOOGLE_GEOCODER_WARN] Google Geocoder failed, attempting fallback:', err?.message || err);
    }
  }

  // 2. Fallback Nominatim OpenStreetMap API
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${validCheck.latitude}&lon=${validCheck.longitude}`;
    const res = await fetch(url, { headers: { 'User-Agent': 'ChaudharyKiranaStore/1.0' } });
    if (res.ok) {
      const data = await res.json();
      const addr = data.address || {};
      return {
        formattedAddress: data.display_name || `Location (${validCheck.latitude.toFixed(4)}, ${validCheck.longitude.toFixed(4)})`,
        addressLine1: [addr.house_number, addr.road].filter(Boolean).join(' ') || addr.suburb || addr.neighbourhood || 'Main Road',
        addressLine2: addr.suburb || addr.neighbourhood || addr.village || '',
        landmark: addr.neighbourhood || addr.amenity || '',
        city: addr.city || addr.town || addr.village || addr.county || 'Mahruni',
        state: addr.state || 'Uttar Pradesh',
        postalCode: addr.postcode || '274702',
        country: addr.country || 'India'
      };
    }
  } catch (err) {
    console.warn('[NOMINATIM_GEOCODER_WARN] Nominatim fallback failed:', err);
  }

  // 3. Fallback preview text
  return {
    formattedAddress: `Coordinates (${validCheck.latitude.toFixed(4)}, ${validCheck.longitude.toFixed(4)})`,
    addressLine1: '',
    addressLine2: '',
    landmark: '',
    city: 'Mahruni',
    state: 'Uttar Pradesh',
    postalCode: '274702',
    country: 'India'
  };
};

/**
 * Generates Google Maps navigation link using coordinates
 */
export const generateGoogleMapsNavigationUrl = (lat, lng, label = '') => {
  const validCheck = validateCoordinates(lat, lng);
  if (validCheck.valid) {
    return `https://www.google.com/maps/dir/?api=1&destination=${validCheck.latitude},${validCheck.longitude}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(label || 'Mahruni')}`;
};
