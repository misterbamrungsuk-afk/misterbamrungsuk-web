"use client";

import { Suspense, use, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useI18n } from "@/i18n/provider";
import { TopBar } from "@/components/shell";
import { baht } from "@/components/ui";
import { BookSteps } from "@/components/book-steps";
import { DEMO_POSTS } from "@/lib/demo-data";
import { ADDRESS_TYPES, BLOCKS, PARTNER_SPAS, blockPrice, massageAddonPrice, type BlockHours } from "@/lib/booking";

// ขั้นที่ 2-3/4: เลือกบริการ (บล็อก 3/5 ชม. + add-on) และสถานที่
function BookInner({ id }: { id: string }) {
  const { lang } = useI18n();
  const th = lang === "th";
  const router = useRouter();
  const sp = useSearchParams();
  const post = DEMO_POSTS.find((p) => p.id === id);

  const [hrs, setHrs] = useState<BlockHours>(3);
  const [massage, setMassage] = useState(false);
  const [loc, setLoc] = useState<"home" | "spa">(sp.get("loc") === "spa" ? "spa" : "home");
  const [addrType, setAddrType] = useState<string>("condo");
  const [address, setAddress] = useState("");
  const [room, setRoom] = useState("");
  const [note, setNote] = useState("");
  const [spa, setSpa] = useState<string>(PARTNER_SPAS[0].id);

  if (!post) {
    return (
      <>
        <TopBar back="/home" title={th ? "จอง" : "Book"} />
        <p className="text-center text-ink-300 py-20">{th ? "ไม่พบ Part-Time คนนี้" : "Part-Time not found"}</p>
      </>
    );
  }

  const addon = massage ? massageAddonPrice(post) : 0;
  const spaObj = PARTNER_SPAS.find((s) => s.id === spa);
  const spaFee = loc === "spa" ? spaObj?.price ?? 0 : 0;
  const price = blockPrice(post, hrs) + addon + spaFee;
  const ready = loc === "spa" ? !!spaObj : address.trim().length > 0;

  const next = () => {
    const at = ADDRESS_TYPES.find((a) => a.id === addrType);
    const place = loc === "spa" ? `${spaObj?.name} · ${spaObj?.area}` : `${th ? at?.th : at?.en} · ${address}${room ? ` (${room})` : ""}`;
    const q = new URLSearchParams({ hrs: String(hrs), massage: massage ? "1" : "", loc, spa: loc === "spa" ? spa : "", place, note });
    router.push(`/book/${post.id}/checkout?${q}`);
  };

  return (
    <>
      <TopBar back={`/post/${post.id}`} title={th ? "จอง Part-Time" : "Book Part-Time"} />
      <BookSteps step={3} th={th} />
      <div className="px-4 pt-4 pb-28 flex flex-col gap-6">
        <Link href={`/post/${post.id}`} className="glass rounded-2xl p-3 flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={post.member.avatar} alt="" className="w-12 h-12 rounded-full object-cover shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="font-display font-semibold truncate">{post.member.name}</p>
            <p className="text-xs text-ink-300 truncate">{post.serviceArea}</p>
          </div>
          {post.rating != null && <span className="shrink-0 inline-flex items-center gap-0.5 h-[22px] px-2 rounded-full bg-black/60 border border-gold-500/40 text-[11.5px] font-bold text-ink-100"><span className="text-gold-500">★</span>{post.rating.toFixed(1)}</span>}
        </Link>

        <section>
          <h2 className="section-title mb-3">{th ? "เลือกบริการ" : "Choose service"}</h2>
          <div className="grid grid-cols-2 gap-2">
            {BLOCKS.map((h) => (
              <button key={h} onClick={() => setHrs(h)} aria-pressed={hrs === h}
                className={`rounded-2xl border py-3.5 flex flex-col items-center gap-0.5 transition ${hrs === h ? "border-gold-500 bg-gold-500/10" : "border-ink-600 bg-ink-800"}`}>
                <span className={`text-[13px] ${hrs === h ? "text-gold-300" : "text-ink-300"}`}>Part-Time {h} {th ? "ชม." : "h"}</span>
                <span className={`font-display font-semibold text-xl ${hrs === h ? "text-gold-300" : ""}`}>{baht(blockPrice(post, h))}</span>
              </button>
            ))}
          </div>
          {post.massageSkill && (
            <label className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-ink-600 bg-ink-800 p-3.5 text-sm cursor-pointer">
              <span className="flex items-center gap-2.5">
                <input type="checkbox" checked={massage} onChange={(e) => setMassage(e.target.checked)} className="w-5 h-5 accent-[#d4af37]" />
                {th ? "เพิ่มสกิลนวด (add-on)" : "Add massage (add-on)"}
              </span>
              <span className="text-gold-300">+{baht(massageAddonPrice(post))}</span>
            </label>
          )}
        </section>

        <section>
          <h2 className="section-title mb-3">{th ? "เลือกสถานที่" : "Location"}</h2>
          <div className="grid grid-cols-2 gap-2">
            {([
              ["home", th ? "ที่พักของฉัน" : "My place", th ? "บ้าน คอนโด โรงแรม" : "House, condo, hotel"],
              ["spa", th ? "สปาพาร์ทเนอร์" : "Partner spa", th ? "ห้องส่วนตัวพร้อมอุปกรณ์" : "Private, equipped room"],
            ] as const).map(([k, title, sub]) => (
              <button key={k} onClick={() => setLoc(k)} aria-pressed={loc === k}
                className={`rounded-2xl border p-3.5 text-left transition ${loc === k ? "border-gold-500 bg-gold-500/10" : "border-ink-600 bg-ink-800"}`}>
                <span className={`block text-sm font-semibold ${loc === k ? "text-gold-300" : ""}`}>{title}</span>
                <span className="block text-xs text-ink-300 mt-0.5">{sub}</span>
              </button>
            ))}
          </div>

          {loc === "home" ? (
            <div className="mt-3 flex flex-col gap-3">
              <div className="relative h-36 rounded-2xl overflow-hidden border border-ink-600 bg-ink-800 bg-[linear-gradient(rgba(212,175,55,.07)_1px,transparent_1px),linear-gradient(90deg,rgba(212,175,55,.07)_1px,transparent_1px)] bg-[size:22px_22px]">
                <svg viewBox="0 0 24 24" className="w-9 h-9 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full text-crimson-500" fill="currentColor"><path d="M12 22s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12zm0-9a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" /></svg>
                <span className="absolute bottom-2 left-2 text-[11px] px-2 py-1 rounded-full bg-black/60 border border-gold-500/40 text-ink-100">{th ? "ปักหมุดตำแหน่งของคุณ" : "Pin your location"}</span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {ADDRESS_TYPES.map((a) => (
                  <button key={a.id} onClick={() => setAddrType(a.id)} aria-pressed={addrType === a.id}
                    className={`h-10 rounded-xl border text-[13px] transition ${addrType === a.id ? "border-gold-500 bg-gold-500/10 text-gold-300 font-semibold" : "border-ink-600 bg-ink-800 text-ink-200"}`}>
                    {th ? a.th : a.en}
                  </button>
                ))}
              </div>
              <input value={address} onChange={(e) => setAddress(e.target.value)} className="input-dark h-12" placeholder={th ? "ที่อยู่ / ชื่ออาคาร / ชื่อโรงแรม" : "Address / building / hotel"} aria-label={th ? "ที่อยู่" : "Address"} />
              <input value={room} onChange={(e) => setRoom(e.target.value)} className="input-dark h-12" placeholder={th ? "เลขห้อง / ชั้น" : "Room / floor"} aria-label={th ? "เลขห้อง" : "Room"} />
            </div>
          ) : (
            <div className="mt-3 flex flex-col gap-2">
              {PARTNER_SPAS.map((s) => (
                <label key={s.id} className={`flex items-center gap-3 rounded-2xl border p-3.5 cursor-pointer transition ${spa === s.id ? "border-gold-500 bg-gold-500/5" : "border-ink-600 bg-ink-800"}`}>
                  <input type="radio" name="spa" checked={spa === s.id} onChange={() => setSpa(s.id)} className="accent-[#d4af37] w-5 h-5" />
                  <span className="flex-1 min-w-0">
                    <span className="block font-medium truncate">{s.name}</span>
                    <span className="block text-xs text-ink-300">{s.area} · {s.km} {th ? "กม." : "km"} · <span className="text-gold-500">★</span> {s.rating}</span>
                  </span>
                  <span className="text-sm text-gold-300 shrink-0">+{baht(s.price)}</span>
                </label>
              ))}
            </div>
          )}
        </section>

        <label className="block">
          <span className="text-xs text-ink-300 mb-1.5 block">{th ? "หมายเหตุถึง Part-Time" : "Note to Part-Time"}</span>
          <input value={note} onChange={(e) => setNote(e.target.value)} className="input-dark h-12" placeholder={th ? "เช่น อยากไปร้านอาหารญี่ปุ่น มีที่จอดรถ" : "e.g. Japanese dinner, parking available"} />
        </label>
      </div>

      <div className="fixed left-1/2 -translate-x-1/2 w-full max-w-[480px] z-30 px-4" style={{ bottom: "calc(16px + env(safe-area-inset-bottom))" }}>
        <div className="rounded-2xl border border-ink-600 bg-ink-900/95 backdrop-blur-xl p-3 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-ink-300 truncate">{hrs} {th ? "ชม." : "h"}{massage ? (th ? " · นวด" : " · massage") : ""}{loc === "spa" ? ` · ${spaObj?.name}` : ""}</p>
            <p className="font-display font-semibold text-xl text-gold-300">{baht(price)}</p>
          </div>
          <button onClick={next} disabled={!ready} className="btn-crimson h-12 px-6 rounded-xl font-display font-semibold">
            {ready ? (th ? "ถัดไป" : "Next") : (th ? "ใส่ที่อยู่ก่อน" : "Add address")}
          </button>
        </div>
      </div>
    </>
  );
}

export default function BookPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <Suspense>
      <BookInner id={id} />
    </Suspense>
  );
}
