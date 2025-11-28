import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function GET() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;
  
  // Log (sanitized) config
  console.log("SMTP Config Check:");
  console.log("SMTP_HOST:", SMTP_HOST);
  console.log("SMTP_PORT:", SMTP_PORT);
  console.log("SMTP_USER:", SMTP_USER ? "Set" : "Not set");
  console.log("SMTP_PASS:", SMTP_PASS ? "Set" : "Not set");
  console.log("SMTP_FROM:", SMTP_FROM);

  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
    return NextResponse.json(
      { error: "SMTP configuration incomplete" },
      { status: 500 }
    );
  }

  try {
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: parseInt(SMTP_PORT),
      secure: parseInt(SMTP_PORT) === 465,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    });

    await transporter.verify();
    
    return NextResponse.json({ 
      success: true, 
      message: "SMTP connection successful" 
    });
  } catch (error: any) {
    console.error("SMTP test error:", error);
    return NextResponse.json(
      { error: error.message || "SMTP connection failed" },
      { status: 500 }
    );
  }
}
