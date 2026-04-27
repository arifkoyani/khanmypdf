import { NextRequest, NextResponse } from "next/server";
import redis from "@/lib/redis";
import { qstash, qstashReceiver } from "@/lib/qstash";
import { submitPdfJob } from "@/lib/pdfco";
import { checkAndConsumeRateLimit, type JobData } from "@/lib/queue";

const APP_BASE_URL = (process.env.APP_BASE_URL ?? "").replace(/\/$/, "");
const JOB_TTL = 3600;
const DONE_TTL = 300;
const RATE_RETRY_DELAY = 1; // seconds to wait before retrying when rate-limited

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("upstash-signature") ?? "";

  try {
    await qstashReceiver.verify({ signature, body: rawBody, url: req.url });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { requestId } = JSON.parse(rawBody) as { requestId: string };

  if (!requestId) {
    return NextResponse.json({ error: "Missing requestId" }, { status: 400 });
  }

  const job = await redis.get<JobData>(`job:${requestId}`);

  if (!job) {
    return NextResponse.json({ ok: true, skipped: "job not found" });
  }

  if (job.status !== "queued") {
    // Already handled by the fast path or a concurrent worker
    return NextResponse.json({ ok: true, skipped: `status is ${job.status}` });
  }

  const allowed = await checkAndConsumeRateLimit();
  if (!allowed) {
    await qstash.publishJSON({
      url: `${APP_BASE_URL}/api/urltopdf/submit`,
      body: { requestId },
      delay: RATE_RETRY_DELAY,
    });
    return NextResponse.json({ ok: true, rescheduled: true });
  }

  // Mark processing first to prevent duplicate workers from picking up the same job
  await redis.set(`job:${requestId}`, { ...job, status: "processing" }, { ex: JOB_TTL });

  try {
    // async:false — PDF.co returns the final URL directly (~50ms)
    const fileUrl = await submitPdfJob(job.url);
    await redis.set(
      `job:${requestId}`,
      { ...job, status: "done", fileUrl },
      { ex: DONE_TTL }
    );
    return NextResponse.json({ ok: true, fileUrl });
  } catch (err) {
    console.error(`[submit] PDF.co failed for ${requestId}:`, err);
    await redis.set(
      `job:${requestId}`,
      { ...job, status: "failed" },
      { ex: DONE_TTL }
    );
    return NextResponse.json({ ok: true, error: "PDF.co failed" });
  }
}
