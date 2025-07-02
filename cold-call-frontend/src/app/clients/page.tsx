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
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Clients</h1>
      <div className="bg-white rounded-lg shadow p-6">
        <p>Clients list will be displayed here</p>
      </div>
    </div>
  );
} 