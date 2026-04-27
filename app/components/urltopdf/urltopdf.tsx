"use client";

import { useState } from "react";

export default function UrlToPdf() {
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState("");
  const [resultUrl, setResultUrl] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setStatus("Processing...");
    setResultUrl("");
    setError("");

    try {
      const res = await fetch("/api/urltopdf", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url }),
      });

      const data = await res.json();

      if (!data.requestId) {
        throw new Error("Request ID not found");
      }

      // Fast path: intake already called PDF.co and returned the URL directly
      if (data.status === "done" && data.fileUrl) {
        setStatus("");
        setResultUrl(data.fileUrl);
        return;
      }

      if (data.status === "failed") {
        setStatus("");
        setError("PDF conversion failed. Please try another URL.");
        return;
      }

      // Slow path (rate-limited): poll until done
      pollStatus(data.requestId);
    } catch (err) {
      setStatus("");
      setError("Something went wrong. Please try again.");
    }
  };

  const pollStatus = async (requestId: string) => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/urltopdf/status?requestId=${requestId}`);
        const data = await res.json();

        if (data?.status === "done") {
          clearInterval(interval);
          setStatus("");
          setResultUrl(data.fileUrl);
        }

        if (data?.status === "failed") {
          clearInterval(interval);
          setStatus("");
          setError("PDF conversion failed. Please try another URL.");
        }
      } catch {
        clearInterval(interval);
        setStatus("");
        setError("Unable to check status.");
      }
    }, 3000);
  };

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-lg p-6">
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">
          URL to PDF
        </h1>

        <p className="text-gray-500 mb-6">
          Enter a webpage URL and convert it into a PDF.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="url"
            required
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com"
            className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:ring-2 focus:ring-black"
          />

          <button
            type="submit"
            disabled={status === "Processing..."}
            className="w-full rounded-xl bg-black text-white py-3 font-medium hover:bg-gray-800 disabled:opacity-60"
          >
            {status === "Processing..." ? "Processing..." : "Convert to PDF"}
          </button>
        </form>

        {status && (
          <p className="mt-5 text-blue-600 font-medium">{status}</p>
        )}

        {resultUrl && (
          <div className="mt-5 rounded-xl bg-green-50 border border-green-200 p-4">
            <p className="text-green-700 font-medium mb-2">PDF Ready:</p>
            <a
              href={resultUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 underline break-all"
            >
              {resultUrl}
            </a>
          </div>
        )}

        {error && (
          <p className="mt-5 text-red-600 font-medium">{error}</p>
        )}
      </div>
    </main>
  );
}