"use client";
import React, { useState, useEffect } from "react";

export default function BusinessLookupPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [addedIdx, setAddedIdx] = useState<number | null>(null);
  const [addedAll, setAddedAll] = useState(false);
  // Filter modal state
  const [showFilter, setShowFilter] = useState(false);
  const [filterLimit, setFilterLimit] = useState(15);
  const [filterNoWebsite, setFilterNoWebsite] = useState(false);
  // Temporary state for modal
  const [tempFilterLimit, setTempFilterLimit] = useState(filterLimit);
  const [tempFilterNoWebsite, setTempFilterNoWebsite] = useState(filterNoWebsite);
  // State for expanded hours
  const [expandedHours, setExpandedHours] = useState<{ [key: string]: boolean }>({});
  // State to store existing businesses
  const [existingBusinesses, setExistingBusinesses] = useState<string[]>([]);
  // State to store the extracted industry from the search query
  const [industry, setIndustry] = useState<string>("");
  // State for reasons popup
  const [showReasons, setShowReasons] = useState(false);
  const [reasons, setReasons] = useState<string[]>([]);
  // State for explore distance slider
  const [exploreDistance, setExploreDistance] = useState(0);
  const [tempExploreDistance, setTempExploreDistance] = useState(exploreDistance);

  // Fetch existing businesses from dashboard on component mount
  useEffect(() => {
    async function fetchExistingBusinesses() {
      try {
        const res = await fetch("http://localhost:8001/api/businesses");
        if (!res.ok) throw new Error("Failed to fetch existing businesses");
        const data = await res.json();
        // Extract business names to use for filtering
        const businessNames = Array.isArray(data) 
          ? data.map(business => business.name.toLowerCase().trim())
          : [];
        setExistingBusinesses(businessNames);
        console.log(`Loaded ${businessNames.length} existing businesses for filtering`);
      } catch (err) {
        console.error("Error fetching existing businesses:", err);
      }
    }
    
    fetchExistingBusinesses();
  }, []);

  // Extract industry from search query
  const extractIndustry = (searchQuery: string): string => {
    // Common industry keywords to look for
    const industryKeywords = [
      'restaurant', 'cafe', 'coffee', 'diner', 'bistro', 'eatery', 'food',
      'hotel', 'motel', 'inn', 'lodging', 'accommodation',
      'retail', 'store', 'shop', 'boutique', 'market',
      'salon', 'spa', 'beauty', 'barber', 'hair',
      'gym', 'fitness', 'health club',
      'bar', 'pub', 'tavern', 'brewery',
      'bakery', 'patisserie',
      'pharmacy', 'drugstore',
      'clinic', 'hospital', 'medical',
      'dentist', 'dental',
      'law firm', 'attorney', 'lawyer',
      'bank', 'financial', 'insurance',
      'real estate', 'property'
    ];
    
    const searchLower = searchQuery.toLowerCase();
    
    // Check if any industry keyword is in the search query
    for (const keyword of industryKeywords) {
      if (searchLower.includes(keyword)) {
        // Capitalize first letter of each word
        return keyword.split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
      }
    }
    
    // If no specific industry is found, try to extract the first word
    // that might represent an industry
    const words = searchLower.split(' ');
    for (const word of words) {
      // Skip common non-industry words
      if (!['near', 'in', 'at', 'by', 'the', 'and', 'or', 'of', 'for', 'with'].includes(word) && 
          word.length > 2) {
        return word.charAt(0).toUpperCase() + word.slice(1);
      }
    }
    
    return "Other";
  };

  // Extract city from address - same implementation as in dashboard
  const extractCity = (address: string | undefined): string => {
    if (!address) return "Unknown Location";
    
    // Try to extract city using common patterns in addresses
    // Pattern: City, State/Province ZipCode
    const cityMatch = address.match(/,\s*([^,]+),/);
    if (cityMatch && cityMatch[1]) return cityMatch[1].trim();
    
    // Pattern: City, State/Province
    const simpleMatch = address.match(/,\s*([^,]+)$/);
    if (simpleMatch && simpleMatch[1]) {
      // Remove postal/zip code if present
      return simpleMatch[1].replace(/\s+\w\d\w\s+\d\w\d|\s+\d{5}(-\d{4})?/, '').trim();
    }
    
    // Fallback: Use the second-last part of the address split by commas
    const parts = address.split(',');
    if (parts.length >= 2) {
      return parts[parts.length - 2].trim();
    }
    
    return "Unknown Location";
  };

  // Function to get today's day name
  const getTodayHours = (hours: string[]) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const today = days[new Date().getDay()];
    return hours.find(h => h.startsWith(today)) || 'Closed today';
  };

  // Function to toggle hours expansion
  const toggleHours = (businessName: string) => {
    setExpandedHours(prev => ({
      ...prev,
      [businessName]: !prev[businessName]
    }));
  };

  function openFilterModal() {
    setTempFilterLimit(filterLimit);
    setTempFilterNoWebsite(filterNoWebsite);
    setTempExploreDistance(exploreDistance);
    setShowFilter(true);
  }

  function handleApplyFilter() {
    setFilterLimit(tempFilterLimit);
    setFilterNoWebsite(tempFilterNoWebsite);
    setExploreDistance(tempExploreDistance);
    setShowFilter(false);
  }

  async function handleSearch() {
    if (!query.trim()) return;
    setError("");
    setLoading(true);
    try {
      // Extract industry from search query before making the API call
      const extractedIndustry = extractIndustry(query);
      setIndustry(extractedIndustry);
      console.log(`Extracted industry from query "${query}": ${extractedIndustry}`);
      
      const params = new URLSearchParams({
        query: query.trim(),
        limit: filterLimit.toString(),
        no_website: filterNoWebsite ? 'true' : 'false',
        explore_distance_km: exploreDistance.toString()
      });
      console.log("Search parameters:", Object.fromEntries(params.entries()));
      const res = await fetch(`http://localhost:8001/api/businesses/search?${params}`);
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      console.log("Search results before filtering:", data.results.length);
      
      // Filter out businesses that already exist in the dashboard
      const filteredResults = data.results.filter(business => 
        !existingBusinesses.includes(business.name.toLowerCase().trim())
      );
      
      console.log(`Filtered out ${data.results.length - filteredResults.length} existing businesses`);
      console.log("Final results:", filteredResults.length);
      
      setResults(filteredResults);
      
      // Show reasons popup if we got fewer results than requested
      if (data.reasons && data.reasons.length > 0) {
        setReasons(data.reasons);
        setShowReasons(true);
      }
    } catch (err) {
      setError("Failed to search businesses");
    }
    setLoading(false);
  }

  // Update existing businesses list after adding a new business
  async function refreshExistingBusinesses() {
    try {
      const res = await fetch("http://localhost:8001/api/businesses");
      if (!res.ok) throw new Error("Failed to fetch existing businesses");
      const data = await res.json();
      const businessNames = Array.isArray(data) 
        ? data.map(business => business.name.toLowerCase().trim())
        : [];
      setExistingBusinesses(businessNames);
    } catch (err) {
      console.error("Error refreshing existing businesses:", err);
    }
  }

  async function handleAddToDashboard(idx) {
    const result = results[idx];
    if (!result) return;
    setError("");
    setLoading(true);
    try {
      // Extract region/city from the address
      const region = extractCity(result.address);
      
      const res = await fetch("http://localhost:8001/api/businesses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: result.name,
          phone: result.phone || "",
          address: result.address || "",
          status: "tocall",
          comment: "",
          opening_hours: result.opening_hours || [],
          region: region, // Include region information
          industry: industry // Include industry information
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      setAddedIdx(idx);
      
      // After adding, refresh the list of existing businesses
      await refreshExistingBusinesses();
      
      // Update results to remove the added business
      setResults(prev => prev.filter((_, i) => i !== idx));
    } catch (err) {
      setError("Failed to add business to dashboard");
    }
    setLoading(false);
  }

  async function handleAddAll() {
    setError("");
    setLoading(true);
    try {
      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        // Extract region/city from the address
        const region = extractCity(result.address);
        
        await fetch("http://localhost:8001/api/businesses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: result.name,
            phone: result.phone || "",
            address: result.address || "",
            status: "tocall",
            comment: "",
            opening_hours: result.opening_hours || [],
            region: region, // Include region information
            industry: industry // Include industry information
          }),
        });
      }
      setAddedAll(true);
      
      // After adding all, refresh the list of existing businesses
      await refreshExistingBusinesses();
      
      // Clear results since all have been added
      setResults([]);
    } catch (err) {
      setError("Failed to add all businesses to dashboard");
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-white p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Business Lookup</h1>
        
        {/* Search Bar */}
        <div className="mb-8">
          <div className="flex gap-4">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter business name..."
              className="flex-1 p-2 border rounded"
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
            <button
              onClick={handleSearch}
              disabled={loading}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-blue-300"
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
            <button
              onClick={() => setShowFilter(true)}
              className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
            >
              Filter
            </button>
          </div>
        </div>

        {/* Results */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {results.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-xl font-semibold">Results</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Found {results.length} business{results.length !== 1 ? 'es' : ''}
                  {results.length < filterLimit && ' (fewer than requested)'}
                </p>
              </div>
              <button
                onClick={handleAddAll}
                disabled={loading || addedAll}
                className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:bg-green-300"
              >
                {loading ? 'Adding...' : addedAll ? 'All Added' : 'Add All'}
              </button>
            </div>
            <div className="space-y-4">
              {results.map((result, idx) => (
                <div key={idx} className="border rounded p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold">{result.name}</h3>
                      <p className="text-gray-600">{result.address}</p>
                      <p className="text-gray-600">{result.phone}</p>
                      {result.website && (
                        <a href={result.website} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                          {result.website}
                        </a>
                      )}
                    </div>
                    <button
                      onClick={() => handleAddToDashboard(idx)}
                      disabled={loading || addedIdx === idx}
                      className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-blue-300"
                    >
                      {loading ? 'Adding...' : addedIdx === idx ? 'Added' : 'Add'}
                    </button>
                  </div>
                  {result.opening_hours && result.opening_hours.length > 0 && (
                    <div className="mt-2">
                      <button
                        onClick={() => setExpandedHours(prev => ({ ...prev, [idx]: !prev[idx] }))}
                        className="text-blue-500 hover:underline"
                      >
                        {expandedHours[idx] ? 'Hide Hours' : 'Show Hours'}
                      </button>
                      {expandedHours[idx] && (
                        <div className="mt-2 text-sm text-gray-600">
                          {result.opening_hours.map((hour, i) => (
                            <div key={i}>{hour}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filter Modal */}
        {showFilter && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center">
            <div className="bg-white rounded-lg p-6 w-96">
              <h2 className="text-xl font-semibold mb-4">Filter Results</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Result Limit</label>
                  <input
                    type="number"
                    value={tempFilterLimit}
                    onChange={(e) => setTempFilterLimit(Number(e.target.value))}
                    min="1"
                    max="30"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="noWebsite"
                    checked={tempFilterNoWebsite}
                    onChange={(e) => setTempFilterNoWebsite(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="noWebsite" className="ml-2 block text-sm text-gray-900">
                    Only show businesses without websites (includes social media only)
                  </label>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Explore nearby areas if not enough results (km)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="0"
                      max="50"
                      value={tempExploreDistance}
                      onChange={e => setTempExploreDistance(Number(e.target.value))}
                      className="w-full"
                    />
                    <span className="w-10 text-right">{tempExploreDistance} km</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">0 disables extra searches. Up to 50 km in 8 directions.</p>
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setTempFilterLimit(filterLimit);
                    setTempFilterNoWebsite(filterNoWebsite);
                    setTempExploreDistance(exploreDistance);
                    setShowFilter(false);
                  }}
                  className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setFilterLimit(tempFilterLimit);
                    setFilterNoWebsite(tempFilterNoWebsite);
                    setExploreDistance(tempExploreDistance);
                    setShowFilter(false);
                    console.log("Filter applied:", {limit: tempFilterLimit, noWebsite: tempFilterNoWebsite, exploreDistance: tempExploreDistance});
                    if (query.trim()) handleSearch();
                  }}
                  className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Reasons Popup */}
        {showReasons && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-96">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-xl font-semibold">Fewer Results Found</h2>
                <button 
                  onClick={() => setShowReasons(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
              <div className="space-y-2">
                {reasons.map((reason, index) => (
                  <p key={index} className="text-gray-600">• {reason}</p>
                ))}
              </div>
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowReasons(false)}
                  className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 