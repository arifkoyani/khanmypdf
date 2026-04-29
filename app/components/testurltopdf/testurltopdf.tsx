"use client";

import { useState, useRef } from "react";

const STATIC_URL = "https://khanpdf.com/";

interface Job {
  index: number;
  requestId: string;
  copied: boolean;
}

export default function TestUrlToPdf() {
  const [totalRequests, setTotalRequests] = useState(5);
  const [batchPerSecond, setBatchPerSecond] = useState(2);
  const [running, setRunning] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [log, setLog] = useState<string[]>([]);
  const abortRef = useRef(false);

  const addLog = (msg: string) =>
    setLog((prev) => [
      `[${new Date().toLocaleTimeString()}] ${msg}`,
      ...prev,
    ]);

  const updateJob = (index: number, patch: Partial<Job>) =>
    setJobs((prev) =>
      prev.map((j) => (j.index === index ? { ...j, ...patch } : j))
    );

  async function runTest() {
    abortRef.current = false;
    setRunning(true);
    setJobs([]);
    setLog([]);
    addLog(`Sending ${totalRequests} requests — ${batchPerSecond}/sec`);

    let sent = 0;

    while (sent < totalRequests && !abortRef.current) {
      const batchSize = Math.min(batchPerSecond, totalRequests - sent);
      const batchIndexes = Array.from({ length: batchSize }, (_, i) => sent + i);

      setJobs((prev) => [
        ...prev,
        ...batchIndexes.map((idx) => ({
          index: idx,
          requestId: "",
          copied: false,
        })),
      ]);

      await Promise.all(
        batchIndexes.map(async (idx) => {
          try {
            const res = await fetch("/api/urltopdf", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ url: STATIC_URL }),
            });
            const data = await res.json();
            if (!data.requestId) throw new Error("No requestId");
            updateJob(idx, { requestId: data.requestId });
            addLog(`#${idx + 1} → ${data.requestId}`);
          } catch {
            addLog(`#${idx + 1} failed`);
          }
        })
      );

      sent += batchSize;
      if (sent < totalRequests && !abortRef.current) {
        await new Promise((r) => setTimeout(r, 1000));
      }
    }

    addLog("Done — all requests sent");
    setRunning(false);
  }

  function stopTest() {
    abortRef.current = true;
    setRunning(false);
    addLog("Stopped");
  }

  async function copyId(index: number, requestId: string) {
    await navigator.clipboard.writeText(requestId);
    updateJob(index, { copied: true });
    setTimeout(() => updateJob(index, { copied: false }), 1500);
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto space-y-5">

        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            URL → PDF Request ID Tester
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Sends requests and shows the{" "}
            <code className="bg-gray-100 rounded px-1 text-xs">requestId</code>{" "}
            returned by each one.
          </p>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <div className="grid grid-cols-2 gap-4 mb-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Total requests
              </label>
              <input
                type="number"
                min={1}
                max={500}
                value={totalRequests}
                disabled={running}
                onChange={(e) =>
                  setTotalRequests(Math.max(1, Number(e.target.value)))
                }
                className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-black disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Requests per second
              </label>
              <input
                type="number"
                min={1}
                max={100}
                value={batchPerSecond}
                disabled={running}
                onChange={(e) =>
                  setBatchPerSecond(Math.max(1, Number(e.target.value)))
                }
                className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-black disabled:opacity-50"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={runTest}
              disabled={running}
              className="rounded-xl bg-black text-white px-6 py-2.5 text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
            >
              {running ? "Sending…" : "Send Requests"}
            </button>
            {running && (
              <button
                onClick={stopTest}
                className="rounded-xl border border-red-200 text-red-600 px-6 py-2.5 text-sm font-medium hover:bg-red-50 transition-colors"
              >
                Stop
              </button>
            )}
            {!running && jobs.length > 0 && (
              <button
                onClick={() => { setJobs([]); setLog([]); }}
                className="rounded-xl border border-gray-200 text-gray-600 px-6 py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Request ID list */}
        {jobs.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            {jobs.map((job) => (
              <div
                key={job.index}
                className="flex items-center gap-3 px-5 py-3 border-b border-gray-100 last:border-0"
              >
                <span className="text-xs text-gray-400 w-7 shrink-0 text-right">
                  #{job.index + 1}
                </span>

                <span className="flex-1 text-xs font-mono text-gray-700 truncate">
                  {job.requestId || "—"}
                </span>

                {job.requestId && (
                  <button
                    onClick={() => copyId(job.index, job.requestId)}
                    className={`shrink-0 text-xs px-3 py-1 rounded-lg border transition-colors ${
                      job.copied
                        ? "border-green-300 text-green-600 bg-green-50"
                        : "border-gray-200 text-gray-500 hover:bg-gray-50"
                    }`}
                  >
                    {job.copied ? "Copied!" : "Copy"}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Log */}
        {log.length > 0 && (
          <div>
            <p className="text-xs text-gray-500 mb-1.5 px-1">Log</p>
            <div className="bg-gray-950 rounded-2xl p-4 max-h-48 overflow-y-auto space-y-0.5">
              {log.map((entry, i) => (
                <p key={i} className="text-green-400 text-xs font-mono leading-5">
                  {entry}
                </p>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
