import Link from "next/link";
import { canResume } from "@/lib/join/resume";
import { notFound } from "next/navigation";
import { extraOf, getAttendance, getByMb } from "@/lib/join/store";
import { TRAINING, TRAINING_SESSIONS } from "@/lib/join/training";
import { C, RED_GRAD, Forbidden } from "../../_kyc/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "ตารางอบรม — Mister Bamrungsuk" };

export default async function TrainingPage({ params, searchParams }: { params: Promise<{ mb: string }>; searchParams: Promise<{ t?: string }> }) {
  const { mb } = await params;
  const { t } = await searchParams;
  // ข้อมูลส่วนตัว: ต้องมี cookie mb_resume หรือ ?t= ของรหัสนี้ (ตรวจก่อนค้นฐานข้อมูล ไม่บอกว่ารหัสมีจริงไหม)
  if (!/^MB-\d{7,}$/.test(mb) || !(await canResume(mb, t))) return <Forbidden />;
  const q = t ? `?t=${encodeURIComponent(t)}` : "";
  const row = await getByMb(mb);
  if (!row) notFound();
  const att = await getAttendance(row.id);
  const cohort = extraOf(row).cohort;
  const group = cohort ? `กลุ่ม ${cohort}` : TRAINING.group;
  const total = TRAINING_SESSIONS.length;
  const done = TRAINING_SESSIONS.filter((s) => att[s.session]).length;
  const next = TRAINING_SESSIONS.find((s) => !att[s.session])?.session;

  return (
    <div className="mb-v7 min-h-dvh" style={{ background: "#171211", color: "#f3ead9" }}><div className="mx-auto max-w-[720px] pb-6">
      <div className="px-3.5 pt-3 flex items-center gap-2">
        <Link href={`/join/done/${row.mb_code}${q}`} aria-label="ย้อนกลับ" className="w-11 h-11 rounded-full grid place-items-center shrink-0" style={{ border: `1px solid ${C.ln}`, background: C.s1, color: C.goldL }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m15 5-7 7 7 7" /></svg>
        </Link>
        <div className="font-lux font-semibold text-[17px]" style={{ color: C.gold }}>ตารางอบรม {group} · {TRAINING.dates}</div>
      </div>
      <div className="px-[18px] pt-3 flex flex-col gap-3.5">
        <div className="p-4 rounded-2xl" style={{ background: C.s1, border: "1px solid rgba(243,234,217,0.07)" }}>
          <div className="flex justify-between text-[13px]"><span>เข้าร่วมแล้ว</span><span className="font-lux font-semibold" style={{ color: C.goldL }}>{done} / {total} รอบ</span></div>
          <div className="h-2 rounded-full mt-2.5 overflow-hidden" style={{ background: C.s2 }}>
            <div className="h-full" style={{ width: `${(done / total) * 100}%`, background: "linear-gradient(90deg,#e8c472,#e8c472)" }} />
          </div>
          <div className="text-[11.5px] mt-1.5" style={{ color: C.mut }}>เข้าครบ {TRAINING.requiredCore} รอบหลักก็เริ่มรับงานได้ · รอบมาตรฐานการนวดสำหรับเพื่อนกินเที่ยว · นวด · {row.mb_code}</div>
        </div>
        {TRAINING_SESSIONS.map((s) => {
          const d = !!att[s.session];
          const open = s.session === next;
          const btn = d
            ? { t: "เช็กชื่อแล้ว", bg: "rgba(60,170,110,.12)", bd: "rgba(60,170,110,.5)", fg: "#7fd6a3", sh: "none" }
            : open
              ? { t: "เช็กชื่อ", bg: RED_GRAD, bd: "transparent", fg: "#1b130b", sh: "none" }
              : { t: "ยังไม่เปิด", bg: C.s2, bd: C.ln, fg: "#b5a596", sh: "none" };
          return (
            <div key={s.session} className="p-4 rounded-2xl flex gap-3 items-center" style={{ background: C.s1, border: `1px solid ${open ? "rgba(212,175,55,.6)" : "rgba(232,196,114,0.14)"}` }}>
              <div className="w-[52px] text-center shrink-0"><div className="font-lux font-semibold text-xl" style={{ color: C.goldL }}>{s.day}</div><div className="text-[11px]" style={{ color: C.mut }}>{s.mon}</div></div>
              <div className="flex-1 flex flex-col gap-0.5 min-w-0"><span className="text-sm font-semibold">{s.title}</span><span className="text-xs" style={{ color: C.mut }}>{s.meta}</span></div>
              <button type="button" disabled className="min-w-[88px] min-h-11 rounded-xl px-2 text-[12.5px] font-semibold leading-tight"
                style={{ border: `1px solid ${btn.bd}`, background: btn.bg, color: btn.fg, boxShadow: btn.sh }}>{btn.t}</button>
            </div>
          );
        })}
        <Link href={`/join/profile/${row.mb_code}${q}`} className="min-h-[52px] rounded-[14px] bg-[#e8c472] text-[#1b130b] font-semibold text-[15px] grid place-items-center hover:text-[#1b130b]">อบรมครบแล้ว · ไปที่โปรไฟล์ของฉัน</Link>
        <div className="text-xs text-center" style={{ color: C.mut }}>เช็กชื่อที่สถานที่อบรมได้ตั้งแต่ 30 นาทีก่อนเริ่ม</div>
      </div>
    </div></div>
  );
}
