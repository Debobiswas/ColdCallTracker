"use client";
import React, { useEffect, useState, useRef } from "react";
import Papa from 'papaparse';
import { FaChevronDown, FaChevronUp } from 'react-icons/fa';

const API_URL = "http://localhost:8001/api/businesses";

type Business = {
  name: string;
  phone?: string;
  address?: string;
  status: string;
  comments?: string;
  hours?: string;
  industry?: string;
  callback_priority?: string;
  callback_due_date?: string;
  callback_due_time?: string;
  callback_reason?: string;
  interest_level?: string;
  best_time_to_call?: string;
  decision_maker?: string;
  next_action?: string;
  lead_score?: number;
};

export default function Dashboard() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [callbackSummary, setCallbackSummary] = useState({ dueToday: 0, overdue: 0, highPriority: 0 });
  const [manualCallsToday, setManualCallsToday] = useState(0);
  const [lastResetDate, setLastResetDate] = useState<string>('');
  const [showModal, setShowModal] = useState(false);
  const [modalIdx, setModalIdx] = useState<number | null>(null);
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [form, setForm] = useState({ name: '', phone: '', address: '', status: 'tocall', comments: '', hours: '', industry: 'Restaurant' });
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkCSV, setBulkCSV] = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkError, setBulkError] = useState('');
  const [detailsModal, setDetailsModal] = useState(false);
  const [detailsForm, setDetailsForm] = useState({ name: '', phone: '', address: '', status: 'tocall', comments: '', hours: '', industry: 'Restaurant' });
  const [filter, setFilter] = useState({ status: '', region: '', industry: '' });
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [expandedCities, setExpandedCities] = useState<{ [key: string]: boolean }>({});
  const [collapsedIndustries, setCollapsedIndustries] = useState<{ [key: string]: boolean }>({});
  const [expandedComments, setExpandedComments] = useState<{ [key: string]: boolean }>({});
  const [autoDialling, setAutoDialling] = useState(false);
  const [autoDialProgress, setAutoDialProgress] = useState('');
  const [dialAttempts, setDialAttempts] = useState<{ [phone: string]: number }>({});
  const [autoDialMonitoringHandle, setAutoDialMonitoringHandle] = useState<NodeJS.Timeout | null>(null);
  const [currentlyDialingPhone, setCurrentlyDialingPhone] = useState<string | null>(null);
  const [bulkSelectedCity, setBulkSelectedCity] = useState('');
  const [showWeek, setShowWeek] = useState({ calls: false, callbacks: false });
  // State to track if comment box is focused
  const [commentFocused, setCommentFocused] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showClientModal, setShowClientModal] = useState(false);
  const [clientForm, setClientForm] = useState({ name: '', address: '', phone: '', website: '', price: '', subscription: '', date: '' });
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [originalBusinessName, setOriginalBusinessName] = useState<string | null>(null);
  // Add state for business details modal
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  // Add state for callback modal
  const [showCallbackModal, setShowCallbackModal] = useState(false);
  const [callbackForm, setCallbackForm] = useState({
    priority: 'Medium',
    due_date: '',
    due_time: '10:00',
    reason: '',
    interest_level: 'Unknown',
    best_time: '',
    decision_maker: '',
    next_action: '',
    lead_score: 5
  });
  // State for expanded/collapsed cities
  const [isAutoDialing, setIsAutoDialing] = useState(false);
  const [currentDialIndex, setCurrentDialIndex] = useState(-1);
  const [dialDelay, setDialDelay] = useState(30); // seconds
  const [showStartModal, setShowStartModal] = useState(false); // Modal for selecting start business
  const [selectedStartBusiness, setSelectedStartBusiness] = useState<string | null>(null); // Track which business to start from
  const [omittedBusinesses, setOmittedBusinesses] = useState<Set<string>>(new Set()); // Track businesses to exclude from auto-dial
  const [autoDialSessionId, setAutoDialSessionId] = useState<string | null>(null); // Track monitoring session
  const [callState, setCallState] = useState<string>('IDLE'); // Track current call state
  const [autoDialBusinessList, setAutoDialBusinessList] = useState<Business[]>([]); // Store the business list for consistent ordering
  const autoDialTimeout = useRef<NodeJS.Timeout | null>(null);
  const isAutoDialingRef = useRef(false); // Persistent ref that survives timeouts
  const eventSourceRef = useRef<EventSource | null>(null); // Track EventSource for call state
  // Add VAPI state variables
  const [showVAPIModal, setShowVAPIModal] = useState(false);
  const [vapiConfig, setVapiConfig] = useState({
    token: '',
    agentId: '',
    phoneNumberId: '',
    selectedBusinesses: [] as string[]
  });
  const [vapiLoading, setVapiLoading] = useState(false);
  const [vapiResult, setVapiResult] = useState<any>(null);
  const [showCredentials, setShowCredentials] = useState({
    token: false,
    agentId: false,
    phoneNumberId: false
  });

  // Add this useEffect for daily reset logic
  useEffect(() => {
    const today = new Date().toLocaleDateString();
    
    // Load saved values from localStorage
    const savedManualCalls = localStorage.getItem('manualCallsToday');
    const savedLastResetDate = localStorage.getItem('lastResetDate');
    
    if (savedLastResetDate !== today) {
      // Reset if it's a new day
      setManualCallsToday(0);
      setLastResetDate(today);
      localStorage.setItem('manualCallsToday', '0');
      localStorage.setItem('lastResetDate', today);
    } else {
      // Load saved values
      setManualCallsToday(parseInt(savedManualCalls || '0'));
      setLastResetDate(savedLastResetDate || today);
    }
  }, []);

  // Add this function to handle counter clicks
  const handleCallsCounterClick = () => {
    const newManualCalls = manualCallsToday + 1;
    setManualCallsToday(newManualCalls);
    localStorage.setItem('manualCallsToday', newManualCalls.toString());
  };

  // Add this function to handle decrement
  const handleCallsCounterDecrement = () => {
    const newManualCalls = Math.max(0, manualCallsToday - 1);
    setManualCallsToday(newManualCalls);
    localStorage.setItem('manualCallsToday', newManualCalls.toString());
  };

  async function fetchBusinesses() {
    console.log('🔄 fetchBusinesses called');
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter.status) {
        const cleanStatus = filter.status.toLowerCase().trim();
        params.append('status', cleanStatus);
      }
      if (filter.region) {
        params.append('region', filter.region);
      }
      if (filter.industry) {
        params.append('industry', filter.industry);
      }
      
      const url = params.toString() 
        ? `${API_URL}/filter?${params.toString()}`
        : API_URL;
      
      console.log('🌐 Attempting to fetch from URL:', url);
      
      try {
        const res = await fetch(url);
        if (!res.ok) {
          throw new Error(`API Error: ${await res.text()}`);
        }
        const data = await res.json();
        console.log('✅ Received data from API');
        setBusinesses(Array.isArray(data) ? data : []);
      } catch (apiError) {
        console.log('⚠️ API not available, using local storage or empty state');
        // Try to get data from localStorage
        const savedData = localStorage.getItem('businesses');
        if (savedData) {
          const parsedData = JSON.parse(savedData);
          setBusinesses(parsedData);
        } else {
          // If no saved data, set empty array
          setBusinesses([]);
        }
      }
    } catch (e) {
      console.error('❌ Error:', e);
      setError("Failed to load businesses");
      // Ensure we have at least an empty array
      setBusinesses([]);
    }
    setLoading(false);
  }

  // Add function to save businesses to localStorage whenever they change
  useEffect(() => {
    if (businesses.length > 0) {
      localStorage.setItem('businesses', JSON.stringify(businesses));
    }
  }, [businesses]);

  async function fetchCallbackSummary() {
    try {
      // Try to fetch from API first
      try {
        const [todayRes, overdueRes, highPriorityRes] = await Promise.all([
          fetch("http://localhost:8001/api/callbacks/due-today"),
          fetch("http://localhost:8001/api/callbacks/overdue"),
          fetch("http://localhost:8001/api/callbacks/priority/High")
        ]);

        if (todayRes.ok && overdueRes.ok && highPriorityRes.ok) {
          const [todayData, overdueData, highPriorityData] = await Promise.all([
            todayRes.json(),
            overdueRes.json(),
            highPriorityRes.json()
          ]);

          setCallbackSummary({
            dueToday: todayData.length,
            overdue: overdueData.length,
            highPriority: highPriorityData.length
          });
          return;
        }
      } catch (apiError) {
        console.log('⚠️ API not available for callback summary');
      }

      // If API fails, calculate from local businesses
      const today = new Date().toISOString().split('T')[0];
      
      const dueToday = businesses.filter(b => 
        b.callback_due_date === today
      ).length;

      const overdue = businesses.filter(b => {
        if (!b.callback_due_date) return false;
        return new Date(b.callback_due_date) < new Date(today);
      }).length;

      const highPriority = businesses.filter(b =>
        b.callback_priority === 'High'
      ).length;

      setCallbackSummary({
        dueToday,
        overdue,
        highPriority
      });

    } catch (e) {
      console.error('Error fetching callback summary:', e);
      setCallbackSummary({ dueToday: 0, overdue: 0, highPriority: 0 });
    }
  }

  useEffect(() => {
    fetchBusinesses();
    fetchCallbackSummary();
  }, [filter.status, filter.region, filter.industry]);

  function openModal(idx: number | null) {
    setModalIdx(idx);
    if (idx === null) {
      setForm({ name: '', phone: '', address: '', status: 'tocall', comments: '', hours: '', industry: 'Restaurant' });
    } else {
      setForm(businesses[idx]);
    }
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setModalIdx(null);
    setBulkSelectedCity(''); // Reset bulk city selection
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
      case 'lead': return 'text-purple-600 font-bold';
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
    // If status is set to 'callback', open callback modal
    if (name === 'status' && value.replace(/\s/g, '').toLowerCase() === 'callback') {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().slice(0, 10);
      setCallbackForm({
        priority: 'Medium',
        due_date: tomorrowStr,
        due_time: '10:00',
        reason: 'Follow-up required',
        interest_level: 'Unknown',
        best_time: '',
        decision_maker: '',
        next_action: '',
        lead_score: 5
      });
      setShowCallbackModal(true);
    }
    setSelectedBusiness({
      ...selectedBusiness,
      [name]: name === 'status' ? value.replace(/\s/g, '').toLowerCase() : value,
    });
  }

  async function handleDetailsFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedBusiness || !originalBusinessName) return;
    
    // If status is callback but callback modal wasn't completed, ask for callback details
    if (selectedBusiness.status === 'callback' && !selectedBusiness.callback_due_date) {
      const shouldOpenCallbackModal = window.confirm(
        "You've selected 'callback' status. Would you like to add callback details (recommended)?\n\n" +
        "Click 'OK' to add callback details, or 'Cancel' to save without details."
      );
      
      if (shouldOpenCallbackModal) {
        // Set up callback form and open modal
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().slice(0, 10);
        setCallbackForm({
          priority: 'Medium',
          due_date: tomorrowStr,
          due_time: '10:00',
          reason: 'Follow-up required',
          interest_level: 'Unknown',
          best_time: '',
          decision_maker: '',
          next_action: '',
          lead_score: 5
        });
        setShowCallbackModal(true);
        return; // Don't proceed with save, let callback modal handle it
      }
      // If user chose to save without details, add minimal callback data
      selectedBusiness.callback_priority = 'Medium';
      selectedBusiness.callback_due_date = new Date(Date.now() + 24*60*60*1000).toISOString().slice(0, 10);
      selectedBusiness.callback_due_time = '10:00';
      selectedBusiness.callback_reason = 'Follow-up required';
    }
    
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
      // Refresh callback summary if it was a callback
      if (selectedBusiness.status === 'callback') {
        fetchCallbackSummary();
      }
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

  const callsToday = businesses.filter((b) => isToday(b.LastCalledDate)).length + manualCallsToday;
  const callBacks = businesses.filter((b) => isToday(b.LastCallbackDate)).length;
  const callsThisWeek = businesses.filter((b) => isThisWeek(b.LastCalledDate)).length + manualCallsToday;
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
      const businesses = parsed.data.map((row: any) => {
        let address = row.Address || '';
        
        // Use the selected city, but ignore if it's 'CUSTOM' (which means they're still typing)
        const selectedCity = bulkSelectedCity === 'CUSTOM' ? '' : bulkSelectedCity;
        
        // If a city is selected, OVERRIDE the address to put all businesses under that city
        if (selectedCity) {
          // Keep the street address but replace/add the city
          const addressParts = address.split(',').map(part => part.trim());
          if (addressParts.length > 1) {
            // Keep street address, replace city
            address = `${addressParts[0]}, ${selectedCity}`;
          } else if (address) {
            // Address exists but no comma, append city
            address = `${address}, ${selectedCity}`;
          } else {
            // No address, use just the city
            address = selectedCity;
          }
        }
        // If no city selected, keep original address (normal extraction behavior)
        
        return {
          name: row.Name || '',
          phone: row.Phone || '',
          address: address,
          status: (row.Status || '').replace(/\s/g, '').toLowerCase(),
          comments: row.Comment || '',
          hours: row.Hours || '',
          industry: row.Industry || 'Restaurant',
        };
      }).filter(b => b.name && b.status);
      
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
      setBulkSelectedCity(''); // Reset city selection
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

  function handleCallbackFormChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setCallbackForm(prev => ({
      ...prev,
      [name]: name === 'lead_score' ? parseInt(value) || 5 : value
    }));
  }

  function closeCallbackModal() {
    // If user cancels callback modal and status is callback, ask what to do
    if (selectedBusiness && selectedBusiness.status === 'callback' && !selectedBusiness.callback_due_date) {
      const shouldResetStatus = window.confirm(
        "You've cancelled the callback details. Would you like to:\n\n" +
        "OK = Keep status as 'callback' (you can add details later)\n" +
        "Cancel = Reset status to 'tocall'"
      );
      
      if (!shouldResetStatus && selectedBusiness) {
        setSelectedBusiness({
          ...selectedBusiness,
          status: 'tocall'
        });
      }
    }
    setShowCallbackModal(false);
  }

  async function handleCallbackFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedBusiness || !originalBusinessName) return;
    setError("");
    try {
      // Prepare the business update with callback details
      const updatedBusiness = {
        ...selectedBusiness,
        callback_priority: callbackForm.priority,
        callback_due_date: callbackForm.due_date,
        callback_due_time: callbackForm.due_time,
        callback_reason: callbackForm.reason,
        interest_level: callbackForm.interest_level,
        best_time_to_call: callbackForm.best_time,
        decision_maker: callbackForm.decision_maker,
        next_action: callbackForm.next_action,
        lead_score: callbackForm.lead_score
      };

      const res = await fetch(`${API_URL}/${encodeURIComponent(originalBusinessName)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedBusiness),
      });
      
      if (!res.ok) {
        const errText = await res.text();
        console.error('Backend error:', errText);
        setError(errText);
        return;
      }
      
      setShowCallbackModal(false);
      closeDetailsModal();
      fetchBusinesses();
      fetchCallbackSummary(); // Refresh callback summary
    } catch (e) {
      setError("Failed to save callback details");
    }
  }

  function handleFilterChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    console.log('Filter changed:', name, value); // Debug log
    // Clean the status value when it's changed
    if (name === 'status') {
      setFilter({ ...filter, [name]: value.toLowerCase().trim() });
    } else {
      setFilter({ ...filter, [name]: value });
    }
  }

  function clearFilters() {
    console.log('Clearing filters'); // Debug log
    setFilter({ status: '', region: '', industry: '' });
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

  async function handleClean() {
    if (!window.confirm('Are you sure you want to clean the current dashboard listings? This will:\n• Remove all displayed businesses without phone numbers\n• Format phone numbers to (XXX) XXX-XXXX format')) return;
    
    setLoading(true);
    setError("");
    
    try {
      let deletedCount = 0;
      let updatedCount = 0;
      
      // Helper function to format phone number to (XXX) XXX-XXXX
      const formatPhoneNumber = (phone: string): string => {
        // Remove all non-digit characters
        let digits = phone.replace(/\D/g, '');
        
        // Remove leading 1 if present (North American country code)
        if (digits.startsWith('1') && digits.length === 11) {
          digits = digits.substring(1);
        }
        
        // Must be exactly 10 digits for North American format
        if (digits.length === 10) {
          return `(${digits.substring(0, 3)}) ${digits.substring(3, 6)}-${digits.substring(6)}`;
        }
        
        // Return original if can't format properly
        return phone;
      };
      
      // Process only the currently displayed businesses
      for (const business of businesses) {
        if (!business.phone || business.phone.trim() === '') {
          // Delete businesses without phone numbers
          try {
            const deleteRes = await fetch(`${API_URL}/${encodeURIComponent(business.name)}`, { 
              method: "DELETE" 
            });
            if (deleteRes.ok) {
              deletedCount++;
              console.log(`Deleted business without phone: ${business.name}`);
            }
          } catch (err) {
            console.error(`Failed to delete business: ${business.name}`, err);
          }
        } else {
          // Format phone number to (XXX) XXX-XXXX
          const originalPhone = business.phone.trim();
          const formattedPhone = formatPhoneNumber(originalPhone);
          
          // Only update if phone number changed
          if (formattedPhone !== originalPhone) {
            try {
              const updateRes = await fetch(`${API_URL}/${encodeURIComponent(business.name)}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  ...business,
                  phone: formattedPhone
                })
              });
              if (updateRes.ok) {
                updatedCount++;
                console.log(`Updated phone for ${business.name}: ${originalPhone} → ${formattedPhone}`);
              }
            } catch (err) {
              console.error(`Failed to update phone for business: ${business.name}`, err);
            }
          }
        }
        
        // Add small delay to avoid overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      // Show success message
      setError(`✅ Cleanup complete! Deleted ${deletedCount} businesses without phones. Updated ${updatedCount} phone numbers to (XXX) XXX-XXXX format.`);
      
      // Refresh the businesses list
      await fetchBusinesses();
    } catch (e) {
      console.error('Clean error:', e);
      setError("Failed to clean businesses: " + (e as Error).message);
    }
    
    setLoading(false);
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

  async function updateMissingHours() {
    setLoading(true);
    setError("");
    
    try {
      // Get all businesses
      const res = await fetch(API_URL);
      if (!res.ok) throw new Error('Failed to fetch businesses');
      const businesses = await res.json();
      
      // Filter businesses without hours
      const businessesWithoutHours = businesses.filter((b: Business) => !b.hours || b.hours.trim() === '');
      
      // Update each business with missing hours
      for (const business of businessesWithoutHours) {
        try {
          // Get hours from lookup API
          const lookupRes = await fetch(`http://localhost:8001/api/businesses/lookup?name=${encodeURIComponent(business.name)}`);
          if (!lookupRes.ok) continue;
          
          const lookupData = await lookupRes.json();
          if (!lookupData.hours) continue;
          
          // Update the business with new hours
          const updateRes = await fetch(`${API_URL}/${encodeURIComponent(business.name)}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...business,
              hours: lookupData.hours
            })
          });
          
          if (!updateRes.ok) {
            console.error(`Failed to update hours for ${business.name}`);
          }
          
          // Add a small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (err) {
          console.error(`Error updating hours for ${business.name}:`, err);
        }
      }
      
      // Refresh the businesses list
      await fetchBusinesses();
    } catch (err) {
      setError("Failed to update hours");
      console.error('Error updating hours:', err);
    }
    
    setLoading(false);
  }

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

  // Group businesses by industry, then by city
  const businessesByIndustry: { [industry: string]: { [city: string]: Business[] } } = {};
  businesses.forEach(b => {
    const industry = b.industry || "Restaurant"; // Use actual industry, fallback to Restaurant
    const city = extractCity(b.address);
    if (!businessesByIndustry[industry]) businessesByIndustry[industry] = {};
    if (!businessesByIndustry[industry][city]) businessesByIndustry[industry][city] = [];
    businessesByIndustry[industry][city].push(b);
  });

  // Update the region filter options to use available cities
  const allCities = Array.from(new Set(businesses.map(b => extractCity(b.address)))).filter(Boolean).sort();
  const regionOptions = ['', ...allCities];
  
  // Get available industries for filter
  const allIndustries = Array.from(new Set(businesses.map(b => b.industry || 'Restaurant'))).filter(Boolean).sort();
  const industryOptions = ['', ...allIndustries];

  // Function to get businesses in the exact order they appear on the dashboard
  const getBusinessesInDisplayOrder = (): Business[] => {
    const orderedBusinesses: Business[] = [];
    
    // Follow the same grouping logic as the display
    const businessesByIndustry: { [industry: string]: { [city: string]: Business[] } } = {};
    businesses.forEach(b => {
      const industry = b.industry || "Restaurant"; // Use actual industry, fallback to Restaurant
      const city = extractCity(b.address);
      if (!businessesByIndustry[industry]) businessesByIndustry[industry] = {};
      if (!businessesByIndustry[industry][city]) businessesByIndustry[industry][city] = [];
      businessesByIndustry[industry][city].push(b);
    });

    // Add businesses in the same order as displayed: industry -> city -> businesses
    Object.keys(businessesByIndustry).sort().forEach(industry => {
      Object.keys(businessesByIndustry[industry]).sort().forEach(city => {
        businessesByIndustry[industry][city].forEach(business => {
          orderedBusinesses.push(business);
        });
      });
    });

    console.log('📋 Dashboard order businesses:', orderedBusinesses.length);
    return orderedBusinesses;
  };

  async function triggerDial(phoneNumber: string) {
    console.log('🔥 triggerDial called with:', phoneNumber);
    try {
      console.log('📞 Sending dial request to http://localhost:4000/dial');
      const response = await fetch('http://localhost:4000/dial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber }),
      });
      console.log('📞 Dial response status:', response.status);
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Dial request failed:', errorText);
        throw new Error(`Dial failed: ${errorText}`);
      }
      const result = await response.json();
      console.log('✅ Dial successful:', result);
    } catch (err) {
      console.error('❌ triggerDial error:', err);
      setError('Failed to trigger phone dial: ' + (err as Error).message);
    }
  }

  // Function to handle single business dialing
  const handleSingleDial = async (business: Business) => {
    if (!business.phone) {
      setError('No phone number available for this business');
      return;
    }
    
    console.log('📞 Single dial for:', business.name, 'phone:', business.phone);
    try {
      await triggerDial(business.phone);
    } catch (err) {
      console.error('❌ Single dial failed:', err);
      setError('Failed to dial: ' + (err as Error).message);
    }
  };

  // Function to start call state monitoring
  const startCallStateMonitoring = async (): Promise<string> => {
    const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    console.log('📱 Starting call state monitoring with session:', sessionId);
    
    try {
      // Start monitoring on the phone server
      const response = await fetch('http://localhost:4000/start-monitoring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to start call monitoring');
      }
      
      // Set up Server-Sent Events to listen for call state changes
      const eventSource = new EventSource('http://localhost:4000/call-state-stream');
      eventSourceRef.current = eventSource;
      
      eventSource.onopen = () => {
        console.log('📡 Call state stream connected');
      };
      
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📡 Call state event received:', data);
          
          if (data.type === 'state_change') {
            const { newState, oldState } = data;
            setCallState(newState);
            
            console.log(`📱 Call state changed: ${oldState} → ${newState}`);
            
            // If call ended (went from OFFHOOK/RINGING to IDLE), dial next number
            if ((oldState === 'OFFHOOK' || oldState === 'RINGING') && newState === 'IDLE') {
              console.log('📞 Call ended - proceeding to next number');
              
              // Small delay to ensure call fully ended
              setTimeout(() => {
                if (isAutoDialingRef.current) {
                  console.log('🔄 Auto-dialing next number after call end');
                  // Ensure we have a valid business list
                  const businessList = autoDialBusinessList.length > 0 ? autoDialBusinessList : getBusinessesInDisplayOrder();
                  console.log('📊 Using business list with length:', businessList.length);
                  dialNextNumber(currentDialIndex, false, businessList);
                }
              }, 2000); // 2 second delay to ensure call fully ended
            }
          } else if (data.type === 'connected') {
            setCallState(data.state);
            console.log('📡 Initial call state:', data.state);
          }
        } catch (err) {
          console.error('Error parsing call state event:', err);
        }
      };
      
      eventSource.onerror = (error) => {
        console.error('📡 Call state stream error:', error);
      };
      
      setAutoDialSessionId(sessionId);
      return sessionId;
    } catch (err) {
      console.error('❌ Failed to start call state monitoring:', err);
      throw err;
    }
  };

  // Function to stop call state monitoring
  const stopCallStateMonitoring = async () => {
    console.log('📱 Stopping call state monitoring');
    
    // Close EventSource connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
      console.log('📡 Closed call state stream');
    }
    
    // Stop monitoring on the phone server
    if (autoDialSessionId) {
      try {
        await fetch('http://localhost:4000/stop-monitoring', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: autoDialSessionId }),
        });
        console.log('📱 Stopped monitoring session:', autoDialSessionId);
      } catch (err) {
        console.error('❌ Error stopping call monitoring:', err);
      }
      
      setAutoDialSessionId(null);
    }
    
    setCallState('IDLE');
  };

  const startAutoDial = async () => {
    try {
      // Get businesses in dashboard display order
      const orderedBusinesses = getBusinessesInDisplayOrder();
      setAutoDialBusinessList(orderedBusinesses); // Store the business list for consistent ordering
      console.log('📊 Dashboard ordered businesses count:', orderedBusinesses.length);
      console.log('📊 Selected start business:', selectedStartBusiness);
      console.log('📊 isAutoDialing:', isAutoDialing);
      console.log('📊 isAutoDialingRef.current:', isAutoDialingRef.current);
      
      if (isAutoDialing || isAutoDialingRef.current) {
        console.log('⚠️  Already auto-dialing, returning early');
        return;
      }
      
      let firstIndex = -1;
      
      if (selectedStartBusiness) {
        // Start from the selected business
        firstIndex = orderedBusinesses.findIndex(b => b.name === selectedStartBusiness);
        console.log('🎯 Starting from selected business:', selectedStartBusiness, 'at index:', firstIndex);
        
        if (firstIndex === -1) {
          setError(`Selected start business "${selectedStartBusiness}" not found in current list.`);
          return;
        }
        
        // Verify the selected business is still callable
        const selectedBusiness = orderedBusinesses[firstIndex];
        if (!selectedBusiness.phone || selectedBusiness.status?.toLowerCase() !== 'tocall') {
          setError(`Selected start business "${selectedStartBusiness}" is no longer available for calling.`);
          return;
        }
      } else {
        // Find the first business to call (original behavior)
        console.log('🔍 Looking for first business to call in dashboard order...');
        firstIndex = orderedBusinesses.findIndex(b => {
          const hasPhone = !!b.phone;
          const statusMatch = b.status?.toLowerCase() === 'tocall';
          console.log(`🔍 Dashboard Business ${b.name}: phone=${hasPhone}, status=${b.status} (${statusMatch})`);
          return hasPhone && statusMatch;
        });
      }
      
      console.log('🎯 Starting index found in dashboard order:', firstIndex);
      
      if (firstIndex === -1) {
        const errorMsg = selectedStartBusiness 
          ? `No businesses to call found starting from "${selectedStartBusiness}".`
          : "No businesses to call found in dashboard order. Make sure you have businesses with phone numbers and 'tocall' status.";
        console.error('❌', errorMsg);
        setError(errorMsg);
        return;
      }
      
      console.log('✅ Starting auto-dial with dashboard business:', orderedBusinesses[firstIndex]);
      
      // Start call state monitoring first
      try {
        await startCallStateMonitoring();
        console.log('✅ Call state monitoring started');
      } catch (err) {
        console.error('❌ Failed to start call monitoring:', err);
        setError('Failed to start call monitoring. Auto-dial cannot proceed.');
        return;
      }
      
      // Set both state and ref
      setIsAutoDialing(true);
      isAutoDialingRef.current = true;
      console.log('📊 Set isAutoDialingRef.current to:', isAutoDialingRef.current);
      
      // Start by dialing the selected business directly (firstIndex)
      setCurrentDialIndex(firstIndex);
      console.log('📞 Dialing selected start business:', orderedBusinesses[firstIndex]);
      await triggerDial(orderedBusinesses[firstIndex].phone!);
      
      console.log('📱 Call initiated - waiting for call state monitoring to detect call end');
    } catch (error) {
      console.error('💥 Error in startAutoDial:', error);
      setError('Failed to start auto-dial: ' + (error as Error).message);
      setIsAutoDialing(false);
      isAutoDialingRef.current = false;
    }
  };

  const stopAutoDial = () => {
    console.log('🛑 STOP AUTO-DIAL CALLED');
    console.log('📊 Current isAutoDialing:', isAutoDialing);
    console.log('📊 Current isAutoDialingRef.current:', isAutoDialingRef.current);
    console.log('📊 Current timeout reference:', autoDialTimeout.current);
    
    // Update both state and ref
    setIsAutoDialing(false);
    isAutoDialingRef.current = false;
    console.log('📊 Set isAutoDialingRef.current to:', isAutoDialingRef.current);
    
    setCurrentDialIndex(-1);
    setAutoDialBusinessList([]); // Clear the stored business list
    
    // Stop call state monitoring
    stopCallStateMonitoring();
    
    if (autoDialTimeout.current) {
      console.log('🗑️  Clearing timeout in stopAutoDial');
      clearTimeout(autoDialTimeout.current);
      autoDialTimeout.current = null;
    } else {
      console.log('⚠️  No timeout to clear in stopAutoDial');
    }
    
    console.log('✅ Auto-dial stopped');
  };

  const dialNextNumber = async (lastIndex: number, forceDialing: boolean = false, businessList?: Business[]) => {
    // Use provided business list or get dashboard order
    const orderedBusinesses = businessList || getBusinessesInDisplayOrder();
    
    console.log('📞 dialNextNumber called with lastIndex:', lastIndex, 'forceDialing:', forceDialing);
    console.log('📊 Using business list length:', orderedBusinesses.length);
    console.log('📊 Business list source:', businessList ? 'provided' : 'getBusinessesInDisplayOrder()');
    console.log('📊 Last business was:', lastIndex >= 0 ? orderedBusinesses[lastIndex]?.name : 'none');
    console.log('📊 autoDialBusinessList length:', autoDialBusinessList.length);
    console.log('📊 omittedBusinesses size:', omittedBusinesses.size);
    console.log('📊 isAutoDialing:', isAutoDialing);
    console.log('📊 isAutoDialingRef.current:', isAutoDialingRef.current);
    
    // Use forceDialing parameter OR the persistent ref (not React state)
    const shouldContinue = forceDialing || isAutoDialingRef.current;
    console.log('📊 shouldContinue:', shouldContinue);
    
    if (!shouldContinue) {
      console.log('⚠️  Not auto-dialing, returning early');
      return;
    }
    
    // Debug: Show businesses after lastIndex that we're checking
    console.log('🔍 Checking businesses after index', lastIndex, ':');
    const businessesAfterLast = orderedBusinesses.slice(lastIndex + 1);
    businessesAfterLast.forEach((b, idx) => {
      const actualIndex = lastIndex + 1 + idx;
      const hasPhone = !!b.phone;
      const statusMatch = b.status?.toLowerCase() === 'tocall';
      const notOmitted = !omittedBusinesses.has(b.name);
      console.log(`🔍 Business ${actualIndex} (${b.name}): phone=${hasPhone}, status=${b.status} (${statusMatch}), notOmitted=${notOmitted}`);
    });
    
    const nextIndex = orderedBusinesses.findIndex((b, idx) => {
      const isAfterLast = idx > lastIndex;
      const hasPhone = !!b.phone;
      const statusMatch = b.status?.toLowerCase() === 'tocall';
      const notOmitted = !omittedBusinesses.has(b.name); // Check if business is not omitted
      const match = isAfterLast && hasPhone && statusMatch && notOmitted;
      if (isAfterLast) {
        console.log(`🔍 Dashboard Business ${idx} (${b.name}): afterLast=${isAfterLast}, phone=${hasPhone}, status=${statusMatch}, notOmitted=${notOmitted} => ${match}`);
      }
      return match;
    });
    
    console.log('🎯 Next business index in dashboard order:', nextIndex);
    
    if (nextIndex === -1) {
      console.log('✅ No more businesses to call in dashboard order, stopping auto-dial');
      stopAutoDial();
      setError("Finished calling all businesses in dashboard order.");
      return;
    }
    
    const businessToDial = orderedBusinesses[nextIndex];
    console.log('📞 About to dial dashboard business:', businessToDial);
    
    setCurrentDialIndex(nextIndex);
    await triggerDial(businessToDial.phone!);
    
    console.log('📱 Call initiated - waiting for call state monitoring to detect call end');
    // No more timeout - call state monitoring will handle the next dial
  };

  // Add useEffect to track when the component unmounts
  useEffect(() => {
    console.log('🔄 Dashboard component mounted/updated');
    
    return () => {
      console.log('🔄 Dashboard component unmounting - cleaning up');
      if (autoDialTimeout.current) {
        clearTimeout(autoDialTimeout.current);
        autoDialTimeout.current = null;
      }
      
      // Clean up EventSource
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      
      // Stop call monitoring if active
      if (autoDialSessionId) {
        fetch('http://localhost:4000/stop-monitoring', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: autoDialSessionId }),
        }).catch(err => console.error('Error stopping monitoring on unmount:', err));
      }
    };
  }, []);

  // Add useEffect to track isAutoDialing state changes
  useEffect(() => {
    console.log('📊 isAutoDialing state changed to:', isAutoDialing);
    console.log('📊 isAutoDialingRef.current:', isAutoDialingRef.current);
    console.log('📊 Current timeout reference:', autoDialTimeout.current);
  }, [isAutoDialing]);

  // VAPI integration functions
  async function handleVAPISubmit(e: React.FormEvent) {
    e.preventDefault();
    setVapiLoading(true);
    setVapiResult(null);
    
    try {
      const response = await fetch('http://localhost:8001/api/vapi/send-listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vapi_token: vapiConfig.token,
          vapi_agent_id: vapiConfig.agentId,
          vapi_phone_number_id: vapiConfig.phoneNumberId,
          business_names: vapiConfig.selectedBusinesses
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to send to VAPI');
      }
      
      const result = await response.json();
      setVapiResult(result);
    } catch (err) {
      setError(`VAPI Error: ${(err as Error).message}`);
    } finally {
      setVapiLoading(false);
    }
  }

  function openVAPIModal() {
    const availableBusinesses = businesses.filter(b => b.phone && b.phone.trim() !== '');
    const tocallBusinesses = availableBusinesses.filter(b => b.status.toLowerCase() === 'tocall');
    
    // Get businesses that are currently selected on the dashboard
    const selectedBusinessNames = selectedRows.map(idx => businesses[idx].name).filter(name => name);
    const selectedBusinessesWithPhone = selectedBusinessNames.filter(name => {
      const business = businesses.find(b => b.name === name);
      return business && business.phone && business.phone.trim() !== '';
    });
    
    // Combine selected dashboard businesses with "tocall" businesses, removing duplicates
    const combinedBusinessNames = Array.from(new Set([
      ...selectedBusinessesWithPhone,
      ...tocallBusinesses.map(b => b.name)
    ]));
    
    console.log('🔍 VAPI Modal Selection Process:');
    console.log('  📊 Available businesses:', availableBusinesses.length);
    console.log('  📞 To call businesses:', tocallBusinesses.length, tocallBusinesses.map(b => ({name: b.name, status: b.status, phone: b.phone})));
    console.log('  ✅ Selected on dashboard:', selectedRows.length, 'rows ->', selectedBusinessNames);
    console.log('  📱 Selected with phone:', selectedBusinessesWithPhone);
    console.log('  🎯 Final combined selection:', combinedBusinessNames.length, 'businesses ->', combinedBusinessNames);
    
    // Load saved VAPI credentials from localStorage
    const savedToken = localStorage.getItem('vapi_token') || '';
    const savedAgentId = localStorage.getItem('vapi_agent_id') || '';
    const savedPhoneNumberId = localStorage.getItem('vapi_phone_number_id') || '';
    
    setVapiConfig({
      token: savedToken,
      agentId: savedAgentId,
      phoneNumberId: savedPhoneNumberId,
      selectedBusinesses: combinedBusinessNames
    });
    setShowVAPIModal(true);
    setVapiResult(null);
  }

  function closeVAPIModal() {
    setShowVAPIModal(false);
    setVapiConfig(prev => ({ ...prev, selectedBusinesses: [] }));
    setVapiResult(null);
    setVapiLoading(false);
  }

  function handleVapiConfigChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setVapiConfig({ ...vapiConfig, [name]: value });
    
    // Save to localStorage immediately when user types
    if (name === 'token') {
      localStorage.setItem('vapi_token', value);
    } else if (name === 'agentId') {
      localStorage.setItem('vapi_agent_id', value);
    } else if (name === 'phoneNumberId') {
      localStorage.setItem('vapi_phone_number_id', value);
    }
  }

  function toggleBusinessSelection(businessName: string) {
    setVapiConfig(prev => ({
      ...prev,
      selectedBusinesses: prev.selectedBusinesses.includes(businessName)
        ? prev.selectedBusinesses.filter(name => name !== businessName)
        : [...prev.selectedBusinesses, businessName]
    }));
  }

  function selectAllBusinesses() {
    const availableBusinesses = businesses.filter(b => b.phone && b.phone.trim() !== '');
    setVapiConfig(prev => ({
      ...prev,
      selectedBusinesses: availableBusinesses.map(b => b.name)
    }));
  }

  function deselectAllBusinesses() {
    setVapiConfig(prev => ({
      ...prev,
      selectedBusinesses: []
    }));
  }

  function maskCredential(value: string): string {
    if (!value) return '';
    if (value.length <= 8) return '•'.repeat(value.length);
    return value.substring(0, 4) + '•'.repeat(value.length - 8) + value.substring(value.length - 4);
  }

  function toggleCredentialVisibility(field: 'token' | 'agentId' | 'phoneNumberId') {
    setShowCredentials(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  }

  return (
    <div className="w-full mx-auto px-4">
      <div className="flex mb-10 w-full gap-x-4">
        <div className="flex-1 bg-white text-green-800 rounded-2xl px-6 py-6 shadow-xl font-bold text-lg text-center border-r border-gray-200 transition-all duration-150 hover:shadow-2xl focus:outline-none flex flex-col items-center justify-center">
          <div className="mb-1 uppercase text-xs tracking-wider text-gray-400">{showWeek.calls ? 'This Week' : 'Today'}</div>
          <div className="flex items-center justify-center gap-2">
            <button
              className="bg-gray-200 text-gray-700 rounded-full px-2 py-1 text-lg font-bold hover:bg-gray-300 focus:outline-none"
              onClick={handleCallsCounterDecrement}
              aria-label="Decrease calls"
              type="button"
            >
              −
            </button>
            <span className="mx-2 select-none cursor-pointer" onClick={handleCallsCounterClick} title="Click to add a call">
              Calls {showWeek.calls ? 'This Week' : 'Today'}: {showWeek.calls ? callsThisWeek : callsToday}
            </span>
            <button
              className="bg-gray-200 text-gray-700 rounded-full px-2 py-1 text-lg font-bold hover:bg-gray-300 focus:outline-none"
              onClick={handleCallsCounterClick}
              aria-label="Increase calls"
              type="button"
            >
              +
            </button>
          </div>
        </div>
        <button
          className="flex-1 bg-white text-yellow-800 rounded-2xl px-6 py-6 shadow-xl font-bold text-lg text-center transition-all duration-150 hover:shadow-2xl focus:outline-none"
          onClick={() => setShowWeek(s => ({ ...s, callbacks: !s.callbacks }))}
        >
          <div className="mb-1 uppercase text-xs tracking-wider text-gray-400">{showWeek.callbacks ? 'This Week' : 'Today'}</div>
          Call Backs {showWeek.callbacks ? 'This Week' : 'Today'}: {showWeek.callbacks ? callBacksThisWeek : callBacks}
        </button>
      </div>

      {/* Enhanced Callback Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-red-800 mb-2">🔥 Callbacks Due Today</h3>
              <p className="text-3xl font-bold text-red-600">{callbackSummary.dueToday}</p>
              <p className="text-sm text-red-600">Need immediate attention</p>
            </div>
            <a 
              href="/callbacks" 
              className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm transition"
            >
              View All
            </a>
          </div>
        </div>
        
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-orange-800 mb-2">🚨 Overdue Callbacks</h3>
              <p className="text-3xl font-bold text-orange-600">{callbackSummary.overdue}</p>
              <p className="text-sm text-orange-600">Missed opportunities</p>
            </div>
            <a 
              href="/callbacks" 
              className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-1 rounded text-sm transition"
            >
              View All
            </a>
          </div>
        </div>
        
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-purple-800 mb-2">⭐ High Priority</h3>
              <p className="text-3xl font-bold text-purple-600">{callbackSummary.highPriority}</p>
              <p className="text-sm text-purple-600">Important callbacks</p>
            </div>
            <a 
              href="/callbacks" 
              className="bg-purple-500 hover:bg-purple-600 text-white px-3 py-1 rounded text-sm transition"
            >
              View All
            </a>
          </div>
        </div>
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
            className="bg-yellow-500 hover:bg-yellow-600 text-white font-semibold px-5 py-2 rounded-lg shadow transition"
            onClick={handleClean}
          >
            Clean
          </button>
          <button
            className="bg-green-500 hover:bg-green-600 text-white font-semibold px-5 py-2 rounded-lg shadow transition"
            onClick={updateMissingHours}
            disabled={loading}
          >
            {loading ? 'Updating Hours...' : 'Update Missing Hours'}
          </button>
          <button
            className={`${isAutoDialing ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'} text-white font-semibold px-5 py-2 rounded-lg shadow transition`}
            onClick={async (e) => {
              try {
                console.log('🖱️  Auto-dial button clicked!', e);
                console.log('📊 Current state - isAutoDialing:', isAutoDialing);
                if (isAutoDialing) {
                  console.log('🛑 Calling stopAutoDial');
                  stopAutoDial();
                } else {
                  console.log('🚀 Showing start modal');
                  setShowStartModal(true);
                }
              } catch (error) {
                console.error('💥 Button click error:', error);
                setError('Button click failed: ' + (error as Error).message);
              }
            }}
          >
            {isAutoDialing ? 'Stop Auto-Dial' : 'Start Auto-Dial'}
          </button>
          {isAutoDialing && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Call State:</span>
              <span className={`px-2 py-1 rounded text-xs font-semibold ${
                callState === 'IDLE' ? 'bg-gray-200 text-gray-700' :
                callState === 'RINGING' ? 'bg-yellow-200 text-yellow-800' :
                callState === 'OFFHOOK' ? 'bg-green-200 text-green-800' :
                'bg-red-200 text-red-800'
              }`}>
                {callState === 'IDLE' ? 'Ready' :
                 callState === 'RINGING' ? 'Ringing' :
                 callState === 'OFFHOOK' ? 'In Call' :
                 callState}
              </span>
            </div>
          )}
          <button
            className="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-5 py-2 rounded-lg shadow transition"
            onClick={() => { setBulkMode(false); openModal(null); }}
          >
            + New Business
          </button>
          <button
            className="bg-purple-500 hover:bg-purple-600 text-white font-semibold px-5 py-2 rounded-lg shadow transition"
            onClick={openVAPIModal}
          >
            📞 Send to VAPI
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
            {Object.keys(businessesByIndustry).sort().map(industry => (
              <div key={industry} className="mb-10">
                <div 
                  className="flex items-center gap-4 cursor-pointer group"
                  onClick={() => setCollapsedIndustries(prev => ({ ...prev, [industry]: !prev[industry] }))}
                >
                  <h3 className="text-2xl font-bold text-gray-800 flex-1">{industry}</h3>
                  <span className="text-gray-500 text-lg font-semibold">
                    ({Object.values(businessesByIndustry[industry]).reduce((total, cityBusinesses) => total + cityBusinesses.length, 0)} businesses)
                  </span>
                  <button
                    className="text-gray-400 group-hover:text-gray-700 focus:outline-none text-2xl p-2 rounded-full transition-colors duration-150 bg-gray-100 hover:bg-gray-200 shadow-sm"
                    onClick={e => { e.stopPropagation(); setCollapsedIndustries(prev => ({ ...prev, [industry]: !prev[industry] })); }}
                    style={{ background: 'none', border: 'none' }}
                    aria-label={`Toggle ${industry}`}
                    type="button"
                  >
                    {collapsedIndustries[industry] ? <FaChevronDown /> : <FaChevronUp />}
                  </button>
                </div>
                {!collapsedIndustries[industry] && (
                  <div className="mt-4">
                    {Object.keys(businessesByIndustry[industry]).sort().map(city => (
                      <div key={city} className="mb-6 border rounded-lg shadow">
                        <div
                          className="flex items-center gap-4 px-6 py-4 bg-gray-50 border border-gray-200 rounded-2xl shadow-sm transition-all duration-200 group cursor-pointer"
                          style={{ minHeight: '4.5rem' }}
                          onClick={() => setExpandedCities(prev => ({ ...prev, [`${industry}-${city}`]: !prev[`${industry}-${city}`] }))}
                        >
                          <input
                            type="checkbox"
                            className="w-6 h-6 accent-blue-600 border-gray-300 bg-white rounded-lg focus:ring-2 focus:ring-blue-200 transition-all duration-150 shadow-sm"
                            checked={businessesByIndustry[industry][city].every(b => selectedRows.includes(businesses.findIndex(biz => biz.name === b.name)))}
                            onChange={e => {
                              e.stopPropagation();
                              const cityIndexes = businessesByIndustry[industry][city].map(b => businesses.findIndex(biz => biz.name === b.name));
                              if (e.target.checked) {
                                setSelectedRows(prev => Array.from(new Set([...prev, ...cityIndexes])));
                              } else {
                                setSelectedRows(prev => prev.filter(idx => !cityIndexes.includes(idx)));
                              }
                            }}
                            title={`Select all in ${city}`}
                          />
                          <span className="text-xl font-bold text-gray-800 flex-1 tracking-tight">{city} <span className="text-gray-400 font-semibold text-lg">({businessesByIndustry[industry][city].length})</span></span>
                          <button
                            className="text-gray-400 group-hover:text-gray-700 focus:outline-none text-2xl p-2 rounded-full transition-colors duration-150 bg-gray-100 hover:bg-gray-200 shadow-sm"
                            onClick={e => { e.stopPropagation(); setExpandedCities(prev => ({ ...prev, [`${industry}-${city}`]: !prev[`${industry}-${city}`] })); }}
                            style={{ background: 'none', border: 'none' }}
                            aria-label={`Toggle ${city}`}
                            type="button"
                          >
                            {expandedCities[`${industry}-${city}`] ? <FaChevronUp /> : <FaChevronDown />}
                          </button>
                        </div>
                        {expandedCities[`${industry}-${city}`] && (
                          <table className="w-full text-left table-fixed">
                            <thead>
                              <tr className="text-gray-500 text-sm">
                                <th className="py-2 px-2 font-semibold w-12"></th>
                                <th className="py-2 px-4 font-semibold w-1/4">Name</th>
                                <th className="py-2 px-4 font-semibold w-32">Phone</th>
                                <th className="py-2 px-4 font-semibold w-20">Action</th>
                                <th className="py-2 px-4 font-semibold w-1/4">Address</th>
                                <th className="py-2 px-4 font-semibold w-20">Status</th>
                                <th className="py-2 px-4 font-semibold w-32">Hours</th>
                                <th className="py-2 px-4 font-semibold w-1/4">Comment</th>
                              </tr>
                            </thead>
                            <tbody>
                              {businessesByIndustry[industry][city].map((b, idx) => (
                                <tr key={b.name + idx} className="border-t border-gray-200 hover:bg-gray-50 cursor-pointer" onClick={() => openModal(businesses.findIndex(biz => biz.name === b.name))}>
                                  <td className="py-2 px-2 w-12" onClick={e => e.stopPropagation()}>
                                    <input type="checkbox" checked={selectedRows.includes(businesses.findIndex(biz => biz.name === b.name))} onChange={() => handleSelectRow(businesses.findIndex(biz => biz.name === b.name))} />
                                  </td>
                                  <td className="py-2 px-4 w-1/4 font-medium text-blue-700 hover:underline cursor-pointer break-words">{b.name}</td>
                                  <td className="py-2 px-4 w-32 text-sm">{b.phone || ''}</td>
                                  <td className="py-2 px-4 w-20 text-sm" onClick={e => e.stopPropagation()}>
                                    {b.phone && (
                                      <button
                                        onClick={() => handleSingleDial(b)}
                                        disabled={!b.phone}
                                        className="bg-green-500 hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold px-2 py-1 rounded-md shadow transition text-xs"
                                        title={b.phone ? `Dial ${b.phone}` : 'No phone number'}
                                      >
                                        📞 Dial
                                      </button>
                                    )}
                                  </td>
                                  <td className="py-2 px-4 w-1/4 text-sm break-words">{b.address || ''}</td>
                                  <td className={`py-2 px-4 w-20 text-sm capitalize ${getStatusColor(b.status)}`}>{b.status}</td>
                                  <td className="py-2 px-4 w-32 text-xs break-words" title={b.hours || ''}>
                                    {getTodayHoursString(b.hours)}
                                  </td>
                                  <td className="py-2 px-4 w-1/4 text-sm cursor-pointer break-words" title={b.comments || ''} onClick={e => { e.stopPropagation(); setExpandedComments(prev => ({ ...prev, [b.name + idx]: !prev[b.name + idx] })); }}>
                                    {expandedComments[b.name + idx] ? b.comments : (b.comments && b.comments.length > 60 ? b.comments.slice(0, 60) + '…' : (b.comments || ''))}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
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
                <pre className="bg-gray-100 rounded p-2 text-xs mb-4 w-full whitespace-pre-wrap">{`Name,Phone,Address,Status,Comment,Hours,Industry\nBusiness A,123-456-7890,123 Main St,called,Spoke with manager,Monday: 9:00 AM – 5:00 PM,Restaurant`}</pre>
                
                {/* City Selection Dropdown */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    City Override (Optional)
                  </label>
                  <select
                    className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={bulkSelectedCity === 'CUSTOM' ? 'CUSTOM' : (allCities.includes(bulkSelectedCity) ? bulkSelectedCity : '')}
                    onChange={e => {
                      if (e.target.value === 'CUSTOM') {
                        setBulkSelectedCity('CUSTOM');
                      } else {
                        setBulkSelectedCity(e.target.value);
                      }
                    }}
                  >
                    <option value="">Auto-extract cities from addresses</option>
                    {allCities.map(city => (
                      <option key={city} value={city}>{city}</option>
                    ))}
                    <option value="CUSTOM">➕ Custom City...</option>
                  </select>
                  
                  {/* Custom City Input */}
                  {bulkSelectedCity === 'CUSTOM' && (
                    <input
                      type="text"
                      className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter new city name..."
                      onChange={e => setBulkSelectedCity(e.target.value)}
                      autoFocus
                    />
                  )}
                  
                  <div className="text-xs text-gray-500">
                    <strong>If city selected:</strong> All businesses will be classified under this city regardless of their addresses.<br/>
                    <strong>If blank:</strong> Cities will be auto-extracted from the address field in your data.
                  </div>
                </div>
                
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
                <input type="text" name="hours" placeholder="Hours" className="border rounded px-3 py-2 bg-gray-100" value={form.hours} readOnly style={{ display: 'none' }} />
                {form.hours && (
                  <div className="border rounded px-3 py-2 bg-gray-100 whitespace-pre-line text-sm">
                    {form.hours.split('|').map((line, idx) => (
                      <div key={idx}>{line.trim()}</div>
                    ))}
                  </div>
                )}
                <select name="status" className="border rounded px-3 py-2" value={form.status} onChange={handleFormChange} required>
                  {['tocall', 'called', 'callback', 'dont_call', 'lead'].map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
                {!commentFocused ? (
                  <input
                    type="text"
                    name="comments"
                    placeholder="Comment"
                    className="border rounded px-3 py-2"
                    value={form.comments}
                    onChange={handleFormChange}
                    onFocus={() => setCommentFocused(true)}
                  />
                ) : (
                  <textarea
                    name="comments"
                    placeholder="Comment"
                    className="border rounded px-3 py-2 transition-all duration-150 h-32 resize-none"
                    value={form.comments}
                    onChange={handleFormChange}
                    onBlur={() => setCommentFocused(false)}
                    autoFocus
                    style={{ minHeight: '2.5rem', maxHeight: '12rem' }}
                  />
                )}
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
              <input type="text" name="hours" placeholder="Hours" className="border rounded px-3 py-2 bg-gray-100" value={selectedBusiness.hours || ''} readOnly style={{ display: 'none' }} />
              {selectedBusiness.hours && (
                <div className="border rounded px-3 py-2 bg-gray-100 whitespace-pre-line text-sm">
                  {selectedBusiness.hours.split('|').map((line, idx) => (
                    <div key={idx}>{line.trim()}</div>
                  ))}
                </div>
              )}
              <select name="status" className="border rounded px-3 py-2" value={selectedBusiness.status || ''} onChange={handleDetailsFormChange} required>
                {['tocall', 'called', 'callback', 'dont_call', 'client', 'lead'].map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
              {!commentFocused ? (
                <input
                  type="text"
                  name="comments"
                  placeholder="Comment"
                  className="border rounded px-3 py-2"
                  value={selectedBusiness.comments || ''}
                  onChange={handleDetailsFormChange}
                  onFocus={() => setCommentFocused(true)}
                />
              ) : (
                <textarea
                  name="comments"
                  placeholder="Comment"
                  className="border rounded px-3 py-2 transition-all duration-150 h-32 resize-none"
                  value={selectedBusiness.comments || ''}
                  onChange={handleDetailsFormChange}
                  onBlur={() => setCommentFocused(false)}
                  autoFocus
                  style={{ minHeight: '2.5rem', maxHeight: '12rem' }}
                />
              )}
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
      {showCallbackModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={closeCallbackModal}>
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-lg relative" onClick={e => e.stopPropagation()}>
            <button onClick={closeCallbackModal} className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-2xl">&times;</button>
            <h3 className="text-xl font-bold mb-4">📞 Callback Details</h3>
            <form onSubmit={handleCallbackFormSubmit} className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <select 
                    name="priority" 
                    className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                    value={callbackForm.priority} 
                    onChange={handleCallbackFormChange}
                    required
                  >
                    <option value="High">🔥 High Priority</option>
                    <option value="Medium">📞 Medium Priority</option>
                    <option value="Low">📋 Low Priority</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Lead Score (1-10)</label>
                  <input 
                    type="number" 
                    name="lead_score" 
                    min="1" 
                    max="10" 
                    className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                    value={callbackForm.lead_score} 
                    onChange={handleCallbackFormChange}
                    required
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                  <input 
                    type="date" 
                    name="due_date" 
                    className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                    value={callbackForm.due_date} 
                    onChange={handleCallbackFormChange}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Due Time</label>
                  <input 
                    type="time" 
                    name="due_time" 
                    className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                    value={callbackForm.due_time} 
                    onChange={handleCallbackFormChange}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Interest Level</label>
                <select 
                  name="interest_level" 
                  className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                  value={callbackForm.interest_level} 
                  onChange={handleCallbackFormChange}
                >
                  <option value="High">🔥 High Interest</option>
                  <option value="Medium">😐 Medium Interest</option>
                  <option value="Low">❄️ Low Interest</option>
                  <option value="Unknown">❓ Unknown</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Callback Reason</label>
                <input 
                  type="text" 
                  name="reason" 
                  placeholder="e.g., Wants pricing info, Decision maker available tomorrow..." 
                  className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                  value={callbackForm.reason} 
                  onChange={handleCallbackFormChange}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Best Time to Call</label>
                  <input 
                    type="text" 
                    name="best_time" 
                    placeholder="e.g., Mornings, After 3pm..." 
                    className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                    value={callbackForm.best_time} 
                    onChange={handleCallbackFormChange}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Decision Maker</label>
                  <input 
                    type="text" 
                    name="decision_maker" 
                    placeholder="e.g., Manager John, Owner..." 
                    className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                    value={callbackForm.decision_maker} 
                    onChange={handleCallbackFormChange}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Next Action</label>
                <textarea 
                  name="next_action" 
                  placeholder="e.g., Send pricing sheet, Schedule demo, Follow up on proposal..." 
                  className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 h-20 resize-none" 
                  value={callbackForm.next_action} 
                  onChange={handleCallbackFormChange}
                />
              </div>

              <div className="flex gap-4 mt-4">
                <button type="submit" className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-semibold px-5 py-2 rounded-lg shadow transition">
                  📞 Set Callback
                </button>
                <button type="button" onClick={closeCallbackModal} className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold px-5 py-2 rounded-lg shadow transition">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {showFilterModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowFilterModal(false)}>
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md relative" onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowFilterModal(false)} className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-2xl">&times;</button>
            <h3 className="text-xl font-bold mb-4">Filter Businesses</h3>
            <form onSubmit={(e) => { e.preventDefault(); fetchBusinesses(); setShowFilterModal(false); }} className="flex flex-col gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <select
                  name="status"
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={filter.status}
                  onChange={handleFilterChange}
                >
                  <option value="">All Statuses</option>
                  <option value="tocall">To Call</option>
                  <option value="called">Called</option>
                  <option value="callback">Callback</option>
                  <option value="dont_call">Don't Call</option>
                  <option value="client">Client</option>
                  <option value="lead">Lead</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Region (City)</label>
                <select
                  name="region"
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={filter.region}
                  onChange={handleFilterChange}
                >
                  <option value="">All Regions</option>
                  {regionOptions.filter(opt => opt).map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Industry</label>
                <select
                  name="industry"
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={filter.industry}
                  onChange={handleFilterChange}
                >
                  <option value="">All Industries</option>
                  {industryOptions.filter(opt => opt).map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  type="button"
                  onClick={clearFilters}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold px-4 py-2 rounded-lg transition-colors"
                >
                  Clear Filters
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-semibold px-4 py-2 rounded-lg transition-colors"
                >
                  Apply Filters
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
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
      {showStartModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowStartModal(false)}>
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-3xl relative max-h-[80vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowStartModal(false)} className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-2xl">&times;</button>
            <h3 className="text-xl font-bold mb-4">Configure Auto-Dial Settings</h3>
            <p className="text-gray-600 mb-4">Choose starting point and which businesses to include:</p>
            
            {/* Control buttons */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => {
                  const callableBusinesses = getBusinessesInDisplayOrder().filter(b => 
                    b.status?.toLowerCase() === 'tocall' && b.phone
                  );
                  setOmittedBusinesses(new Set(callableBusinesses.map(b => b.name)));
                }}
                className="bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1 rounded text-sm transition"
              >
                Exclude All
              </button>
            </div>
            
            <div className="overflow-y-auto max-h-96 mb-4">
              {(() => {
                const callableBusinesses = getBusinessesInDisplayOrder().filter(b => 
                  b.status?.toLowerCase() === 'tocall' && b.phone
                );
                
                if (callableBusinesses.length === 0) {
                  return (
                    <div className="text-center py-8 text-gray-500">
                      No businesses available for calling. Make sure you have businesses with 'tocall' status and phone numbers.
                    </div>
                  );
                }
                
                return callableBusinesses.map((business, idx) => (
                  <div
                    key={business.name + idx}
                    className={`p-3 border rounded-lg mb-2 transition-colors ${
                      selectedStartBusiness === business.name
                        ? 'bg-green-50 border-green-300'
                        : omittedBusinesses.has(business.name)
                        ? 'bg-red-50 border-red-200'
                        : 'bg-gray-50 hover:bg-gray-100 border-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        {/* Omit checkbox */}
                        <input
                          type="checkbox"
                          checked={omittedBusinesses.has(business.name)}
                          onChange={(e) => {
                            const newOmitted = new Set(omittedBusinesses);
                            if (e.target.checked) {
                              newOmitted.add(business.name);
                              // If this business was selected as start, clear the selection
                              if (selectedStartBusiness === business.name) {
                                setSelectedStartBusiness(null);
                              }
                            } else {
                              newOmitted.delete(business.name);
                            }
                            setOmittedBusinesses(newOmitted);
                          }}
                          className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                          title="Check to exclude from auto-dial"
                        />
                        
                        {/* Business info */}
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{business.name}</h4>
                          <p className="text-sm text-gray-600">{business.phone}</p>
                          <p className="text-xs text-gray-500">{business.address}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(business.status)} bg-blue-100`}>
                          {business.status}
                        </span>
                        
                        {/* Start from here button */}
                        {!omittedBusinesses.has(business.name) && (
                          <button
                            onClick={() => setSelectedStartBusiness(
                              selectedStartBusiness === business.name ? null : business.name
                            )}
                            className={`px-2 py-1 text-xs rounded transition ${
                              selectedStartBusiness === business.name
                                ? 'bg-green-500 text-white'
                                : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                            }`}
                          >
                            {selectedStartBusiness === business.name ? '✓ Start' : 'Start'}
                          </button>
                        )}
                        
                        {omittedBusinesses.has(business.name) && (
                          <span className="text-red-500 text-xs font-medium">Excluded</span>
                        )}
                      </div>
                    </div>
                  </div>
                ));
              })()}
            </div>
            
            <div className="flex gap-4">
              <button
                onClick={() => {
                  setSelectedStartBusiness(null);
                  setOmittedBusinesses(new Set());
                  setShowStartModal(false);
                }}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold px-4 py-2 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setShowStartModal(false);
                  await startAutoDial();
                }}
                disabled={!selectedStartBusiness}
                className="flex-1 bg-green-500 hover:bg-green-600 text-white font-semibold px-4 py-2 rounded-lg transition"
              >
                Start Auto-Dial
              </button>
            </div>
          </div>
        </div>
      )}
      {showVAPIModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={closeVAPIModal}>
          <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl relative max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
                         <button onClick={closeVAPIModal} className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-2xl">&times;</button>
             <div className="p-6 pb-0">
               <h3 className="text-2xl font-bold mb-6">📞 Send Listings to VAPI Agent</h3>
             </div>
            
            {!vapiResult ? (
              <form onSubmit={handleVAPISubmit} className="flex flex-col h-full">
                <div className="flex-1 overflow-y-auto px-6 space-y-6 max-h-96">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-lg font-semibold text-gray-800">VAPI Configuration</h4>
                    <button
                      type="button"
                      onClick={() => {
                        localStorage.removeItem('vapi_token');
                        localStorage.removeItem('vapi_agent_id');
                        localStorage.removeItem('vapi_phone_number_id');
                        setVapiConfig(prev => ({ ...prev, token: '', agentId: '', phoneNumberId: '' }));
                      }}
                      className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 py-1 rounded text-sm transition"
                    >
                      Clear Saved Credentials
                    </button>
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        VAPI API Token <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showCredentials.token ? "text" : "password"}
                          name="token"
                          value={showCredentials.token ? vapiConfig.token : (vapiConfig.token ? maskCredential(vapiConfig.token) : '')}
                          onChange={handleVapiConfigChange}
                          onFocus={() => setShowCredentials(prev => ({ ...prev, token: true }))}
                          className="w-full border rounded-lg px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-purple-500"
                          placeholder="Enter your VAPI API token"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => toggleCredentialVisibility('token')}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showCredentials.token ? '👁️' : '👁️‍🗨️'}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Agent ID <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showCredentials.agentId ? "text" : "password"}
                          name="agentId"
                          value={showCredentials.agentId ? vapiConfig.agentId : (vapiConfig.agentId ? maskCredential(vapiConfig.agentId) : '')}
                          onChange={handleVapiConfigChange}
                          onFocus={() => setShowCredentials(prev => ({ ...prev, agentId: true }))}
                          className="w-full border rounded-lg px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-purple-500"
                          placeholder="Enter your VAPI Agent ID"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => toggleCredentialVisibility('agentId')}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showCredentials.agentId ? '👁️' : '👁️‍🗨️'}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Phone Number ID <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showCredentials.phoneNumberId ? "text" : "password"}
                          name="phoneNumberId"
                          value={showCredentials.phoneNumberId ? vapiConfig.phoneNumberId : (vapiConfig.phoneNumberId ? maskCredential(vapiConfig.phoneNumberId) : '')}
                          onChange={handleVapiConfigChange}
                          onFocus={() => setShowCredentials(prev => ({ ...prev, phoneNumberId: true }))}
                          className="w-full border rounded-lg px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-purple-500"
                          placeholder="Enter your VAPI Phone Number ID"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => toggleCredentialVisibility('phoneNumberId')}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showCredentials.phoneNumberId ? '👁️' : '👁️‍🗨️'}
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        This is the ID of the phone number configured in your VAPI dashboard to make outbound calls
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-lg font-semibold text-gray-800">
                      Select Businesses ({vapiConfig.selectedBusinesses.length} selected)
                    </h4>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={selectAllBusinesses}
                        className="bg-green-100 hover:bg-green-200 text-green-700 px-3 py-1 rounded text-sm transition"
                      >
                        Select All
                      </button>
                      <button
                        type="button"
                        onClick={deselectAllBusinesses}
                        className="bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1 rounded text-sm transition"
                      >
                        Deselect All
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const tocallBusinesses = businesses.filter(b => 
                            b.phone && b.phone.trim() !== '' && b.status.toLowerCase() === 'tocall'
                          );
                          console.log('To call businesses found:', tocallBusinesses.length, tocallBusinesses.map(b => ({name: b.name, status: b.status, phone: b.phone})));
                          setVapiConfig(prev => ({
                            ...prev,
                            selectedBusinesses: tocallBusinesses.map(b => b.name)
                          }));
                        }}
                        className="bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-1 rounded text-sm transition"
                      >
                        Select "To Call" Only
                      </button>
                    </div>
                  </div>
                  
                  <div className="max-h-48 overflow-y-auto border rounded-lg">
                    {businesses.filter(b => b.phone && b.phone.trim() !== '').length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        No businesses with phone numbers found.
                      </div>
                    ) : (
                      <div className="space-y-2 p-4">
                        {businesses.filter(b => b.phone && b.phone.trim() !== '').map((business, idx) => (
                          <div
                            key={business.name + idx}
                            className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                              vapiConfig.selectedBusinesses.includes(business.name)
                                ? 'bg-purple-50 border-purple-300'
                                : 'bg-gray-50 hover:bg-gray-100 border-gray-200'
                            }`}
                            onClick={() => toggleBusinessSelection(business.name)}
                          >
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={vapiConfig.selectedBusinesses.includes(business.name)}
                                onChange={() => toggleBusinessSelection(business.name)}
                                className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                              />
                              <div className="flex-1">
                                <h4 className="font-medium text-gray-900">{business.name}</h4>
                                <p className="text-sm text-gray-600">{business.phone}</p>
                                <p className="text-xs text-gray-500">{business.address}</p>
                              </div>
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(business.status)}`}>
                                {business.status}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                </div>

                <div className="flex gap-4 p-6 border-t bg-gray-50">
                  <button
                    type="button"
                    onClick={closeVAPIModal}
                    className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold px-4 py-2 rounded-lg transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={vapiLoading || vapiConfig.selectedBusinesses.length === 0}
                    className="flex-1 bg-purple-500 hover:bg-purple-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold px-4 py-2 rounded-lg transition"
                  >
                    {vapiLoading ? 'Sending to VAPI...' : `Send ${vapiConfig.selectedBusinesses.length} Businesses to VAPI`}
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex flex-col h-full">
                <div className="flex-1 overflow-y-auto px-6 space-y-6 max-h-96">
                <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                  <h4 className="text-lg font-semibold text-green-800 mb-4">✅ VAPI Integration Results</h4>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-white rounded-lg p-4">
                      <div className="text-2xl font-bold text-green-600">{vapiResult.calls_initiated}</div>
                      <div className="text-sm text-green-700">Calls Initiated</div>
                    </div>
                    <div className="bg-white rounded-lg p-4">
                      <div className="text-2xl font-bold text-red-600">{vapiResult.calls_failed}</div>
                      <div className="text-sm text-red-700">Failed Calls</div>
                    </div>
                  </div>
                </div>

                {vapiResult.successful_calls && vapiResult.successful_calls.length > 0 && (
                  <div className="space-y-3">
                    <h5 className="font-semibold text-green-800">✅ Successful Calls:</h5>
                    <div className="max-h-40 overflow-y-auto space-y-2">
                      {vapiResult.successful_calls.map((call: any, idx: number) => (
                        <div key={idx} className="bg-green-50 border border-green-200 rounded p-3">
                          <div className="font-medium">{call.business}</div>
                          <div className="text-sm text-gray-600">{call.phone}</div>
                          <div className="text-xs text-green-600">Call ID: {call.call_id}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {vapiResult.failed_calls && vapiResult.failed_calls.length > 0 && (
                  <div className="space-y-3">
                    <h5 className="font-semibold text-red-800">❌ Failed Calls:</h5>
                    <div className="max-h-40 overflow-y-auto space-y-2">
                      {vapiResult.failed_calls.map((call: any, idx: number) => (
                        <div key={idx} className="bg-red-50 border border-red-200 rounded p-3">
                          <div className="font-medium">{call.business}</div>
                          <div className="text-sm text-gray-600">{call.phone}</div>
                          <div className="text-xs text-red-600">Error: {call.error}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                </div>

                <div className="flex gap-4 p-6 border-t bg-gray-50">
                  <button
                    onClick={closeVAPIModal}
                    className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold px-4 py-2 rounded-lg transition"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => setVapiResult(null)}
                    className="flex-1 bg-purple-500 hover:bg-purple-600 text-white font-semibold px-4 py-2 rounded-lg transition"
                  >
                    Send More
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
