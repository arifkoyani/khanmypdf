import redis from "./redis";

const QUEUE_KEY = "urltopdf:queue";
const RATE_LIMIT_PREFIX = "pdfco:rate:";
const RATE_LIMIT_PER_SECOND = 2;

export type JobStatus = "queued" | "processing" | "done" | "failed";

export interface JobData {
  requestId: string;
  url: string;
  status: JobStatus;
  jobId?: string;
  fileUrl?: string;
  retries: number;
  createdAt: number;
}

export async function enqueueJob(requestId: string): Promise<void> {
  await redis.rpush(QUEUE_KEY, requestId);
}

// Sliding-window rate limiter: allow RATE_LIMIT_PER_SECOND calls per second.
// Returns true if the call is within the limit, false if it should be deferred.
export async function checkAndConsumeRateLimit(): Promise<boolean> {
  const bucket = Math.floor(Date.now() / 1000);
  const key = `${RATE_LIMIT_PREFIX}${bucket}`;

  const count = await redis.incr(key);
  if (count === 1) {
    // First increment: set a 2-second TTL so the key auto-expires
    await redis.expire(key, 2);
  }

  return count <= RATE_LIMIT_PER_SECOND;
}
