import { listClientErrors } from "@/lib/client-errors";
import { PageHead } from "../admin-nav";
import { ClearErrors } from "./clear";

export const dynamic = "force-dynamic";
export const metadata = { title: "ข้อผิดพลาดหน้าเว็บ — แอดมิน" };

const LN = "rgba(240,200,90,.38)";
const KIND: Record<string, string> = { hydration: "หน้าแสดงผลไม่ตรง (hydration)", error: "สคริปต์ผิดพลาด", promise: "คำสั่งเบื้องหลังผิดพลาด" };
const when = (iso: string) => new Date(iso).toLocaleString("th-TH", { timeZone: "Asia/Bangkok", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const device = (ua: string) => {
  const os = /iPhone|iPad/.test(ua) ? (/iPad/.test(ua) ? "iPad" : "iPhone") : /Android/.test(ua) ? "Android" : /Windows/.test(ua) ? "Windows" : /Mac OS/.test(ua) ? "Mac" : "อื่น ๆ";
  const br = / Line\//.test(ua) ? "LINE" : /FBAN|FBAV/.test(ua) ? "Facebook" : /CriOS|Chrome\//.test(ua) && !/Edg\//.test(ua) ? "Chrome" : /Edg\//.test(ua) ? "Edge" : /Safari\//.test(ua) ? "Safari" : /Firefox/.test(ua) ? "Firefox" : "อื่น ๆ";
  return `${os} · ${br}`;
};

// error ที่เกิดในเบราว์เซอร์ของผู้ใช้จริง (ErrorReporter → /api/client-log) · รวมรายการซ้ำและนับครั้ง
export default async function ErrorsPage() {
  const rows = await listClientErrors();
  const total = rows.reduce((s, r) => s + r.count, 0);
  return (
    <>
      <PageHead title="ข้อผิดพลาดหน้าเว็บ" sub="error ที่ผู้ใช้จริงเจอในเบราว์เซอร์ (ไม่มีข้อมูลส่วนตัว) · ใช้หาต้นเหตุบั๊กที่ทำซ้ำในเครื่องไม่ได้" />
      <div className="flex flex-wrap items-center justify-between gap-2 text-[13.5px] text-[#cdbfb3]">
        <span>{rows.length} แบบ · รวม {total.toLocaleString("th-TH")} ครั้ง (เก็บล่าสุด 300 แบบ)</span>
        {rows.length > 0 && <ClearErrors />}
      </div>
      <div className="rounded-2xl border overflow-x-auto" style={{ borderColor: LN }}>
        {!rows.length ? <p className="m-0 p-5 text-center text-[#9a8a85]">ยังไม่มีข้อผิดพลาดจากผู้ใช้</p> : rows.map((r) => (
          <details key={r.key} className="border-t first:border-t-0 px-3.5 py-3" style={{ borderColor: LN }}>
            <summary className="cursor-pointer flex flex-wrap gap-x-3 gap-y-1 items-baseline">
              <b className="text-[#f0c75a] tabular-nums">{r.count}×</b>
              <span className="text-[12px] rounded-full px-2 py-0.5" style={{ background: "rgba(240,199,90,.12)", color: "#a8781f" }}>{KIND[r.kind] ?? r.kind}</span>
              <span className="font-medium">{r.path}</span>
              <span className="text-[12.5px] text-[#9a8a85]">ล่าสุด {when(r.last_at)} · {device(r.ua)} · จอ {r.vw}×{r.vh}</span>
            </summary>
            <div className="mt-2 flex flex-col gap-1.5 text-[12.5px]">
              <code className="block whitespace-pre-wrap break-words text-[#fecaca]">{r.message}</code>
              <span className="text-[#9a8a85]">ครั้งแรก {when(r.first_at)} · เกิดหลังเปิดหน้า {(r.ms / 1000).toFixed(1)} วิ · service worker {r.sw ? "ทำงาน" : "ไม่ทำงาน"}</span>
              <span className="text-[#9a8a85] break-all">{r.ua}</span>
              {r.stack && <code className="block whitespace-pre-wrap break-words text-[11.5px] text-[#cdbfb3]">{r.stack}</code>}
            </div>
          </details>
        ))}
      </div>
    </>
  );
}
