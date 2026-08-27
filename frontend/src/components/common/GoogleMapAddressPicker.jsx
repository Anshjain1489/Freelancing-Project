import React, { useState, useEffect, useRef, useCallback } from 'react';
import client from '../../api/client';
import { STORE_LOCATION } from '../../config/store.config';
import { getCurrentPosition, reverseGeocode, validateCoordinates, calculateFrontendDeliveryCharge, calculateHaversineDistance } from '../../utils/location.utils';
import { MapPin, Navigation, AlertTriangle, RefreshCw, CheckCircle, Search } from 'lucide-react';

export default function GoogleMapAddressPicker({ onSelectAddress, initialLat, initialLng, onFieldsAutoFilled }) {
  const [position, setPosition] = useState({
    lat: initialLat ? parseFloat(initialLat) : STORE_LOCATION.latitude,
    lng: initialLng ? parseFloat(initialLng) : STORE_LOCATION.longitude
  });

  const [addressPreview, setAddressPreview] = useState('');
  const [distanceInfo, setDistanceInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [geoError, setGeoError] = useState(null);
  const [mapsApiLoaded, setMapsApiLoaded] = useState(false);
  const [mapsApiFailed, setMapsApiFailed] = useState(false);

  const mapContainerRef = useRef(null);
  const googleMapRef = useRef(null);
  const googleMarkerRef = useRef(null);
  const debounceTimerRef = useRef(null);

  const rawApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
  const apiKey = (typeof rawApiKey === 'string' && rawApiKey.trim() && !rawApiKey.startsWith('your_') && rawApiKey !== 'undefined' && rawApiKey.trim().length > 10) ? rawApiKey.trim() : '';

  // Listen for global Google Maps Auth Failure callback (gm_authFailure)
  useEffect(() => {
    const prevAuthFailure = window.gm_authFailure;
    window.gm_authFailure = () => {
      console.warn('[GOOGLE_MAPS_AUTH_FAILURE] API key invalid or unbilled. Switching to interactive location picker fallback.');
      setMapsApiFailed(true);
      setMapsApiLoaded(false);
      if (typeof prevAuthFailure === 'function') prevAuthFailure();
    };
    return () => {
      window.gm_authFailure = prevAuthFailure;
    };
  }, []);

  // Monitor DOM inside mapContainerRef to catch Google's error box immediately
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const observer = new MutationObserver(() => {
      if (!mapContainerRef.current) return;
      const html = mapContainerRef.current.innerHTML || '';
      const text = mapContainerRef.current.textContent || '';
      if (
        html.includes('gm-err') ||
        text.includes('Oops! Something went wrong') ||
        text.includes("didn't load Google Maps correctly") ||
        mapContainerRef.current.querySelector('.gm-err-container') ||
        mapContainerRef.current.querySelector('.gm-err-content')
      ) {
        console.warn('[GOOGLE_MAPS_DOM_ERROR_DETECTED] Google Maps error container detected. Switching to interactive fallback.');
        setMapsApiFailed(true);
        setMapsApiLoaded(false);
      }
    });

    observer.observe(mapContainerRef.current, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [mapsApiLoaded]);

  // 1. Fetch server delivery distance and fee calculation
  const fetchDeliveryCalculation = useCallback(async (lat, lng) => {
    setLoading(true);
    try {
      const response = await client.post('/delivery/calculate', { latitude: lat, longitude: lng });
      if (response.data?.success) {
        setDistanceInfo(response.data.data);
      }
    } catch (err) {
      console.warn('Backend distance calculation error, using fallback:', err);
      const dist = calculateHaversineDistance(STORE_LOCATION.latitude, STORE_LOCATION.longitude, lat, lng);
      const roadDist = Math.round(dist * 1.25 * 100) / 100;
      setDistanceInfo({
        distanceKm: roadDist,
        deliveryCharge: calculateFrontendDeliveryCharge(roadDist),
        isDeliverable: roadDist <= STORE_LOCATION.maxDeliveryRadiusKm,
        store: STORE_LOCATION,
        destination: { latitude: lat, longitude: lng }
      });
    } finally {
      setLoading(false);
    }
  }, []);

  // 2. Handle position changes (click / drag / current location)
  const handlePositionChange = useCallback(async (newLat, newLng, skipReverseGeocode = false) => {
    const validated = validateCoordinates(newLat, newLng);
    if (!validated.valid) return;

    const lat = validated.latitude;
    const lng = validated.longitude;

    setPosition({ lat, lng });

    // Update marker on Google Map if initialized
    if (googleMapRef.current && googleMarkerRef.current && !mapsApiFailed) {
      try {
        const latLng = new window.google.maps.LatLng(lat, lng);
        googleMarkerRef.current.setPosition(latLng);
        googleMapRef.current.panTo(latLng);
      } catch (e) {
        console.warn('Google Map position update failed:', e);
      }
    }

    // Debounce distance calculation API request
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      fetchDeliveryCalculation(lat, lng);
    }, 300);

    // Reverse geocode to auto-fill address fields
    if (!skipReverseGeocode) {
      setGeocoding(true);
      try {
        const geoData = await reverseGeocode(lat, lng);
        setAddressPreview(geoData.formattedAddress);
        if (onFieldsAutoFilled) {
          onFieldsAutoFilled(geoData);
        }
      } catch (err) {
        console.warn('Reverse geocoding error:', err);
      } finally {
        setGeocoding(false);
      }
    }
  }, [fetchDeliveryCalculation, onFieldsAutoFilled, mapsApiFailed]);

  // 3. Load Google Maps JS API script dynamically ONLY if valid apiKey is present
  useEffect(() => {
    if (!apiKey) {
      setMapsApiFailed(true);
      setMapsApiLoaded(false);
      return;
    }

    if (window.google && window.google.maps && window.google.maps.Map) {
      setMapsApiLoaded(true);
      return;
    }

    const scriptId = 'google-maps-js-sdk';
    let script = document.getElementById(scriptId);

    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
      script.async = true;
      script.defer = true;

      script.onload = () => {
        if (window.google && window.google.maps && window.google.maps.Map) {
          setMapsApiLoaded(true);
        } else {
          setMapsApiFailed(true);
        }
      };

      script.onerror = () => {
        console.warn('Failed to load Google Maps API SDK');
        setMapsApiFailed(true);
      };

      document.head.appendChild(script);
    }
  }, [apiKey]);

  // 4. Initialize Google Map element when API is ready
  useEffect(() => {
    if (!apiKey || !mapsApiLoaded || mapsApiFailed || !mapContainerRef.current || googleMapRef.current) return;

    try {
      const initialLatLng = { lat: position.lat, lng: position.lng };
      const map = new window.google.maps.Map(mapContainerRef.current, {
        center: initialLatLng,
        zoom: 15,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        zoomControl: true
      });

      const marker = new window.google.maps.Marker({
        position: initialLatLng,
        map: map,
        draggable: true,
        title: 'Delivery Pin (Drag or tap map to move)',
        animation: window.google.maps.Animation.DROP
      });

      googleMapRef.current = map;
      googleMarkerRef.current = marker;

      // Handle map click
      map.addListener('click', (e) => {
        const clickedLat = e.latLng.lat();
        const clickedLng = e.latLng.lng();
        handlePositionChange(clickedLat, clickedLng);
      });

      // Handle marker dragend
      marker.addListener('dragend', (e) => {
        const draggedLat = e.latLng.lat();
        const draggedLng = e.latLng.lng();
        handlePositionChange(draggedLat, draggedLng);
      });

    } catch (err) {
      console.warn('Google Map initialization error:', err);
      setMapsApiFailed(true);
    }
  }, [apiKey, mapsApiLoaded, mapsApiFailed, position.lat, position.lng, handlePositionChange]);

  // Initial calculation on load
  useEffect(() => {
    fetchDeliveryCalculation(position.lat, position.lng);
  }, [fetchDeliveryCalculation, position.lat, position.lng]);

  // Update parent whenever location is selected
  useEffect(() => {
    if (onSelectAddress && distanceInfo) {
      onSelectAddress({
        latitude: position.lat,
        longitude: position.lng,
        addressText: addressPreview,
        distanceKm: distanceInfo.distanceKm,
        deliveryCharge: distanceInfo.deliveryCharge,
        isDeliverable: distanceInfo.isDeliverable
      });
    }
  }, [position.lat, position.lng, addressPreview, distanceInfo, onSelectAddress]);

  // 5. Handle "📍 Use My Current Location" button click
  const handleUseCurrentLocation = async () => {
    setGeoError(null);
    setLoading(true);
    try {
      const current = await getCurrentPosition();
      await handlePositionChange(current.latitude, current.longitude);
    } catch (err) {
      setGeoError(err.message || 'Unable to retrieve your location.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '14px',
      background: 'var(--color-surface, #FFF)',
      border: '1px solid var(--color-border, #E2E8F0)',
      borderRadius: '12px',
      padding: '16px'
    }}>
      {/* Title & Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
        <h4 style={{ fontWeight: 800, fontSize: '0.95rem', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
          <MapPin size={18} color="var(--color-primary, #06C167)" /> Select Delivery Location on Map
        </h4>
        <button
          type="button"
          onClick={handleUseCurrentLocation}
          disabled={loading}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 14px',
            background: 'var(--color-mint-light, #E8F7F0)',
            color: 'var(--color-primary-dark, #048848)',
            border: '1px solid var(--color-primary, #06C167)',
            borderRadius: '8px',
            fontWeight: 700,
            fontSize: '0.82rem',
            cursor: 'pointer'
          }}
        >
          <Navigation size={14} /> {loading ? 'Detecting...' : 'Use My Current Location'}
        </button>
      </div>

      {/* Geolocation Error Alert */}
      {geoError && (
        <div style={{
          padding: '10px 12px',
          background: '#FFFBEB',
          border: '1px solid #FCD34D',
          borderRadius: '8px',
          color: '#92400E',
          fontSize: '0.8rem',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <AlertTriangle size={16} />
          <span>{geoError}</span>
        </div>
      )}

      {/* Map Display Box */}
      <div style={{
        position: 'relative',
        width: '100%',
        height: '240px',
        borderRadius: '10px',
        overflow: 'hidden',
        border: '1px solid var(--color-border, #CBD5E1)',
        background: '#F1F5F9'
      }}>
        {mapsApiLoaded && !mapsApiFailed && apiKey ? (
          <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />
        ) : (
          /* Clean Interactive Location Picker Fallback Canvas when Google Maps API key is missing or unauthenticated */
          <div
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const offsetX = (e.clientX - rect.left) / rect.width - 0.5;
              const offsetY = (e.clientY - rect.top) / rect.height - 0.5;
              handlePositionChange(position.lat - offsetY * 0.02, position.lng + offsetX * 0.02);
            }}
            style={{
              width: '100%',
              height: '100%',
              background: 'radial-gradient(circle at center, #F8FAFC 0%, #E2E8F0 100%)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              userSelect: 'none',
              position: 'relative',
              padding: '16px'
            }}
          >
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              background: 'rgba(255, 255, 255, 0.96)',
              padding: '14px 22px',
              borderRadius: '14px',
              boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
              border: '1.5px solid #CBD5E1',
              textAlign: 'center',
              maxWidth: '92%'
            }}>
              <div style={{ fontSize: '2.6rem', lineHeight: 1, marginBottom: '6px' }}>📍</div>
              <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#0F172A' }}>
                Tap map canvas to adjust pin position
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '4px' }}>
                Click anywhere on canvas or use "Use My Current Location" button to set delivery coordinates
              </div>
            </div>
          </div>
        )}

        {/* Selected Coordinates Overlay Badge */}
        <div style={{
          position: 'absolute',
          bottom: '8px',
          left: '8px',
          background: 'rgba(15, 23, 42, 0.88)',
          color: '#FFF',
          fontSize: '0.72rem',
          padding: '5px 10px',
          borderRadius: '6px',
          fontWeight: 700,
          backdropFilter: 'blur(4px)',
          zIndex: 10
        }}>
          Latitude: {position.lat.toFixed(6)} • Longitude: {position.lng.toFixed(6)}
        </div>
      </div>

      {/* Address & Distance Live Status Card */}
      <div style={{
        background: '#F8FAFC',
        border: '1px solid #E2E8F0',
        borderRadius: '8px',
        padding: '12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        fontSize: '0.85rem'
      }}>
        {geocoding ? (
          <div style={{ color: '#64748B', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}>
            <RefreshCw className="animate-spin" size={14} /> Fetching address preview...
          </div>
        ) : addressPreview ? (
          <div style={{ fontWeight: 600, color: '#334155' }}>
            📍 Selected Location: <span style={{ fontWeight: 400 }}>{addressPreview}</span>
          </div>
        ) : null}

        {distanceInfo && (
          <div style={{
            display: 'flex',
            justify: 'space-between',
            alignItems: 'center',
            borderTop: '1px solid #E2E8F0',
            paddingTop: '6px',
            marginTop: '4px'
          }}>
            <div>
              🚚 Distance: <strong>{distanceInfo.distanceKm} km</strong> from store
            </div>
            <div style={{ fontWeight: 800, color: 'var(--color-primary-dark, #048848)', fontSize: '0.95rem' }}>
              Delivery Fee: {distanceInfo.deliveryCharge === 0 ? '₹0 (FREE)' : `₹${distanceInfo.deliveryCharge}`}
            </div>
          </div>
        )}

        {distanceInfo && !distanceInfo.isDeliverable && (
          <div style={{ color: '#DC2626', fontWeight: 700, fontSize: '0.8rem', marginTop: '4px' }}>
            ⚠️ This location is outside our maximum delivery radius of {distanceInfo.maximumDeliveryRadiusKm || 50} km.
          </div>
        )}
      </div>
    </div>
  );
}
