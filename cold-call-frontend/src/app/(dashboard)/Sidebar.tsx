"use client";
import Link from "next/link";
import { FaHome, FaUserFriends, FaPhone, FaCalendarAlt, FaChartBar, FaDollarSign, FaSearch, FaPhoneAlt, FaTimes } from "react-icons/fa";
import GoogleApiKeyManager from './GoogleApiKeyManager';
import { useState, useRef } from "react";
import { createBrowserClient } from "@supabase/ssr";

interface SidebarProps {
  onClose?: () => void;
}

export default function Sidebar({ onClose }: SidebarProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string>("");
  const [showUploadStatus, setShowUploadStatus] = useState(false);
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState('');
  const [selectedIndustry, setSelectedIndustry] = useState('');
  const [minReviews, setMinReviews] = useState('');
  const [pendingData, setPendingData] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handleLinkClick = () => {
    // Close sidebar on mobile when a link is clicked
    if (onClose) {
      onClose();
    }
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/json') {
      setUploadStatus('Error: Please select a JSON file');
      setShowUploadStatus(true);
      return;
    }

    setUploading(true);
    setShowUploadStatus(true);
    setUploadStatus('Reading file...');

    try {
      const fileText = await file.text();
      const jsonData = JSON.parse(fileText);
      
      if (!Array.isArray(jsonData)) {
        setUploadStatus('Error: JSON file must contain an array of businesses');
        setUploading(false);
        return;
      }

      // Store the data temporarily and show options modal
      setPendingData(jsonData);
      setShowOptionsModal(true);
      setUploading(false);
      setShowUploadStatus(false);

    } catch (error) {
      console.error('File reading error:', error);
      setUploadStatus(`Error: ${error instanceof Error ? error.message : 'Failed to read file'}`);
      setUploading(false);
    }
  };

  const handleOptionsSubmit = async () => {
    setShowOptionsModal(false);
    setUploading(true);
    setShowUploadStatus(true);
    setUploadStatus(`Processing ${pendingData.length} businesses...`);

    try {
      // Get the user session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setUploadStatus('Error: You must be logged in to upload businesses');
        setUploading(false);
        return;
      }

      // Apply minimum reviews filter if specified
      let filteredData = pendingData;
      if (minReviews && !isNaN(parseInt(minReviews))) {
        const minReviewsNum = parseInt(minReviews);
        filteredData = pendingData.filter(business => {
          const reviewCount = business.reviews_count || business.review_count || business.total_reviews || 0;
          return reviewCount >= minReviewsNum;
        });
      }

      // Set region and industry for all businesses (override JSON data if specified)
      const businessesWithOptions = filteredData.map(business => ({
        ...business,
        region: selectedRegion.trim() ? selectedRegion : (business.city || business.location || ''),
        industry: selectedIndustry.trim() ? selectedIndustry : (business.industry || business.category || business.types?.[0] || ''),
        min_reviews: minReviews ? parseInt(minReviews) : 0
      }));

      setUploadStatus(`Uploading ${businessesWithOptions.length} businesses (filtered from ${pendingData.length})...`);

      // Send to API
      const response = await fetch('/api/businesses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        credentials: 'include',
        body: JSON.stringify(businessesWithOptions)
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorData}`);
      }

      const result = await response.json();
      
      const successMessage = `Upload Complete!
Region: ${selectedRegion.trim() ? `Set to "${selectedRegion}"` : 'Used from JSON data'}
Industry: ${selectedIndustry.trim() ? `Set to "${selectedIndustry}"` : 'Used from JSON data'}
Min Reviews Filter: ${minReviews || 'No filter'}
Original businesses: ${pendingData.length}
Filtered businesses: ${businessesWithOptions.length}
Businesses processed: ${result.processed || 0}
Unique businesses: ${result.unique || 0}
New businesses added: ${result.inserted || 0}`;

      setUploadStatus(successMessage);
      
      // Reset form
      setSelectedRegion('');
      setSelectedIndustry('');
      setMinReviews('');
      setPendingData([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

    } catch (error) {
      console.error('Upload error:', error);
      setUploadStatus(`Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`);
    } finally {
      setUploading(false);
    }
  };

  const handleModalClose = () => {
    setShowOptionsModal(false);
    setSelectedRegion('');
    setSelectedIndustry('');
    setMinReviews('');
    setPendingData([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  return (
    <>
      {/* Header with close button for mobile */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold tracking-tight">ColdCall Tracker</h1>
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden p-2 rounded-lg hover:bg-[#1b3358] transition-colors"
          >
            <FaTimes className="text-lg" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-2 text-base">
        <Link 
          href="/" 
          className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-[#1b3358] transition font-medium"
          onClick={handleLinkClick}
        >
          <FaHome className="text-lg" /> Dashboard
        </Link>
        <Link 
          href="/business-lookup" 
          className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-[#1b3358] transition font-medium"
          onClick={handleLinkClick}
        >
          <FaSearch className="text-lg" /> Business Lookup
        </Link>
        <Link 
          href="/businesses" 
          className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-[#1b3358] transition font-medium"
          onClick={handleLinkClick}
        >
          <FaUserFriends className="text-lg" /> Businesses
        </Link>
        <Link 
          href="/clients" 
          className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-[#1b3358] transition font-medium"
          onClick={handleLinkClick}
        >
          <FaUserFriends className="text-lg" /> Clients
        </Link>
        <Link 
          href="/calendar" 
          className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-[#1b3358] transition font-medium"
          onClick={handleLinkClick}
        >
          <FaCalendarAlt className="text-lg" /> Calendar
        </Link>
        <Link 
          href="/calls" 
          className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-[#1b3358] transition font-medium"
          onClick={handleLinkClick}
        >
          <FaPhone className="text-lg" /> Calls
        </Link>
        <Link 
          href="/callbacks" 
          className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-[#1b3358] transition font-medium"
          onClick={handleLinkClick}
        >
          <FaPhoneAlt className="text-lg" /> Callbacks
        </Link>
        <Link 
          href="/reports" 
          className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-[#1b3358] transition font-medium"
          onClick={handleLinkClick}
        >
          <FaChartBar className="text-lg" /> Reports
        </Link>
        <Link 
          href="/financials" 
          className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-[#1b3358] transition font-medium"
          onClick={handleLinkClick}
        >
          <FaDollarSign className="text-lg" /> Financials
        </Link>
      </nav>

      {/* Components at bottom - Stack vertically on mobile */}
      <div className="mt-auto space-y-3">
        <div className="border-t border-gray-600 pt-3">
          {/* JSON Upload Text Link */}
          <div className="mb-3">
            <button
              onClick={triggerFileUpload}
              disabled={uploading}
              className={`text-sm underline hover:no-underline transition-colors ${
                uploading 
                  ? 'text-gray-400 cursor-not-allowed' 
                  : 'text-blue-400 hover:text-blue-300'
              }`}
            >
              {uploading ? 'Uploading...' : 'Upload JSON'}
            </button>
            
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              className="hidden"
            />
            
            {showUploadStatus && (
              <div className={`mt-2 text-xs p-2 rounded whitespace-pre-line ${
                uploadStatus.includes('Error') || uploadStatus.includes('Please select')
                  ? 'bg-red-900 text-red-200'
                  : uploadStatus.includes('Upload Complete!')
                  ? 'bg-green-900 text-green-200'
                  : 'bg-blue-900 text-blue-200'
              }`}>
                {uploadStatus}
              </div>
            )}
          </div>
          
          <GoogleApiKeyManager />
        </div>
      </div>

      {/* Options Modal */}
      {showOptionsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[#0f2a44] p-6 rounded-lg border border-gray-600 max-w-md w-full mx-4">
            <h2 className="text-lg font-bold text-white mb-4">Upload Options</h2>
            <p className="text-sm text-gray-300 mb-4">
              Configure how the {pendingData.length} businesses should be processed.
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Region (optional)
                </label>
                <input
                  type="text"
                  value={selectedRegion}
                  onChange={(e) => setSelectedRegion(e.target.value)}
                  placeholder="Enter region/city name"
                  className="w-full px-3 py-2 bg-[#1b3358] border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Industry (optional)
                </label>
                <input
                  type="text"
                  value={selectedIndustry}
                  onChange={(e) => setSelectedIndustry(e.target.value)}
                  placeholder="Enter industry name"
                  className="w-full px-3 py-2 bg-[#1b3358] border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Minimum Reviews (optional)
                </label>
                <input
                  type="number"
                  value={minReviews}
                  onChange={(e) => setMinReviews(e.target.value)}
                  placeholder="Enter minimum number of reviews"
                  min="0"
                  className="w-full px-3 py-2 bg-[#1b3358] border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleModalClose}
                  className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleOptionsSubmit}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  Upload
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
} 