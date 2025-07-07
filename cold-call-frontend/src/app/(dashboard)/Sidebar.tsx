"use client";
import Link from "next/link";
import { FaHome, FaUserFriends, FaPhone, FaCalendarAlt, FaChartBar, FaCog, FaDollarSign, FaSearch, FaPhoneAlt, FaTimes } from "react-icons/fa";
import GoogleApiKeyManager from "./GoogleApiKeyManager";
import JsonUploader from "../components/JsonUploader";

interface SidebarProps {
  onClose?: () => void;
}

export default function Sidebar({ onClose }: SidebarProps) {
  const handleLinkClick = () => {
    // Close sidebar on mobile when a link is clicked
    if (onClose) {
      onClose();
    }
  };

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

      {/* Components - Stack vertically on mobile */}
      <div className="mt-auto space-y-4">
        <div className="border-t border-gray-600 pt-4">
          <JsonUploader />
        </div>
        <GoogleApiKeyManager />
      </div>
    </>
  );
} 