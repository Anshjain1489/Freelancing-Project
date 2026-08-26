import React, { useState, useEffect, useRef, useCallback } from 'react';
import client from '../../api/client';

const STORE_LOCATION = {
  name: 'Chaudhary Kirana Store',
  lat: 24.2381,
  lng: 78.7364
};

export default function GoogleMapAddressPicker({ onSelectAddress, initialLat, initialLng }) {
  const [position, setPosition] = useState({
    lat: initialLat ? parseFloat(initialLat) : STORE_LOCATION.lat,
    lng: initialLng ? parseFloat(initialLng) : STORE_LOCATION.lng
  });
  const [addressText, setAddressText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [distanceInfo, setDistanceInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [geoError, setGeoError] = useState(null);
  const mapRef = useRef(null);
  const debounceTimerRef = useRef(null);

  // Recalculate distance and fee from backend API
  const calculateDistance = useCallback(async (lat, lng) => {
    setLoading(true);
    setGeoError(null);
    try {
      const response = await client.post('/delivery/calculate', { latitude: lat, longitude: lng });
      if (response.data?.success) {
        setDistanceInfo(response.data.data);
      }
    } catch (err) {
      console.warn('Failed to calculate delivery distance:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced wrapper for marker drag / map click
  const handlePositionChange = useCallback((newLat, newLng) => {
    setPosition({ lat: newLat, lng: newLng });
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      calculateDistance(newLat, newLng);
    }, 300);
  }, [calculateDistance]);

  // Handle "📍 Use My Current Location" button click
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported by your browser.');
      return;
    }

    setLoading(true);
    setGeoError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const currentLat = pos.coords.latitude;
        const currentLng = pos.coords.longitude;
        handlePositionChange(currentLat, currentLng);
        setAddressText(`Current GPS Location (${currentLat.toFixed(4)}, ${currentLng.toFixed(4)})`);
      },
      (err) => {
        setLoading(false);
        if (err.code === err.PERMISSION_DENIED) {
          setGeoError('Location permission was not granted. Please search for your address or select your location manually on the map.');
        } else {
          setGeoError('Location unavailable. Please search for your address or tap on the map.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Initial calculation on component load
  useEffect(() => {
    calculateDistance(position.lat, position.lng);
  }, [calculateDistance, position.lat, position.lng]);

  const handleSave = () => {
    if (onSelectAddress && distanceInfo) {
      onSelectAddress({
        latitude: position.lat,
        longitude: position.lng,
        addressText: addressText || `Location (${position.lat.toFixed(4)}, ${position.lng.toFixed(4)})`,
        distanceKm: distanceInfo.distanceKm,
        deliveryCharge: distanceInfo.deliveryCharge,
        isDeliverable: distanceInfo.isDeliverable
      });
    }
  };

  return (
    <div className="google-map-address-picker p-4 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 max-w-2xl mx-auto">
      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
        <span>📍</span> Choose Delivery Location
      </h3>

      {/* 1. Address Search Bar */}
      <div className="mb-3">
        <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
          🔎 Search your area or address
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Type area, street, or landmark..."
            className="w-full px-3 py-2 text-sm border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
          <button
            type="button"
            onClick={() => {
              if (searchQuery.trim()) {
                setAddressText(searchQuery);
                // Simulate address lookup search centered on Mahruni
                handlePositionChange(24.2381 + (Math.random() - 0.5) * 0.05, 78.7364 + (Math.random() - 0.5) * 0.05);
              }
            }}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700"
          >
            Search
          </button>
        </div>
      </div>

      {/* 2. Current Location Button */}
      <button
        type="button"
        onClick={handleUseCurrentLocation}
        className="w-full mb-3 py-2 px-4 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg border border-blue-200 dark:border-blue-800 font-medium text-sm flex items-center justify-center gap-2 hover:bg-blue-100 dark:hover:bg-blue-900/50"
      >
        <span>📍</span> Use My Current Location
      </button>

      {/* Error Banner */}
      {geoError && (
        <div className="mb-3 p-3 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-lg text-xs border border-amber-200 dark:border-amber-800">
          {geoError}
        </div>
      )}

      {/* 3. Interactive Map Canvas Box */}
      <div className="relative w-full h-64 bg-gray-100 dark:bg-gray-900 rounded-lg overflow-hidden border border-gray-300 dark:border-gray-700 mb-4 flex flex-col items-center justify-center">
        {/* Simple map pin visualizer */}
        <div className="absolute inset-0 bg-emerald-950/10 dark:bg-emerald-950/40 flex items-center justify-center cursor-pointer"
             onClick={(e) => {
               const rect = e.currentTarget.getBoundingClientRect();
               const offsetX = (e.clientX - rect.left) / rect.width - 0.5;
               const offsetY = (e.clientY - rect.top) / rect.height - 0.5;
               handlePositionChange(position.lat + offsetY * 0.02, position.lng + offsetX * 0.02);
             }}>
          <div className="text-center">
            <div className="text-4xl transform -translate-y-2 transition-transform duration-200">📍</div>
            <div className="px-3 py-1 bg-white/90 dark:bg-gray-800/90 rounded-full text-xs font-semibold text-gray-800 dark:text-white shadow-md">
              Tap map to adjust pin position
            </div>
          </div>
        </div>

        {/* Selected Coordinates Overlay */}
        <div className="absolute bottom-2 left-2 bg-black/70 text-white text-[10px] px-2 py-1 rounded">
          Lat: {position.lat.toFixed(6)}, Lng: {position.lng.toFixed(6)}
        </div>
      </div>

      {/* 4. Distance & Delivery Fee Summary Card */}
      {distanceInfo && (
        <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600 mb-4 text-sm">
          <div className="flex justify-between items-center mb-1">
            <span className="text-gray-600 dark:text-gray-300">Distance from Chaudhary Kirana Store:</span>
            <span className="font-bold text-gray-900 dark:text-white flex items-center gap-1">
              🚚 {distanceInfo.distanceKm} km
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600 dark:text-gray-300">Delivery Charge:</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400 text-base">
              ₹{distanceInfo.deliveryCharge}
            </span>
          </div>
          {!distanceInfo.isDeliverable && (
            <div className="mt-2 text-xs font-semibold text-rose-600 dark:text-rose-400">
              ⚠️ {distanceInfo.reason || 'Outside delivery area.'}
            </div>
          )}
        </div>
      )}

      {/* 5. Save Button */}
      <button
        type="button"
        disabled={loading || (distanceInfo && !distanceInfo.isDeliverable)}
        onClick={handleSave}
        className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold text-sm rounded-lg transition-colors"
      >
        {loading ? 'Calculating Distance...' : 'Confirm & Save Delivery Location'}
      </button>
    </div>
  );
}
