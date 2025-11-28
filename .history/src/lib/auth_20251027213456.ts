import { headers } from "next/headers";

export type MeUser = { id?: string; email?: string | null; name?: string | null; firstName?: string | null } | null;

export async function getServerUser(): Promise<{ ok: boolean; user?: MeUser } | null> {
  try {
    const h = headers();
    const cookie = h.get("cookie") || "";
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL ? process.env.NEXT_PUBLIC_BASE_URL.replace(/\/$/, "") : ""}/api/me` || "/api/me", {
      method: "GET",
      headers: cookie ? { cookie } : undefined,
      cache: "no-store",
      credentials: "include" as any,
    });
    if (!res.ok) return { ok: false };
    const data = await res.json();
    return data;
  } catch {
    return { ok: false };
  }
}
