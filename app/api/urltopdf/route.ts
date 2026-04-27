import { NextRequest, NextResponse } from "next/server";
import redis from "@/lib/redis";
import { qstash } from "@/lib/qstash";
import { generateRequestId } from "@/lib/ids";
import { enqueueJob, checkAndConsumeRateLimit, type JobData } from "@/lib/queue";
import { submitPdfJob } from "@/lib/pdfco";

const APP_BASE_URL = (process.env.APP_BASE_URL ?? "").replace(/\/$/, "");
const JOB_TTL = 3600;
const DONE_TTL = 300;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url } = body as { url?: string };

    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "url is required" }, { status: 400 });
    }
    try {
      new URL(url);
    } catch {
      return NextResponse.json({ error: "Invalid URL format" }, { status: 400 });
    }

    const requestId = generateRequestId();
    const job: JobData = {
      requestId,
      url,
      status: "queued",
      retries: 0,
      createdAt: Date.now(),
    };

    try {
      await redis.set(`job:${requestId}`, job, { ex: JOB_TTL });
    } catch (err) {
      console.warn("[urltopdf] Redis initial save failed:", err);
    }

    // Check rate limit; default to allowed when Redis is unreachable
    let allowed = true;
    try {
      allowed = await checkAndConsumeRateLimit();
    } catch (err) {
      console.warn("[urltopdf] Rate-limit check failed, defaulting to allowed:", err);
    }

    if (allowed) {
      return await callPdfCo(requestId, url, job);
    }

    // ── Slow path: rate-limited → hand off to QStash ────────────────────────
    // If QStash is unreachable (e.g. local dev), fall back to calling PDF.co
    // directly so the request never hard-fails just because of QStash.
    try {
      await enqueueJob(requestId);
      await qstash.publishJSON({
        url: `${APP_BASE_URL}/api/urltopdf/submit`,
        body: { requestId },
      });
      return NextResponse.json({ success: true, requestId, status: "processing" });
    } catch (err) {
      console.warn("[urltopdf] QStash unavailable, falling back to direct call:", err);
      return await callPdfCo(requestId, url, job);
    }
  } catch (err) {
    console.error("[urltopdf] intake error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Shared helper: call PDF.co directly and return an immediate response.
async function callPdfCo(
  requestId: string,
  url: string,
  job: JobData
): Promise<Response> {
  try {
    const fileUrl = await submitPdfJob(url);
    try {
      await redis.set(
        `job:${requestId}`,
        { ...job, status: "done", fileUrl },
        { ex: DONE_TTL }
      );
    } catch (err) {
      console.warn("[urltopdf] Redis done-save failed:", err);
    }
    return NextResponse.json({ success: true, requestId, status: "done", fileUrl });
  } catch (err) {
    console.error(`[urltopdf] PDF.co failed for ${requestId}:`, err);
    try {
      await redis.set(
        `job:${requestId}`,
        { ...job, status: "failed" },
        { ex: DONE_TTL }
      );
    } catch {}
    return NextResponse.json({ success: true, requestId, status: "failed" });
  }
}
