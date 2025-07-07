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
  const [filterLimit, setFilterLimit] = useState(60);
  const [filterNoWebsite, setFilterNoWebsite] = useState(false);
  const [initialRadius, setInitialRadius] = useState(1000);
  const [maxRadius, setMaxRadius] = useState(50000);
  const [keywords, setKeywords] = useState("restaurant, cafe, Tavern, coffee, bistro, diner");
  // Temporary state for modal
  const [tempFilterLimit, setTempFilterLimit] = useState(filterLimit);
  const [tempFilterNoWebsite, setTempFilterNoWebsite] = useState(filterNoWebsite);
  const [tempInitialRadius, setTempInitialRadius] = useState(initialRadius);
  const [tempMaxRadius, setTempMaxRadius] = useState(maxRadius);
  const [tempKeywords, setTempKeywords] = useState(keywords);
  // State for expanded hours
  const [expandedHours, setExpandedHours] = useState<{ [key: string]: boolean }>({});
  const [allIndustries, setAllIndustries] = useState<string[]>(["Restaurant"]);
  const [showIndustryModal, setShowIndustryModal] = useState(false);
  const [industryInput, setIndustryInput] = useState("");
  const [industryDropdown, setIndustryDropdown] = useState("");
  const [pendingAddIdx, setPendingAddIdx] = useState<number | null>(null);

  // API configuration
  const BUSINESSES_API_URL = '/api/businesses';
  const SEARCH_API_URL = '/api/businesses/search';

  // Headers configuration
  const getHeaders = () => {
    return {
      'Content-Type': 'application/json',
    };
  };

  // Fetch all businesses to get industries
  useEffect(() => {
    fetch(BUSINESSES_API_URL, { headers: getHeaders() })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          const inds = Array.from(new Set(data.map((b: any) => b.industry || "Restaurant")));
          setAllIndustries(inds.length ? inds : ["Restaurant"]);
        }
      })
      .catch(error => {
        console.warn('Failed to fetch industries:', error);
        setAllIndustries(["Restaurant"]);
      });
  }, []);

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
    setTempInitialRadius(initialRadius);
    setTempMaxRadius(maxRadius);
    setTempKeywords(keywords);
    setShowFilter(true);
  }

  function handleApplyFilter() {
    setFilterLimit(tempFilterLimit);
    setFilterNoWebsite(tempFilterNoWebsite);
    setInitialRadius(tempInitialRadius);
    setMaxRadius(tempMaxRadius);
    setKeywords(tempKeywords);
    setShowFilter(false);
  }

  async function handleSearch(e) {
    e.preventDefault();
    setError("");
    setResults([]);
    setAddedIdx(null);
    setAddedAll(false);
    setLoading(true);
    try {
      const params = new URLSearchParams({
        query,
        limit: filterLimit.toString(),
        no_website: filterNoWebsite ? "true" : "false",
        initial_radius: initialRadius.toString(),
        max_radius: maxRadius.toString(),
        keywords: keywords,
      });
      const res = await fetch(`${SEARCH_API_URL}?${params.toString()}`);
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setResults(Array.isArray(data) ? data : []);
    } catch (err) {
      setError("Failed to fetch business results");
    }
    setLoading(false);
  }

  async function handleAddToDashboard(idx) {
    setPendingAddIdx(idx);
    setIndustryInput("");
    setIndustryDropdown("");
    setShowIndustryModal(true);
  }

  async function confirmAddToDashboard() {
    if (pendingAddIdx === null) return;
    const result = results[pendingAddIdx];
    if (!result) return;
    setError("");
    setLoading(true);
    setShowIndustryModal(false);
    const industry = industryInput.trim() || industryDropdown || "Restaurant";
    try {
      const res = await fetch(BUSINESSES_API_URL, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          name: result.name,
          phone: result.phone || "",
          address: result.address || "",
          status: "tocall",
          comments: "",
          hours: result.hours || "",
          industry,
        }),
      });
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Failed to add business: ${res.status} - ${errorText}`);
      }
      setAddedIdx(pendingAddIdx);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to add business to dashboard";
      setError(errorMessage);
      console.error('Error adding business:', err);
    }
    setLoading(false);
    setPendingAddIdx(null);
  }

  async function handleAddAll() {
    setError("");
    setLoading(true);
    try {
      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        const res = await fetch(BUSINESSES_API_URL, {
          method: "POST",
          headers: getHeaders(),
          body: JSON.stringify({
            name: result.name,
            phone: result.phone || "",
            address: result.address || "",
            status: "tocall",
            comments: "",
            hours: result.hours || "",
            industry: "Restaurant" // Default industry for bulk add
          }),
        });
        
        if (!res.ok) {
          console.warn(`Failed to add business ${result.name}: ${res.status}`);
        }
      }
      setAddedAll(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to add all businesses to dashboard";
      setError(errorMessage);
      console.error('Error adding all businesses:', err);
    }
    setLoading(false);
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <h2 className="text-3xl font-bold mb-8">Business Lookup</h2>
      <div className="mb-8 shadow-lg rounded-xl bg-white">
        <form onSubmit={handleSearch} className="flex gap-3 p-4">
          <input
            type="text"
            className="flex-1 px-4 py-3 text-lg border-2 border-gray-200 rounded-xl shadow-md focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 placeholder-gray-400 bg-white"
            placeholder="Enter business or search (e.g. 'restaurants near concordia')..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            required
          />
          <button
            type="button"
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold px-5 py-3 rounded-xl shadow-md transition-all duration-200"
            onClick={openFilterModal}
          >
            Filter
          </button>
          <button
            type="submit"
            className="bg-blue-800 hover:bg-blue-900 text-white font-semibold px-6 py-3 rounded-xl shadow-md transition-all duration-200"
            disabled={loading}
          >
            {loading ? "Searching..." : "Search"}
          </button>
        </form>
      </div>
      {/* Filter Modal */}
      {showFilter && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md relative">
            <button onClick={() => setShowFilter(false)} className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-2xl">&times;</button>
            <h3 className="text-xl font-bold mb-4">Filter Results</h3>
            <form onSubmit={e => { e.preventDefault(); handleApplyFilter(); }} className="flex flex-col gap-4">
              <label className="flex flex-col gap-1">
                <span className="font-semibold">Search Keywords</span>
                <input
                  type="text"
                  value={tempKeywords}
                  onChange={e => setTempKeywords(e.target.value)}
                  className="border rounded px-3 py-2"
                  placeholder="Enter keywords separated by commas (e.g. restaurant, cafe, bar)"
                />
                <span className="text-sm text-gray-500">These keywords will be prepended to your search query</span>
              </label>
              <label className="flex flex-col gap-1">
                <span className="font-semibold">Number of Results</span>
                <input
                  type="number"
                  min={1}
                  value={tempFilterLimit}
                  onChange={e => setTempFilterLimit(Number(e.target.value))}
                  className="border rounded px-3 py-2"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="font-semibold">Initial Search Radius (meters)</span>
                <input
                  type="number"
                  min={500}
                  max={50000}
                  value={tempInitialRadius}
                  onChange={e => setTempInitialRadius(Number(e.target.value))}
                  className="border rounded px-3 py-2"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="font-semibold">Maximum Search Radius (meters)</span>
                <input
                  type="number"
                  min={1000}
                  max={100000}
                  value={tempMaxRadius}
                  onChange={e => setTempMaxRadius(Number(e.target.value))}
                  className="border rounded px-3 py-2"
                />
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={tempFilterNoWebsite}
                  onChange={e => setTempFilterNoWebsite(e.target.checked)}
                />
                <span className="font-semibold">Only show results without a website</span>
              </label>
              <button
                type="submit"
                className="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-5 py-2 rounded-lg shadow transition-all duration-200"
              >
                Apply
              </button>
            </form>
          </div>
        </div>
      )}
      {showIndustryModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md relative">
            <button onClick={() => setShowIndustryModal(false)} className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-2xl">&times;</button>
            <h3 className="text-xl font-bold mb-4">Select Industry</h3>
            <div className="flex flex-col gap-4">
              <label className="flex flex-col gap-1">
                <span className="font-semibold">Choose an existing industry</span>
                <select value={industryDropdown} onChange={e => setIndustryDropdown(e.target.value)} className="border rounded px-3 py-2">
                  <option value="">-- Select Industry --</option>
                  {allIndustries.map(ind => (
                    <option key={ind} value={ind}>{ind}</option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="font-semibold">Or enter a new industry</span>
                <input type="text" value={industryInput} onChange={e => setIndustryInput(e.target.value)} className="border rounded px-3 py-2" placeholder="e.g. Bakery, Cafe, etc." />
              </label>
              <button onClick={confirmAddToDashboard} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2 rounded-lg shadow transition-all duration-200">Add to Dashboard</button>
            </div>
          </div>
        </div>
      )}
      {error && <div className="text-red-500 mb-4">{error}</div>}
      {results.length > 0 && (
        <div className="space-y-4">
          <div className="text-gray-600 mb-2">
            Found {results.length} {results.length === 1 ? 'business' : 'businesses'}
          </div>
          <button
            className="mb-4 bg-blue-800 hover:bg-blue-900 text-white font-semibold px-5 py-2 rounded-lg shadow transition w-full"
            onClick={handleAddAll}
            disabled={addedAll || loading}
          >
            {addedAll ? "All Added!" : "Add All to Dashboard"}
          </button>
          {results.map((result, idx) => (
            <div key={result.name + idx} className="bg-white rounded-xl shadow-2xl p-8 w-full mb-2">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="mb-2"><span className="font-semibold">Name:</span> {result.name}</div>
                  <div className="mb-2"><span className="font-semibold">Phone:</span> {result.phone || <span className="text-gray-400">Not found</span>}</div>
                  <div className="mb-2"><span className="font-semibold">Address:</span> {result.address || <span className="text-gray-400">Not found</span>}</div>
                  {result.website && (
                    <div className="mb-2"><span className="font-semibold">Website:</span> <a href={result.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">{result.website}</a></div>
                  )}
                  {result.opening_hours && result.opening_hours.length > 0 && (
                    <div className="mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">Hours Today:</span>
                        <span className="text-gray-700">{getTodayHours(result.opening_hours)}</span>
                        <button
                          onClick={() => toggleHours(result.name)}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          {expandedHours[result.name] ? 'Show less' : 'Show all hours'}
                        </button>
                      </div>
                      {expandedHours[result.name] && (
                        <ul className="list-disc list-inside mt-2 text-sm">
                          {result.opening_hours.map((hours, i) => (
                            <li key={i} className="text-gray-700">{hours}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-2 ml-4">
                  {result.google_maps_url && (
                    <a
                      href={result.google_maps_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-green-600 hover:bg-green-700 text-white font-semibold px-4 py-2 rounded-lg shadow transition flex items-center gap-2"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M12 1.586l-4 4v12.828l4-4V1.586zM3.707 3.293A1 1 0 002 4v10a1 1 0 00.293.707L6 18.414V5.586L3.707 3.293zM17.707 5.293L14 1.586v12.828l2.293 2.293A1 1 0 0018 16V6a1 1 0 00-.293-.707z" clipRule="evenodd" />
                      </svg>
                      View on Maps
                    </a>
                  )}
                  <button
                    className="bg-blue-800 hover:bg-blue-900 text-white font-semibold px-4 py-2 rounded-lg shadow transition"
                    onClick={() => handleAddToDashboard(idx)}
                    disabled={addedIdx === idx || loading || addedAll}
                  >
                    {addedIdx === idx || addedAll ? "Added!" : "Add to Dashboard"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 