"use client";

// บอร์ด C-Notifications "การแจ้งเตือน" — งานตอบรับ / คืนเงิน / ข้อความใหม่ จากระบบจริง · เปิดหน้า = อ่านแล้ว
import { useEffect, useState } from "react";
import Link from "next/link";
import { TopBar } from "@/components/shell";

const GOLD = "#e8c472";
const LN = "rgba(243,234,217,0.07)";
type N = { id: number; kind: string; title: string; body: string | null; url: string | null; read_at: string | null; created_at: string };
const ago = (iso: string) => {
  const m = Math.round((Date.now() - Date.parse(iso)) / 60000);
  return m < 1 ? "เมื่อสักครู่" : m < 60 ? `${m} นาทีที่แล้ว` : m < 1440 ? `${Math.round(m / 60)} ชม.ที่แล้ว` : new Date(iso).toLocaleDateString("th-TH", { day: "numeric", month: "short" });
};

export default function NotificationsPage() {
  const [rows, setRows] = useState<N[] | null>(null);
  useEffect(() => {
    fetch("/api/notifications", { cache: "no-store" }).then((r) => r.json()).then((d) => { setRows(d?.ok ? d.notices : []); if (d?.notices?.some((n: N) => !n.read_at)) fetch("/api/notifications", { method: "POST" }).catch(() => {}); }).catch(() => setRows([]));
  }, []);
  return (
    <div className="pb-6">
      <TopBar back="/" title="การแจ้งเตือน" right={<Link href="/notifications/permission" className="tap px-2 text-[13px] font-light" style={{ color: GOLD }}>ตั้งค่า</Link>} />
      <div className="flex flex-col gap-2" style={{ padding: "16px 16px 0" }}>
        {rows === null ? <p className="m-0 text-[13px] font-light text-[#b5a596]">กำลังโหลด…</p> : !rows.length ? (
          <div className="rounded-[20px] bg-[#211a18] text-center text-[14px] text-[#d9c9b4]" style={{ padding: 28, border: `1px solid ${LN}` }}>ยังไม่มีการแจ้งเตือน</div>
        ) : rows.map((n) => {
          const inner = (
            <>
              <span className="w-2 h-2 rounded-full shrink-0 mt-2" style={{ background: n.read_at ? "transparent" : GOLD }} />
              <span className="flex-1 min-w-0"><b className="font-medium text-[14.5px]">{n.title}</b>{n.body && <span className="block text-[13px] font-light text-[#d9c9b4]">{n.body}</span>}<span className="block text-[12px] font-light text-[#b5a596]">{ago(n.created_at)}</span></span>
            </>
          );
          const cls = "flex gap-3 rounded-2xl bg-[#211a18] text-[#f3ead9] hover:text-[#f3ead9]";
          return n.url ? <Link key={n.id} href={n.url} className={cls} style={{ padding: 14, border: `1px solid ${LN}` }}>{inner}</Link> : <div key={n.id} className={cls} style={{ padding: 14, border: `1px solid ${LN}` }}>{inner}</div>;
        })}
      </div>
    </div>
  );
}
