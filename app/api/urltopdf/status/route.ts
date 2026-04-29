import { NextRequest, NextResponse } from "next/server";
import redis from "@/lib/redis";
import type { JobData } from "@/lib/queue";

const SEEN_DONE_TTL = 3600;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const requestId = searchParams.get("requestId");

  if (!requestId) {
    return NextResponse.json({ error: "requestId is required" }, { status: 400 });
  }

  let job: JobData | null;
  try {
    job = await redis.get<JobData>(`job:${requestId}`);
  } catch (err) {
    console.error("[status] Redis error:", err);
    return NextResponse.json({ status: "processing" });
  }

  // Distinct status for "key not in Redis" vs "job explicitly failed"
  if (!job) {
    return NextResponse.json({ status: "not_found" });
  }

  if (job.status === "done") {
    await redis.expire(`job:${requestId}`, SEEN_DONE_TTL).catch(() => {});
    return NextResponse.json({ status: "done", fileUrl: job.fileUrl });
  }

  if (job.status === "failed") {
    return NextResponse.json({ status: "failed" });
  }

  return NextResponse.json({ status: "processing" });
}
