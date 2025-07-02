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
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Financials</h1>
      <div className="bg-white rounded-lg shadow p-6">
        <p>Financial information will be displayed here</p>
      </div>
    </div>
  );
} 