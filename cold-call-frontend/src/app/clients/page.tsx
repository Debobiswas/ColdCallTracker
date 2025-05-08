"use client";
import React, { useEffect, useState } from "react";

const API_URL = "http://localhost:8001/api/clients";

const emptyForm = { name: '', address: '', price: '', subscription: '', date: '', phone: '', website: '' };

export default function ClientsPage() {
  const [clients, setClients] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [modalIdx, setModalIdx] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function fetchClients() {
    setLoading(true);
    try {
      const res = await fetch(API_URL);
      const data = await res.json();
      setClients(Array.isArray(data) ? data : []);
    } catch (e) {
      setError("Failed to fetch clients");
      setClients([]);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchClients();
  }, []);

  function openModal(idx: number | null) {
    setModalIdx(idx);
    if (idx === null) {
      setForm(emptyForm);
    } else {
      setForm(clients[idx]);
    }
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setModalIdx(null);
  }

  function handleFormChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      if (modalIdx === null) {
        // Add client
        const res = await fetch(API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        if (!res.ok) throw new Error("Failed to add client");
      } else {
        // Edit client
        const res = await fetch(`${API_URL}/${encodeURIComponent(clients[modalIdx].name)}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        if (!res.ok) throw new Error("Failed to update client");
      }
      closeModal();
      fetchClients();
    } catch (e) {
      setError("Failed to save client");
    }
  }

  async function handleDelete(idx: number) {
    if (!window.confirm("Delete this client?")) return;
    try {
      const res = await fetch(`${API_URL}/${encodeURIComponent(clients[idx].name)}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete client");
      fetchClients();
    } catch (e) {
      setError("Failed to delete client");
    }
  }

  return (
    <div className="w-full mx-auto px-4">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-3xl font-bold">Clients</h2>
        <button
          className="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-5 py-2 rounded-lg shadow transition"
          onClick={() => openModal(null)}
        >
          + New Client
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
                <th className="py-2 px-4 font-semibold">Address</th>
                <th className="py-2 px-4 font-semibold">Phone Number</th>
                <th className="py-2 px-4 font-semibold">Website</th>
                <th className="py-2 px-4 font-semibold">Price</th>
                <th className="py-2 px-4 font-semibold">Subscription Fee</th>
                <th className="py-2 px-4 font-semibold">Date Acquired</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c, idx) => (
                <tr
                  key={c.name + idx}
                  className="border-t border-gray-200 hover:bg-gray-50 cursor-pointer"
                  onClick={() => openModal(idx)}
                >
                  <td className="py-2 px-4 font-medium">{c.name}</td>
                  <td className="py-2 px-4">{c.address}</td>
                  <td className="py-2 px-4">{c.phone}</td>
                  <td className="py-2 px-4">
                    {c.website ? <a href={c.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline" onClick={e => e.stopPropagation()}>{c.website}</a> : ''}
                  </td>
                  <td className="py-2 px-4">{c.price}</td>
                  <td className="py-2 px-4">{c.subscription}</td>
                  <td className="py-2 px-4">{c.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {/* Modal for Add/Edit Client */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={closeModal}
        >
          <div
            className="bg-white rounded-lg shadow-lg p-6 w-full max-w-lg relative"
            onClick={e => e.stopPropagation()}
          >
            <button onClick={closeModal} className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-2xl">&times;</button>
            <h3 className="text-xl font-bold mb-4">{modalIdx === null ? 'Add Client' : 'Edit Client'}</h3>
            <form onSubmit={handleFormSubmit} className="flex flex-col gap-4">
              <input type="text" name="name" placeholder="Name" className="border rounded px-3 py-2" value={form.name} onChange={handleFormChange} required />
              <input type="text" name="address" placeholder="Address" className="border rounded px-3 py-2" value={form.address} onChange={handleFormChange} required />
              <input type="text" name="phone" placeholder="Phone Number" className="border rounded px-3 py-2" value={form.phone} onChange={handleFormChange} required />
              <input type="text" name="website" placeholder="Website" className="border rounded px-3 py-2" value={form.website} onChange={handleFormChange} />
              <input type="number" name="price" placeholder="Price" className="border rounded px-3 py-2" value={form.price} onChange={handleFormChange} required />
              <input type="number" name="subscription" placeholder="Subscription Fee" className="border rounded px-3 py-2" value={form.subscription} onChange={handleFormChange} required />
              <input type="date" name="date" placeholder="Date Acquired" className="border rounded px-3 py-2" value={form.date} onChange={handleFormChange} required />
              <div className="flex gap-4 mt-2">
                <button type="submit" className="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-5 py-2 rounded-lg shadow transition">Save</button>
                <button type="button" onClick={closeModal} className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold px-5 py-2 rounded-lg shadow transition">Cancel</button>
                {modalIdx !== null && (
                  <button
                    type="button"
                    onClick={() => handleDelete(modalIdx)}
                    className="bg-red-500 hover:bg-red-600 text-white font-semibold px-5 py-2 rounded-lg shadow transition ml-auto"
                  >
                    Delete
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
} 