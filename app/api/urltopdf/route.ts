import { NextRequest, NextResponse } from "next/server";
import redis from "@/lib/redis";
import { qstash } from "@/lib/qstash";
import { generateRequestId } from "@/lib/ids";
import { enqueueJob, checkAndConsumeRateLimit, type JobData } from "@/lib/queue";
import { submitPdfJob } from "@/lib/pdfco";

const APP_BASE_URL = (process.env.APP_BASE_URL ?? "").replace(/\/$/, "");
const JOB_TTL = 3600;
const DONE_TTL = 3600;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

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

    let allowed = true;
    try {
      allowed = await checkAndConsumeRateLimit();
    } catch (err) {
      console.warn("[urltopdf] Rate-limit check failed, defaulting to allowed:", err);
    }

    if (allowed) {
      return await callPdfCo(requestId, url, job);
    }

    try {
      await enqueueJob(requestId);
      await qstash.publishJSON({
        url: `${APP_BASE_URL}/api/urltopdf/submit`,
        body: { requestId, url }, // url carried so submit worker can reconstruct job if Redis is empty
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

async function callPdfCo(
  requestId: string,
  url: string,
  job: JobData
): Promise<Response> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
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
      lastError = err;
      console.warn(`[urltopdf] PDF.co attempt ${attempt}/${MAX_RETRIES} failed for ${requestId}:`, err);

      if (attempt < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
      }
    }
  }

  console.error(`[urltopdf] All ${MAX_RETRIES} attempts failed for ${requestId}:`, lastError);
  try {
    await redis.set(
      `job:${requestId}`,
      { ...job, status: "failed" },
      { ex: DONE_TTL }
    );
  } catch {}

  return NextResponse.json({ success: true, requestId, status: "failed" });
}
