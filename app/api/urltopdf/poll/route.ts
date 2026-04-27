import { NextResponse } from "next/server";

// Poll is not active: switching to async:false means PDF.co returns the
// final URL immediately, so there is no background job to poll.
// This stub exists so the file path is not a 404 if QStash retries an old message.
export async function POST() {
  return NextResponse.json({ ok: true, note: "poll not active with async:false" });
}
