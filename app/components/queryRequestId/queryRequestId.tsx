"use client";

import { useState } from "react";

type ResultStatus = "done" | "processing" | "failed" | "not_found" | "network_error" | null;

export default function QueryRequestId() {
  const [requestId, setRequestId] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [result, setResult] = useState<{ status: ResultStatus; fileUrl?: string }>({
    status: null,
  });

  async function copyUrl(url: string) {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function handleFetch() {
    const id = requestId.trim();
    if (!id) return;

    setLoading(true);
    setResult({ status: null });

    try {
      const res = await fetch(
        `/api/urltopdf/status?requestId=${encodeURIComponent(id)}`
      );
      const data = await res.json();

      if (data.status === "done" && data.fileUrl) {
        setResult({ status: "done", fileUrl: data.fileUrl });
      } else if (data.status === "processing") {
        setResult({ status: "processing" });
      } else if (data.status === "failed") {
        setResult({ status: "failed" });
      } else {
        // "not_found" — key not in Redis (expired or never saved)
        setResult({ status: "not_found" });
      }
    } catch {
      setResult({ status: "network_error" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-lg p-6">
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">
          Query by Request ID
        </h1>
        <p className="text-gray-500 text-sm mb-6">
          Enter a Request ID to fetch its PDF result.
        </p>

        <div className="space-y-3">
          <input
            type="text"
            value={requestId}
            onChange={(e) => setRequestId(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleFetch()}
            placeholder="req_a1b2c3d4e5f6g7h8"
            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-black font-mono"
          />

          <button
            onClick={handleFetch}
            disabled={loading || !requestId.trim()}
            className="w-full rounded-xl bg-black text-white py-3 text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
          >
            {loading ? "Fetching…" : "Fetch Result"}
          </button>
        </div>

        {/* Done */}
        {result.status === "done" && result.fileUrl && (
          <div className="mt-5 rounded-xl bg-green-50 border border-green-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-green-700 text-sm font-semibold">✓ PDF Ready</p>
              <button
                onClick={() => copyUrl(result.fileUrl!)}
                className={`text-xs px-3 py-1 rounded-lg border transition-colors ${
                  copied
                    ? "border-green-400 text-green-600 bg-green-100"
                    : "border-green-300 text-green-700 hover:bg-green-100"
                }`}
              >
                {copied ? "Copied!" : "Copy URL"}
              </button>
            </div>
            <a
              href={result.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 underline break-all text-sm hover:text-blue-800"
            >
              {result.fileUrl}
            </a>
          </div>
        )}

        {/* Still processing */}
        {result.status === "processing" && (
          <div className="mt-5 rounded-xl bg-blue-50 border border-blue-200 p-4">
            <p className="text-blue-700 text-sm font-medium">
              Still processing — click Fetch again in a few seconds.
            </p>
          </div>
        )}

        {/* PDF.co genuinely failed */}
        {result.status === "failed" && (
          <div className="mt-5 rounded-xl bg-red-50 border border-red-200 p-4">
            <p className="text-red-600 text-sm font-medium">
              PDF conversion failed for this request. No result is available.
            </p>
          </div>
        )}

        {/* Not in Redis — expired or invalid */}
        {result.status === "not_found" && (
          <div className="mt-5 rounded-xl bg-yellow-50 border border-yellow-200 p-4">
            <p className="text-yellow-700 text-sm font-medium">
              Result not found. The Request ID may be expired (&gt;1 hour) or invalid.
            </p>
          </div>
        )}

        {/* Network error */}
        {result.status === "network_error" && (
          <div className="mt-5 rounded-xl bg-gray-50 border border-gray-200 p-4">
            <p className="text-gray-600 text-sm font-medium">
              Network error. Check your connection and try again.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
