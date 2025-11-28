import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function GET() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;
  
  // Log (sanitized) config
  console.log("SMTP Config Check:");
  console.log("SMTP_HOST:", SMTP_HOST);
  console.log("