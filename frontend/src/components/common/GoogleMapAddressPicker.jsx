import React, { useState, useEffect, useRef, useCallback } from 'react';
import client from '../../api/client';
import { STORE_LOCATION } from '../../config/store.config';
import { getCurrentPosition, reverseGeocode, validateCoordinates, calculateFrontendDeliveryCharge, calculateHaversineDistance } from '../../utils/location.utils';
import { MapPin, Navigation, AlertTriangle, RefreshCw } from 'lucide-react';

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
  const [leafletLoaded, setLeafletLoaded] = useState(false);

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
  const leafletMapContainerRef = useRef(null);
  const leafletMapRef = useRef(null);
  const leafletMarkerRef = useRef(null);
  const debounceTimerRef = useRef(null);

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

    // Update Leaflet marker position
    if (leafletMapRef.current && leafletMarkerRef.current && window.L) {
      try {
        const newLatLng = new window.L.LatLng(lat, lng);
        leafletMarkerRef.current.setLatLng(newLatLng);
        leafletMapRef.current.panTo(newLatLng);
      } catch (e) {
        console.warn('Leaflet position update error:', e);
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
  }, [fetchDeliveryCalculation, onFieldsAutoFilled]);

  // 3. Load Leaflet CSS & JS SDK dynamically
  useEffect(() => {
    if (window.L) {
      setLeafletLoaded(true);
      return;
    }

    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    if (!document.getElementById('leaflet-js')) {
      const script = document.createElement('script');
      script.id = 'leaflet-js';
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.async = true;
      script.onload = () => setLeafletLoaded(true);
      script.onerror = () => console.warn('Failed to load Leaflet SDK');
      document.head.appendChild(script);
    }
  }, []);

  // 4. Initialize Leaflet Map
  useEffect(() => {
    if (!leafletLoaded || !leafletMapContainerRef.current || leafletMapRef.current || !window.L) return;

    try {
      const L = window.L;
      const map = L.map(leafletMapContainerRef.current, {
        center: [position.lat, position.lng],
        zoom: 15,
        zoomControl: true
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap'
      }).addTo(map);

      // Custom delivery pin icon
      const customIcon = L.divIcon({
        className: 'custom-leaflet-pin',
        html: `<div style="font-size:2.4rem;line-height:1;transform:translate(-50%,-100%);filter:drop-shadow(0 3px 6px rgba(0,0,0,0.35));">📍</div>`,
        iconSize: [0, 0],
        iconAnchor: [0, 0]
      });

      // P3-18: Non-draggable Canonical Store Pin Icon
      const storeIcon = L.divIcon({
        className: 'store-leaflet-pin',
        html: `<div style="font-size:2.2rem;line-height:1;transform:translate(-50%,-100%);filter:drop-shadow(0 2px 5px rgba(0,0,0,0.3));" title="Chaudhary Kirana Store (Mahruni)">🏠</div>`,
        iconSize: [0, 0],
        iconAnchor: [0, 0]
      });

      // Add store marker
      L.marker([STORE_LOCATION.latitude, STORE_LOCATION.longitude], {
        draggable: false,
        icon: storeIcon,
        title: STORE_LOCATION.name
      }).addTo(map);

      const marker = L.marker([position.lat, position.lng], {
        draggable: true,
        icon: customIcon,
        title: 'Delivery Pin (Drag or tap to adjust)'
      }).addTo(map);

      leafletMapRef.current = map;
      leafletMarkerRef.current = marker;

      marker.on('dragend', (e) => {
        const targetLatLng = e.target.getLatLng();
        handlePositionChange(targetLatLng.lat, targetLatLng.lng);
      });

      map.on('click', (e) => {
        const { lat, lng } = e.latlng;
        marker.setLatLng([lat, lng]);
        handlePositionChange(lat, lng);
      });

      // Recalculate Leaflet size when mounted inside modal
      setTimeout(() => {
        if (leafletMapRef.current) leafletMapRef.current.invalidateSize();
      }, 250);

    } catch (err) {
      console.warn('Leaflet map initialization error:', err);
    }
  }, [leafletLoaded, position.lat, position.lng, handlePositionChange]);

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

  // Handle "📍 Use My Current Location" button click
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

      {/* P1-1: Micro-copy map guidance helper text */}
      <div style={{
        fontSize: '0.78rem',
        color: '#475569',
        background: '#F1F5F9',
        padding: '6px 10px',
        borderRadius: '6px',
        fontWeight: 600,
        display: 'flex',
        alignItems: 'center',
        gap: '6px'
      }}>
        <span>📍</span> Tap anywhere on the map or drag the pin to set your exact delivery location.
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

      {/* Map Display Box - Leaflet OpenStreetMap Canvas */}
      <div style={{
        position: 'relative',
        width: '100%',
        height: '240px',
        borderRadius: '10px',
        overflow: 'hidden',
        border: '1px solid var(--color-border, #CBD5E1)',
        background: '#E2E8F0',
        zIndex: 1
      }}>
        <div ref={leafletMapContainerRef} style={{ width: '100%', height: '100%' }} />

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
          zIndex: 1000
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
