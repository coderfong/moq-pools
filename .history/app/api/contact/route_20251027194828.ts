import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { promises as fsp } from "fs";
import path from "path";

type Ticket = {
  id: string;
  name: string;
  email: string;
  orderId?: string | null;
  subject: string;
  message: string;
  fileUrl?: string | null;
  status: string;
  createdAt: string; // ISO string
  ip?: string | null;
  ua?: string | null;
};

// Simple in-memory IP rate limit (best-effort; resets on cold start)
const RATE: Map<string, { count: number; resetAt: number }> = new Map();
const RATE_WINDOW_MS = 60 * 60 * 1000; // 1h
const RATE_LIMIT = 5; // 5 submissions per hour per IP

function getIp(req: Request): string {
  const ff = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim();
  return ff || (req.headers.get("x-real-ip") || "");
}

async function saveToDisk(ticket: Ticket) {
  const root = process.cwd();
  const dir = path.join(root, "tmp");
  const uploads = path.join(dir, "uploads");
  const file = path.join(dir, "supportTickets.json");
  await fsp.mkdir(dir, { recursive: true });
  await fsp.mkdir(uploads, { recursive: true });
  try {
    const prev = JSON.parse(await fsp.readFile(file, "utf8").catch(() => "[]")) as Ticket[];
    prev.push(ticket);
    await fsp.writeFile(file, JSON.stringify(prev, null, 2));
  } catch (err) {
    // best-effort
    console.error("contact_save_disk_error", err);
  }
}

async function maybeSaveFile(fd: FormData): Promise<string | null> {
  const f = fd.get("file");
  if (!f || !(f instanceof File)) return null;
  try {
    const ab = await f.arrayBuffer();
    const buf = Buffer.from(ab);
    const root = process.cwd();
    const dir = path.join(root, "tmp", "uploads");
    await fsp.mkdir(dir, { recursive: true });
    const safeName = `${Date.now()}-${(f.name || "upload").replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const full = path.join(dir, safeName);
    await fsp.writeFile(full, buf);
    return `/tmp/uploads/${safeName}`;
  } catch (err) {
    console.error("contact_file_write_error", err);
    return null;
  }
}

export async function POST(req: Request) {
  const ip = getIp(req) || "unknown";
  const now = Date.now();
  const rate = RATE.get(ip);
  if (!rate || now > rate.resetAt) {
    RATE.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
  } else {
    if (rate.count >= RATE_LIMIT) {
      return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
    }
    rate.count++;
  }

  let name = "";
  let email = "";
  let orderId: string | null = null;
  let subject = "General Inquiry";
  let message = "";
  let fileUrl: string | null = null;

  const ctype = req.headers.get("content-type") || "";

  try {
    if (ctype.includes("multipart/form-data")) {
      const fd = await req.formData();
      // Honeypot: unknown key must be empty if present
      for (const [k, v] of fd.entries()) {
        if (k.startsWith("react-aria") || k.startsWith("__")) continue;
        if (typeof v === "string" && k.length > 0 && k !== "name" && k !== "email" && k !== "orderId" && k !== "subject" && k !== "message" && k !== "file") {
          if (v) return NextResponse.json({ ok: false, error: "bot_detected" }, { status: 400 });
        }
      }
      name = String(fd.get("name") || "").trim();
      email = String(fd.get("email") || "").trim();
      orderId = String(fd.get("orderId") || "").trim() || null;
      subject = String(fd.get("subject") || "General Inquiry").trim() || "General Inquiry";
      message = String(fd.get("message") || "").trim();
      fileUrl = await maybeSaveFile(fd);
    } else {
      const body = await req.json().catch(() => ({}));
      name = String(body.name || "").trim();
      email = String(body.email || "").trim();
      orderId = String(body.orderId || "").trim() || null;
      subject = String(body.subject || "General Inquiry").trim() || "General Inquiry";
      message = String(body.message || "").trim();
      fileUrl = null;
    }

    // Validation
    if (!name || !email || !message) {
      return NextResponse.json({ ok: false, error: "missing_fields" }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ ok: false, error: "invalid_email" }, { status: 400 });
    }

    const ticket: Ticket = {
      id: (globalThis as any).crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      name,
      email,
      orderId,
      subject,
      message,
      fileUrl,
      status: "open",
      createdAt: new Date().toISOString(),
      ip,
      ua: req.headers.get("user-agent"),
    };

    // Try to persist via Prisma if SupportTicket model exists; otherwise write to disk
    let stored = false;
    try {
      if (process.env.DATABASE_URL) {
        const prisma = getPrisma() as any;
        if (prisma?.supportTicket?.create) {
          await prisma.supportTicket.create({
            data: {
              name: ticket.name,
              email: ticket.email,
              orderId: ticket.orderId,
              subject: ticket.subject,
              message: ticket.message,
              fileUrl: ticket.fileUrl,
              status: ticket.status,
              createdAt: new Date(ticket.createdAt),
            },
          });
          stored = true;
        }
      }
    } catch (e) {
      // Fall back to disk
      stored = false;
    }

    if (!stored) await saveToDisk(ticket);

    // TODO: optional email notification to support inbox can be wired here
    return NextResponse.json({ ok: true, id: ticket.id });
  } catch (err) {
    console.error("contact_post_error", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
