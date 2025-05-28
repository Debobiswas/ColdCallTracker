import Link from "next/link";
import { FaHome, FaUserFriends, FaPhone, FaCalendarAlt, FaChartBar, FaCog, FaDollarSign, FaSearch, FaMapMarkerAlt } from "react-icons/fa";
import "./globals.css";
import Sidebar from "./Sidebar";

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
            <Sidebar />
          </aside>
          <main className="flex-1 p-10 ml-64">{children}</main>
        </div>
      </body>
    </html>
  );
}
