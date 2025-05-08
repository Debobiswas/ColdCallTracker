import Link from "next/link";
import { FaHome, FaUserFriends, FaPhone, FaCalendarAlt, FaChartBar, FaCog, FaDollarSign, FaSearch, FaMapMarkerAlt } from "react-icons/fa";
import "./globals.css";

export const metadata = {
  title: "ColdCall Tracker",
  description: "Track your cold calls and follow-ups",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-[#f6f8fb] text-gray-900 min-h-screen font-sans">
        <div className="flex min-h-screen">
          <aside className="w-64 bg-[#102542] text-white flex flex-col p-6 gap-8 rounded-r-3xl shadow-lg fixed top-0 left-0 h-full z-40">
            <h1 className="text-2xl font-bold mb-8 tracking-tight">ColdCall Tracker</h1>
            <nav className="flex flex-col gap-2 text-base">
              <Link href="/" className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-[#1b3358] transition font-medium">
                <FaHome className="text-lg" /> Dashboard
              </Link>
              <Link href="/business-lookup" className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-[#1b3358] transition font-medium">
                <FaSearch className="text-lg" /> Business Lookup
              </Link>
              <Link href="/map" className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-[#1b3358] transition font-medium">
                <FaMapMarkerAlt className="text-lg" /> Map
              </Link>
              <Link href="/clients" className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-[#1b3358] transition font-medium">
                <FaUserFriends className="text-lg" /> Clients
              </Link>
              <Link href="/calendar" className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-[#1b3358] transition font-medium">
                <FaCalendarAlt className="text-lg" /> Calendar
              </Link>
              <Link href="/calls" className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-[#1b3358] transition font-medium">
                <FaPhone className="text-lg" /> Calls
              </Link>
              <Link href="/reports" className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-[#1b3358] transition font-medium">
                <FaChartBar className="text-lg" /> Reports
              </Link>
              <Link href="/financials" className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-[#1b3358] transition font-medium">
                <FaDollarSign className="text-lg" /> Financials
              </Link>
            </nav>
          </aside>
          <main className="flex-1 p-10 ml-64">{children}</main>
        </div>
      </body>
    </html>
  );
}
