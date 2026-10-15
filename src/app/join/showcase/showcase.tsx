"use client";
/* eslint-disable @next/next/no-img-element */

// ตัวอย่างหน้าแรกแอปลูกค้า (บอร์ด Benefits) · รูปและข้อมูลเป็นตัวอย่างทั้งหมด · การ์ดไม่ลิงก์ไปจองจริง
// มือถือ 2 คอลัมน์ · md 3 · lg 4
import { useMemo, useState } from "react";
import { Badge, Button, Container, Icon, Shell, StickyAction, StickySpacer, baht } from "@/components/mb/ui";
import { DEMO_MEMBERS } from "@/lib/demo-data";
import { EARNINGS } from "@/lib/join/config";

const ACTS = [
  { id: "eat", label: "กิน & เที่ยว", icon: "M7 3v8M5 3v4a2 2 0 0 0 4 0V3M7 11v10M17 3c-2 0-3 2-3 5s1 4 3 4v9" },
  { id: "massage", label: "นวดผ่อนคลาย", icon: "M12 3c2 3 5 5 5 9a5 5 0 0 1-10 0c0-4 3-6 5-9zM9 14a3 3 0 0 0 3 3" },
  { id: "cafe", label: "คาเฟ่", icon: "M4 9h12v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5zM16 10h2a2 2 0 0 1 0 4h-2M8 3v3M12 3v3" },
  { id: "photo", label: "ถ่ายรูป", icon: "M4 8h3l2-3h6l2 3h3v11H4zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" },
  { id: "movie", label: "ดูหนัง", icon: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 8.5v.01M8.5 12v.01M15.5 12v.01M12 15.5v.01" },
  { id: "gym", label: "ออกกำลัง", icon: "M3 9v6M6 7v10M18 7v10M21 9v6M6 12h12" },
  { id: "chill", label: "นั่งชิล", icon: "M6 4h12v6a6 6 0 0 1-12 0zM9 20h6M12 16v4" },
] as const;
type Act = (typeof ACTS)[number]["id"];

const SAMPLE: { top: boolean; rating: string; area: string; acts: Act[] }[] = [
  { top: true, rating: "5.0", area: "วัฒนา", acts: ["eat", "massage", "cafe"] },
  { top: false, rating: "4.8", area: "อารีย์", acts: ["cafe", "photo", "chill"] },
  { top: true, rating: "4.9", area: "ทองหล่อ", acts: ["massage", "gym", "eat"] },
  { top: false, rating: "4.8", area: "นิมมาน", acts: ["movie", "chill", "eat"] },
  { top: false, rating: "4.7", area: "สีลม", acts: ["eat", "photo", "movie"] },
  { top: true, rating: "4.9", area: "สาทร", acts: ["massage", "photo", "cafe"] },
  { top: false, rating: "4.8", area: "เอกมัย", acts: ["gym", "eat", "chill"] },
  { top: false, rating: "4.7", area: "นนทบุรี", acts: ["eat", "massage", "movie"] },
];
const label = (id: Act) => ACTS.find((a) => a.id === id)?.label ?? "";
const PEOPLE = SAMPLE.map((s, i) => {
  const m = DEMO_MEMBERS[i];
  const svc = s.acts.includes("massage") ? EARNINGS.price3h.massage : EARNINGS.price3h.eat;
  return { ...s, id: m.id, name: `${m.name}, ${m.age}`, img: m.avatar, price: s.top ? svc.top : svc.silver };
});

export function Showcase() {
  const [acts, setActs] = useState<Act[]>([]);
  const list = useMemo(() => PEOPLE.filter((p) => acts.every((a) => p.acts.includes(a))).sort((a, b) => Number(b.top) - Number(a.top)), [acts]);
  const toggle = (id: Act) => setActs((x) => (x.includes(id) ? x.filter((y) => y !== id) : [...x, id]));

  return (
    <Shell>
      <div className="bg-[rgba(232,196,114,0.10)] text-mb-gold text-[13px] font-light">
        <Container className="py-2.5 flex items-center justify-between gap-3">
          <span><b className="font-semibold">ตัวอย่างแอปลูกค้า</b> · รูปและข้อมูลเป็นตัวอย่าง ไม่ใช่การจองจริง</span>
          <a href="/join" className="shrink-0 min-h-11 inline-flex items-center text-mb-gold hover:underline">กลับหน้าสมัคร</a>
        </Container>
      </div>

      <Container className="pt-4 md:pt-6">
        <a href="/market" className="relative block rounded-[18px] overflow-hidden aspect-[16/9] md:aspect-[16/5] max-w-full">
          <img src="/brand/spa.jpg" alt="สปาพาร์ทเนอร์" className="w-full h-full object-cover block" />
          <span className="absolute inset-0 bg-[linear-gradient(90deg,rgba(20,16,15,.88)_0%,rgba(20,16,15,0)_70%)]" />
          <span className="absolute left-4 bottom-4 md:left-8 md:bottom-8 flex flex-col gap-1">
            <Badge tone="gold" className="self-start">โฆษณา · พาร์ทเนอร์</Badge>
            <span className="mb-h text-[18px] md:text-[26px]">บำรุงสุข สปา</span>
            <span className="text-[13px] font-light text-mb-text2">สมาชิกลด 20% · ตัวอย่างโปรโมชัน</span>
          </span>
        </a>

        <h1 className="mb-h mt-4 text-[26px] md:text-[32px] leading-tight text-mb-gold">เลือกเพื่อนของคุณ</h1>

        <div className="mt-3.5 -mx-4 px-4 md:mx-0 md:px-0 flex gap-2 overflow-x-auto no-scrollbar" role="group" aria-label="กรองตามกิจกรรม">
          {ACTS.map((a) => {
            const on = acts.includes(a.id);
            return (
              <button key={a.id} type="button" aria-pressed={on} onClick={() => toggle(a.id)}
                className={`shrink-0 w-[76px] h-[76px] rounded-2xl flex flex-col items-center justify-center gap-1.5 text-[12px] font-light transition ${on ? "bg-[rgba(232,196,114,0.16)] text-mb-gold" : "bg-[rgba(42,33,30,0.9)] text-mb-text"}`}>
                <Icon d={a.icon} size={22} />{a.label}
              </button>
            );
          })}
        </div>

        <div className="flex justify-between items-baseline pt-[18px] pb-2.5">
          <h2 className="mb-h text-[19px]">เพื่อนในระบบ</h2>
          <span className="text-[13px] font-light" aria-live="polite">พบ {list.length} คน</span>
        </div>

        {list.length === 0 ? (
          <div className="p-6 rounded-2xl text-center text-[13px] font-light bg-mb-surface3">ยังไม่เจอเพื่อนที่ตรงใจ ลองเลือกกิจกรรมให้น้อยลง</div>
        ) : (
          <ul className="m-0 p-0 list-none grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
            {list.map((p) => (
              <li key={p.id} className="rounded-[18px] overflow-hidden bg-mb-surface2">
                <div className="relative aspect-[4/5]">
                  <img src={p.img} alt={`ภาพตัวอย่าง ${p.name}`} loading="lazy" className="w-full h-full object-cover block" />
                  <span className="absolute inset-0 bg-[linear-gradient(180deg,rgba(251,251,251,0)_55%,rgba(42,33,30,0.85))]" />
                  {p.top && <Badge tone="top" className="absolute top-2 left-2 !h-[18px] !px-[7px] !rounded !text-[9.5px]">TOP</Badge>}
                  <span className="absolute left-2.5 bottom-2 text-[13px] font-light">{p.area}</span>
                </div>
                <div className="px-2.5 pt-[9px] pb-[11px]">
                  <div className="flex justify-between items-center gap-2"><span className="font-semibold text-[15px] truncate">{p.name}</span><span className="text-[13px] text-mb-gold shrink-0">★ {p.rating}</span></div>
                  <div className="text-[13px] mt-0.5 truncate">{p.acts.map(label).join(" · ")}</div>
                  <div className="mt-1.5 font-semibold text-[15px] text-mb-gold">{baht(p.price)} <span className="font-thin text-[11px] text-mb-text3">/ 3 ชม.</span></div>
                </div>
              </li>
            ))}
          </ul>
        )}

        <section className="mt-8 p-5 md:p-8 rounded-2xl bg-mb-surface flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="mb-h text-[18px] md:text-[22px]">โปรไฟล์ของคุณจะอยู่ตรงนี้</h2>
            <p className="mb-s m-0 mt-1">ผ่านอบรมแล้วได้รูปโปรไฟล์ ระดับ (TOP / Silver) และเริ่มรับนัดจากลูกค้าในแอป</p>
          </div>
          <div className="hidden lg:flex gap-2 shrink-0 w-[380px]">
            <Button href="/join#packages">สมัครเข้าอบรม</Button>
            {EARNINGS.show && <Button href="/join/earnings" variant="secondary">ดูรายได้</Button>}
          </div>
        </section>
        <StickySpacer />
      </Container>

      <div className="lg:hidden">
        <StickyAction>
          <Button href="/join#packages">สมัครเข้าอบรม</Button>
          {EARNINGS.show && <Button href="/join/earnings" variant="text">ดูรายได้และส่วนแบ่ง</Button>}
        </StickyAction>
      </div>
    </Shell>
  );
}
