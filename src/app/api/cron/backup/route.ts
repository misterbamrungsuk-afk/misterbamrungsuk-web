import { NextResponse } from "next/server";
import { backupFilename, buildBackup } from "@/lib/backup";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Vercel Cron เรียกทุกวัน (vercel.json) พร้อม Authorization: Bearer ${CRON_SECRET}
// ส่ง JSON ไป Apps Script (action "backup") เพื่อเก็บไฟล์ใน Google Drive โฟลเดอร์ "MB Backups"
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ ok: false }, { status: 401 });
  const url = process.env.GOOGLE_SHEETS_WEBHOOK_URL, token = process.env.GOOGLE_SHEETS_WEBHOOK_TOKEN;
  if (!url || !token) return NextResponse.json({ ok: false, error: "GOOGLE_SHEETS_WEBHOOK_URL/TOKEN not set" }, { status: 500 });

  const filename = backupFilename();
  const dump = await buildBackup();
  try {
    const res = await fetch(url, {
      method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ token, action: "backup", filename, json: JSON.stringify(dump) }),
    });
    const out = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
    if (!res.ok || !out.ok) return NextResponse.json({ ok: false, error: out.error || `webhook ${res.status}` }, { status: 502 });
    return NextResponse.json({ ok: true, filename });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 502 });
  }
}
