import redis from "./redis";

const QUEUE_KEY = "urltopdf:queue";

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
