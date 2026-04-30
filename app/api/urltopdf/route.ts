import { NextRequest, NextResponse } from "next/server";
import redis from "@/lib/redis";
import { qstash } from "@/lib/qstash";
import { generateRequestId } from "@/lib/ids";
import { enqueueJob, type JobData } from "@/lib/queue";

const APP_BASE_URL = (process.env.APP_BASE_URL ?? "").replace(/\/$/, "");
const JOB_TTL = 3600;
const FLOW_RATE = Number(process.env.KHANPDF_RATE_LIMIT_PER_SECOND ?? 2);

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
      console.warn("[urltopdf] Redis save failed:", err);
    }

    try {
      await enqueueJob(requestId);
    } catch (err) {
      console.warn("[urltopdf] enqueueJob failed:", err);
    }

    // flowControl lets QStash enforce FLOW_RATE deliveries/sec to /submit.
    // PDF.co is never called here — the intake always returns instantly.
    await qstash.publishJSON({
      url: `${APP_BASE_URL}/api/urltopdf/submit`,
      body: { requestId, url },
      flowControl: {
        key: "pdfco-rate",
        ratePerSecond: FLOW_RATE,
      },
    });

    return NextResponse.json({ success: true, requestId, status: "processing" });
  } catch (err) {
    console.error("[urltopdf] intake error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
