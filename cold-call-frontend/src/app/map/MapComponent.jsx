"use client";
import { useEffect, useState, useRef } from 'react';

export default function MapComponent({ businesses }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load Leaflet from CDN
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = initializeMap;
    document.head.appendChild(script);

    return () => {
      // Cleanup
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      document.head.removeChild(link);
      document.head.removeChild(script);
    };
  }, []);

  // Initialize the map after Leaflet is loaded
  function initializeMap() {
    if (!mapRef.current || mapInstanceRef.current) return;
    
    const L = window.L;
    if (!L) {
      console.error('Leaflet not loaded');
      return;
    }

    // Create map instance
    const map = L.map(mapRef.current).setView([45.5017, -73.5673], 12);
    mapInstanceRef.current = map;

    // Add tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // Define a custom icon for markers
    const customIcon = L.icon({
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    });

    // Geocode and add markers
    setLoading(true);
    geocodeAddresses(businesses, L, map, customIcon);
  }

  // Geocode all business addresses
  async function geocodeAddresses(businesses, L, map, icon) {
    if (!businesses || !Array.isArray(businesses) || !L || !map) {
      setLoading(false);
      return;
    }

    const markers = [];
    for (const business of businesses) {
      if (business.address) {
        try {
          const coords = await geocodeAddress(business.address);
          if (coords) {
            // Create marker with custom icon and add to map
            const marker = L.marker([coords.lat, coords.lng], { icon: icon }).addTo(map);
            
            // Add popup with business info
            marker.bindPopup(`
              <div>
                <div style="font-weight: bold; font-size: 16px; margin-bottom: 4px;">${business.name}</div>
                <div style="margin-bottom: 4px;">${business.address}</div>
                <div style="margin-bottom: 4px;">${business.phone || 'No phone'}</div>
                <div style="font-weight: 600;">Status: <span style="color: #1d4ed8;">${business.status}</span></div>
                ${business.comment ? `<div style="margin-top: 8px; color: #666;">${business.comment}</div>` : ''}
              </div>
            `);
            
            markers.push(marker);
          }
        } catch (error) {
          console.error(`Error geocoding ${business.name}:`, error);
        }
      }
    }

    // If we have markers, fit the map to show all of them
    if (markers.length > 0) {
      const group = L.featureGroup(markers);
      map.fitBounds(group.getBounds().pad(0.1));
    }
    
    setLoading(false);
  }

  // Geocode a single address using Nominatim
  async function geocodeAddress(address) {
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`;
      const response = await fetch(url);
      const data = await response.json();
      
      if (data && data.length > 0) {
        return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
      }
      return null;
    } catch (error) {
      console.error('Error geocoding address:', error);
      return null;
    }
  }

  return (
    <>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
          <div className="text-lg font-medium">Loading map and geocoding addresses...</div>
        </div>
      )}
      <div 
        ref={mapRef} 
        className="w-full h-full rounded-xl shadow-xl" 
        style={{ minHeight: "500px" }}
      />
    </>
  );
} 