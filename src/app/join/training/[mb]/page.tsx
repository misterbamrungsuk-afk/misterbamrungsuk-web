import Link from "next/link";
import { canResume } from "@/lib/join/resume";
import { notFound } from "next/navigation";
import { extraOf, getAttendance, getByMb } from "@/lib/join/store";
import { CORE_SESSIONS, MASSAGE_SESSION, TRAINING, coreDone, sessionsFor } from "@/lib/join/training";
import { C, Forbidden } from "../../_kyc/ui";

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
  // นับเฉพาะรอบที่คนนี้ต้องเข้า (สายนวดมีรอบการนวดเพิ่ม) · "อบรมครบ" = รอบหลักครบตาม requiredCore เท่านั้น
  const mine = sessionsFor(row.package);
  const total = mine.length;
  const done = mine.filter((s) => att[s.session]).length;
  const coreN = CORE_SESSIONS.filter((n) => att[n]).length;
  const trained = coreDone(att);
  const next = mine.find((s) => !att[s.session])?.session;

  return (
    <div className="mb-v7 min-h-dvh" style={{ background: "#171211", color: "#f3ead9", lineHeight: "normal" }}><div className="mb-panel mx-auto max-w-[720px] pb-6">
      <div className="px-3.5 pt-3 flex items-center gap-2">
        <Link href={`/join/done/${row.mb_code}${q}`} aria-label="ย้อนกลับ" className="w-11 h-11 rounded-full grid place-items-center shrink-0" style={{ border: `1px solid ${C.ln}`, background: C.s1, color: C.goldL }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m15 5-7 7 7 7" /></svg>
        </Link>
        <div className="font-lux font-semibold text-[17px]" style={{ color: C.gold }}>{`ตารางอบรม ${group} · ${TRAINING.window}`}</div>
      </div>
      <div className="px-[18px] pt-3 flex flex-col gap-3.5">
        <div className="p-[14px] rounded-2xl" style={{ background: C.s1, border: "1px solid rgba(243,234,217,0.07)" }}>
          <div className="flex justify-between text-[13px] font-light"><span>เข้าร่วมแล้ว</span><span className="font-lux font-semibold" style={{ color: C.goldL }}>{`${done} / ${total} รอบ`}</span></div>
          <div className="h-2 rounded-full mt-2.5 overflow-hidden" style={{ background: C.s2 }}>
            <div className="h-full" style={{ width: `${total ? (done / total) * 100 : 0}%`, background: "linear-gradient(90deg,#e8c472,#e8c472)" }} />
          </div>
          <div className="text-[12px] mt-1.5 font-light" style={{ color: C.mut }}>{`รอบหลัก ${coreN} / ${TRAINING.requiredCore} · เข้าครบ ${TRAINING.requiredCore} รอบหลักก็เริ่มรับงานได้${row.package === "B" ? " · สายนวดต้องเข้ารอบมาตรฐานการนวดด้วย" : ""} · ${row.mb_code}`}</div>
        </div>
        {mine.map((s) => {
          const d = !!att[s.session];
          const open = s.session === next;
          // ปุ่มนี้ไม่ใช่ปุ่มกด — ทีมงานเช็กชื่อให้ที่หน้างาน จึงแสดงเป็นป้ายสถานะ (ไม่ทำให้ดูเหมือนกดได้)
          const st = d
            ? { t: "✓ เช็กชื่อแล้ว", bg: "rgba(60,170,110,.12)", bd: "rgba(60,170,110,.5)", fg: "#7fd6a3" }
            : open
              ? { t: "รอบถัดไป · ทีมงานเช็กชื่อให้ที่หน้างาน", bg: "rgba(232,196,114,.1)", bd: "rgba(232,196,114,.35)", fg: "#e8c472" }
              : { t: "ยังไม่ถึงรอบ", bg: "transparent", bd: C.ln, fg: "#b5a596" };
          return (
            <div key={s.session} className="p-[14px] rounded-2xl flex gap-3 items-center" style={{ background: C.s1, border: `1px solid ${open ? "rgba(212,175,55,.6)" : "rgba(232,196,114,0.14)"}` }}>
              <div className="w-[52px] text-center shrink-0"><div className="font-lux font-semibold text-xl" style={{ color: C.goldL }}>{s.day}</div><div className="text-[12px] font-light" style={{ color: C.mut }}>{s.mon}</div></div>
              <div className="flex-1 flex flex-col gap-0.5 min-w-0"><span className="text-sm font-semibold">{s.title}{s.session === MASSAGE_SESSION ? " · เฉพาะสายนวด" : ""}</span><span className="text-xs font-light" style={{ color: C.mut }}>{s.meta}</span></div>
              <span role="status" className="max-w-[112px] rounded-xl px-2 py-1.5 text-[12px] font-semibold leading-tight text-center"
                style={{ border: `1px dashed ${st.bd}`, background: st.bg, color: st.fg }}>{st.t}</span>
            </div>
          );
        })}
        {trained
          ? <Link href={`/join/profile/${row.mb_code}${q}`} className="min-h-[52px] rounded-[14px] bg-[#e8c472] text-[#1b130b] font-semibold text-[15px] grid place-items-center hover:text-[#1b130b]">อบรมครบแล้ว · ไปที่โปรไฟล์ของฉัน</Link>
          : <Link href={`/join/profile/${row.mb_code}${q}`} className="min-h-[52px] rounded-[14px] text-[#e8c472] font-semibold text-[15px] grid place-items-center hover:text-[#e8c472]" style={{ background: "rgba(232,196,114,0.16)" }}>{`กลับไปที่โปรไฟล์ของฉัน · เหลือรอบหลัก ${TRAINING.requiredCore - coreN} รอบ`}</Link>}
        <div className="text-xs text-center font-light" style={{ color: C.mut }}>ไปถึงสถานที่อบรมก่อนเริ่ม 30 นาที · ทีมงานเช็กชื่อให้ที่หน้างาน แล้วผลจะขึ้นที่หน้านี้</div>
      </div>
    </div></div>
  );
}
