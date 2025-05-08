import React from "react";

export default function ReportsPage() {
  const cards = [
    { title: "Total Calls", value: "123" },
    { title: "New Clients", value: "12" },
    { title: "Revenue", value: "$4,500" },
    { title: "Meetings Scheduled", value: "8" },
    { title: "Follow Ups", value: "15" },
    { title: "Callbacks", value: "5" },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <h2 className="text-3xl font-bold mb-8">Reports</h2>
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