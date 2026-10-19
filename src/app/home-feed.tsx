"use client";
/* eslint-disable @next/next/no-img-element */

// หน้าแรก · ดูเพื่อนในระบบ (บอร์ด Benefits + ป๊อปอัป BenefitsPopup) — ถอดตามบอร์ด
// มือถือ = ตามบอร์ด 390 · md+ การ์ด 3 คอลัมน์ · กดการ์ด → โปรไฟล์ตัวอย่าง /p/[id] (บอร์ด C-Profile) → แชทตัวอย่าง (บอร์ด C-ChatRoom)
import { useEffect, useMemo, useRef, useState } from "react";
import { readConsent } from "@/lib/consent";
import Link from "next/link";
import { PEOPLE, priceOf, type Person } from "@/lib/home/people";
import { TabBar } from "@/components/shell";
import { SiteFooter } from "@/components/site-footer";
import { MemberCard } from "@/components/member-card";
import { sized } from "@/lib/thumb-url";

const GOLD = "#e8c472";
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
// เพื่อนตัวอย่าง 20 คน (รูป AI ชุดเดียวกับ canvas) — กดการ์ดดูโปรไฟล์ /p/[id] และตัวอย่างแชท
type P = Person;
const PROV: Record<string, string> = { "กรุงเทพฯ": "bkk", "นนทบุรี": "bkk", "ปทุมธานี": "bkk", "สมุทรปราการ": "bkk", "สมุทรสาคร": "bkk", "นครปฐม": "bkk", "กำแพงเพชร": "north", "ชัยนาท": "bkk", "นครนายก": "bkk", "นครสวรรค์": "north", "พระนครศรีอยุธยา": "bkk", "พิจิตร": "north", "พิษณุโลก": "north", "เพชรบูรณ์": "north", "ลพบุรี": "bkk", "สมุทรสงคราม": "bkk", "สิงห์บุรี": "bkk", "สุโขทัย": "north", "สุพรรณบุรี": "bkk", "สระบุรี": "bkk", "อ่างทอง": "bkk", "อุทัยธานี": "north", "เชียงราย": "north", "เชียงใหม่": "north", "น่าน": "north", "พะเยา": "north", "แพร่": "north", "แม่ฮ่องสอน": "north", "ลำปาง": "north", "ลำพูน": "north", "อุตรดิตถ์": "north", "กาฬสินธุ์": "ne", "ขอนแก่น": "ne", "ชัยภูมิ": "ne", "นครพนม": "ne", "นครราชสีมา": "ne", "บึงกาฬ": "ne", "บุรีรัมย์": "ne", "มหาสารคาม": "ne", "มุกดาหาร": "ne", "ยโสธร": "ne", "ร้อยเอ็ด": "ne", "เลย": "ne", "ศรีสะเกษ": "ne", "สกลนคร": "ne", "สุรินทร์": "ne", "หนองคาย": "ne", "หนองบัวลำภู": "ne", "อำนาจเจริญ": "ne", "อุดรธานี": "ne", "อุบลราชธานี": "ne", "จันทบุรี": "bkk", "ฉะเชิงเทรา": "bkk", "ชลบุรี": "bkk", "ตราด": "bkk", "ปราจีนบุรี": "bkk", "ระยอง": "bkk", "สระแก้ว": "bkk", "กาญจนบุรี": "bkk", "ตาก": "north", "ประจวบคีรีขันธ์": "bkk", "เพชรบุรี": "bkk", "ราชบุรี": "bkk", "กระบี่": "south", "ชุมพร": "south", "ตรัง": "south", "นครศรีธรรมราช": "south", "นราธิวาส": "south", "ปัตตานี": "south", "พังงา": "south", "พัทลุง": "south", "ภูเก็ต": "south", "ระนอง": "south", "สตูล": "south", "สงขลา": "south", "สุราษฎร์ธานี": "south", "ยะลา": "south" };
const REG = [["", "ทุกภาค"], ["bkk", "กรุงเทพฯ และภาคกลาง"], ["north", "ภาคเหนือ"], ["ne", "ภาคตะวันออกเฉียงเหนือ"], ["south", "ภาคใต้"]];
const SORTS = [["top", "แนะนำ · TOP ก่อน"], ["rate", "คะแนนสูงสุด"], ["price", "ราคา"]] as const;
type Sort = (typeof SORTS)[number][0];
const price = priceOf;
const labelOf = (id: Act) => ACTS.find((a) => a.id === id)?.label ?? "";
const provOf = (p: P) => p.prov || "กรุงเทพฯ";
const ageOf = (p: P) => p.age;

const AD = { img: "/brand/home/ad-spa.jpg", kind: "สปาพาร์ทเนอร์ · สีลม", name: "บำรุงสุข สปา", offer: "สมาชิกลด 20%" };
// สไลด์โฆษณาบนสุด (3 รูป · เลื่อนเองทุก 5 วิ · ปัดได้ · กดจุดได้)
const SLIDES = [
  { ...AD, href: "/spas" },
  { img: "/brand/hotel1.jpg", kind: "โรงแรมพาร์ทเนอร์ · สาทร", name: "The Sathorn Retreat", offer: "ห้องพักราคาสมาชิก", href: "/hotels" },
  { img: "/brand/hotel2.jpg", kind: "รีสอร์ทพาร์ทเนอร์ · หัวหิน", name: "Seaside Villa", offer: "พักริมทะเล ลด 15% สำหรับสมาชิก", href: "/hotels" },
];
const sel: React.CSSProperties = { height: 50, width: "100%", borderRadius: 12, background: "rgba(0,0,0,0.3)", color: "#fff7e8", colorScheme: "dark", fontSize: 15, padding: "0 14px" };
const Svg = ({ d, size = 20, sw = 1.8 }: { d: string; size?: number; sw?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
);

// โฆษณาคั่นในรายการเพื่อน (n = จำนวนเพื่อนระหว่างโฆษณา) — วนตามลำดับ
const AD_EVERY = 6, AD_EVERY_XL = 8;
const MID_ADS = [
  { img: "/brand/hotel1.jpg", name: "The Sathorn Retreat", sub: "ห้องพักราคาสมาชิก", href: "/hotels" },
  { img: "/brand/home/ad-spa.jpg", name: "บำรุงสุข สปา", sub: "สมาชิกลด 20%", href: "/spas" },
  { img: "/brand/market/gold-box.jpg", name: "ชุดของขวัญ Gold Box", sub: "ของขวัญพรีเมียม ส่งถึงบ้าน", href: "/products" },
  { img: "/brand/hotel2.jpg", name: "Seaside Villa", sub: "พักริมทะเล ลด 15% สำหรับสมาชิก", href: "/hotels" },
  { img: "/brand/market/body-oil-lavender.jpg", name: "Body Oil ลาเวนเดอร์", sub: "น้ำมันนวดผ่อนคลาย", href: "/products" },
];
// การ์ดทั้งหน้า: แดงเลือดหมูแบบการ์ดสปาหน้า /work-with-us (#2c1a1f) แต่เข้มกว่า (ผู้ใช้สั่ง 17 ต.ค.)
const CARD_BG = "linear-gradient(180deg, #4d1f2a 0%, #37151d 100%)";
const CARD_BD = "1px solid rgba(232,196,114,.22)";

/** mode "home" = หน้าแรกลูกค้า (เมนูลูกค้า) · "sample" = หน้าตัวอย่างสำหรับผู้สนใจร่วมทีม (เพื่อนตัวอย่าง + เมนูรับสมัคร)
 *  people = Part-Time จริง (ถ้ามี) · ไม่มีคนจริง → ใช้ตัวอย่าง 20 คน */
type Promo = { gold: { pay: number; credit: number }; black: { pay: number; credit: number } };
const PROMO_DEFAULT: Promo = { gold: { pay: 50000, credit: 70000 }, black: { pay: 100000, credit: 150000 } };
const fb = (n: number) => "฿" + n.toLocaleString("th-TH");

export function HomeFeed({ showEarnings = true, people = PEOPLE, mode = "home", me = null, unread = 0, memberTier = null, promo = PROMO_DEFAULT }: { showEarnings?: boolean; people?: Person[]; mode?: "home" | "sample"; me?: { name: string } | null; unread?: number; memberTier?: "gold" | "black" | null; promo?: Promo }) {
  const sample = mode === "sample";
  const slider = useRef<HTMLDivElement>(null);
  const [slide, setSlide] = useState(0);
  // จุดแดงที่กระดิ่ง = มีแจ้งเตือนที่ยังไม่อ่านจริง (ไม่ได้ล็อกอิน = ไม่มีจุด)
  const [unreadN, setUnreadN] = useState(0);
  useEffect(() => { if (!me) return; fetch("/api/notifications", { cache: "no-store" }).then((r) => r.json()).then((d) => setUnreadN((d?.notices ?? []).filter((n: { read_at: string | null }) => !n.read_at).length)).catch(() => {}); }, [me]);
  const go = (i: number) => { const el = slider.current; if (el) el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" }); };
  const onSlide = () => { const el = slider.current; if (el) setSlide(Math.round(el.scrollLeft / Math.max(1, el.clientWidth))); };
  const nSlides = SLIDES.length + (memberTier ? 0 : 1);
  useEffect(() => { const t = setInterval(() => go((Math.round((slider.current?.scrollLeft ?? 0) / Math.max(1, slider.current?.clientWidth ?? 1)) + 1) % nSlides), 5000); return () => clearInterval(t); }, [nSlides]); // eslint-disable-line react-hooks/exhaustive-deps
  const [acts, setActs] = useState<Act[]>([]);
  const [sort, setSort] = useState<Sort>("top");
  const [ad, setAd] = useState(false);
  const [fOpen, setFOpen] = useState(false);
  const [f, setF] = useState({ reg: "", prov: "", spot: "", type: "", tier: "", act: "", aMin: "20", aMax: "50" });

  // ป๊อปอัปโฆษณาตอนเปิดแอป (บอร์ด BenefitsPopup) — ครั้งเดียวต่อ session
  useEffect(() => {
    // รอให้ตอบแถบคุกกี้ก่อน (ไม่เปิดซ้อนกันตอนเข้าครั้งแรก) — เช็กทุก 1 วิ สูงสุด 2 นาที
    let n = 0;
    const show = () => { try { if (!sessionStorage.getItem("mb_home_ad")) { setAd(true); sessionStorage.setItem("mb_home_ad", "1"); } } catch { setAd(true); } };
    if (!!readConsent()) { show(); return; }
    const t = setInterval(() => { if (!!readConsent()) { clearInterval(t); setTimeout(show, 600); } else if (++n > 120) clearInterval(t); }, 1000);
    return () => clearInterval(t);
  }, []);
  const closeAd = () => setAd(false);

  const lo = +f.aMin || 20, hi = +f.aMax || 50, spot = f.spot.trim();
  const list = useMemo(() => {
    const by: Record<Sort, (a: P, b: P) => number> = {
      top: (a, b) => (b.boost ? 1 : 0) - (a.boost ? 1 : 0) || (b.top ? 1 : 0) - (a.top ? 1 : 0) || (parseFloat(b.rating) || 0) - (parseFloat(a.rating) || 0),
      rate: (a, b) => (parseFloat(b.rating) || 0) - (parseFloat(a.rating) || 0), price: (a, b) => price(a) - price(b),
    };
    return people.filter((p) => acts.every((a) => p.acts.includes(a)) && (!f.reg || PROV[provOf(p)] === f.reg) && (!f.prov || provOf(p) === f.prov)
      && (!spot || p.area.includes(spot) || spot.includes(p.area)) && (!f.type || (f.type === "massage") === p.acts.includes("massage"))
      && (!f.tier || (f.tier === "top") === p.top) && (!f.act || p.acts.includes(f.act as Act)) && ageOf(p) >= lo && ageOf(p) <= hi).sort(by[sort]);
  }, [people, acts, sort, f.reg, f.prov, spot, f.type, f.tier, f.act, lo, hi]);
  const nF = acts.length + [f.reg, f.prov, spot, f.type, f.tier, f.act].filter(Boolean).length + (lo !== 20 || hi !== 50 ? 1 : 0);
  const provOpts = Object.keys(PROV).filter((k) => !f.reg || PROV[k] === f.reg).sort((a, b) => a.localeCompare(b, "th"));
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF((x) => ({ ...x, [k]: e.target.value }));
  const clear = () => { setActs([]); setF({ reg: "", prov: "", spot: "", type: "", tier: "", act: "", aMin: "20", aMax: "50" }); };

  const card = (p: P, i = 0) => (
    <Link key={p.id} href={sample && !p.real ? `/p/${p.id}?ex=1` : `/p/${p.id}`} style={{ order: i * 2, background: p.boost ? "linear-gradient(180deg, #5a2a1c 0%, #3a1a14 100%)" : CARD_BG, border: p.boost ? "2px solid #e8c472" : CARD_BD, boxShadow: p.boost ? "0 0 0 1px rgba(255,241,201,.35), 0 10px 30px rgba(232,196,114,.28)" : undefined }} className="block rounded-[18px] overflow-hidden text-inherit hover:text-inherit">
      <div className="relative h-[176px] md:h-auto md:aspect-[4/5] lg:aspect-square">
        <img src={sized(p.img, 480)} alt={p.nick} loading="lazy" className="w-full h-full object-cover block" style={p.pos ? { objectPosition: p.pos } : undefined} />
        <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(251,251,251,0) 55%, rgba(55,21,29,0.95))" }} />
        {p.boost && <span className="absolute top-2 right-2 rounded-full text-[11.5px] font-semibold text-[#1b130b]" style={{ padding: "2px 9px", background: "linear-gradient(135deg, #fff1c9, #e8c472)", boxShadow: "0 2px 8px rgba(0,0,0,.35)" }}>★ แนะนำ</span>}
        {p.top && <div className="absolute top-2 left-2 flex"><span style={{ display: "inline-flex", alignItems: "center", height: 18, padding: "0 7px", borderRadius: 4, background: "linear-gradient(135deg, #fff1c9 0%, #e8c472 45%, #a8781f 100%)", color: "#1b130b", fontWeight: 700, fontSize: 9.5, letterSpacing: ".2em", boxShadow: "inset 0 0 0 1px rgba(255,241,201,.5), 0 2px 6px rgba(0,0,0,.35)" }}>TOP</span></div>}
        <div className="absolute left-[10px] bottom-2 text-[13px] font-light text-[#f3ead9]">{p.prov ? `${p.area} · ${p.prov}` : p.area}</div>
      </div>
      <div style={{ padding: "9px 10px 11px" }}>
        <div className="flex justify-between items-center"><span className="font-semibold text-[15px]" style={p.boost ? { color: "#f3d27e" } : undefined}>{p.nick}, {p.age}</span><span className="text-[13px] text-[#e8c472] font-normal">★ {p.rating}</span></div>
        <div className="text-[13px] mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis font-thin">{p.acts.map(labelOf).join(" · ")}</div>
        <div className="font-semibold text-[#e8c472] mt-1.5 text-[15px]">฿{price(p).toLocaleString("en-US")} <span className="font-thin text-[11.5px] text-[#b5a596]">/ 3 ชม.</span></div>
      </div>
    </Link>
  );

  return (
    <div className="mb-v7 min-h-dvh relative" style={{ background: "#171211", color: "#f3ead9" }}>
      <div className="mx-auto w-full max-w-[1200px] md:px-4">
        {/* หัว */}
        <div className="flex items-center justify-between" style={{ padding: "14px 18px 8px" }}>
          <Link href="/" aria-label="Mister Bamrungsuk · หน้าแรก" className="flex items-center gap-[10px] hover:text-inherit">
            <img src="/brand/logo.png" alt="" width={38} height={38} className="w-[38px] h-[38px] object-contain" />
            <span className="font-brand text-[11px] md:text-[14px] text-[#e8c472] whitespace-nowrap">Mister Bamrungsuk</span>
          </Link>
          <nav aria-label="เมนูหลัก (จอคอม)" className="hidden md:flex items-center gap-1 ml-auto mr-3 text-[14px] font-light">
            {(sample
              ? [["/join/showcase", "ดูเพื่อน"], ["/map", "แผนที่"], [showEarnings ? "/join/earnings" : "/join", "รายได้"], ["/policy", "กฎเกณฑ์"], ["/work-with-us", "ร่วมทีม"]]
              : [["/", "หน้าแรก"], ["/map", "แผนที่"], ...(me ? [["/orders", "นัดของฉัน"]] : [])]).map(([h, l], i) => (
              <Link key={h} href={h} aria-current={i === 0 ? "page" : undefined} className={`px-3 min-h-10 inline-flex items-center rounded-full ${i === 0 ? "text-[#e8c472] hover:text-[#e8c472]" : "text-[#d9c9b4] hover:text-[#f3ead9]"}`}>{l}</Link>
            ))}
            {sample ? <Link href="/join" className="ml-2 px-5 min-h-10 inline-flex items-center rounded-full bg-[#e8c472] text-[#1b130b] font-semibold hover:text-[#1b130b]">สมัครร่วมทีม</Link>
              : me ? <Link href="/profile" className="ml-2 px-4 min-h-10 inline-flex items-center gap-2 rounded-full text-[#f3ead9] hover:text-[#f3ead9]" style={{ background: "rgba(232,196,114,0.16)" }}><span className="w-7 h-7 rounded-full grid place-items-center bg-[#e8c472] text-[#1b130b] text-[13px] font-semibold">{me.name.slice(0, 1) || "ฉ"}</span>บัญชีของฉัน</Link>
              : <><Link href="/auth/register" className="ml-2 px-5 min-h-10 inline-flex items-center rounded-full bg-[#e8c472] text-[#1b130b] font-semibold hover:text-[#1b130b]">สมัครทันที</Link>
                <Link href="/login" className="px-3 min-h-10 inline-flex items-center rounded-full text-[#d9c9b4] hover:text-[#f3ead9]">เข้าสู่ระบบ</Link></>}
          </nav>
          <Link href={me ? "/notifications" : "/login?next=/notifications"} aria-label="การแจ้งเตือน" className="relative grid place-items-center w-11 h-11 rounded-full text-[#f3ead9] hover:text-[#f3ead9]" style={{ background: "rgba(232,196,114,0.16)" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10 21h4" /></svg>
            {unreadN > 0 && <span className="absolute w-2 h-2 rounded-full bg-[#c9283d]" style={{ top: 9, right: 10 }} aria-label={`ยังไม่อ่าน ${unreadN}`} />}
          </Link>
        </div>

        {/* โฆษณาบนสุด — สไลด์ */}
        <div className="flex flex-col gap-2" style={{ margin: "6px 18px 0" }}>
          <div ref={slider} onScroll={onSlide} className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar rounded-[18px]" aria-roledescription="carousel" aria-label="โฆษณา">
            {!memberTier && (
              <Link href="/membership" aria-label="โปรเปิดเมมเบอร์ Gold / Black" className="relative block shrink-0 w-full snap-start overflow-hidden aspect-[16/9] md:aspect-[16/5]" style={{ background: "radial-gradient(80% 120% at 85% 30%, rgba(232,196,114,.25), rgba(0,0,0,0) 60%), linear-gradient(120deg, #3a0a14 0%, #1a0d0f 60%, #0b0808 100%)" }}>
                <span className="absolute inset-y-0 left-0 flex flex-col justify-center gap-1.5 text-[#f3ead9] w-[58%] md:w-[52%]" style={{ padding: "14px 16px" }}>
                  <span className="text-[11.5px] tracking-[.22em] font-semibold text-[#e8c472]">MEMBER PROMOTION</span>
                  <span className="font-bold text-[19px] md:text-[28px] leading-[1.3]">เปิดเมม Gold<br className="md:hidden" /> จ่าย {fb(promo.gold.pay)} <span className="text-[#e8c472]">รับ {fb(promo.gold.credit)}</span></span>
                  <span className="text-[12.5px] md:text-[15px] text-[#d9c9b4]">Black จ่าย {fb(promo.black.pay)} รับ {fb(promo.black.credit)} · แต้มคูณ · บัตรสมาชิก</span>
                  <span className="mt-1 self-start rounded-full bg-[#e8c472] text-[#1b130b] text-[13px] font-semibold" style={{ padding: "6px 14px" }}>ดูโปรเมมเบอร์ ›</span>
                </span>
                <span className="absolute right-[-6%] md:right-[3%] top-1/2 -translate-y-1/2 md:-translate-y-[58%] w-[48%] md:w-[25%] rotate-[-8deg] md:rotate-[7deg]"><MemberCard tier="black" name="Black Member" sample /></span>
                <span className="hidden md:block absolute right-[20%] top-1/2 -translate-y-[42%] w-[25%] rotate-[-7deg]"><MemberCard tier="gold" name="Gold Member" sample /></span>
              </Link>
            )}
            {SLIDES.map((x, i) => (
              <Link key={x.name} href={x.href} aria-label={`โฆษณา ${i + 1}/${SLIDES.length} · ${x.name}`} className="relative block shrink-0 w-full snap-start overflow-hidden aspect-[16/9] md:aspect-[16/5]">
                <img src={x.img} alt={x.name} loading={i ? "lazy" : "eager"} className="w-full h-full object-cover block" />
                <span className="absolute inset-0" style={{ background: "linear-gradient(rgba(20,16,15,0) 40%, rgba(20,16,15,0.9))" }} />
                <span className="absolute top-[10px] left-[10px] text-[11.5px] font-light text-white rounded-full" style={{ padding: "2px 9px", background: "rgba(20,16,15,0.7)" }}>โฆษณา</span>
                <span className="absolute flex flex-col text-[#f3ead9]" style={{ left: 14, right: 14, bottom: 12 }}>
                  <span className="text-[13px] text-white font-light">{x.kind}</span>
                  <span className="font-semibold text-[18px]">{x.name}</span>
                  <span className="text-[13.5px] text-white">{x.offer}</span>
                </span>
              </Link>
            ))}
          </div>
          <div className="flex justify-between items-center">
            <span className="flex items-center">
              {Array.from({ length: nSlides }, (_, i) => (
                <button key={i} type="button" onClick={() => go(i)} aria-label={`ดูโฆษณาที่ ${i + 1}`} aria-current={slide === i} className="h-10 min-w-7 px-1 grid place-items-center">
                  <span className="block h-[5px] rounded-[3px] transition-all" style={{ width: slide === i ? 18 : 5, background: slide === i ? GOLD : "rgba(243,234,217,.3)" }} />
                </button>
              ))}
            </span>
            <Link href="/partner" className="tap text-[13px] text-[#f3ead9] font-light hover:text-[#f3ead9]">โฆษณากับเรา ›</Link>
          </div>
        </div>

        <div style={{ padding: "10px 18px 0" }}>
          {!sample && me && <p className="m-0 mb-1 text-[15px] text-[#d9c9b4]">สวัสดี คุณ{me.name.replace(/^คุณ\s*/, "").split(" ")[0]} 👋</p>}
          {sample && <div className="mb-2 inline-flex items-center gap-2 rounded-full text-[12.5px] font-semibold" style={{ padding: "5px 12px", background: "rgba(232,196,114,0.16)", color: GOLD }}>หน้าตัวอย่าง · สิ่งที่ลูกค้าเห็นในแอป</div>}
          <h1 className="m-0 mt-0.5 font-bold text-[26px] md:text-[32px] leading-[1.3] text-[#e8c472]" style={{ textWrap: "balance" }}>{sample ? "เพื่อนกินเที่ยวในแอปของเรา" : "เลือกเพื่อนของคุณ"}</h1>
        </div>

        {sample ? (
          /* หน้าตัวอย่าง: ชวนสมัครร่วมทีม */
          <Link href="/join" className="flex items-center gap-3 rounded-2xl text-[#1b130b] hover:text-[#1b130b]" style={{ margin: "14px 18px 0", padding: "12px 14px", background: "#f3ead9" }}>
            <span className="flex-1 min-w-0 leading-[1.4]"><span className="block font-semibold text-[15px]">อยากเป็นเพื่อนกินเที่ยวแบบนี้?</span><span className="block text-[13px] font-normal text-[#4f4038]">อบรมเริ่มต้น ฿3,000 · เลือกวันเวลาเอง</span></span>
            <span className="shrink-0 h-10 px-4 rounded-full text-[#f3ead9] text-[13.5px] font-semibold flex items-center bg-[#1b130b]">สมัครร่วมทีม →</span>
          </Link>
        ) : (
          <>
          {/* ลูกค้าล็อกอินแล้ว: ทางไปเลือกซื้อบริการและสินค้า (สีครีมอ่อน) */}
          {me && (
            <nav aria-label="ซื้อบริการและสินค้า" className="grid grid-cols-2 gap-2 md:gap-3" style={{ margin: "14px 18px 0" }}>
              {([["/stay", "โรงแรม · สปา", "ราคาสมาชิก", "M3 21V8l9-5 9 5v13M9 21v-6h6v6M3 21h18"], ["/market", "สินค้า", "ส่งถึงบ้าน", "M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18M16 10a4 4 0 0 1-8 0"]] as const).map(([h, t, sub, d]) => (
                <Link key={h} href={h} className="flex items-center gap-2.5 rounded-2xl text-[#1b130b] hover:text-[#1b130b] active:scale-[.98] transition-transform" style={{ padding: "12px 12px", minHeight: 64, background: "#f3ead9" }}>
                  <span className="grid place-items-center w-10 h-10 rounded-xl shrink-0" style={{ background: "rgba(143,94,0,0.12)", color: "#8f5e00" }}><Svg d={d} size={20} /></span>
                  <span className="min-w-0 leading-[1.35]"><span className="block font-semibold text-[15px]">{t}</span><span className="block text-[12px] text-[#5a4a42] truncate">{sub}</span></span>
                </Link>
              ))}
            </nav>
          )}
          {/* ร่วมงานกับเรา — ปุ่มเดียวแบบเดิม สีครีมอ่อน */}
          <Link href="/work-with-us" className="flex items-center gap-3 rounded-2xl text-[#1b130b] hover:text-[#1b130b]" style={{ margin: "14px 18px 0", padding: "12px 14px", background: "#f3ead9" }}>
            <span className="grid place-items-center w-[38px] h-[38px] rounded-xl shrink-0" style={{ background: "rgba(143,94,0,0.12)", color: "#8f5e00" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m11 17 2 2a1 1 0 1 0 3-3" /><path d="m14 14 2.5 2.5a1 1 0 1 0 3-3l-3.88-3.88a3 3 0 0 0-4.24 0l-.88.88a1 1 0 1 1-3-3l2.81-2.81a5.79 5.79 0 0 1 7.06-.87l.47.28a2 2 0 0 0 1.42.25L21 4" /><path d="m21 3 1 11h-2" /><path d="M3 3 2 14l6.5 6.5a1 1 0 1 0 3-3" /><path d="M3 4h8" /></svg>
            </span>
            <span className="flex-1 min-w-0 leading-[1.4]"><span className="block font-semibold text-[15px]">ร่วมงานกับเรา</span></span>
            <span className="shrink-0 h-9 px-3.5 rounded-full text-[#f3ead9] text-[13px] font-semibold flex items-center bg-[#1b130b]">สมัคร →</span>
          </Link>
          </>
        )}

        {/* ค้นหา + ตัวกรอง */}
        <div className="flex gap-[10px]" style={{ margin: "14px 18px 0" }}>
          <label className="flex-1 min-w-0 h-12 rounded-[14px] bg-[#3d1922] border border-[rgba(232,196,114,.22)] flex items-center gap-[10px] px-[14px] text-[#b5a596] text-[14px]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
            <input value={f.spot} onChange={set("spot")} placeholder="ค้นหาชื่อ ย่าน หรือกิจกรรม" aria-label="ค้นหา" className="flex-1 min-w-0 bg-transparent border-0 outline-none text-[#f3ead9] placeholder:text-[#b5a596]" style={{ fontSize: 14 }} />
          </label>
          <Link href="/map" aria-label="ดูบนแผนที่" className="grid place-items-center w-12 h-12 shrink-0 rounded-[14px] text-[#e8c472] hover:text-[#e8c472]" style={{ background: "rgba(232,196,114,0.24)" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14" /></svg>
          </Link>
          <button type="button" onClick={() => setFOpen(true)} aria-label="ตัวกรอง" className="relative grid place-items-center w-12 h-12 shrink-0 rounded-[14px] text-[#e8c472] p-0" style={{ background: "rgba(232,196,114,0.24)" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0" /><circle cx="16" cy="6" r="2" /><circle cx="10" cy="12" r="2" /><circle cx="18" cy="18" r="2" /></svg>
            {nF > 0 && <span className="absolute grid place-items-center rounded-full bg-[#b0182c] text-white font-bold" style={{ top: -6, right: -6, minWidth: 18, height: 18, padding: "0 5px", fontSize: 11.5 }}>{nF}</span>}
          </button>
        </div>

        {/* กิจกรรม */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar" style={{ padding: "14px 18px 0" }}>
          {ACTS.map((a) => {
            const on = acts.includes(a.id);
            return (
              <button key={a.id} type="button" aria-pressed={on} onClick={() => setActs((x) => (on ? x.filter((y) => y !== a.id) : [...x, a.id]))}
                className="flex flex-col items-center justify-center gap-[5px] rounded-2xl font-light flex-[0_0_70px] md:flex-1 md:text-[13px]!" style={{ minWidth: 70, height: 72, fontSize: 11.5, background: on ? "rgba(232,196,114,0.22)" : CARD_BG, border: on ? "1px solid #e8c472" : CARD_BD, color: on ? GOLD : "#f3ead9" }}>
                <Svg d={a.icon} size={22} sw={1.6} />{a.label}
              </button>
            );
          })}
        </div>

        {/* เรียงลำดับ */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar" style={{ padding: "12px 18px 0" }}>
          {SORTS.map(([id, label]) => {
            const on = sort === id;
            return <button key={id} type="button" aria-pressed={on} onClick={() => setSort(id)} className="shrink-0 rounded-full font-semibold" style={{ height: 40, padding: "0 16px", fontSize: 13.5, background: on ? GOLD : "#3d1922", border: on ? "1px solid #e8c472" : CARD_BD, color: on ? "#1b130b" : "#f3ead9" }}>{label}</button>;
          })}
        </div>

        <div className="flex justify-between items-baseline" style={{ padding: "18px 18px 10px" }}>
          <div className="font-semibold text-[19px]">เพื่อนในระบบ</div>
          <div className="text-[13px] font-light" aria-live="polite"><span className="text-[#b5a596]">●</span> พบ {list.length} คน</div>
        </div>

        {list.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4" style={{ padding: "0 18px" }}>
            {list.map((x, i) => card(x, i))}
            {/* โฆษณาคั่นกลาง: ทุก ๆ AD_EVERY คน (มือถือ/แท็บเล็ต 6 คน · จอคอม 4 คอลัมน์ 8 คน) วนตามรายการ MID_ADS เลื่อนไปเรื่อย ๆ */}
            {[{ n: AD_EVERY, cls: "xl:hidden" }, { n: AD_EVERY_XL, cls: "hidden xl:grid" }].flatMap(({ n, cls }) =>
              Array.from({ length: Math.floor((list.length - 1) / n) }, (_, k) => {
                const ad = MID_ADS[k % MID_ADS.length];
                return (
                  <Link key={`${n}-${k}`} href={ad.href} style={{ gridTemplateColumns: "112px 1fr", order: (k + 1) * n * 2 - 1, background: "#2c1a1f", border: CARD_BD }} className={`${cls === "xl:hidden" ? "grid xl:hidden" : cls} col-span-full relative gap-3 items-center p-[10px] rounded-2xl text-[#f3ead9] hover:text-[#f3ead9]`}>
                    <img src={ad.img} alt="" loading="lazy" className="w-[112px] h-[84px] rounded-[10px] object-cover block" />
                    <span className="flex flex-col gap-0.5 min-w-0 font-normal">
                      <span className="text-[11.5px] text-[#b5a596] font-light">โฆษณา</span>
                      <span className="font-semibold text-[15px] truncate">{ad.name}</span>
                      <span className="text-[13px] text-[#b5a596] font-light truncate">{ad.sub}</span>
                      <span className="text-[13.5px] text-[#e8c472] font-semibold">ดูรายละเอียด ›</span>
                    </span>
                  </Link>
                );
              }))}
          </div>
        ) : (
          <div className="rounded-2xl text-center text-[13px] font-light bg-[#2c1a1f]" style={{ margin: "0 18px", padding: 24 }}>ยังไม่เจอเพื่อนที่ตรงใจ ลองเลือกกิจกรรมให้น้อยลงดูนะคะ</div>
        )}

        {/* โฆษณาท้ายหน้า */}
        <div className="flex flex-col gap-2" style={{ margin: "22px 18px 0" }}>
          <Link href="/market" className="relative block rounded-2xl overflow-hidden aspect-[16/7] md:aspect-[16/4]">
            <img src="/brand/home/ad-oil.jpg" alt="" className="w-full h-full object-cover block" />
            <span className="absolute inset-0" style={{ background: "linear-gradient(90deg, rgba(20,16,15,.88) 0%, rgba(20,16,15,0) 70%)" }} />
            <span className="absolute top-[10px] left-3 text-[11.5px] font-light text-white rounded-full" style={{ padding: "2px 8px", background: "rgba(20,16,15,.7)" }}>โฆษณา</span>
            <span className="absolute flex flex-col text-[#f3ead9]" style={{ left: 14, bottom: 14 }}>
              <span className="font-semibold text-[17px]">น้ำมันนวดออร์แกนิก</span>
              <span className="text-[13.5px] text-[#e8c472]">ซื้อใน Marketplace ›</span>
            </span>
          </Link>
          <Link href="/partner" className="self-end tap text-[13.5px] text-[#f3ead9] hover:text-[#f3ead9]">โฆษณากับเรา ›</Link>
        </div>
      </div>
      <div style={{ paddingBottom: "calc(80px + env(safe-area-inset-bottom))" }} className="md:pb-0!"><SiteFooter /></div>

      {/* เมนูล่าง: หน้าตัวอย่าง = เมนูรับสมัคร · หน้าแรก = เมนูลูกค้า */}
      {sample ? <nav aria-label="เมนูหลัก" className="md:hidden fixed bottom-0 inset-x-0 z-40 mx-auto max-w-[640px] grid grid-cols-5 items-center text-center font-light text-[#b5a596] border-t border-[rgba(243,234,217,0.07)] bg-[#251d1b] md:rounded-t-2xl"
        style={{ height: "calc(64px + env(safe-area-inset-bottom))", paddingBottom: "env(safe-area-inset-bottom)", fontSize: 12 }}>
        <Link href="/join/showcase" aria-current="page" className="flex flex-col items-center gap-[3px] text-[#e8c472] hover:text-[#e8c472]"><Svg d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />ดูเพื่อน</Link>
        <Link href={showEarnings ? "/join/earnings" : "/join"} className="flex flex-col items-center gap-[3px] text-inherit hover:text-[#f3ead9]"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><rect x="2" y="6" width="20" height="12" rx="2" /><circle cx="12" cy="12" r="2.5" /></svg>รายได้</Link>
        <div><Link href="/auth/register" aria-label="สมัครทันที" className="mx-auto grid place-items-center w-[50px] h-[50px] rounded-2xl bg-[#e8c472] text-[#1b130b] hover:text-[#1b130b]"><Svg d="M12 5v14M5 12h14" size={22} sw={2.2} /></Link></div>
        <Link href="/policy" className="flex flex-col items-center gap-[3px] text-inherit hover:text-[#f3ead9]"><Svg d="M12 3l7 3v5c0 4.5-3 8.2-7 10-4-1.8-7-5.5-7-10V6l7-3z" />กฎเกณฑ์</Link>
        <Link href="/join" className="flex flex-col items-center gap-[3px] text-inherit hover:text-[#f3ead9]"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="12" cy="8" r="4" /><path d="M4 21c1-4 4-6 8-6s7 2 8 6" /></svg>ร่วมทีม</Link>
      </nav> : <div className="md:hidden"><TabBar unread={unread} /></div>}

      {/* ป๊อปอัปโปรเมมเบอร์ (คนที่ยังไม่เป็นเมม) */}
      {ad && !memberTier && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto" style={{ background: "rgba(8,6,6,.78)", padding: "96px 20px 24px" }} onClick={closeAd}>
          <div role="dialog" aria-modal="true" aria-label="โปรเปิดเมมเบอร์" className="relative w-full max-w-[420px] rounded-[22px] overflow-hidden" style={{ background: "linear-gradient(160deg, #3a0a14 0%, #1c0d10 55%, #0d0909 100%)", boxShadow: "0 0 0 1.5px #e8c472, 0 24px 60px rgba(0,0,0,.6)" }} onClick={(e) => e.stopPropagation()}>
            <button type="button" onClick={closeAd} aria-label="ปิด" className="absolute z-10 grid place-items-center w-10 h-10 rounded-full text-[#f3ead9] text-[18px]" style={{ top: 10, right: 10, background: "rgba(0,0,0,.45)" }}>✕</button>
            <div className="flex flex-col items-center text-center gap-3" style={{ padding: "22px 18px 18px" }}>
              <span className="text-[12px] tracking-[.24em] font-semibold text-[#e8c472]">MEMBER PROMOTION</span>
              <span className="font-bold text-[24px] leading-[1.3] text-[#f3ead9]">เปิดเมม ได้เครดิตเพิ่มทันที</span>
              <div className="relative w-full h-[170px]">
                <span className="absolute left-[2%] top-2 w-[62%] rotate-[-7deg]"><MemberCard tier="gold" name="Gold Member" sample /></span>
                <span className="absolute right-[2%] top-6 w-[62%] rotate-[6deg]"><MemberCard tier="black" name="Black Member" sample /></span>
              </div>
              <div className="grid grid-cols-2 gap-2 w-full text-left">
                {(["gold", "black"] as const).map((k) => (
                  <div key={k} className="rounded-xl" style={{ padding: "10px 12px", background: "rgba(0,0,0,.3)", border: "1px solid rgba(232,196,114,.35)" }}>
                    <b className="text-[14px] text-[#f6dc9a]">{k === "gold" ? "Gold" : "Black"}</b>
                    <div className="text-[13px] text-[#d9c9b4]">จ่าย {fb(promo[k].pay)}</div>
                    <div className="text-[15px] font-semibold text-[#e8c472]">รับ {fb(promo[k].credit)}</div>
                  </div>
                ))}
              </div>
              <ul className="m-0 pl-5 self-stretch text-left text-[13.5px] leading-[1.7] text-[#d9c9b4]">
                <li>เครดิตเพิ่มใช้นัดเพื่อน สปา โรงแรม และสินค้า</li>
                <li>แต้มสะสมคูณทุกการใช้จ่าย</li>
                <li>โปรไฟล์สีพิเศษตามระดับ + บัตรสมาชิกดิจิทัล</li>
              </ul>
              <Link href="/membership" onClick={closeAd} className="self-stretch min-h-12 rounded-xl bg-[#e8c472] text-[#1b130b] font-semibold grid place-items-center hover:text-[#1b130b]">ดูโปรเมมเบอร์</Link>
              <button type="button" onClick={closeAd} className="min-h-10 bg-transparent text-[#b5a596] text-[13px] font-light">ไว้ทีหลัง</button>
            </div>
          </div>
        </div>
      )}
      {/* ป๊อปอัปโฆษณา (เมมเบอร์แล้ว) */}
      {ad && memberTier && (
        <div className="fixed inset-0 z-50 flex items-start justify-center" style={{ background: "rgba(8,6,6,.72)", padding: "140px 24px 24px" }} onClick={closeAd}>
          <div role="dialog" aria-modal="true" aria-label="โฆษณา" className="w-full max-w-[400px] rounded-[20px] overflow-hidden bg-[#251d1b]" style={{ boxShadow: "0 20px 50px rgba(0,0,0,.5)" }} onClick={(e) => e.stopPropagation()}>
            <div className="relative aspect-[4/3]">
              <img src={AD.img} alt={AD.name} className="w-full h-full object-cover block" />
              <span className="absolute top-3 left-3 text-[13px] font-light text-white rounded-full" style={{ padding: "3px 10px", background: "rgba(20,16,15,.75)" }}>โฆษณา</span>
              <button type="button" onClick={closeAd} aria-label="ปิดโฆษณา" className="absolute grid place-items-center w-9 h-9 rounded-full text-[#f3ead9] text-[18px]" style={{ top: 10, right: 10, background: "rgba(20,16,15,.75)" }}>✕</button>
            </div>
            <div className="flex flex-col gap-1" style={{ padding: "16px 18px 18px" }}>
              <span className="text-[13px] text-[#e8c472] font-light">{AD.kind}</span>
              <span className="font-semibold text-[20px]">{AD.name}</span>
              <span className="text-[13.5px] text-[#b5a596]">{AD.offer}</span>
              <Link href="/spas" className="mt-[10px] min-h-12 rounded-xl bg-[#e8c472] text-[#1b130b] font-semibold grid place-items-center hover:text-[#1b130b]">ดูรายละเอียด</Link>
              <button type="button" onClick={closeAd} className="min-h-10 bg-transparent text-[#b5a596] text-[13px] font-light">ไว้ทีหลัง</button>
            </div>
          </div>
        </div>
      )}

      {/* ตัวกรอง */}
      {fOpen && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto" style={{ background: "rgba(8,6,6,.6)", padding: "120px 14px 24px" }} onClick={() => setFOpen(false)}>
          <div role="dialog" aria-modal="true" aria-label="ตัวกรองช่วยค้นหาเพื่อน" className="w-full max-w-[480px] bg-[#2c1a1f] rounded-[18px] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="relative text-center font-semibold text-[16px] text-[#e8c472] border-b border-[rgba(243,234,217,0.07)]" style={{ padding: "16px 52px" }}>
              ตัวกรองช่วยค้นหาเพื่อน
              <button type="button" onClick={() => setFOpen(false)} aria-label="ปิด" className="absolute w-11 h-11 bg-transparent text-[#f3ead9] text-[20px]" style={{ right: 8, top: 6 }}>✕</button>
            </div>
            <div className="flex flex-col gap-3" style={{ padding: "18px 16px 20px" }}>
              <div className="grid grid-cols-2 gap-[10px]">
                <select aria-label="ภูมิภาค" value={f.reg} onChange={(e) => setF((x) => ({ ...x, reg: e.target.value, prov: "" }))} style={sel}>{REG.map(([v, t]) => <option key={v} value={v}>{t}</option>)}</select>
                <select aria-label="จังหวัด" value={f.prov} onChange={(e) => { const v = e.target.value; setF((x) => (v ? { ...x, prov: v, reg: PROV[v] } : { ...x, prov: "" })); }} style={sel}><option value="">ทุกจังหวัด</option>{provOpts.map((k) => <option key={k} value={k}>{k}</option>)}</select>
              </div>
              <input type="text" value={f.spot} onChange={set("spot")} placeholder="จุดพื้นที่ เช่น สุขุมวิท ลาดพร้าว สาทร บางนา" aria-label="จุดพื้นที่" style={sel} />
              <div className="grid grid-cols-2 gap-[10px]">
                <select aria-label="ประเภท" value={f.type} onChange={set("type")} style={sel}>{[["", "ทุกประเภท"], ["eat", "เพื่อนกินเที่ยว"], ["massage", "สายนวด"]].map(([v, t]) => <option key={v} value={v}>{t}</option>)}</select>
                <select aria-label="ระดับ" value={f.tier} onChange={set("tier")} style={sel}>{[["", "ทุกระดับ"], ["top", "TOP"], ["silver", "Silver"]].map(([v, t]) => <option key={v} value={v}>{t}</option>)}</select>
              </div>
              <select aria-label="กิจกรรม" value={f.act} onChange={set("act")} style={sel}><option value="">ทุกกิจกรรม</option>{ACTS.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}</select>
              <div className="font-semibold text-[16px] mt-1">ช่วงอายุ (ปี)</div>
              <div className="grid items-center gap-2" style={{ gridTemplateColumns: "1fr 24px 1fr" }}>
                <input type="number" inputMode="numeric" min={20} max={50} aria-label="อายุต่ำสุด" value={f.aMin} onChange={set("aMin")} style={{ ...sel, textAlign: "center" }} />
                <span className="text-center text-[#b5a596]">—</span>
                <input type="number" inputMode="numeric" min={25} max={50} aria-label="อายุสูงสุด" value={f.aMax} onChange={set("aMax")} style={{ ...sel, textAlign: "center" }} />
              </div>
              <div className="grid grid-cols-2 gap-[10px] mt-2">
                <button type="button" onClick={clear} className="h-12 rounded-xl text-[#e8c472] text-[15px] font-semibold" style={{ background: "rgba(232,196,114,0.16)" }}>ล้างข้อมูล</button>
                <button type="button" onClick={() => setFOpen(false)} className="h-12 rounded-xl bg-[#e8c472] text-[#1b130b] text-[15px] font-semibold">ค้นหาเพื่อน · {list.length} คน</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
