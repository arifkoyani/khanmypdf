"use client";

import { useState } from "react";

export default function SendEmail() {
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSent(false);

    try {
      const res = await fetch("/api/sendemail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, subject, body }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Failed to send email.");
      } else {
        setSent(true);
        setEmail("");
        setSubject("");
        setBody("");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="w-full max-w-lg">
        <h1 className="text-2xl font-semibold text-gray-900 mb-1">Send Email</h1>
        <p className="text-sm text-gray-500 mb-6">Fill in the details below to send an email.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">To</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="recipient@example.com"
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-black"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Subject</label>
            <input
              type="text"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject"
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-black"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Message</label>
            <textarea
              required
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your message here..."
              rows={6}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-black resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-gray-900 text-white py-3 text-sm font-medium hover:bg-gray-700 disabled:opacity-50 transition-colors"
          >
            {loading ? "Sending…" : "Send Email"}
          </button>
        </form>

        {sent && (
          <div className="mt-5 rounded-xl bg-green-50 border border-green-200 p-4">
            <p className="text-green-700 text-sm font-medium">✓ Email sent successfully.</p>
          </div>
        )}

        {error && (
          <div className="mt-5 rounded-xl bg-red-50 border border-red-200 p-4">
            <p className="text-red-600 text-sm font-medium">{error}</p>
          </div>
        )}
      </div>
    </main>
  );
}
