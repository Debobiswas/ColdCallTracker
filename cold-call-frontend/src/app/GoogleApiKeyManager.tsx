"use client";
import { useState, useEffect } from "react";

export default function GoogleApiKeyManager() {
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [inputKey, setInputKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (showApiKeyModal) {
      setLoading(true);
      fetch("http://localhost:8001/api/admin/google-api-key")
        .then(res => res.json())
        .then(data => {
          setApiKey(data.key);
          setLoading(false);
        });
    }
  }, [showApiKeyModal]);

  const handleSave = async () => {
    setLoading(true);
    setMessage("");
    const res = await fetch("http://localhost:8001/api/admin/google-api-key", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: inputKey })
    });
    if (res.ok) {
      setMessage("API key updated.");
      setInputKey("");
      const data = await res.json();
      fetch("http://localhost:8001/api/admin/google-api-key").then(r => r.json()).then(d => setApiKey(d.key));
    } else {
      setMessage("Failed to update key.");
    }
    setLoading(false);
  };

  const handleDelete = async () => {
    setLoading(true);
    setMessage("");
    const res = await fetch("http://localhost:8001/api/admin/google-api-key", { method: "DELETE" });
    if (res.ok) {
      setMessage("API key removed.");
      setApiKey(null);
    } else {
      setMessage("Failed to remove key.");
    }
    setLoading(false);
  };

  return (
    <>
      <button
        className="mt-8 px-4 py-3 rounded-xl font-bold text-lg bg-gradient-to-r from-yellow-400 to-orange-500 text-[#102542] shadow-lg hover:from-yellow-500 hover:to-orange-600 transition border-2 border-yellow-300 outline-none focus:ring-4 focus:ring-yellow-200"
        style={{ letterSpacing: '0.05em' }}
        onClick={() => setShowApiKeyModal(true)}
      >
        Google API Key
      </button>
      {showApiKeyModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowApiKeyModal(false)}>
          <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md relative" onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowApiKeyModal(false)} className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-2xl">&times;</button>
            <h3 className="text-2xl font-bold mb-4 text-center">Google API Key</h3>
            <div className="mb-6 text-center">
              <div className="text-gray-600 mb-1">Current Key:</div>
              <div className="inline-block px-4 py-2 rounded bg-gray-100 border border-gray-300 font-mono text-blue-700 text-lg tracking-wider">
                {apiKey ? apiKey : <span className="text-gray-400">Not set</span>}
              </div>
            </div>
            <input
              type="text"
              className="border border-gray-300 rounded px-3 py-2 w-full mb-4 focus:outline-none focus:ring-2 focus:ring-blue-300"
              placeholder="Enter new API key"
              value={inputKey}
              onChange={e => setInputKey(e.target.value)}
            />
            <div className="flex gap-4 justify-center mt-2">
              <button
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded shadow transition"
                onClick={handleSave}
                disabled={loading || !inputKey}
              >
                Save
              </button>
              <button
                className="bg-red-500 hover:bg-red-600 text-white font-semibold px-6 py-2 rounded shadow transition"
                onClick={handleDelete}
                disabled={loading || !apiKey}
              >
                Remove
              </button>
            </div>
            {message && <div className="mt-6 text-center text-green-700 font-semibold">{message}</div>}
          </div>
        </div>
      )}
    </>
  );
} 