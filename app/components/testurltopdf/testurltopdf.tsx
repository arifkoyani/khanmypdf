"use client";

import { useState, useRef } from "react";

const STATIC_URL = "https://khanpdf.com/";
const POLL_INTERVAL_MS = 3000;
const MAX_POLLS = 20; // 20 × 3s = 60s hard ceiling per job

type JobStatus = "pending" | "processing" | "done" | "failed";

interface Job {
  index: number;
  requestId: string;
  status: JobStatus;
  fileUrl?: string;
  note?: string; // "instant" | "polled"
}

export default function TestUrlToPdf() {
  const [totalRequests, setTotalRequests] = useState(5);
  const [batchPerSecond, setBatchPerSecond] = useState(2);
  const [running, setRunning] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [log, setLog] = useState<string[]>([]);

  const intervalsRef = useRef<ReturnType<typeof setInterval>[]>([]);
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

  function clearAllPolls() {
    intervalsRef.current.forEach(clearInterval);
    intervalsRef.current = [];
  }

  function startPolling(index: number, requestId: string) {
    let pollCount = 0;

    const interval = setInterval(async () => {
      if (abortRef.current) {
        clearInterval(interval);
        return;
      }

      pollCount++;
      if (pollCount > MAX_POLLS) {
        clearInterval(interval);
        intervalsRef.current = intervalsRef.current.filter((i) => i !== interval);
        updateJob(index, { status: "failed" });
        addLog(`#${index + 1} timed out after ${MAX_POLLS} polls`);
        return;
      }

      try {
        const res = await fetch(
          `/api/urltopdf/status?requestId=${requestId}`
        );
        if (!res.ok) {
          // Transient server error — keep retrying
          return;
        }
        const data = await res.json();

        if (data.status === "done") {
          clearInterval(interval);
          intervalsRef.current = intervalsRef.current.filter((i) => i !== interval);
          updateJob(index, { status: "done", fileUrl: data.fileUrl, note: "polled" });
          addLog(`#${index + 1} done (polled)`);
        } else if (data.status === "failed") {
          clearInterval(interval);
          intervalsRef.current = intervalsRef.current.filter((i) => i !== interval);
          updateJob(index, { status: "failed" });
          addLog(`#${index + 1} failed`);
        }
      } catch {
        // Network error — keep retrying
      }
    }, POLL_INTERVAL_MS);

    intervalsRef.current.push(interval);
  }

  async function runTest() {
    clearAllPolls();
    abortRef.current = false;
    setRunning(true);
    setJobs([]);
    setLog([]);
    addLog(`Starting ${totalRequests} requests — ${batchPerSecond}/sec`);

    let sent = 0;

    while (sent < totalRequests && !abortRef.current) {
      const batchSize = Math.min(batchPerSecond, totalRequests - sent);
      const batchIndexes = Array.from({ length: batchSize }, (_, i) => sent + i);

      setJobs((prev) => [
        ...prev,
        ...batchIndexes.map((idx) => ({
          index: idx,
          requestId: "",
          status: "pending" as JobStatus,
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

            if (!data.requestId) throw new Error("No requestId in response");

            // ── Instant result (fast path) ──────────────────────────────────
            if (data.status === "done" && data.fileUrl) {
              updateJob(idx, {
                requestId: data.requestId,
                status: "done",
                fileUrl: data.fileUrl,
                note: "instant",
              });
              addLog(`#${idx + 1} done instantly`);
              return;
            }

            if (data.status === "failed") {
              updateJob(idx, { requestId: data.requestId, status: "failed" });
              addLog(`#${idx + 1} failed at intake`);
              return;
            }

            // ── Queued (rate-limited slow path) — start polling ─────────────
            updateJob(idx, { requestId: data.requestId, status: "processing" });
            addLog(`#${idx + 1} queued → polling`);
            startPolling(idx, data.requestId);
          } catch {
            updateJob(idx, { status: "failed" });
            addLog(`#${idx + 1} submit error`);
          }
        })
      );

      sent += batchSize;
      if (sent < totalRequests && !abortRef.current) {
        await new Promise((r) => setTimeout(r, 1000));
      }
    }

    addLog("All requests submitted");
    setRunning(false);
  }

  function stopTest() {
    abortRef.current = true;
    clearAllPolls();
    setRunning(false);
    addLog("Test stopped");
  }

  const doneCount = jobs.filter((j) => j.status === "done").length;
  const failedCount = jobs.filter((j) => j.status === "failed").length;
  const processingCount = jobs.filter(
    (j) => j.status === "processing" || j.status === "pending"
  ).length;
  const instantCount = jobs.filter((j) => j.note === "instant").length;

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-3xl mx-auto space-y-5">

        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            URL → PDF Load Tester
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Static payload:{" "}
            <code className="bg-gray-100 rounded px-1.5 py-0.5 text-xs">
              {`{ url: "${STATIC_URL}" }`}
            </code>
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
              {running ? "Running…" : "Start Test"}
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
                onClick={() => {
                  clearAllPolls();
                  setJobs([]);
                  setLog([]);
                }}
                className="rounded-xl border border-gray-200 text-gray-600 px-6 py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Stats */}
        {jobs.length > 0 && (
          <div className="flex flex-wrap gap-4 text-sm px-1">
            <span className="text-gray-500">
              Total{" "}
              <span className="font-semibold text-gray-900">{jobs.length}</span>
            </span>
            {processingCount > 0 && (
              <span className="text-blue-600">
                Processing{" "}
                <span className="font-semibold">{processingCount}</span>
              </span>
            )}
            <span className="text-green-600">
              Done <span className="font-semibold">{doneCount}</span>
              {instantCount > 0 && (
                <span className="text-green-400 font-normal">
                  {" "}({instantCount} instant)
                </span>
              )}
            </span>
            {failedCount > 0 && (
              <span className="text-red-500">
                Failed <span className="font-semibold">{failedCount}</span>
              </span>
            )}
          </div>
        )}

        {/* Results */}
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

                <span
                  className={`text-xs font-medium px-2.5 py-0.5 rounded-full shrink-0 ${
                    job.status === "done"
                      ? "bg-green-100 text-green-700"
                      : job.status === "failed"
                      ? "bg-red-100 text-red-600"
                      : job.status === "processing"
                      ? "bg-blue-100 text-blue-600"
                      : "bg-gray-100 text-gray-400"
                  }`}
                >
                  {job.status}
                </span>

                {job.note === "instant" && (
                  <span className="text-xs text-gray-400 shrink-0">⚡</span>
                )}

                {job.status === "done" && job.fileUrl ? (
                  <a
                    href={job.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 underline text-sm break-all"
                  >
                    {job.fileUrl}
                  </a>
                ) : (
                  <span className="text-gray-400 text-xs truncate font-mono">
                    {job.requestId || "—"}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Log */}
        {log.length > 0 && (
          <div>
            <p className="text-xs text-gray-500 mb-1.5 px-1">Activity log</p>
            <div className="bg-gray-950 rounded-2xl p-4 max-h-52 overflow-y-auto space-y-0.5">
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
