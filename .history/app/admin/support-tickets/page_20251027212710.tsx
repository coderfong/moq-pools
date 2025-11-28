import React from "react";
import { getPrisma } from "@/lib/prisma";
import { promises as fsp } from "fs";
import path from "path";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Ticket type used for fallback
interface TicketRow {
  id: string;
  name: string;
  email: string;
  orderId?: string | null;
  subject: string;
  message: string;
  fileUrl?: string | null;
  status: string;
  createdAt: string; // ISO
}

async function loadTickets(): Promise<TicketRow[]> {
  // Try Prisma first if model exists
  try {
    if (process.env.DATABASE_URL) {
      const prisma: any = getPrisma();
      if (prisma?.supportTicket?.findMany) {
        const rows = await prisma.supportTicket.findMany({
          orderBy: { createdAt: "desc" },
          take: 200,
        });
        return rows.map((r: any) => ({
          id: r.id,
          name: r.name,
          email: r.email,
          orderId: r.orderId ?? null,
          subject: r.subject,
          message: r.message,
          fileUrl: r.fileUrl ?? null,
          status: r.status ?? "open",
          createdAt: (r.createdAt instanceof Date ? r.createdAt : new Date(r.createdAt)).toISOString(),
        }));
      }
    }
  } catch {}
  // Fallback to JSON file
  try {
    const file = path.join(process.cwd(), "tmp", "supportTickets.json");
    const raw = await fsp.readFile(file, "utf8").catch(() => "[]");
    const data = JSON.parse(raw) as TicketRow[];
    return (data || []).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)).slice(0, 200);
  } catch {
    return [];
  }
}

function Cell({ children }: { children: React.ReactNode }) {
  return <td className="px-3 py-2 align-top text-sm text-neutral-800">{children}</td>;
}

export default async function AdminSupportTicketsPage() {
  const rows = await loadTickets();
  return (
    <div className="mx-auto w-full max-w-[1100px] px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-900">Support Tickets</h1>
        <a href="/support" className="rounded-md border border-neutral-200 px-3 py-1.5 text-sm hover:bg-neutral-50">Open Support page</a>
      </div>
      <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white">
        <table className="min-w-full divide-y divide-neutral-200">
          <thead className="bg-neutral-50 text-left text-xs font-medium text-neutral-600">
            <tr>
              <th className="px-3 py-2">Created</th>
              <th className="px-3 py-2">From</th>
              <th className="px-3 py-2">Subject</th>
              <th className="px-3 py-2">Order</th>
              <th className="px-3 py-2">Message</th>
              <th className="px-3 py-2">File</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">ID</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-center text-sm text-neutral-600">No tickets yet.</td>
              </tr>
            ) : rows.map((r) => (
              <tr key={r.id} className="hover:bg-neutral-50">
                <Cell>{new Date(r.createdAt).toLocaleString("en-US", { timeZone: "UTC" })} UTC</Cell>
                <Cell>
                  <div className="font-medium text-neutral-900">{r.name}</div>
                  <a className="text-xs underline" href={`mailto:${r.email}`}>{r.email}</a>
                </Cell>
                <Cell>{r.subject}</Cell>
                <Cell>{r.orderId || "—"}</Cell>
                <Cell>
                  <div className="max-w-[360px] whitespace-pre-wrap break-words text-neutral-700">{r.message}</div>
                </Cell>
                <Cell>
                  {r.fileUrl ? <a className="underline" href={r.fileUrl} target="_blank">Attachment</a> : "—"}
                </Cell>
                <Cell>{r.status || "open"}</Cell>
                <Cell>
                  <code className="text-[11px] text-neutral-500">{r.id}</code>
                </Cell>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-neutral-500">This simple list reads from your database if the SupportTicket model exists, otherwise it reads tmp/supportTickets.json.</p>
    </div>
  );
}
