"use client";
import React, { useState, useEffect } from "react";

export default function CustomScraperPage() {
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [addedIdx, setAddedIdx] = useState<number | null>(null);
  const [addedAll, setAddedAll] = useState(false);
  // Filter modal state
  const [showFilter, setShowFilter] = useState(false);
  const [filterLimit, setFilterLimit] = useState(15);
  const [filterNoWebsite, setFilterNoWebsite] = useState(false);
  const [headless, setHeadless] = useState(true);
  // Temporary state for modal
  const [tempFilterLimit, setTempFilterLimit] = useState(filterLimit);
  const [tempFilterNoWebsite, setTempFilterNoWebsite] = useState(filterNoWebsite);
  const [tempHeadless, setTempHeadless] = useState(headless);
  // State for expanded hours
  const [expandedHours, setExpandedHours] = useState<{ [key: string]: boolean }>({});
  // State to store existing businesses
  const [existingBusinesses, setExistingBusinesses] = useState<string[]>([]);
  // State to store the extracted industry from the search query
  const [industry, setIndustry] = useState<string>("");
  // State for scraping progress
  const [scrapingProgress, setScrapingProgress] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);

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
    setTempHeadless(headless);
    setShowFilter(true);
  }

  function handleApplyFilter() {
    setFilterLimit(tempFilterLimit);
    setFilterNoWebsite(tempFilterNoWebsite);
    setHeadless(tempHeadless);
    setShowFilter(false);
  }

  async function handleScrape() {
    if (!query.trim() || !location.trim()) {
      setError("Please enter both business type and location");
      return;
    }
    
    setError("");
    setLoading(true);
    setIsProcessing(true);
    setScrapingProgress("Starting scraper...");
    setResults([]);
    
    try {
      // Extract industry from search query before making the API call
      const extractedIndustry = extractIndustry(query);
      setIndustry(extractedIndustry);
      console.log(`Extracted industry from query "${query}": ${extractedIndustry}`);
      
      const params = new URLSearchParams({
        business_type: query.trim(),
        location: location.trim(),
        limit: filterLimit.toString(),
        no_website: filterNoWebsite ? 'true' : 'false',
        headless: headless ? 'true' : 'false'
      });
      
      console.log("Scrape parameters:", Object.fromEntries(params.entries()));
      
      // Start the scraping process
      const startRes = await fetch(`http://localhost:8001/api/scraper/start?${params}`);
      if (!startRes.ok) throw new Error(await startRes.text());
      
      // Poll for progress updates
      const pollInterval = setInterval(async () => {
        try {
          const progressRes = await fetch("http://localhost:8001/api/scraper/progress");
          if (progressRes.ok) {
            const progressData = await progressRes.json();
            setScrapingProgress(progressData.message);
            
            if (progressData.status === "completed") {
              clearInterval(pollInterval);
              setIsProcessing(false);
              
              // Fetch the results
              const resultsRes = await fetch("http://localhost:8001/api/scraper/results");
              if (resultsRes.ok) {
                const data = await resultsRes.json();
                
                // Filter out businesses that already exist in the dashboard
                const filteredResults = data.results.filter(business => 
                  !existingBusinesses.includes(business.name.toLowerCase().trim())
                );
                
                console.log(`Filtered out ${data.results.length - filteredResults.length} existing businesses`);
                console.log("Final results:", filteredResults.length);
                
                setResults(filteredResults);
              } else {
                throw new Error("Failed to fetch results");
              }
            } else if (progressData.status === "error") {
              clearInterval(pollInterval);
              setIsProcessing(false);
              throw new Error(progressData.message);
            }
          }
        } catch (err) {
          console.error("Error polling progress:", err);
        }
      }, 2000);
      
    } catch (err) {
      setError("Failed to start scraper: " + (err.message || "Unknown error"));
      setIsProcessing(false);
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
        <h1 className="text-3xl font-bold mb-8">Custom Web Scraper</h1>
        
        {/* Search Form */}
        <div className="mb-8 bg-white rounded-lg shadow-md p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Business Type</label>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g., restaurants, dentists, plumbers..."
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g., New York, NY, London, UK..."
                className="w-full p-2 border rounded"
              />
            </div>
          </div>
          
          <div className="flex gap-4">
            <button
              onClick={handleScrape}
              disabled={loading || isProcessing}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-blue-300"
            >
              {loading ? 'Starting...' : isProcessing ? 'Scraping...' : 'Start Scraping'}
            </button>
            <button
              onClick={openFilterModal}
              className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
            >
              Options
            </button>
          </div>
          
          {/* Progress Indicator */}
          {isProcessing && (
            <div className="mt-4">
              <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
                <div className="bg-blue-600 h-2.5 rounded-full w-full animate-pulse"></div>
              </div>
              <p className="text-sm text-gray-600">{scrapingProgress}</p>
            </div>
          )}
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
                      {result.website && result.website !== "N/A" && (
                        <a href={result.website} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                          {result.website}
                        </a>
                      )}
                      
                      {/* Display opening hours if available */}
                      {result.opening_hours && result.opening_hours.length > 0 && (
                        <div className="mt-2">
                          <button
                            onClick={() => toggleHours(result.name)}
                            className="text-sm text-gray-600 flex items-center"
                          >
                            <span className="mr-1">{expandedHours[result.name] ? 'Hide' : 'Show'} hours</span>
                            <svg
                              className={`w-4 h-4 transition-transform ${expandedHours[result.name] ? 'transform rotate-180' : ''}`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                          
                          {expandedHours[result.name] && (
                            <div className="mt-2 pl-2 border-l-2 border-gray-200 text-sm text-gray-600">
                              {result.opening_hours.map((hour, i) => (
                                <div key={i}>{hour}</div>
                              ))}
                            </div>
                          )}
                        </div>
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
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Options Modal */}
        {showFilter && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-96">
              <h2 className="text-xl font-semibold mb-4">Scraper Options</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Result Limit</label>
                  <input
                    type="number"
                    value={tempFilterLimit}
                    onChange={(e) => setTempFilterLimit(Number(e.target.value))}
                    min="1"
                    max="50"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Maximum number of businesses to scrape (1-50)</p>
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
                    Only show businesses without websites
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="headless"
                    checked={tempHeadless}
                    onChange={(e) => setTempHeadless(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="headless" className="ml-2 block text-sm text-gray-900">
                    Run browser in headless mode (hidden)
                  </label>
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setShowFilter(false)}
                  className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApplyFilter}
                  className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 