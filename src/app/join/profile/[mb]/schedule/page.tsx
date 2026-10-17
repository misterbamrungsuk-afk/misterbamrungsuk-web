import Link from "next/link";
import { notFound } from "next/navigation";
import { listForParttime, type Booking } from "@/lib/bookings";
import { TRAINING, TRAINING_SESSIONS } from "@/lib/join/training";
import { Forbidden } from "../../../_kyc/ui";
import { PtNav, PtPage, loadPt, ptHref } from "../_pt";

export const dynamic = "force-dynamic";
export const metadata = { title: "ตารางงานของฉัน — Mister Bamrungsuk" };

// บอร์ด P-Schedule — หัว "ตารางงานของฉัน" + สถานะ · ตัวนับ 3 ช่อง · ปฏิทินเดือน (มีนัด/วันนี้) · "นัดวันที่ …"
// ข้อมูลจริง: สถานะเปิดรับงาน (listed/paused) · การจองจริง (เวลาไทย) + วันอบรม · วันเวลาที่สะดวกจากหน้าเวลาทำงาน
const MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
const MONTHS_LONG = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
const WD = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];
const TRAIN_MONTH = "2026-11";
const TRAIN_DAYS = [...new Set(TRAINING_SESSIONS.map((s) => +s.day))];
const line = "1px solid rgba(243,234,217,0.07)";
/** สถานะที่ยังนับเป็น "นัด" บนปฏิทิน (ไม่รวมที่ปฏิเสธ/หมดเวลา/ยกเลิก/คืนเงิน) */
const LIVE = ["requested", "accepted", "checked_in", "cancel_requested", "completed", "disputed"];
const ST: Record<string, [string, string]> = { requested: ["รอตอบรับ", "#e8c472"], accepted: ["ยืนยันแล้ว", "#7fd6a3"], checked_in: ["ถึงจุดนัดแล้ว", "#7fd6a3"], cancel_requested: ["ลูกค้าขอยกเลิก", "#f0a35a"], completed: ["จบงานแล้ว", "#b5a596"], disputed: ["ทีมงานตรวจสอบ", "#f0a35a"] };
/** ISO → วันเวลาไทย */
const bkk = (iso: string) => { const d = new Date(Date.parse(iso) + 7 * 3600_000); return { y: d.getUTCFullYear(), m: d.getUTCMonth(), d: d.getUTCDate(), hm: `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}` }; };

export default async function SchedulePage({ params, searchParams }: { params: Promise<{ mb: string }>; searchParams: Promise<{ t?: string; m?: string; d?: string }> }) {
  const sp = await searchParams;
  const c = await loadPt(params, Promise.resolve(sp));
  if (c === "forbidden") return <Forbidden />;
  if (!c) notFound();

  const now = new Date(Date.now() + 7 * 3600_000); // เวลาไทย
  const today = { y: now.getUTCFullYear(), m: now.getUTCMonth(), d: now.getUTCDate() };
  const [y, m] = /^\d{4}-\d{2}$/.test(sp.m ?? "") ? [Number(sp.m!.slice(0, 4)), Number(sp.m!.slice(5)) - 1] : [today.y, today.m];
  const key = (yy: number, mm: number) => `${yy}-${String(mm + 1).padStart(2, "0")}`;
  const first = new Date(Date.UTC(y, m, 1)).getUTCDay();
  const days = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const isThis = y === today.y && m === today.m;
  const sel = Math.min(days, Math.max(1, Number(sp.d) || (isThis ? today.d : 1)));
  const isTrain = (d: number) => key(y, m) === TRAIN_MONTH && TRAIN_DAYS.includes(d);
  const prev = m === 0 ? key(y - 1, 11) : key(y, m - 1);
  const next = m === 11 ? key(y + 1, 0) : key(y, m + 1);
  const link = (extra: string) => `/join/profile/${c.mb}/schedule?${c.t ? `t=${encodeURIComponent(c.t)}&` : ""}${extra}`;

  // การจองจริงของ Part-Time คนนี้ (ล้ม = ถือว่ายังไม่มี ไม่ให้หน้าพัง)
  const all: Booking[] = await listForParttime(c.row.id).catch(() => []);
  const live = all.filter((b) => LIVE.includes(b.status));
  const inMonth = live.filter((b) => { const t = bkk(b.starts_at); return t.y === y && t.m === m; });
  const onDay = (d: number) => inMonth.filter((b) => bkk(b.starts_at).d === d).sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  const isToday = (iso: string) => { const t = bkk(iso); return t.y === today.y && t.m === today.m && t.d === today.d; };
  const pending = all.filter((b) => b.status === "requested").length;
  const acceptedToday = all.filter((b) => ["accepted", "checked_in"].includes(b.status) && isToday(b.starts_at)).length;
  const monthJobs = inMonth.filter((b) => b.status !== "requested").length;

  // สถานะเปิดรับงาน: เปิดโปรไฟล์แล้ว + ไม่ได้พัก = เปิดรับงานอยู่
  const listed = !!c.x.listed, paused = !!c.x.work?.paused;
  const badge: [string, string, string] = !listed ? ["ยังไม่เปิดรับงาน", "#d9c9b4", "rgba(243,234,217,0.25)"] : paused ? ["พักงานชั่วคราว", "#ff8a9a", "rgba(255,138,154,0.45)"] : ["● เปิดรับงานอยู่", "#7fd6a3", "rgba(127,214,163,0.5)"];

  const av = c.x.availability;
  const weekDays = av?.week_days ?? [];
  const selSessions = isTrain(sel) ? TRAINING_SESSIONS.filter((s) => +s.day === sel) : [];
  const selJobs = onDay(sel);
  const stat = (v: number | string, l: string, hi?: boolean, gold?: boolean) => (
    <div className="rounded-[14px]" style={{ padding: "10px 0", background: hi ? "rgba(232,196,114,0.14)" : undefined, border: hi ? "1px solid rgba(232,196,114,0.55)" : line }}>
      <div className="font-bold text-[20px] tabular-nums" style={{ color: gold ? "#e8c472" : undefined }}>{v}</div><div className="text-[12px] text-[#d9c9b4] font-light">{l}</div>
    </div>
  );
  const arrow = "w-10 h-10 rounded-lg grid place-items-center text-[#d9c9b4] hover:text-[#f3ead9]";

  return (
    <PtPage>
      <div className="flex flex-col gap-3 md:grid md:grid-cols-[1fr_340px] md:items-start md:gap-4" style={{ padding: "14px 18px 0" }}>
        <div className="flex flex-col gap-3 min-w-0">
          <div className="flex justify-between items-center gap-2">
            <h1 className="m-0 font-semibold text-[20px]">ตารางงานของฉัน</h1>
            <Link href={ptHref(c, "availability")} className="rounded-full text-[12px] font-light min-h-8 flex items-center hover:opacity-90" style={{ padding: "5px 10px", border: `1px solid ${badge[2]}`, color: badge[1] }}>{badge[0]}</Link>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <Link href={ptHref(c, "jobs")} className="hover:text-inherit">{stat(pending, "รอตอบรับ", true)}</Link>
            {stat(acceptedToday, "รับแล้ววันนี้", false, true)}
            {stat(monthJobs, isThis ? "งานเดือนนี้" : `งาน ${MONTHS[m]}`)}
          </div>

          <div className="rounded-2xl bg-[#211a18]" style={{ padding: 12, border: line }}>
            <div className="flex justify-between items-center mb-2 gap-2">
              <span className="flex items-center gap-1">
                <Link href={link(`m=${prev}`)} aria-label="เดือนก่อน" className={arrow}>‹</Link>
                <span className="font-semibold text-[14px]">{MONTHS_LONG[m]} {y + 543}</span>
                <Link href={link(`m=${next}`)} aria-label="เดือนถัดไป" className={arrow}>›</Link>
              </span>
              <span className="text-[12px] text-[#d9c9b4] font-light"><span className="text-[#e8c472]">●</span> มีนัด <span className="text-[#c9283d]">●</span> วันนี้</span>
            </div>
            <div className="grid grid-cols-7 gap-[3px] text-center text-[12px] font-light">
              {WD.map((w) => <span key={w} className="text-[12px] text-[#d9c9b4] py-1">{w}</span>)}
              {Array.from({ length: first }, (_, i) => <span key={"e" + i} />)}
              {Array.from({ length: days }, (_, i) => {
                const d = i + 1;
                const nJobs = onDay(d).length;
                const on = d === sel, busy = isTrain(d) || nJobs > 0, tdy = isThis && d === today.d;
                return (
                  <Link key={d} href={link(`m=${key(y, m)}&d=${d}`)} aria-current={on ? "date" : undefined} aria-label={`${d} ${MONTHS[m]}${nJobs ? ` · มีนัด ${nJobs} งาน` : ""}${isTrain(d) ? " · มีนัดอบรม" : ""}${tdy ? " · วันนี้" : ""}`}
                    className="relative h-10 rounded-lg grid place-items-center tabular-nums"
                    style={{ background: on ? "#e8c472" : busy ? "rgba(212,175,55,.14)" : "transparent", color: on ? "#1b130b" : busy ? "#e8c472" : "#d9c9b4", border: `1px solid ${tdy && !on ? "#c9283d" : "transparent"}` }}>
                    {d}{nJobs > 0 && <span aria-hidden="true" className="absolute bottom-1 w-1 h-1 rounded-full" style={{ background: on ? "#1b130b" : "#e8c472" }} />}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 min-w-0">
          <div className="font-semibold text-[16px]">นัดวันที่ {sel} {MONTHS[m]}</div>
          {selJobs.map((b) => {
            const st = ST[b.status] ?? [b.status, "#d9c9b4"];
            const t0 = bkk(b.starts_at), t1 = bkk(new Date(Date.parse(b.starts_at) + b.hours * 3600_000).toISOString());
            const chat = ["requested", "accepted", "checked_in", "cancel_requested"].includes(b.status);
            return (
              <Link key={b.id} href={chat ? `/join/profile/${c.mb}/chat/${b.id}${c.q}` : ptHref(c, "jobs")} className="rounded-[18px] bg-[#211a18] flex flex-col gap-1.5 text-[13px] font-light hover:text-inherit" style={{ padding: 14, border: "1px solid rgba(232,196,114,0.22)" }}>
                <div className="flex justify-between items-center gap-2"><div className="font-bold text-[18px] tabular-nums">{t0.hm}–{t1.hm}</div><span className="rounded-full text-[12px] shrink-0" style={{ padding: "3px 9px", background: "rgba(243,234,217,0.07)", color: st[1] }}>{st[0]}</span></div>
                <div className="text-[13.5px]">{[b.place?.label, b.place?.detail].filter(Boolean).join(" · ")}</div>
                <div className="text-[#d9c9b4]">{b.code} · {b.hours} ชม.{b.customer_name ? ` · คุณ${b.customer_name}` : ""}</div>
              </Link>
            );
          })}
          {selSessions.map((s) => (
            <Link key={s.session} href={`/join/training/${c.mb}${c.q}`} className="rounded-[18px] bg-[#211a18] flex flex-col gap-2 text-[12.5px] font-light hover:text-inherit" style={{ padding: 14, border: "1px solid rgba(232,196,114,0.14)" }}>
              <div className="flex justify-between items-center"><div className="font-bold text-[18px]">{s.meta.split(" · ")[0]}</div><span className="rounded-full text-[12px]" style={{ padding: "3px 9px", background: "rgba(74,222,128,.15)", color: "#bbf7d0" }}>อบรม</span></div>
              <div className="text-[13.5px]">{s.title}</div>
              <div className="text-[#d9c9b4]">{s.meta.split(" · ")[1] ?? TRAINING.venue}</div>
            </Link>
          ))}
          {!selJobs.length && !selSessions.length && <div className="rounded-[18px] bg-[#211a18] text-[13.5px] font-light text-[#d9c9b4]" style={{ padding: 14, border: line }}>{listed ? "ยังไม่มีนัดวันนี้ · ลูกค้าจองได้ตามวันเวลาที่ตั้งไว้" : `ยังไม่มีนัด · เริ่มรับงานหลังทีมงานอนุมัติและเปิดโปรไฟล์ (เปิดให้บริการ ${TRAINING.openService})`}</div>}

          <div className="rounded-[18px] bg-[#211a18] flex flex-col gap-2" style={{ padding: 14, border: line }}>
            <div className="flex justify-between items-center"><span className="font-semibold text-[14px]">วันเวลาที่สะดวกรับงาน</span><Link href={ptHref(c, "availability")} className="tap text-[13px] text-[#e8c472] font-light">ตั้งเวลา ›</Link></div>
            {av && weekDays.length
              ? <>
                  <div className="flex flex-wrap gap-1.5">{["จ", "อ", "พ", "พฤ", "ศ", "ส", "อา"].map((w) => <span key={w} className="w-9 h-9 rounded-full grid place-items-center text-[13px]" style={{ background: weekDays.includes(w) ? "rgba(232,196,114,0.16)" : "#251d1b", color: weekDays.includes(w) ? "#e8c472" : "#8d7f72" }}>{w}</span>)}</div>
                  <span className="text-[13px] font-light text-[#d9c9b4]">{c.x.work ? ["จ", "อ", "พ", "พฤ", "ศ", "ส", "อา"].filter((d) => c.x.work!.days[d]?.on).map((d) => `${d} ${c.x.work!.days[d].from}–${c.x.work!.days[d].to}`).join(" · ") + ` · รัศมี ${c.x.work.radius_km} กม.` : `${av.slots.join(" · ") || "—"}${av.hours_band ? ` · ${av.hours_band}/วัน` : ""}`}</span>
                  {paused && <span className="self-start rounded-full text-[12px] text-[#ff8a9a]" style={{ padding: "2px 10px", background: "rgba(255,138,154,0.1)" }}>พักงานชั่วคราว</span>}
                </>
              : <span className="text-[13px] font-light text-[#d9c9b4]">ยังไม่ได้กรอก · กด &quot;ตั้งเวลา&quot; เพื่อเลือกวันและช่วงเวลา</span>}
          </div>
        </div>
      </div>
      <PtNav c={c} active="schedule" />
    </PtPage>
  );
}
