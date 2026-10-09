import Link from "next/link";
import { notFound } from "next/navigation";
import { extraOf, getAttendance, getByMb } from "@/lib/join/store";
import { TRAINING, TRAINING_SESSIONS } from "@/lib/join/training";
import { C, Page, RED_GRAD } from "../../_kyc/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "ตารางอบรม — Mister Bamrungsuk" };

export default async function TrainingPage({ params }: { params: Promise<{ mb: string }> }) {
  const { mb } = await params;
  const row = /^MB-\d{7,}$/.test(mb) ? await getByMb(mb) : null;
  if (!row) notFound();
  const att = await getAttendance(row.id);
  const cohort = extraOf(row).cohort;
  const group = cohort ? `กลุ่ม ${cohort}` : TRAINING.group;
  const total = TRAINING_SESSIONS.length;
  const done = TRAINING_SESSIONS.filter((s) => att[s.session]).length;
  const next = TRAINING_SESSIONS.find((s) => !att[s.session])?.session;

  return (
    <Page padBottom={false}>
      <div className="px-3.5 pt-3 flex items-center gap-2">
        <Link href={`/join/done/${row.mb_code}`} aria-label="ย้อนกลับ" className="w-11 h-11 rounded-full grid place-items-center shrink-0" style={{ border: `1px solid ${C.ln}`, background: C.s1, color: C.goldL }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m15 5-7 7 7 7" /></svg>
        </Link>
        <div className="font-lux font-semibold text-[17px]" style={{ color: C.gold }}>ตารางอบรม {group} · {TRAINING.dates}</div>
      </div>
      <div className="px-[18px] pt-3 flex flex-col gap-3.5">
        <div className="p-3.5 rounded-2xl" style={{ background: C.s1, border: `1px solid ${C.ln}` }}>
          <div className="flex justify-between text-[13px]"><span>เข้าร่วมแล้ว</span><span className="font-lux font-semibold" style={{ color: C.goldL }}>{done} / {total} รอบ</span></div>
          <div className="h-2 rounded-full mt-2.5 overflow-hidden" style={{ background: C.s2 }}>
            <div className="h-full" style={{ width: `${(done / total) * 100}%`, background: "linear-gradient(90deg,#f0c75a,#ffd76a)" }} />
          </div>
          <div className="text-[11.5px] mt-1.5" style={{ color: C.mut }}>เข้าครบ {TRAINING.requiredCore} รอบหลักก็เริ่มรับงานได้ · รอบมาตรฐานการนวดสำหรับแพ็กเกจ B · {row.mb_code}</div>
        </div>
        {TRAINING_SESSIONS.map((s) => {
          const d = !!att[s.session];
          const open = s.session === next;
          const btn = d
            ? { t: "เช็กชื่อแล้ว", bg: "rgba(60,170,110,.12)", bd: "rgba(60,170,110,.5)", fg: "#7fd6a3", sh: "none" }
            : open
              ? { t: "เช็กชื่อที่สถานที่อบรม", bg: RED_GRAD, bd: "rgba(245,210,110,.85)", fg: "#fff", sh: "0 8px 24px rgba(255,40,70,.45)" }
              : { t: "ยังไม่เปิด", bg: C.s2, bd: C.ln, fg: "#7d6d6a", sh: "none" };
          return (
            <div key={s.session} className="p-3.5 rounded-2xl flex gap-3 items-center" style={{ background: C.s1, border: `1px solid ${open ? "rgba(212,175,55,.6)" : C.ln}` }}>
              <div className="w-[52px] text-center shrink-0"><div className="font-lux font-semibold text-xl" style={{ color: C.goldL }}>{s.day}</div><div className="text-[11px]" style={{ color: C.mut }}>{s.mon}</div></div>
              <div className="flex-1 flex flex-col gap-0.5 min-w-0"><span className="text-sm font-semibold">{s.title}</span><span className="text-xs" style={{ color: C.mut }}>{s.meta}</span></div>
              <button type="button" disabled className="min-w-[88px] max-w-[110px] min-h-11 rounded-xl px-2 text-[12.5px] font-semibold leading-tight"
                style={{ border: `1px solid ${btn.bd}`, background: btn.bg, color: btn.fg, boxShadow: btn.sh }}>{btn.t}</button>
            </div>
          );
        })}
        <div className="text-xs text-center" style={{ color: C.mut }}>เช็กชื่อที่สถานที่อบรมได้ตั้งแต่ 30 นาทีก่อนเริ่ม</div>
      </div>
    </Page>
  );
}
