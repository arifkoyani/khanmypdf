import { NextRequest, NextResponse } from "next/server";
import redis from "@/lib/redis";
import { qstash, qstashReceiver } from "@/lib/qstash";
import { submitPdfJob } from "@/lib/pdfco";
import { checkAndConsumeRateLimit, type JobData } from "@/lib/queue";

const APP_BASE_URL = (process.env.APP_BASE_URL ?? "").replace(/\/$/, "");
const JOB_TTL = 3600;
const DONE_TTL = 3600;
const RATE_RETRY_DELAY = 1;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("upstash-signature") ?? "";

  try {
    await qstashReceiver.verify({ signature, body: rawBody, url: req.url });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // url is carried in every QStash message so we can reconstruct
  // the job even if the initial Redis save failed
  const { requestId, url } = JSON.parse(rawBody) as {
    requestId: string;
    url: string;
  };

  if (!requestId || !url) {
    return NextResponse.json({ error: "Missing requestId or url" }, { status: 400 });
  }

  // Try to load job from Redis; if missing, reconstruct from message payload
  let job: JobData | null = null;
  try {
    job = await redis.get<JobData>(`job:${requestId}`);
  } catch (err) {
    console.warn(`[submit] Redis get failed for ${requestId}:`, err);
  }

  if (!job) {
    // Redis save in intake failed silently — rebuild from QStash message
    job = { requestId, url, status: "queued", retries: 0, createdAt: Date.now() };
    try {
      await redis.set(`job:${requestId}`, job, { ex: JOB_TTL });
    } catch (err) {
      console.warn(`[submit] Redis re-save failed for ${requestId}:`, err);
    }
  }

  if (job.status !== "queued") {
    return NextResponse.json({ ok: true, skipped: `status is ${job.status}` });
  }

  // Rate limit check — if Redis is down, default to allowed
  let allowed = true;
  try {
    allowed = await checkAndConsumeRateLimit();
  } catch (err) {
    console.warn("[submit] Rate-limit check failed, defaulting to allowed:", err);
  }

  if (!allowed) {
    // Pass url along so the rescheduled worker also has it
    await qstash.publishJSON({
      url: `${APP_BASE_URL}/api/urltopdf/submit`,
      body: { requestId, url },
      delay: RATE_RETRY_DELAY,
    });
    return NextResponse.json({ ok: true, rescheduled: true });
  }

  // Mark as processing to prevent duplicate workers
  try {
    await redis.set(
      `job:${requestId}`,
      { ...job, status: "processing" },
      { ex: JOB_TTL }
    );
  } catch (err) {
    console.warn(`[submit] Redis processing-save failed for ${requestId}:`, err);
  }

  // Retry loop — same as the fast path in the intake route
  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const fileUrl = await submitPdfJob(job.url);
      try {
        await redis.set(
          `job:${requestId}`,
          { ...job, status: "done", fileUrl },
          { ex: DONE_TTL }
        );
      } catch (err) {
        console.warn(`[submit] Redis done-save failed for ${requestId}:`, err);
      }
      return NextResponse.json({ ok: true, fileUrl });
    } catch (err) {
      lastError = err;
      console.warn(
        `[submit] PDF.co attempt ${attempt}/${MAX_RETRIES} failed for ${requestId}:`,
        err
      );
      if (attempt < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
      }
    }
  }

  console.error(
    `[submit] All ${MAX_RETRIES} attempts failed for ${requestId}:`,
    lastError
  );
  try {
    await redis.set(
      `job:${requestId}`,
      { ...job, status: "failed" },
      { ex: DONE_TTL }
    );
  } catch {}
  return NextResponse.json({ ok: true, error: "PDF.co failed after retries" });
}
