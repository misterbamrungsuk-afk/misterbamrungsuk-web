import { notFound } from "next/navigation";
import { Logo } from "@/components/ui";
import { CONTRACT, LINE_OA_ID, PACKAGES, lineAddUrl } from "@/lib/join/config";
import { getByMb } from "@/lib/join/store";
import { CopyCode, ContractAccept } from "./client";

export const dynamic = "force-dynamic";
export const metadata = { title: "การสมัครเสร็จสมบูรณ์ — Mister Bamrungsuk" };

export default async function DonePage({ params }: { params: Promise<{ mb: string }> }) {
  const { mb } = await params;
  const row = /^MB-\d{7,}$/.test(mb) ? await getByMb(mb) : null;
  if (!row) notFound();

  return (
    <div className="phone-stage"><main className="phone px-5 pb-12">
      <header className="flex items-center h-16"><Logo size={26} /></header>

      <section className="flex flex-col items-center text-center mt-6">
        <span className="w-24 h-24 rounded-full border-2 border-gold-500 grid place-items-center text-gold-500 shadow-[0_0_40px_rgba(224,164,0,.25)]">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-12 h-12"><path d="m5 12 5 5 9-10" /></svg>
        </span>
        <h1 className="font-display text-3xl font-semibold mt-5">การสมัครเสร็จสมบูรณ์</h1>
        <p className="text-sm text-ink-300 mt-1">{row.nickname} · แพ็กเกจ {row.package} {PACKAGES[row.package].name}</p>
        <p className="text-sm text-ink-300 mt-6">รหัสของคุณคือ</p>
        <CopyCode code={row.mb_code} />
        <p className="text-xs text-ink-400 mt-2">สถานะ: {row.status === "verified" ? "ชำระเงินแล้ว" : "รอทีมงานตรวจสลิป"}</p>
      </section>

      <section className="glass rounded-3xl p-5 mt-8">
        <p className="font-semibold">ขั้นตอนถัดไป</p>
        <ol className="mt-3 space-y-3 text-sm">
          {["แคปหน้าจอนี้เก็บไว้", `แอดไลน์ทีมงาน ${LINE_OA_ID}`, "แจ้งรหัส MB เพื่อรับคิวอบรม"].map((s, i) => (
            <li key={s} className="flex items-center gap-3"><span className="w-7 h-7 rounded-full bg-gold-500 text-[#3a1208] grid place-items-center font-bold text-sm shrink-0">{i + 1}</span>{s}</li>
          ))}
        </ol>
        <a href={lineAddUrl()} target="_blank" rel="noopener noreferrer"
          className="mt-5 h-14 rounded-full bg-[#06c755] text-white font-display font-semibold text-lg grid place-items-center">
          เพิ่มเพื่อน LINE เพื่อยืนยันคิว
        </a>
      </section>

      <section className="glass rounded-3xl p-5 mt-5">
        <p className="font-semibold">สัญญาการเข้าร่วมโครงการ</p>
        <div className="mt-3 max-h-72 overflow-y-auto pr-1 space-y-3 text-sm text-ink-200 leading-relaxed">
          {CONTRACT.map((c) => <div key={c.h}><p className="font-medium text-ink-100">{c.h}</p><p>{c.p}</p></div>)}
        </div>
        <ContractAccept mb={row.mb_code} acceptedAt={row.contract_accepted_at} />
      </section>
    </main></div>
  );
}
