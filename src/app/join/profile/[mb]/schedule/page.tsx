import Link from "next/link";
import { notFound } from "next/navigation";
import { TRAINING, TRAINING_SESSIONS } from "@/lib/join/training";
import { Forbidden } from "../../../_kyc/ui";
import { PtHead, PtNav, PtPage, loadPt, ptHref } from "../_pt";

export const dynamic = "force-dynamic";
export const metadata = { title: "ตารางงานของฉัน — Mister Bamrungsuk" };

// บอร์ด P-Schedule — ปฏิทินเดือนจริง · วันอบรม · วัน/ช่วงเวลาที่สะดวกจากใบสมัคร (ยังไม่มีนัดจนกว่าจะเปิดรับงาน)
const MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
const MONTHS_LONG = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
const WD = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];
const TRAIN_MONTH = "2026-11";
const TRAIN_DAYS = [...new Set(TRAINING_SESSIONS.map((s) => +s.day))];

export default async function SchedulePage({ params, searchParams }: { params: Promise<{ mb: string }>; searchParams: Promise<{ t?: string; m?: string; d?: string }> }) {
  const sp = await searchParams;
  const c = await loadPt(params, Promise.resolve(sp));
  if (c === "forbidden") return <Forbidden />;
  if (!c) notFound();

  const now = new Date(Date.now() + 7 * 3600_000); // เวลาไทย
  const today = { y: now.getUTCFullYear(), m: now.getUTCMonth(), d: now.getUTCDate() };
  const [y, m] = /^\d{4}-\d{2}$/.test(sp.m ?? "") ? sp.m!.split("-").map(Number).map((v, i) => (i ? v - 1 : v)) : [today.y, today.m];
  const key = (yy: number, mm: number) => `${yy}-${String(mm + 1).padStart(2, "0")}`;
  const first = new Date(Date.UTC(y, m, 1)).getUTCDay();
  const days = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const isThis = y === today.y && m === today.m;
  const sel = Math.min(days, Math.max(1, Number(sp.d) || (isThis ? today.d : 1)));
  const isTrain = (d: number) => key(y, m) === TRAIN_MONTH && TRAIN_DAYS.includes(d);
  const prev = m === 0 ? key(y - 1, 11) : key(y, m - 1);
  const next = m === 11 ? key(y + 1, 0) : key(y, m + 1);
  const link = (extra: string) => `/join/profile/${c.mb}/schedule?${c.t ? `t=${encodeURIComponent(c.t)}&` : ""}${extra}`;

  const av = c.x.availability;
  const weekDays = av?.week_days ?? [];
  const selWd = WD[new Date(Date.UTC(y, m, sel)).getUTCDay()];
  const selSessions = isTrain(sel) ? TRAINING_SESSIONS.filter((s) => +s.day === sel) : [];
  const ring = "rounded-2xl bg-[#211a18] flex flex-col gap-0.5";

  return (
    <PtPage>
      <PtHead back={ptHref(c)} title="ตารางงานของฉัน" right={<span className="rounded-full text-[12px] font-light text-[#b5a596] bg-[#251d1b]" style={{ padding: "4px 10px" }}>ยังไม่เปิดรับงาน</span>} />
      <div className="px-4 flex flex-col gap-4 md:grid md:grid-cols-[1fr_320px] md:items-start">
        <div className="flex flex-col gap-4 min-w-0">
          <div className="grid grid-cols-3 gap-[10px]">
            {[["นัดวันนี้", "0"], ["สัปดาห์นี้", "0"], ["รอยืนยัน", "0"]].map(([l, v]) => (
              <div key={l} className={ring} style={{ padding: 14 }}><span className="text-[12px] font-light text-[#b5a596]">{l}</span><span className="font-semibold text-[22px] tabular-nums">{v}</span></div>
            ))}
          </div>

          <div className="rounded-[18px] bg-[#211a18]" style={{ padding: 16 }}>
            <div className="flex justify-between items-center mb-3">
              <Link href={link(`m=${prev}`)} aria-label="เดือนก่อน" className="w-10 h-10 rounded-full bg-[#251d1b] grid place-items-center text-[#f3ead9] hover:text-[#f3ead9]">‹</Link>
              <span className="font-semibold text-[16px]">{MONTHS_LONG[m]} {y + 543}</span>
              <Link href={link(`m=${next}`)} aria-label="เดือนถัดไป" className="w-10 h-10 rounded-full bg-[#251d1b] grid place-items-center text-[#f3ead9] hover:text-[#f3ead9]">›</Link>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center">
              {WD.map((w) => <span key={w} className="text-[12px] font-light text-[#b5a596] py-1">{w}</span>)}
              {Array.from({ length: first }, (_, i) => <span key={"e" + i} />)}
              {Array.from({ length: days }, (_, i) => {
                const d = i + 1;
                const on = d === sel, train = isTrain(d), now = isThis && d === today.d;
                const free = weekDays.includes(WD[new Date(Date.UTC(y, m, d)).getUTCDay()]);
                return (
                  <Link key={d} href={link(`m=${key(y, m)}&d=${d}`)} aria-current={on ? "date" : undefined} aria-label={`${d} ${MONTHS[m]}${train ? " · วันอบรม" : ""}`}
                    className="h-11 rounded-xl grid place-items-center relative text-[14px] tabular-nums hover:text-inherit"
                    style={{ background: on ? "#e8c472" : train ? "rgba(232,196,114,0.16)" : "transparent", color: on ? "#1b130b" : "#f3ead9", fontWeight: on || now ? 600 : 300, outline: now && !on ? "1px solid #e8c472" : undefined }}>
                    {d}
                    {(train || free) && <span className="absolute bottom-1 w-1 h-1 rounded-full" style={{ background: on ? "#1b130b" : train ? "#e8c472" : "#7fd6a3" }} />}
                  </Link>
                );
              })}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-[12px] font-light text-[#b5a596]">
              <span><span className="inline-block w-2 h-2 rounded-full bg-[#e8c472] mr-1" />วันอบรม</span>
              <span><span className="inline-block w-2 h-2 rounded-full bg-[#7fd6a3] mr-1" />วันที่สะดวกรับงาน</span>
              <span><span className="inline-block w-2 h-2 rounded-full border border-[#e8c472] mr-1" />วันนี้</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div className="rounded-[18px] bg-[#211a18] flex flex-col gap-2" style={{ padding: 16 }}>
            <span className="font-semibold">วัน{selWd === "อา" ? "อาทิตย์" : selWd === "จ" ? "จันทร์" : selWd === "อ" ? "อังคาร" : selWd === "พ" ? "พุธ" : selWd === "พฤ" ? "พฤหัสบดี" : selWd === "ศ" ? "ศุกร์" : "เสาร์"}ที่ {sel} {MONTHS[m]} {y + 543}</span>
            {selSessions.length
              ? selSessions.map((s) => (
                  <Link key={s.session} href={`/join/training/${c.mb}${c.q}`} className="rounded-xl bg-[#251d1b] flex flex-col hover:text-inherit" style={{ padding: "10px 12px", borderLeft: "3px solid #e8c472" }}>
                    <span className="text-[14px] font-semibold">อบรม · {s.title}</span><span className="text-[12.5px] font-light text-[#d9c9b4]">{s.meta}</span>
                  </Link>
                ))
              : <span className="text-[14px] font-light text-[#d9c9b4]">ยังไม่มีนัด · เริ่มรับงานหลังอบรม ({TRAINING.openService})</span>}
          </div>

          <div className="rounded-[18px] bg-[#211a18] flex flex-col gap-2" style={{ padding: 16 }}>
            <div className="flex justify-between items-center"><span className="font-semibold">วันเวลาที่สะดวกรับงาน</span><Link href={`/join/form/${c.mb}?step=2${c.t ? `&t=${encodeURIComponent(c.t)}` : ""}`} className="text-[13px] text-[#e8c472] font-light">แก้ไข ›</Link></div>
            {av && weekDays.length
              ? <>
                  <div className="flex flex-wrap gap-1.5">{["จ", "อ", "พ", "พฤ", "ศ", "ส", "อา"].map((w) => <span key={w} className="w-9 h-9 rounded-full grid place-items-center text-[13px]" style={{ background: weekDays.includes(w) ? "rgba(127,214,163,0.16)" : "#251d1b", color: weekDays.includes(w) ? "#7fd6a3" : "#8d7f72" }}>{w}</span>)}</div>
                  <span className="text-[13px] font-light text-[#d9c9b4]">{av.slots.join(" · ") || "—"}{av.hours_band ? ` · ${av.hours_band}/วัน` : ""}</span>
                </>
              : <span className="text-[14px] font-light text-[#d9c9b4]">ยังไม่ได้กรอก · กด “แก้ไข” เพื่อเลือกวันและช่วงเวลา</span>}
          </div>
        </div>
      </div>
      <PtNav c={c} active="schedule" />
    </PtPage>
  );
}
