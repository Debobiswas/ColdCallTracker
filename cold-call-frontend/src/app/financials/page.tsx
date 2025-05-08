"use client";
import React, { useEffect, useState } from "react";

function isThisMonth(dateStr) {
  if (!dateStr) return false;
  const now = new Date();
  const d = new Date(dateStr);
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

export default function FinancialsPage() {
  const [monthlyRecurring, setMonthlyRecurring] = useState(0);
  const [totalClients, setTotalClients] = useState(0);
  const [newClients, setNewClients] = useState(0);

  useEffect(() => {
    async function fetchClients() {
      try {
        const res = await fetch("http://localhost:8001/api/clients");
        const data = await res.json();
        if (Array.isArray(data)) {
          setTotalClients(data.length);
          const sum = data.reduce((acc, c) => acc + (parseFloat(c.subscription) || 0), 0);
          setMonthlyRecurring(sum);
          const newCount = data.filter(c => isThisMonth(c.date)).length;
          setNewClients(newCount);
        }
      } catch (e) {
        setMonthlyRecurring(0);
        setTotalClients(0);
        setNewClients(0);
      }
    }
    fetchClients();
  }, []);

  const cards = [
    { title: "Total Revenue", value: 0 },
    { title: "Monthly Recurring", value: monthlyRecurring },
    { title: "Revenue This Month", value: 0 },
    { title: "Total Clients", value: totalClients },
    { title: "New Clients", value: newClients },
    { title: "Expenses", value: 0 },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <h2 className="text-3xl font-bold mb-8">Financials</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
        {cards.map((card, idx) => (
          <div
            key={idx}
            className="bg-white rounded-2xl shadow-2xl p-12 min-h-[260px] flex flex-col items-center justify-center border border-gray-100 hover:shadow-3xl transition-all duration-150"
          >
            <div className="text-gray-400 text-sm uppercase tracking-wider mb-2 font-semibold">
              {card.title}
            </div>
            <div className="text-4xl font-bold text-blue-700 mb-1">{card.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
} 