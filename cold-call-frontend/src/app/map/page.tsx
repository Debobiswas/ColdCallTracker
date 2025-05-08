"use client";
import React, { useEffect, useState } from "react";
import dynamic from 'next/dynamic';

const API_URL = "http://localhost:8001/api/businesses";

// Dynamically import the MapComponent with no SSR
const MapComponent = dynamic(() => import('./MapComponent'), {
  ssr: false,
  loading: () => <div className="text-center p-10">Loading map component...</div>
});

export default function MapPage() {
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredBusinesses, setFilteredBusinesses] = useState([]);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(API_URL);
        if (!res.ok) {
          throw new Error(`API request failed with status ${res.status}`);
        }
        const data = await res.json();
        const businessData = Array.isArray(data) ? data : [];
        setBusinesses(businessData);
        setFilteredBusinesses(businessData);
      } catch (error) {
        console.error('Error fetching businesses:', error);
        setError(error.message || 'Failed to fetch businesses');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Search businesses by address
  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setFilteredBusinesses(businesses);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = businesses.filter(business => 
      business.address && business.address.toLowerCase().includes(query)
    );
    
    setFilteredBusinesses(filtered);
  };

  // Clear search
  const clearSearch = () => {
    setSearchQuery("");
    setFilteredBusinesses(businesses);
  };

  return (
    <div className="w-full h-full flex flex-col">
      <h2 className="text-3xl font-bold mb-6 mt-8 text-center">Business Map</h2>
      
      {/* Search form */}
      <div className="mx-auto w-full max-w-2xl mb-6">
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            placeholder="Search by address..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg shadow-sm"
          />
          <button 
            type="submit"
            className="bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-lg"
          >
            Search
          </button>
          {searchQuery && (
            <button 
              type="button"
              onClick={clearSearch}
              className="bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded-lg"
            >
              Clear
            </button>
          )}
        </form>
        {filteredBusinesses.length === 0 && !loading && !error && (
          <p className="text-center mt-2 text-gray-600">No businesses found with that address</p>
        )}
        {filteredBusinesses.length > 0 && searchQuery && (
          <p className="text-center mt-2 text-sm text-gray-600">
            Found {filteredBusinesses.length} business{filteredBusinesses.length !== 1 ? 'es' : ''}
          </p>
        )}
      </div>

      <div className="relative flex-1" style={{ minHeight: "75vh" }}>
        {error ? (
          <div className="text-center p-10 text-red-600">
            Error: {error}. Please make sure the backend API is running.
          </div>
        ) : loading ? (
          <div className="text-center p-10">Loading business data...</div>
        ) : (
          <MapComponent businesses={filteredBusinesses} />
        )}
      </div>
    </div>
  );
} 