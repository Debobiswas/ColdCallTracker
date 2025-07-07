"use client";
import React, { useEffect, useState } from "react";

// API URL for the backend
const API_URL = '/api/businesses';

// Headers configuration
const getHeaders = () => {
  return {
    'Content-Type': 'application/json',
  };
};

// Retry function for failed requests
const retryRequest = async (fn: () => Promise<Response>, maxRetries = 3, delay = 1000) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fn();
      if (response.ok) return response;
      
      // Don't retry on client errors (4xx)
      if (response.status >= 400 && response.status < 500) {
        const errorText = await response.text();
        throw new Error(`Client error: ${response.status} ${response.statusText} - ${errorText}`);
      }
      
      // Retry on server errors (5xx) or network issues
      if (i === maxRetries - 1) {
        const errorText = await response.text();
        throw new Error(`Server error after ${maxRetries} retries: ${response.status} ${response.statusText} - ${errorText}`);
      }
      
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
    }
  }
  throw new Error('Max retries exceeded');
};

type Business = {
  id: number;
  name: string;
  phone: string;
  address: string;
  status: string;
  hours?: string;
  comments?: string;
  industry?: string;
  region?: string;
  callback_count?: number;
  lead_score?: number;
  last_called_date?: string;
  last_callback_date?: string;
  callback_due_date?: string;
  callback_due_time?: string;
  callback_reason?: string;
  callback_priority?: string;
  interest_level?: string;
  best_time_to_call?: string;
  decision_maker?: string;
  next_action?: string;
};

const emptyForm: Omit<Business, 'id'> = { 
  name: '', 
  phone: '', 
  address: '', 
  hours: '',
  status: 'tocall', 
  comments: '', 
  industry: '',
  region: '',
  callback_count: 0,
  lead_score: 5,
  callback_priority: 'Medium',
  interest_level: 'Unknown',
  best_time_to_call: '',
  decision_maker: '',
  next_action: ''
};

const statusOptions = ["tocall", "called", "callback", "dont_call"];
const priorityOptions = ["Low", "Medium", "High"];
const interestOptions = ["Unknown", "Not Interested", "Maybe Interested", "Very Interested"];

// Force a new build
export default function BusinessesPage() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingBusiness, setEditingBusiness] = useState<Business | null>(null);
  const [form, setForm] = useState<Omit<Business, 'id'> | Business>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showOnlyWithPhone, setShowOnlyWithPhone] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchBusinesses();
  }, []);

  async function fetchBusinesses() {
    setLoading(true);
    setError("");
    
    try {
      const response = await retryRequest(() => 
        fetch(API_URL, { headers: getHeaders() })
      );
      
      const data = await response.json();
      
      if (Array.isArray(data)) {
        setBusinesses(data);
        setRetryCount(0); // Reset retry count on success
      } else {
        throw new Error('Received invalid data format from API');
      }
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "Failed to fetch businesses";
      setError(errorMessage);
      console.error('Error in fetchBusinesses:', e);
      
      // Increment retry count for user feedback
      setRetryCount(prev => prev + 1);
    } finally {
      setLoading(false);
    }
  }

  async function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      console.log("File upload cancelled or no file selected.");
      return;
    }
    console.log("File selected:", file.name);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        console.log("FileReader onload triggered.");
        const text = e.target?.result;
        if (typeof text !== 'string') {
          setError("Failed to read file");
          console.error("FileReader result is not a string.");
          return;
        }
        console.log("File read successfully. Parsing JSON...");
        const businessesToUpload = JSON.parse(text);
        console.log("JSON parsed successfully.");

        if (!Array.isArray(businessesToUpload)) {
          setError("JSON file must contain an array of businesses.");
          console.error("Parsed JSON is not an array.");
          return;
        }
        console.log(`Found ${businessesToUpload.length} businesses in the file. Formatting for upload...`);
        
        const formattedBusinesses = businessesToUpload.map((biz: any) => ({
            name: biz.title || 'N/A',
            phone: biz.phone || '',
            address: biz.address || '',
            status: 'tocall',
            hours: biz.openingHours ? biz.openingHours.map((h: any) => `${h.day}: ${h.hours}`).join(', ') : '',
            industry: biz.categoryName || '',
            region: biz.neighborhood || '',
            comments: biz.description || '',
        }));
        console.log("Businesses formatted:", formattedBusinesses.slice(0, 5)); // Log first 5 for preview

        setLoading(true);
        console.log("Sending data to /api/businesses/upload...");
        const response = await fetch(`${API_URL}/upload`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(formattedBusinesses),
        });
        console.log("Received response from API:", response.status, response.statusText);

        if (!response.ok) {
            const errorData = await response.json();
            console.error("API Error Data:", errorData);
            throw new Error(errorData.detail || 'Failed to upload businesses');
        }

        console.log("Upload successful, fetching updated business list.");
        await fetchBusinesses();
        alert('Businesses uploaded successfully!');

      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "An unknown error occurred during file upload.";
        setError(`Error uploading file: ${errorMessage}`);
        console.error(err);
      } finally {
        setLoading(false);
        // Reset file input
        if(fileInputRef.current) {
            fileInputRef.current.value = "";
        }
      }
    };
    reader.readAsText(file);
  }

  function openModal(business: Business | null) {
    if (business) {
      setEditingBusiness(business);
      setForm(business);
    } else {
      setEditingBusiness(null);
      setForm(emptyForm);
    }
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditingBusiness(null);
  }

  function handleFormChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  }

  async function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    
    // Validate required fields
    if (!form.name || !form.name.trim()) {
      setError("Business name is required");
      return;
    }
    
    setLoading(true);
    
    try {
      let response;
      
      if (editingBusiness) {
        // Edit business
        const { id, ...updateData } = form as Business;
        response = await retryRequest(() => 
          fetch(`${API_URL}/${id}`, {
            method: "PATCH",
            headers: getHeaders(),
            body: JSON.stringify(updateData),
          })
        );
      } else {
        // Add business
        response = await retryRequest(() => 
          fetch(API_URL, {
            method: "POST",
            headers: getHeaders(),
            body: JSON.stringify(form),
          })
        );
      }
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Operation failed: ${response.status} - ${errorText}`);
      }
      
      closeModal();
      await fetchBusinesses();
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "Failed to save business";
      setError(errorMessage);
      console.error('Error in handleFormSubmit:', e);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(businessId: number) {
    if (!window.confirm("Are you sure you want to delete this business? This action cannot be undone.")) {
      return;
    }
    
    setError("");
    setLoading(true);
    
    try {
      const response = await retryRequest(() => 
        fetch(`${API_URL}/${businessId}`, {
          method: "DELETE",
          headers: getHeaders()
        })
      );
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Delete failed: ${response.status} - ${errorText}`);
      }
      
      await fetchBusinesses();
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "Failed to delete business";
      setError(errorMessage);
      console.error('Error in handleDelete:', e);
    } finally {
      setLoading(false);
    }
  }

  const filteredBusinesses = showOnlyWithPhone 
    ? businesses.filter(b => b.phone && b.phone.trim() !== '')
    : businesses;

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Businesses</h1>

      {error && <div className="text-red-500 bg-red-100 p-4 rounded-md mb-4">Error: {error} {retryCount > 0 && `(retrying ${retryCount} times)`}</div>}
      
      <div className="flex justify-between items-center mb-6">
        <div>
          <button
            className="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-4 lg:px-5 py-2 rounded-lg shadow transition text-sm lg:text-base"
            onClick={() => openModal(null)}
          >
            + New Business
          </button>
          <input 
            type="file" 
            accept=".json" 
            onChange={handleFileUpload} 
            className="hidden" 
            ref={fileInputRef}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors ml-4"
          >
            Upload JSON
          </button>
        </div>
      </div>

      {loading && !businesses.length ? (
        <div className="bg-white rounded-xl shadow-2xl p-6 text-center">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mr-3"></div>
            <div className="text-gray-500">Loading businesses...</div>
          </div>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden lg:block bg-white rounded-xl shadow-2xl p-6 overflow-x-auto w-full">
            <table className="w-full text-left">
              <thead>
                <tr className="text-gray-500 text-sm">
                  <th className="py-2 px-4 font-semibold">Name</th>
                  <th className="py-2 px-4 font-semibold">Phone</th>
                  <th className="py-2 px-4 font-semibold">Address</th>
                  <th className="py-2 px-4 font-semibold">Region</th>
                  <th className="py-2 px-4 font-semibold">Industry</th>
                  <th className="py-2 px-4 font-semibold">Status</th>
                  <th className="py-2 px-4 font-semibold">Priority</th>
                  <th className="py-2 px-4 font-semibold">Interest</th>
                  <th className="py-2 px-4 font-semibold">Decision Maker</th>
                  <th className="py-2 px-4 font-semibold">Best Time</th>
                  <th className="py-2 px-4 font-semibold">Comments</th>
                  <th className="py-2 px-4 font-semibold">Next Action</th>
                  <th className="py-2 px-4 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredBusinesses.map((b) => (
                  <tr key={b.id} className="border-t border-gray-200 hover:bg-gray-50">
                    <td className="py-2 px-4 font-medium">{b.name}</td>
                    <td className="py-2 px-4">{b.phone || ''}</td>
                    <td className="py-2 px-4">{b.address || ''}</td>
                    <td className="py-2 px-4">{b.region || ''}</td>
                    <td className="py-2 px-4">{b.industry || ''}</td>
                    <td className="py-2 px-4 capitalize">{b.status}</td>
                    <td className="py-2 px-4">{b.callback_priority || ''}</td>
                    <td className="py-2 px-4">{b.interest_level || ''}</td>
                    <td className="py-2 px-4">{b.decision_maker || ''}</td>
                    <td className="py-2 px-4">{b.best_time_to_call || ''}</td>
                    <td className="py-2 px-4">{b.comments || ''}</td>
                    <td className="py-2 px-4">{b.next_action || ''}</td>
                    <td className="py-2 px-4">
                      <button className="text-blue-600 hover:underline mr-2" onClick={() => openModal(b)}>Edit</button>
                      <button className="text-red-600 hover:underline" onClick={() => handleDelete(b.id)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="lg:hidden space-y-4">
            {filteredBusinesses.map((b) => (
              <div key={b.id} className="bg-white rounded-lg shadow-md p-4 border">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold text-lg text-gray-900">{b.name}</h3>
                    <p className="text-sm text-gray-600">{b.industry || 'No industry specified'}</p>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      className="text-blue-600 hover:bg-blue-50 p-2 rounded-lg transition text-sm"
                      onClick={() => openModal(b)}
                    >
                      Edit
                    </button>
                    <button 
                      className="text-red-600 hover:bg-red-50 p-2 rounded-lg transition text-sm"
                      onClick={() => handleDelete(b.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
                
                <div className="space-y-2 text-sm">
                  {b.phone && (
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-700">Phone:</span>
                      <a href={`tel:${b.phone}`} className="text-blue-600 hover:underline">{b.phone}</a>
                    </div>
                  )}
                  {b.address && (
                    <div className="flex items-start gap-2">
                      <span className="font-medium text-gray-700">Address:</span>
                      <span className="text-gray-600">{b.address}</span>
                    </div>
                  )}
                  {b.hours && (
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-700">Hours:</span>
                      <span className="text-gray-600">{b.hours}</span>
                    </div>
                  )}
                  {b.region && (
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-700">Region:</span>
                      <span className="text-gray-600">{b.region}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-700">Status:</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${
                      b.status === 'tocall' ? 'bg-yellow-100 text-yellow-800' :
                      b.status === 'called' ? 'bg-green-100 text-green-800' :
                      b.status === 'callback' ? 'bg-blue-100 text-blue-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {b.status}
                    </span>
                  </div>
                  {b.callback_priority && (
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-700">Priority:</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        b.callback_priority === 'High' ? 'bg-red-100 text-red-800' :
                        b.callback_priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {b.callback_priority}
                      </span>
                    </div>
                  )}
                  {b.interest_level && (
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-700">Interest:</span>
                      <span className="text-gray-600">{b.interest_level}</span>
                    </div>
                  )}
                  {b.decision_maker && (
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-700">Decision Maker:</span>
                      <span className="text-gray-600">{b.decision_maker}</span>
                    </div>
                  )}
                  {b.best_time_to_call && (
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-700">Best Time:</span>
                      <span className="text-gray-600">{b.best_time_to_call}</span>
                    </div>
                  )}
                  {b.comments && (
                    <div className="flex items-start gap-2">
                      <span className="font-medium text-gray-700">Comments:</span>
                      <span className="text-gray-600">{b.comments}</span>
                    </div>
                  )}
                  {b.next_action && (
                    <div className="flex items-start gap-2">
                      <span className="font-medium text-gray-700">Next Action:</span>
                      <span className="text-gray-600">{b.next_action}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Modal for Add/Edit Business */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg p-4 lg:p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto relative">
            <button onClick={closeModal} className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-2xl">&times;</button>
            <h3 className="text-lg lg:text-xl font-bold mb-4 pr-8">{editingBusiness ? 'Edit Business' : 'Add Business'}</h3>
            <form onSubmit={handleFormSubmit} className="flex flex-col gap-3 lg:gap-4">
              <input 
                type="text" 
                name="name" 
                placeholder="Name *" 
                className="border rounded px-3 py-2 text-sm lg:text-base" 
                value={form.name} 
                onChange={handleFormChange} 
                required 
              />
              <input 
                type="text" 
                name="phone" 
                placeholder="Phone" 
                className="border rounded px-3 py-2 text-sm lg:text-base" 
                value={form.phone || ''} 
                onChange={handleFormChange} 
              />
              <input 
                type="text" 
                name="address" 
                placeholder="Address" 
                className="border rounded px-3 py-2 text-sm lg:text-base" 
                value={form.address || ''} 
                onChange={handleFormChange} 
              />
              <input 
                type="text" 
                name="hours" 
                placeholder="Hours (e.g., 9am-5pm M-F)" 
                className="border rounded px-3 py-2 text-sm lg:text-base" 
                value={form.hours || ''} 
                onChange={handleFormChange} 
              />
              <input 
                type="text" 
                name="region" 
                placeholder="Region" 
                className="border rounded px-3 py-2 text-sm lg:text-base" 
                value={form.region || ''} 
                onChange={handleFormChange} 
              />
              <input 
                type="text" 
                name="industry" 
                placeholder="Industry" 
                className="border rounded px-3 py-2 text-sm lg:text-base" 
                value={form.industry || ''} 
                onChange={handleFormChange} 
              />
              <select 
                name="status" 
                className="border rounded px-3 py-2 text-sm lg:text-base" 
                value={form.status} 
                onChange={handleFormChange} 
                required
              >
                {statusOptions.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
              <select 
                name="callback_priority" 
                className="border rounded px-3 py-2 text-sm lg:text-base" 
                value={form.callback_priority || 'Medium'} 
                onChange={handleFormChange}
              >
                {priorityOptions.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
              <select 
                name="interest_level" 
                className="border rounded px-3 py-2 text-sm lg:text-base" 
                value={form.interest_level || 'Unknown'} 
                onChange={handleFormChange}
              >
                {interestOptions.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
              <input 
                type="text" 
                name="decision_maker" 
                placeholder="Decision Maker" 
                className="border rounded px-3 py-2 text-sm lg:text-base" 
                value={form.decision_maker || ''} 
                onChange={handleFormChange} 
              />
              <input 
                type="text" 
                name="best_time_to_call" 
                placeholder="Best Time to Call" 
                className="border rounded px-3 py-2 text-sm lg:text-base" 
                value={form.best_time_to_call || ''} 
                onChange={handleFormChange} 
              />
              <textarea 
                name="comments" 
                placeholder="Comments" 
                className="border rounded px-3 py-2 text-sm lg:text-base min-h-[80px]" 
                value={form.comments || ''} 
                onChange={handleFormChange} 
              />
              <textarea 
                name="next_action" 
                placeholder="Next Action" 
                className="border rounded px-3 py-2 text-sm lg:text-base min-h-[80px]" 
                value={form.next_action || ''} 
                onChange={handleFormChange} 
              />
              <div className="flex flex-col lg:flex-row gap-3 lg:gap-4 mt-2">
                <button 
                  type="submit" 
                  className="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-4 lg:px-5 py-2 rounded-lg shadow transition text-sm lg:text-base disabled:opacity-50"
                  disabled={loading}
                >
                  {loading ? 'Saving...' : 'Save'}
                </button>
                <button 
                  type="button" 
                  onClick={closeModal} 
                  className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold px-4 lg:px-5 py-2 rounded-lg shadow transition text-sm lg:text-base"
                  disabled={loading}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
} 