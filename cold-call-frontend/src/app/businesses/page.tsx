"use client";
import React, { useEffect, useState } from "react";

const API_URL = "http://localhost:8001/api/businesses";

type Business = {
  name: string;
  phone?: string;
  address?: string;
  status: string;
  comment?: string;
};

const emptyForm: Business = { name: '', phone: '', address: '', status: 'tocall', comment: '' };

const statusOptions = ["tocall", "called", "callback", "dont_call"];

export default function BusinessesPage() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [modalIdx, setModalIdx] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function fetchBusinesses() {
    setLoading(true);
    try {
      const res = await fetch(API_URL);
      const data = await res.json();
      setBusinesses(data);
    } catch (e) {
      setError("Failed to fetch businesses");
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchBusinesses();
  }, []);

  function openModal(idx: number | null) {
    setModalIdx(idx);
    if (idx === null) {
      setForm(emptyForm);
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

  return (
    <div className="w-full mx-auto px-4">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-3xl font-bold">Businesses</h2>
        <button
          className="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-5 py-2 rounded-lg shadow transition"
          onClick={() => openModal(null)}
        >
          + New Business
        </button>
      </div>
      {error && <div className="text-red-500 mb-4">{error}</div>}
      <div className="bg-white rounded-xl shadow-2xl p-6 overflow-x-auto w-full">
        {loading ? (
          <div>Loading...</div>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="text-gray-500 text-sm">
                <th className="py-2 px-4 font-semibold">Name</th>
                <th className="py-2 px-4 font-semibold">Phone</th>
                <th className="py-2 px-4 font-semibold">Address</th>
                <th className="py-2 px-4 font-semibold">Status</th>
                <th className="py-2 px-4 font-semibold">Comment</th>
                <th className="py-2 px-4 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {businesses.map((b, idx) => (
                <tr key={b.name + idx} className="border-t border-gray-200 hover:bg-gray-50">
                  <td className="py-2 px-4 font-medium">{b.name}</td>
                  <td className="py-2 px-4">{b.phone || ''}</td>
                  <td className="py-2 px-4">{b.address || ''}</td>
                  <td className="py-2 px-4 capitalize">{b.status}</td>
                  <td className="py-2 px-4">{b.comment || ''}</td>
                  <td className="py-2 px-4">
                    <button className="text-blue-600 hover:underline mr-2" onClick={() => openModal(idx)}>Edit</button>
                    <button className="text-red-600 hover:underline" onClick={() => handleDelete(idx)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {/* Modal for Add/Edit Business */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-lg relative">
            <button onClick={closeModal} className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-2xl">&times;</button>
            <h3 className="text-xl font-bold mb-4">{modalIdx === null ? 'Add Business' : 'Edit Business'}</h3>
            <form onSubmit={handleFormSubmit} className="flex flex-col gap-4">
              <input type="text" name="name" placeholder="Name" className="border rounded px-3 py-2" value={form.name} onChange={handleFormChange} required />
              <input type="text" name="phone" placeholder="Phone" className="border rounded px-3 py-2" value={form.phone} onChange={handleFormChange} />
              <input type="text" name="address" placeholder="Address" className="border rounded px-3 py-2" value={form.address} onChange={handleFormChange} />
              <select name="status" className="border rounded px-3 py-2" value={form.status} onChange={handleFormChange} required>
                {statusOptions.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
              <input type="text" name="comment" placeholder="Comment" className="border rounded px-3 py-2" value={form.comment} onChange={handleFormChange} />
              <div className="flex gap-4 mt-2">
                <button type="submit" className="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-5 py-2 rounded-lg shadow transition">Save</button>
                <button type="button" onClick={closeModal} className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold px-5 py-2 rounded-lg shadow transition">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
} 