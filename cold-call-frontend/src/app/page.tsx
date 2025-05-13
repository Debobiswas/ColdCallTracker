"use client";
import React, { useEffect, useState } from "react";
import Papa from 'papaparse';

const API_URL = "http://localhost:8001/api/businesses";

type Business = {
  name: string;
  phone?: string;
  address?: string;
  status: string;
  comment?: string;
  region?: string;
  industry?: string;
  last_called_date?: string;
  last_callback_date?: string;
};

export default function Dashboard() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [modalIdx, setModalIdx] = useState<number | null>(null);
  const [form, setForm] = useState<Business>({ name: '', phone: '', address: '', status: 'tocall', comment: '', region: '', industry: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [showWeek, setShowWeek] = useState({ calls: false, callbacks: false });
  // State to track if comment box is focused
  const [commentFocused, setCommentFocused] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkCSV, setBulkCSV] = useState('');
  const [bulkError, setBulkError] = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);
  // State for client modal
  const [showClientModal, setShowClientModal] = useState(false);
  const [clientForm, setClientForm] = useState({ name: '', address: '', phone: '', website: '', price: '', subscription: '', date: '' });
  // Filter states
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    region: ''
  });
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [bulkMode, setBulkMode] = useState(false);
  const [originalBusinessName, setOriginalBusinessName] = useState<string | null>(null);
  // Add state for business details modal
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [businessHours, setBusinessHours] = useState<string[]>([]);
  const [expandedHours, setExpandedHours] = useState(false);
  // State to track expanded industries
  const [expandedIndustries, setExpandedIndustries] = useState<Record<string, Record<string, boolean>>>({});

  async function fetchBusinesses() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.status) {
        const cleanStatus = filters.status.toLowerCase().trim();
        params.append('status', cleanStatus);
      }
      
      if (filters.region) {
        const cleanRegion = filters.region.trim();
        params.append('region', cleanRegion);
      }
      
      const url = params.toString() 
        ? `${API_URL}/filter?${params.toString()}`
        : API_URL;
      
      console.log('Fetching from URL:', url); // Debug log
      console.log('Filter params:', JSON.stringify(filters)); // Debug log
      
      const res = await fetch(url);
      if (!res.ok) {
        const errorText = await res.text();
        console.error('API Error:', errorText);
        throw new Error(`API Error: ${errorText}`);
      }
      const data = await res.json();
      console.log('Received data:', data); // Debug log
      setBusinesses(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Fetch error:', e);
      setError("Failed to fetch businesses");
      setBusinesses([]);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchBusinesses();
  }, [filters.status, filters.region]);

  function openModal(idx: number | null) {
    setModalIdx(idx);
    if (idx === null) {
      setForm({ name: '', phone: '', address: '', status: 'tocall', comment: '', region: '', industry: '' });
    } else {
      setForm(businesses[idx]);
    }
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setModalIdx(null);
  }

  function handleFormChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      if (modalIdx === null) {
        // Add business
        const res = await fetch(API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        if (!res.ok) throw new Error("Failed to add business");
      } else {
        // Edit business
        const res = await fetch(`${API_URL}/${encodeURIComponent(businesses[modalIdx].name)}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        if (!res.ok) throw new Error("Failed to update business");
      }
      closeModal();
      fetchBusinesses();
    } catch (e) {
      setError("Failed to save business");
    }
  }

  async function handleDelete(idx: number) {
    if (!window.confirm("Delete this business?")) return;
    try {
      const res = await fetch(`${API_URL}/${encodeURIComponent(businesses[idx].name)}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete business");
      fetchBusinesses();
    } catch (e) {
      setError("Failed to delete business");
    }
  }

  const handleRowClick = async (business: Business) => {
    closeModal();
    setSelectedBusiness(business);
    setOriginalBusinessName(business.name);
    setShowDetailsModal(true);
    await fetchBusinessDetails(business.name);
  };

  function closeDetailsModal() {
    setShowDetailsModal(false);
    setSelectedBusiness(null);
    setOriginalBusinessName(null);
    closeModal();
  }

  function getStatusColor(status: string) {
    switch (status.toLowerCase()) {
      case 'called': return 'text-green-600 font-bold';
      case 'tocall': return 'text-blue-600 font-bold';
      case 'callback': return 'text-yellow-600 font-bold';
      case 'dont_call': return 'text-red-600 font-bold';
      default: return '';
    }
  }

  function handleDetailsFormChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    if (!selectedBusiness) return;
    const { name, value } = e.target;
    // If status is set to 'client', open client modal after updating selectedBusiness
    if (name === 'status' && value.replace(/\s/g, '').toLowerCase() === 'client') {
      const today = new Date();
      const todayStr = today.toISOString().slice(0, 10);
      setClientForm({
        name: selectedBusiness.name,
        address: selectedBusiness.address || '',
        phone: selectedBusiness.phone || '',
        website: '',
        price: '',
        subscription: '',
        date: todayStr,
      });
      setShowClientModal(true);
    }
    setSelectedBusiness({
      ...selectedBusiness,
      [name]: name === 'status' ? value.replace(/\s/g, '').toLowerCase() : value,
    });
  }

  async function handleDetailsFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedBusiness || !originalBusinessName) return;
    setError("");
    try {
      // Extract and prepare data for backend
      const commentToSave = selectedBusiness.comment || '';
      // Create a clean payload with the direct comment (no processing)
      const businessData = {
        ...selectedBusiness,
        comment: commentToSave // Directly use what the user typed
      };
      console.log('Saving business with comment:', commentToSave);
      // Use the original name in the URL
      const res = await fetch(`${API_URL}/${encodeURIComponent(originalBusinessName)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(businessData),
      });
      if (!res.ok) {
        const errText = await res.text();
        console.error('Backend error:', errText);
        setError(errText);
        return;
      }
      closeDetailsModal();
      fetchBusinesses();
    } catch (e) {
      setError("Failed to save business");
    }
  }

  // Helper to get start of week (Monday)
  function getStartOfWeek(date: Date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is Sunday
    return new Date(d.setDate(diff));
  }

  // Calculate counters for today and this week using new date fields
  function isToday(dateStr: string) {
    if (!dateStr) return false;
    const today = new Date();
    const d = new Date(dateStr);
    return d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate();
  }
  function isThisWeek(dateStr: string) {
    if (!dateStr) return false;
    const now = new Date();
    const d = new Date(dateStr);
    const start = getStartOfWeek(now);
    const end = new Date(start);
    end.setDate(start.getDate() + 7);
    return d >= start && d < end;
  }

  const callsToday = businesses.filter(b => isToday((b as any).LastCalledDate)).length;
  const callBacks = businesses.filter(b => isToday((b as any).LastCallbackDate)).length;
  const callsThisWeek = businesses.filter(b => isThisWeek((b as any).LastCalledDate)).length;
  const callBacksThisWeek = businesses.filter(b => isThisWeek((b as any).LastCallbackDate)).length;

  async function handleBulkSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBulkError('');
    setBulkLoading(true);
    try {
      const parsed = Papa.parse(bulkCSV.trim(), { header: true });
      if (!parsed.data || !Array.isArray(parsed.data) || parsed.data.length === 0) {
        setBulkError('No valid data found.');
        setBulkLoading(false);
        return;
      }
      // Clean and map fields
      const businesses = parsed.data.map((row: any) => ({
        name: row.Name || '',
        phone: row.Phone || '',
        address: row.Address || '',
        status: (row.Status || '').replace(/\s/g, '').toLowerCase(),
        comment: row.Comment || '',
        region: row.Region || '',
        industry: row.Industry || ''
      })).filter(b => b.name && b.status);
      if (businesses.length === 0) {
        setBulkError('No valid businesses found.');
        setBulkLoading(false);
        return;
      }
      const res = await fetch('http://localhost:8001/api/businesses/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businesses }),
      });
      if (!res.ok) {
        setBulkError(await res.text());
        setBulkLoading(false);
        return;
      }
      setShowBulkModal(false);
      setBulkCSV('');
      fetchBusinesses();
    } catch (err) {
      setBulkError('Failed to parse or upload CSV.');
    }
    setBulkLoading(false);
  }

  async function handleClientFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await fetch('http://localhost:8001/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(clientForm),
      });
      setShowClientModal(false);
    } catch (err) {
      // Optionally handle error
      setShowClientModal(false);
    }
  }

  function handleFilterChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    console.log('Filter changed:', name, value); // Debug log
    // Clean the status value when it's changed
    if (name === 'status') {
      setFilters({ ...filters, [name]: value.toLowerCase().trim() });
    } else {
      setFilters({ ...filters, [name]: value });
    }
  }

  function clearFilters() {
    console.log('Clearing filters'); // Debug log
    setFilters({ status: '', region: '' });
    fetchBusinesses();
  }

  function handleSelectRow(idx: number) {
    setSelectedRows(prev => prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]);
  }

  function handleSelectAllRows() {
    if (selectedRows.length === businesses.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(businesses.map((_, idx) => idx));
    }
  }

  async function handleDeleteSelected() {
    if (!window.confirm('Delete all selected businesses?')) return;
    for (const idx of selectedRows) {
      try {
        await fetch(`${API_URL}/${encodeURIComponent(businesses[idx].name)}`, { method: "DELETE" });
      } catch {}
    }
    setSelectedRows([]);
    fetchBusinesses();
  }

  // Function to get today's hours
  const getTodayHours = (hours: string[]) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const today = days[new Date().getDay()];
    return hours.find(h => h.startsWith(today)) || 'Closed today';
  };

  // Function to fetch business details
  const fetchBusinessDetails = async (businessName: string) => {
    try {
      const res = await fetch(`http://localhost:8001/api/businesses/search?query=${encodeURIComponent(businessName)}&limit=1`);
      if (!res.ok) throw new Error('Failed to fetch business details');
      const data = await res.json();
      if (data && data.length > 0) {
        setBusinessHours(data[0].opening_hours || []);
      }
    } catch (err) {
      console.error('Error fetching business details:', err);
    }
  };

  // Filtered businesses - no need to filter on client side anymore
  const displayedBusinesses = businesses;

  // Extract city from address
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

  // Get region from business, falling back to extracted city from address if region is not set
  const getBusinessRegion = (business: Business): string => {
    if (business.region) {
      return business.region;
    }
    return extractCity(business.address);
  };

  // Get industry from business, defaulting to "Other" if not set
  const getBusinessIndustry = (business: Business): string => {
    return business.industry || "Other";
  };

  // Group businesses by region
  const groupedBusinesses = displayedBusinesses.reduce((groups, business) => {
    const region = getBusinessRegion(business);
    if (!groups[region]) {
      groups[region] = [];
    }
    groups[region].push(business);
    return groups;
  }, {} as Record<string, Business[]>);

  // Group businesses by industry within each region
  const groupedByIndustry = Object.entries(groupedBusinesses).reduce(
    (regions, [region, businesses]) => {
      regions[region] = businesses.reduce((industries, business) => {
        const industry = getBusinessIndustry(business);
        if (!industries[industry]) {
          industries[industry] = [];
        }
        industries[industry].push(business);
        return industries;
      }, {} as Record<string, Business[]>);
      return regions;
    },
    {} as Record<string, Record<string, Business[]>>
  );

  // Sort regions alphabetically
  const sortedRegions = Object.keys(groupedBusinesses).sort();

  // Get all available regions from the full business list
  const availableRegions = [...new Set(businesses.map(b => getBusinessRegion(b)))].sort();

  // Toggle industry expansion
  const toggleIndustry = (region: string, industry: string) => {
    setExpandedIndustries(prev => {
      const regionExpanded = prev[region] || {};
      return {
        ...prev,
        [region]: {
          ...regionExpanded,
          [industry]: !regionExpanded[industry]
        }
      };
    });
  };

  return (
    <div className="w-full mx-auto px-4">
      {/* Counters - two boxes, each half the table width */}
      <div className="flex mb-10 w-full gap-x-4">
        <button
          className="flex-1 bg-white text-green-800 rounded-2xl px-6 py-6 shadow-xl font-bold text-lg text-center border-r border-gray-200 transition-all duration-150 hover:shadow-2xl focus:outline-none"
          onClick={() => setShowWeek(s => ({ ...s, calls: !s.calls }))}
        >
          <div className="mb-1 uppercase text-xs tracking-wider text-gray-400">{showWeek.calls ? 'This Week' : 'Today'}</div>
          Calls {showWeek.calls ? 'This Week' : 'Today'}: {showWeek.calls ? callsThisWeek : callsToday}
        </button>
        <button
          className="flex-1 bg-white text-yellow-800 rounded-2xl px-6 py-6 shadow-xl font-bold text-lg text-center transition-all duration-150 hover:shadow-2xl focus:outline-none"
          onClick={() => setShowWeek(s => ({ ...s, callbacks: !s.callbacks }))}
        >
          <div className="mb-1 uppercase text-xs tracking-wider text-gray-400">{showWeek.callbacks ? 'This Week' : 'Today'}</div>
          Call Backs {showWeek.callbacks ? 'This Week' : 'Today'}: {showWeek.callbacks ? callBacksThisWeek : callBacks}
        </button>
      </div>
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-3xl font-bold">Businesses</h2>
        <div className="flex gap-2">
          <button
            className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold px-5 py-2 rounded-lg shadow transition"
            onClick={() => setShowFilterModal(true)}
          >
            Filter
          </button>
          <button
            className="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-5 py-2 rounded-lg shadow transition"
            onClick={() => { setBulkMode(false); openModal(null); }}
          >
            + New Business
          </button>
          <button
            className="bg-red-500 hover:bg-red-600 text-white font-semibold px-5 py-2 rounded-lg shadow transition disabled:opacity-50"
            onClick={handleDeleteSelected}
            disabled={selectedRows.length === 0}
          >
            Delete Selected
          </button>
        </div>
      </div>
      {error && <div className="text-red-500 mb-4 whitespace-pre-line">{error}</div>}
      <div className="space-y-8">
        {loading ? (
          <div className="bg-white rounded-xl shadow-2xl p-6">Loading...</div>
        ) : (
          sortedRegions.map(region => (
            <div key={region} className="bg-white rounded-xl shadow-2xl p-6 overflow-x-auto w-full">
              <h3 className="text-xl font-bold mb-4 text-gray-700 border-b pb-2">{region} ({groupedBusinesses[region].length})</h3>
              
              {/* Industries within this region */}
              <div className="space-y-4">
                {Object.entries(groupedByIndustry[region] || {}).sort(([a], [b]) => a.localeCompare(b)).map(([industry, businesses]) => (
                  <div key={industry} className="border rounded-lg overflow-hidden">
                    <button 
                      className="w-full flex justify-between items-center p-3 bg-gray-50 hover:bg-gray-100 text-left font-medium"
                      onClick={() => toggleIndustry(region, industry)}
                    >
                      <span>{industry} ({businesses.length})</span>
                      <span className="text-gray-500">
                        {expandedIndustries[region]?.[industry] ? '▼' : '▶'}
                      </span>
                    </button>
                    
                    {expandedIndustries[region]?.[industry] && (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left">
                          <thead>
                            <tr className="text-gray-500 text-sm">
                              <th className="py-2 px-2">
                                <input 
                                  type="checkbox" 
                                  checked={businesses.every(b => 
                                    selectedRows.includes(displayedBusinesses.findIndex(db => db.name === b.name))
                                  )} 
                                  onChange={() => {
                                    // Toggle all in this industry group
                                    const allIndices = businesses.map(b => 
                                      displayedBusinesses.findIndex(db => db.name === b.name)
                                    );
                                    const allSelected = allIndices.every(idx => selectedRows.includes(idx));
                                    
                                    if (allSelected) {
                                      // Deselect all in this industry
                                      setSelectedRows(prev => prev.filter(idx => !allIndices.includes(idx)));
                                    } else {
                                      // Select all in this industry
                                      setSelectedRows(prev => [...prev, ...allIndices.filter(idx => !prev.includes(idx))]);
                                    }
                                  }}
                                />
                              </th>
                              <th className="py-2 px-4 font-semibold">Name</th>
                              <th className="py-2 px-4 font-semibold">Phone</th>
                              <th className="py-2 px-4 font-semibold">Address</th>
                              <th className="py-2 px-4 font-semibold">Status</th>
                              <th className="py-2 px-4 font-semibold">Comment</th>
                            </tr>
                          </thead>
                          <tbody>
                            {businesses.map((b) => {
                              const idx = displayedBusinesses.findIndex(db => db.name === b.name);
                              return (
                                <tr key={b.name} className="border-t border-gray-200 hover:bg-gray-50 cursor-pointer" onClick={() => handleRowClick(b)}>
                                  <td className="py-2 px-2" onClick={(e) => { e.stopPropagation(); handleSelectRow(idx); }}>
                                    <input type="checkbox" checked={selectedRows.includes(idx)} readOnly />
                                  </td>
                                  <td className="py-2 px-4 font-medium text-blue-700 hover:underline">{b.name}</td>
                                  <td className="py-2 px-4">{b.phone || '-'}</td>
                                  <td className="py-2 px-4">{b.address || '-'}</td>
                                  <td className={`py-2 px-4 ${getStatusColor(b.status)}`}>{b.status}</td>
                                  <td className="py-2 px-4 max-w-xs truncate">{b.comment || '-'}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
      {/* Modal for Add/Edit Business */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={closeModal}>
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-lg relative" onClick={e => e.stopPropagation()}>
            <button onClick={closeModal} className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-2xl">&times;</button>
            <h3 className="text-xl font-bold mb-4">{modalIdx === null ? (bulkMode ? 'Bulk Add Businesses' : 'Add Business') : 'Edit Business'}</h3>
            {modalIdx === null && (
              <div className="flex gap-2 mb-4">
                <button
                  className={`flex-1 px-4 py-2 rounded ${!bulkMode ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'} font-semibold`}
                  onClick={() => setBulkMode(false)}
                  type="button"
                >
                  Single
                </button>
                <button
                  className={`flex-1 px-4 py-2 rounded ${bulkMode ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'} font-semibold`}
                  onClick={() => setBulkMode(true)}
                  type="button"
                >
                  Bulk
                </button>
              </div>
            )}
            {bulkMode && modalIdx === null ? (
              <form onSubmit={handleBulkSubmit} className="flex flex-col gap-4">
                <div className="mb-2 text-sm text-gray-500">Paste your CSV data below. Sample format:</div>
                <pre className="bg-gray-100 rounded p-2 text-xs mb-4 w-full whitespace-pre-wrap">{`Name,Phone,Address,Status,Comment,Region,Industry\nBusiness A,123-456-7890,123 Main St,called,Spoke with manager,Kingston,Restaurant`}</pre>
                <textarea
                  className="border rounded px-3 py-2 h-32 resize-none"
                  value={bulkCSV}
                  onChange={e => setBulkCSV(e.target.value)}
                  placeholder="Paste CSV here..."
                  required
                />
                {bulkError && <div className="text-red-500 text-sm">{bulkError}</div>}
                <div className="flex gap-4 mt-2">
                  <button type="submit" disabled={bulkLoading} className="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-5 py-2 rounded-lg shadow transition">{bulkLoading ? 'Uploading...' : 'Upload'}</button>
                  <button type="button" onClick={closeModal} className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold px-5 py-2 rounded-lg shadow transition">Cancel</button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleFormSubmit} className="flex flex-col gap-4">
                <input type="text" name="name" placeholder="Name" className="border rounded px-3 py-2" value={form.name} onChange={handleFormChange} required />
                <input type="text" name="phone" placeholder="Phone" className="border rounded px-3 py-2" value={form.phone} onChange={handleFormChange} />
                <input type="text" name="address" placeholder="Address" className="border rounded px-3 py-2" value={form.address} onChange={handleFormChange} />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Region (used for grouping)</label>
                  <input type="text" name="region" placeholder="Region" className="border rounded px-3 py-2 w-full" value={form.region} onChange={handleFormChange} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Industry</label>
                  <input type="text" name="industry" placeholder="Industry" className="border rounded px-3 py-2 w-full" value={form.industry} onChange={handleFormChange} />
                </div>
                <select name="status" className="border rounded px-3 py-2" value={form.status} onChange={handleFormChange} required>
                  {['tocall', 'called', 'callback', 'dont_call'].map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
                <input type="text" name="comment" placeholder="Comment" className="border rounded px-3 py-2" value={form.comment} onChange={handleFormChange} />
                <div className="flex gap-4 mt-2">
                  <button type="submit" className="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-5 py-2 rounded-lg shadow transition">Save</button>
                  <button type="button" onClick={closeModal} className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold px-5 py-2 rounded-lg shadow transition">Cancel</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
      {selectedBusiness && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={closeDetailsModal}>
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md relative" onClick={e => e.stopPropagation()}>
            <button onClick={closeDetailsModal} className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-2xl">&times;</button>
            <h3 className="text-xl font-bold mb-4">Edit Business</h3>
            <form onSubmit={handleDetailsFormSubmit} className="flex flex-col gap-4">
              <input type="text" name="name" placeholder="Name" className="border rounded px-3 py-2" value={selectedBusiness.name || ''} onChange={handleDetailsFormChange} required />
              <input type="text" name="phone" placeholder="Phone" className="border rounded px-3 py-2" value={selectedBusiness.phone || ''} onChange={handleDetailsFormChange} />
              <input type="text" name="address" placeholder="Address" className="border rounded px-3 py-2" value={selectedBusiness.address || ''} onChange={handleDetailsFormChange} />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Region (used for grouping)</label>
                <input type="text" name="region" placeholder="Region" className="border rounded px-3 py-2 w-full" value={selectedBusiness.region || ''} onChange={handleDetailsFormChange} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Industry</label>
                <input type="text" name="industry" placeholder="Industry" className="border rounded px-3 py-2 w-full" value={selectedBusiness.industry || ''} onChange={handleDetailsFormChange} />
              </div>
              <select name="status" className="border rounded px-3 py-2" value={selectedBusiness.status || ''} onChange={handleDetailsFormChange} required>
                {['tocall', 'called', 'callback', 'dont_call', 'client'].map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
              <textarea
                name="comment"
                placeholder="Comment"
                className={`border rounded px-3 py-2 transition-all duration-150 ${commentFocused ? 'h-32' : 'h-10'} resize-none`}
                value={selectedBusiness.comment || ''}
                onChange={handleDetailsFormChange}
                onFocus={() => setCommentFocused(true)}
                onBlur={() => setCommentFocused(false)}
                style={{ minHeight: '2.5rem', maxHeight: '12rem' }}
              />
              <div className="flex gap-4 mt-2">
                <button type="submit" className="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-5 py-2 rounded-lg shadow transition">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {showClientModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowClientModal(false)}>
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-lg relative" onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowClientModal(false)} className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-2xl">&times;</button>
            <h3 className="text-xl font-bold mb-4">Add Client Info</h3>
            <form onSubmit={handleClientFormSubmit} className="flex flex-col gap-4">
              <input type="text" name="name" placeholder="Name" className="border rounded px-3 py-2" value={clientForm.name} disabled />
              <input type="text" name="address" placeholder="Address" className="border rounded px-3 py-2" value={clientForm.address} disabled />
              <input type="text" name="phone" placeholder="Phone" className="border rounded px-3 py-2" value={clientForm.phone} disabled />
              <input type="text" name="website" placeholder="Website" className="border rounded px-3 py-2" value={clientForm.website} onChange={e => setClientForm(f => ({ ...f, website: e.target.value }))} />
              <input type="number" name="price" placeholder="Price" className="border rounded px-3 py-2" value={clientForm.price} onChange={e => setClientForm(f => ({ ...f, price: e.target.value }))} required />
              <input type="number" name="subscription" placeholder="Subscription Fee" className="border rounded px-3 py-2" value={clientForm.subscription} onChange={e => setClientForm(f => ({ ...f, subscription: e.target.value }))} required />
              <input type="date" name="date" placeholder="Date Acquired" className="border rounded px-3 py-2" value={clientForm.date} onChange={e => setClientForm(f => ({ ...f, date: e.target.value }))} required />
              <div className="flex gap-4 mt-2">
                <button type="submit" className="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-5 py-2 rounded-lg shadow transition">Save</button>
                <button type="button" onClick={() => setShowClientModal(false)} className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold px-5 py-2 rounded-lg shadow transition">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Filter Modal */}
      {showFilterModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowFilterModal(false)}>
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md relative" onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowFilterModal(false)} className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-2xl">&times;</button>
            <h3 className="text-xl font-bold mb-4">Filter Businesses</h3>
            <form onSubmit={(e) => { 
              e.preventDefault(); 
              console.log('Applying filters:', JSON.stringify(filters));
              fetchBusinesses(); 
              setShowFilterModal(false); 
            }} className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  name="status"
                  className="border rounded px-3 py-2 w-full"
                  value={filters.status}
                  onChange={handleFilterChange}
                >
                  <option value="">All Statuses</option>
                  {['tocall', 'called', 'callback', 'dont_call', 'client'].map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
              
              {availableRegions.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Region</label>
                  <select
                    name="region"
                    className="border rounded px-3 py-2 w-full"
                    value={filters.region}
                    onChange={handleFilterChange}
                  >
                    <option value="">All Regions</option>
                    {availableRegions.map(region => (
                      <option key={region} value={region}>{region}</option>
                    ))}
                  </select>
                </div>
              )}
              
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    console.log('Clearing filters');
                    setFilters({ status: '', region: '' });
                    setTimeout(() => fetchBusinesses(), 0);
                  }}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold px-4 py-2 rounded"
                >
                  Clear Filter
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-semibold px-4 py-2 rounded"
                >
                  Apply Filter
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Business Details Modal */}
      {showDetailsModal && selectedBusiness && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-2xl relative">
            <button 
              onClick={() => setShowDetailsModal(false)} 
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl"
            >
              ×
            </button>
            <h3 className="text-2xl font-bold mb-6">{selectedBusiness.name}</h3>
            <div className="space-y-4">
              <div>
                <span className="font-semibold">Phone:</span>{' '}
                {selectedBusiness.phone || <span className="text-gray-400">Not available</span>}
              </div>
              <div>
                <span className="font-semibold">Address:</span>{' '}
                {selectedBusiness.address || <span className="text-gray-400">Not available</span>}
              </div>
              <div>
                <span className="font-semibold">Region (Grouping):</span>{' '}
                {selectedBusiness.region || extractCity(selectedBusiness.address) || <span className="text-gray-400">Not available</span>}
              </div>
              <div>
                <span className="font-semibold">Industry:</span>{' '}
                {selectedBusiness.industry || <span className="text-gray-400">Not specified</span>}
              </div>
              <div>
                <span className="font-semibold">Status:</span>{' '}
                <span className={`capitalize ${getStatusColor(selectedBusiness.status)}`}>
                  {selectedBusiness.status}
                </span>
              </div>
              {selectedBusiness.comment && (
                <div>
                  <span className="font-semibold">Comment:</span>{' '}
                  {selectedBusiness.comment}
                </div>
              )}
              {businessHours.length > 0 && (
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">Hours Today:</span>
                    <span className="text-gray-700">{getTodayHours(businessHours)}</span>
                    <button
                      onClick={() => setExpandedHours(!expandedHours)}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      {expandedHours ? 'Show less' : 'Show all hours'}
                    </button>
                  </div>
                  {expandedHours && (
                    <ul className="list-disc list-inside mt-2 text-sm">
                      {businessHours.map((hours, i) => (
                        <li key={i} className="text-gray-700">{hours}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
              <div className="flex justify-end gap-4 mt-6">
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold px-4 py-2 rounded-lg shadow transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
