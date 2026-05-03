import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function POST(req: NextRequest) {
  try {
    const { email, subject, body } = await req.json();

    if (!email || !subject || !body) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }

    await transporter.sendMail({
      from: `"${process.env.SMTP_FROM_NAME}" <${process.env.SMTP_FROM}>`,
      to: email,
      subject,
      text: body,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[sendemail] error:", err);
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }
}
