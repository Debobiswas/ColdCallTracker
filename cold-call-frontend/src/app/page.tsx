"use client";
import React, { useEffect, useState } from "react";
import Papa from 'papaparse';

const API_URL = "http://localhost:8001/api/businesses";

type Business = {
  name: string;
  phone?: string;
  address?: string;
  status: string;
  comments?: string;
  hours?: string;
};

export default function Dashboard() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [modalIdx, setModalIdx] = useState<number | null>(null);
  const [form, setForm] = useState<Business>({ name: '', phone: '', address: '', status: 'tocall', comments: '', hours: '' });
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
  // State for expanded/collapsed cities
  const [expandedCities, setExpandedCities] = useState<{ [city: string]: boolean }>({});
  // Add state for hours modal
  const [showHoursModal, setShowHoursModal] = useState(false);
  const [hoursModalContent, setHoursModalContent] = useState<string>('');

  async function fetchBusinesses() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.status) {
        const cleanStatus = filters.status.toLowerCase().trim();
        params.append('status', cleanStatus);
      }
      if (filters.region) {
        params.append('region', filters.region);
      }
      
      const url = params.toString() 
        ? `${API_URL}/filter?${params.toString()}`
        : API_URL;
      
      console.log('Fetching from URL:', url); // Debug log
      
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
      setForm({ name: '', phone: '', address: '', status: 'tocall', comments: '', hours: '' });
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

  const handleRowClick = (business: Business) => {
    closeModal();
    setSelectedBusiness(business);
    setOriginalBusinessName(business.name);
    setShowDetailsModal(true);
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
      const res = await fetch(`${API_URL}/${encodeURIComponent(originalBusinessName)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(selectedBusiness),
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
        comments: row.Comment || '',
        hours: row.Hours || '',
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

  // Helper to extract today's hours from the hours string
  function getTodayHoursString(hours?: string): string {
    if (!hours) return 'Not available';
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const today = days[new Date().getDay()];
    const regex = new RegExp(`${today}:\\s*([^|]*)`, 'i');
    const match = hours.match(regex);
    if (match && match[1]) {
      return match[1].trim();
    }
    return 'Not available';
  }

  // Function to fetch business details
  const fetchBusinessDetails = async (businessName: string) => {
    try {
      const res = await fetch(`http://localhost:8001/api/businesses/search?query=${encodeURIComponent(businessName)}&limit=1`);
      if (!res.ok) throw new Error('Failed to fetch business details');
      const data = await res.json();
      if (data && data.length > 0) {
        const hours = data[0].opening_hours || [];
        setForm(prev => ({ ...prev, hours }));
      }
    } catch (err) {
      console.error('Error fetching business details:', err);
    }
  };

  // Helper to check if a business is open now
  const isBusinessOpenNow = (hours: string[]): boolean => {
    if (!hours || hours.length === 0) return false;
    
    console.log("Checking hours:", hours);
    
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const now = new Date();
    const today = days[now.getDay()];
    const todayHours = hours.find(h => h.startsWith(today));
    
    if (!todayHours) {
      console.log(`No hours found for ${today}`);
      return false;
    }
    
    console.log("Today's hours:", todayHours);
    
    // Example: "Monday: 9:00 AM – 5:00 PM"
    const match = todayHours.match(/: (.+)$/);
    if (!match) {
      console.log("Could not parse hours format");
      return false;
    }
    
    const hoursString = match[1];
    console.log("Hours string:", hoursString);
    
    // Check for "Closed" status
    if (hoursString.trim().toLowerCase() === 'closed') {
      console.log("Business is closed today");
      return false;
    }
    
    const periods = hoursString.split(',');
    for (const period of periods) {
      if (period.trim().toLowerCase() === 'closed') continue;
      
      // Look for time range with dash/hyphen/en dash
      const timeParts = period.split(/[–—-]/).map(s => s.trim());
      if (timeParts.length !== 2) {
        console.log("Could not parse time range:", period);
        continue;
      }
      
      const [open, close] = timeParts;
      if (!open || !close) continue;
      
      // Convert to 24h time
      const parseTime = (t: string) => {
        try {
          const d = new Date(now);
          const [time, ampm] = t.split(' ');
          let [h, m] = (time || '').split(':').map(Number);
          
          if (isNaN(h)) {
            console.log("Invalid hour:", time);
            return null;
          }
          
          if (ampm && ampm.toLowerCase() === 'pm' && h !== 12) h += 12;
          if (ampm && ampm.toLowerCase() === 'am' && h === 12) h = 0;
          
          d.setHours(h, m || 0, 0, 0);
          return d;
        } catch (err) {
          console.log("Error parsing time:", t, err);
          return null;
        }
      };
      
      const openTime = parseTime(open);
      const closeTime = parseTime(close);
      
      if (!openTime || !closeTime) {
        console.log("Failed to parse open or close time");
        continue;
      }
      
      console.log(`Time now: ${now.toLocaleTimeString()}, Open: ${openTime.toLocaleTimeString()}, Close: ${closeTime.toLocaleTimeString()}`);
      
      if (now >= openTime && now <= closeTime) {
        console.log("Business is currently open");
        return true;
      }
    }
    
    console.log("Business is currently closed");
    return false;
  };

  // Filtered businesses
  const displayedBusinesses = businesses;

  // Utility to extract city from address (assumes format: 'street, city, ...')
  function extractCity(address?: string): string {
    if (!address) return 'Unknown';
    const parts = address.split(',').map(s => s.trim());
    if (parts.length < 2) return 'Unknown';
    // Assume city is the second part
    return parts[1] || 'Unknown';
  }

  // Group businesses by city
  const businessesByCity: { [city: string]: Business[] } = {};
  displayedBusinesses.forEach(b => {
    const city = extractCity(b.address);
    if (!businessesByCity[city]) businessesByCity[city] = [];
    businessesByCity[city].push(b);
  });
  const cityNames = Object.keys(businessesByCity).sort();

  // Update the region filter options to use available cities
  const regionOptions = ['', ...cityNames];

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
        <h2 className="text-3xl font-bold">Businesses <span className="text-gray-500 font-normal">({businesses.length})</span></h2>
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
      <div className="bg-white rounded-xl shadow-2xl p-6 overflow-x-auto w-full">
        {loading ? (
          <div>Loading...</div>
        ) : (
          <div>
            {cityNames.length === 0 && <div>No businesses found.</div>}
            {cityNames.map(city => (
              <div key={city} className="mb-6 border rounded-lg shadow">
                <button
                  className="w-full text-left px-4 py-3 bg-gray-100 font-bold text-lg flex justify-between items-center rounded-t-lg focus:outline-none"
                  onClick={() => setExpandedCities(prev => ({ ...prev, [city]: !prev[city] }))}
                >
                  <span>{city} <span className="text-gray-500 font-normal">({businessesByCity[city].length})</span></span>
                  <span>{expandedCities[city] ? '▲' : '▼'}</span>
                </button>
                {expandedCities[city] && (
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-gray-500 text-sm">
                        <th className="py-2 px-2">
                          {/* No select all per city for now */}
                        </th>
                        <th className="py-2 px-4 font-semibold">Name</th>
                        <th className="py-2 px-4 font-semibold">Phone</th>
                        <th className="py-2 px-4 font-semibold">Address</th>
                        <th className="py-2 px-4 font-semibold">Hours</th>
                        <th className="py-2 px-4 font-semibold">Status</th>
                        <th className="py-2 px-4 font-semibold">Comment</th>
                      </tr>
                    </thead>
                    <tbody>
                      {businessesByCity[city].map((b, idx) => {
                        // Find the global index for selection and modal
                        const globalIdx = businesses.findIndex(biz => biz.name === b.name);
                        return (
                          <tr key={b.name + idx} className="border-t border-gray-200 hover:bg-gray-50 cursor-pointer" onClick={() => openModal(globalIdx)}>
                            <td className="py-2 px-2" onClick={e => e.stopPropagation()}>
                              <input type="checkbox" checked={selectedRows.includes(globalIdx)} onChange={() => handleSelectRow(globalIdx)} />
                            </td>
                            <td className="py-2 px-4 font-medium text-blue-700 hover:underline cursor-pointer" onClick={e => { e.stopPropagation(); handleRowClick(b); }}>
                              {b.name}
                            </td>
                            <td className="py-2 px-4">{b.phone || ''}</td>
                            <td className="py-2 px-4">{b.address || ''}</td>
                            <td className="py-2 px-4 text-gray-500 cursor-pointer" onClick={e => { e.stopPropagation(); setHoursModalContent(b.hours || 'Not available'); setShowHoursModal(true); }}>
                              {b.hours ? getTodayHoursString(b.hours) : 'Not available'}
                            </td>
                            <td className={`py-2 px-4 capitalize ${getStatusColor(b.status)}`}>{b.status}</td>
                            <td className="py-2 px-4">{(b.comments && b.comments.length > 25) ? b.comments.slice(0, 25) + '…' : (b.comments || '')}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            ))}
          </div>
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
                <pre className="bg-gray-100 rounded p-2 text-xs mb-4 w-full whitespace-pre-wrap">{`Name,Phone,Address,Status,Comment,Hours\nBusiness A,123-456-7890,123 Main St,called,Spoke with manager,Monday: 9:00 AM – 5:00 PM`}</pre>
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
                <input type="text" name="hours" placeholder="Hours" className="border rounded px-3 py-2 bg-gray-100" value={form.hours} readOnly />
                <select name="status" className="border rounded px-3 py-2" value={form.status} onChange={handleFormChange} required>
                  {['tocall', 'called', 'callback', 'dont_call'].map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
                <input type="text" name="comments" placeholder="Comment" className="border rounded px-3 py-2" value={form.comments} onChange={handleFormChange} />
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
              <input type="text" name="hours" placeholder="Hours" className="border rounded px-3 py-2 bg-gray-100" value={selectedBusiness.hours || ''} readOnly />
              <select name="status" className="border rounded px-3 py-2" value={selectedBusiness.status || ''} onChange={handleDetailsFormChange} required>
                {['tocall', 'called', 'callback', 'dont_call', 'client'].map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
              <textarea
                name="comments"
                placeholder="Comment"
                className={`border rounded px-3 py-2 transition-all duration-150 ${commentFocused ? 'h-32' : 'h-10'} resize-none`}
                value={selectedBusiness.comments || ''}
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
            <h3 className="text-xl font-bold mb-4">Filter by Status and Region</h3>
            <form onSubmit={(e) => { e.preventDefault(); fetchBusinesses(); setShowFilterModal(false); }} className="flex flex-col gap-4">
              <select
                name="status"
                className="border rounded px-3 py-2"
                value={filters.status}
                onChange={handleFilterChange}
              >
                <option value="">All Statuses</option>
                {['tocall', 'called', 'callback', 'dont_call', 'client'].map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
              <select
                name="region"
                className="border rounded px-3 py-2"
                value={filters.region}
                onChange={handleFilterChange}
              >
                {regionOptions.map(opt => (
                  <option key={opt} value={opt}>{opt || 'All Regions'}</option>
                ))}
              </select>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={clearFilters}
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
                <span className="font-semibold">Status:</span>{' '}
                <span className={`capitalize ${getStatusColor(selectedBusiness.status)}`}>
                  {selectedBusiness.status}
                </span>
              </div>
              {selectedBusiness.comments && (
                <div>
                  <span className="font-semibold">Comment:</span>{' '}
                  {selectedBusiness.comments}
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
      {showHoursModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowHoursModal(false)}>
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md relative" onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowHoursModal(false)} className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-2xl">&times;</button>
            <h3 className="text-xl font-bold mb-4">Business Hours</h3>
            <div className="whitespace-pre-line text-gray-700">{hoursModalContent.split('|').map((line, idx) => <div key={idx}>{line.trim()}</div>)}</div>
            <div className="flex justify-end mt-4">
              <button onClick={() => setShowHoursModal(false)} className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold px-4 py-2 rounded-lg shadow transition">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
