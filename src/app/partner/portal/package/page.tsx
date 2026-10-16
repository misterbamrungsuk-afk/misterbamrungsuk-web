import { redirect } from "next/navigation";
import { LINE_OA_ID, lineAddUrl } from "@/lib/join/config";
import { currentPartner } from "@/lib/partner/auth";
import { PARTNER_PACKAGES, PACKAGE_INCLUDES, baht } from "@/lib/partner/config";
import { listPurchases } from "@/lib/partner/portal";
import { CLIP_LABEL, CLIP_STATUSES, PURCHASE_LABEL } from "@/lib/partner/portal-types";
import { QC_LABEL, daysLeft } from "@/lib/partner/status";
import { RenewBox } from "./client";

export const dynamic = "force-dynamic";
const d = (s: string | null) => (s ? new Date(`${s.slice(0, 10)}T00:00:00+07:00`).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" }) : "—");

export default async function PartnerPackagePage() {
  const p = await currentPartner();
  if (!p) redirect("/partner/login");
  const purchases = await listPurchases(p.id).catch(() => []);
  const left = daysLeft(p.ends_at);
  const total = p.starts_at && p.ends_at ? Math.round((Date.parse(p.ends_at) - Date.parse(p.starts_at)) / 86400_000) : null;
  const clipIdx = p.clip_status ? CLIP_STATUSES.indexOf(p.clip_status) : -1;
  const pending = purchases.find((x) => x.status === "pending");

  return (
    <>
      <h1 className="font-display text-2xl font-semibold mt-5">แผนโปรโมทของฉัน</h1>

      <section className="mt-4 rounded-3xl border border-gold-500/50 bg-gradient-to-br from-ink-800 to-ink-900 p-5">
        <div className="flex justify-between text-[11px] tracking-[.18em] text-gold-400"><span>CURRENT PLAN</span><span className="tracking-normal">QC {QC_LABEL[p.qc]}</span></div>
        {left != null && total ? (
          <>
            <p className="font-display text-3xl font-semibold mt-2">{(PARTNER_PACKAGES[p.package]?.label ?? p.package)}</p>
            <p className="text-sm text-ink-300">{d(p.starts_at)} – {d(p.ends_at)}</p>
            <div className="h-1.5 rounded-full bg-ink-700 mt-3 overflow-hidden"><div className={`h-full ${left <= 30 ? "bg-crimson-500" : "bg-gold-500"}`} style={{ width: `${Math.max(0, Math.min(100, (left / total) * 100))}%` }} /></div>
            <p className={`text-xs mt-1 ${left <= 30 ? "text-crimson-300" : "text-ink-300"}`}>{left > 0 ? `เหลือ ${left} / ${total} วัน` : "หมดอายุแล้ว"}</p>
          </>
        ) : (
          <p className="mt-2 text-sm text-ink-300">{pending ? `รอตรวจสลิป ${pending.invoice_no}` : "ยังไม่มีแผนโปรโมทที่ใช้งาน"}</p>
        )}
        <p className="text-xs text-ink-400 mt-3">แพลตฟอร์มหัก {p.platform_pct ?? "[รอกำหนด]"}% ต่อการจอง</p>
      </section>

      <section className="mt-6">
        <h2 className="font-semibold">ต่ออายุ / อัปเกรด</h2>
        <p className="text-xs text-ink-400 mt-1">ทุกแผนโปรโมทรวม: {PACKAGE_INCLUDES.join(" · ")}</p>
        {pending ? <p className="mt-3 text-sm rounded-2xl border border-gold-500/40 px-4 py-3">มีรายการรอตรวจสลิปอยู่ ({pending.invoice_no} · ฿{baht(pending.amount)}) — ทีมงานจะตรวจภายใน 24 ชม.</p>
          : <RenewBox current={p.package} />}
      </section>

      <section className="mt-6">
        <h2 className="font-semibold">สถานะคลิปโปรโมท</h2>
        <ol className="mt-3 space-y-3">
          {CLIP_STATUSES.map((c, i) => {
            const done = i <= clipIdx;
            return (
              <li key={c} className="flex items-center gap-3 text-sm">
                <span className={`w-7 h-7 rounded-full grid place-items-center text-xs shrink-0 ${done ? "bg-gold-500 text-[#1a1206] font-bold" : "border border-ink-500 text-ink-400"}`}>{done ? "✓" : i + 1}</span>
                <span className={done ? "" : "text-ink-400"}>{CLIP_LABEL[c]}{i === clipIdx && p.clip_note ? <span className="text-ink-400"> · {p.clip_note}</span> : null}</span>
              </li>
            );
          })}
        </ol>
      </section>

      <section id="invoices" className="mt-6 scroll-mt-20">
        <h2 className="font-semibold">ใบแจ้งหนี้</h2>
        {purchases.length === 0 ? <p className="text-sm text-ink-400 mt-3">ยังไม่มีรายการ</p> : (
          <ul className="mt-3 space-y-2">
            {purchases.map((x) => (
              <li key={x.id} className="rounded-2xl border border-ink-600 bg-ink-800/60 px-4 py-3 flex justify-between gap-3 text-sm">
                <div className="min-w-0"><p className="font-medium truncate">{x.invoice_no}</p><p className="text-xs text-ink-300">{new Date(x.created_at).toLocaleDateString("th-TH", { timeZone: "Asia/Bangkok", day: "numeric", month: "short", year: "2-digit" })} · แผนโปรโมท {PARTNER_PACKAGES[x.package].label}</p></div>
                <div className="text-right shrink-0"><p className="font-display text-gold-300">฿{baht(x.amount)}</p><p className={`text-xs ${x.status === "paid" ? "text-emerald-300" : x.status === "rejected" ? "text-crimson-300" : "text-ink-300"}`}>{PURCHASE_LABEL[x.status]}</p></div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <a href={lineAddUrl()} target="_blank" rel="noopener noreferrer" className="btn-ghost min-h-12 rounded-full w-full grid place-items-center mt-6">ติดต่อทีมงาน · LINE {LINE_OA_ID}</a>
    </>
  );
}
