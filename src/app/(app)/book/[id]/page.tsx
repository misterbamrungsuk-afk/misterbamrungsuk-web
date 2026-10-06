"use client";

import { Suspense, use, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useI18n } from "@/i18n/provider";
import { TopBar } from "@/components/shell";
import { baht } from "@/components/ui";
import { BookSteps } from "@/components/book-steps";
import { DEMO_POSTS } from "@/lib/demo-data";
import { BLOCKS, MEET_PLACES, blockPrice, isRoomPlace, type BlockHours, type MeetPlaceId } from "@/lib/booking";
import { usePartnerSpas } from "@/lib/spas";

// ขั้นที่ 2-3/4: เลือกบริการ (บล็อก 3/5 ชม.) และสถานที่นัด 7 แบบ
function BookInner({ id }: { id: string }) {
  const { lang } = useI18n();
  const th = lang === "th";
  const router = useRouter();
  const sp = useSearchParams();
  const post = DEMO_POSTS.find((p) => p.id === id);

  const [hrs, setHrs] = useState<BlockHours>(3);
  const spas = usePartnerSpas();
  const initLoc = MEET_PLACES.find((x) => x.id === sp.get("loc"))?.id ?? "condo";
  const [loc, setLoc] = useState<MeetPlaceId>(initLoc);
  const [address, setAddress] = useState("");
  const [room, setRoom] = useState("");
  const [note, setNote] = useState("");
  const [spaPick, setSpa] = useState<string>("");
  const spa = spaPick || spas[0]?.id || "";

  if (!post) {
    return (
      <>
        <TopBar back="/home" title={th ? "จอง" : "Book"} />
        <p className="text-center text-ink-300 py-20">{th ? "ไม่พบเพื่อนคนนี้" : "Companion not found"}</p>
      </>
    );
  }

  const spaObj = spas.find((s) => s.id === spa);
  const spaFee = loc === "spa" ? spaObj?.price ?? 0 : 0;
  const price = blockPrice(post, hrs) + spaFee;
  const pl = MEET_PLACES.find((x) => x.id === loc)!;
  const isRoom = isRoomPlace(loc);
  const ready = loc === "spa" ? !!spaObj : address.trim().length > 0;

  const next = () => {
    const place = loc === "spa" ? `${spaObj?.name} · ${spaObj?.area}` : `${th ? pl.th : pl.en} · ${address}${isRoom && room ? ` (${room})` : ""}`;
    const q = new URLSearchParams({ hrs: String(hrs), loc, spa: loc === "spa" ? spa : "", place, note });
    router.push(`/book/${post.id}/checkout?${q}`);
  };

  return (
    <>
      <TopBar back={`/post/${post.id}`} title={th ? "นัดเพื่อน" : "Book a companion"} />
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
                <span className={`text-[13px] ${hrs === h ? "text-gold-300" : "text-ink-300"}`}>{th ? "เพื่อน" : "Companion"} {h} {th ? "ชม." : "h"}</span>
                <span className={`font-display font-semibold text-xl ${hrs === h ? "text-gold-300" : ""}`}>{baht(blockPrice(post, h))}</span>
              </button>
            ))}
          </div>
        </section>

        <section>
          <h2 className="section-title mb-3">{th ? "เจอกันที่ไหนดี" : "Where to meet"}</h2>
          <div className="grid grid-cols-2 gap-2">
            {MEET_PLACES.map((x) => (
              <button key={x.id} onClick={() => setLoc(x.id)} aria-pressed={loc === x.id}
                className={`rounded-2xl border p-3 text-left transition ${loc === x.id ? "border-gold-500 bg-gold-500/10" : "border-ink-600 bg-ink-800"}`}>
                <span className={`block text-sm font-semibold ${loc === x.id ? "text-gold-300" : ""}`}>{th ? x.th : x.en}</span>
                <span className="block text-xs text-ink-300 mt-0.5">{x.sub}</span>
              </button>
            ))}
          </div>

          {loc === "spa" ? (
            <div className="mt-3 flex flex-col gap-2">
              <p className="text-xs text-ink-300">{th ? "เลือกสปา / สถานที่พาร์ทเนอร์" : "Choose a partner spa"}</p>
              {spas.map((s) => (
                <label key={s.id} className={`flex items-center gap-3 rounded-2xl border p-3.5 cursor-pointer transition ${spa === s.id ? "border-gold-500 bg-gold-500/5" : "border-ink-600 bg-ink-800"}`}>
                  <input type="radio" name="spa" checked={spa === s.id} onChange={() => setSpa(s.id)} className="accent-[#d4af37] w-5 h-5" />
                  <span className="flex-1 min-w-0">
                    <span className="block font-medium truncate">{s.name}</span>
                    <span className="block text-xs text-ink-300">{s.area}{s.km != null ? ` · ${s.km} ${th ? "กม." : "km"}` : ""}{s.rating != null ? <> · <span className="text-gold-500">★</span> {s.rating}</> : null}</span>
                  </span>
                  {s.price > 0 && <span className="text-sm text-gold-300 shrink-0">+{baht(s.price)} {th ? "ห้อง" : "room"}</span>}
                </label>
              ))}
            </div>
          ) : isRoom ? (
            <div className="mt-3 flex flex-col gap-3">
              <div className="relative h-36 rounded-2xl overflow-hidden border border-ink-600 bg-ink-800 bg-[linear-gradient(rgba(212,175,55,.07)_1px,transparent_1px),linear-gradient(90deg,rgba(212,175,55,.07)_1px,transparent_1px)] bg-[size:22px_22px]">
                <svg viewBox="0 0 24 24" className="w-9 h-9 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full text-crimson-500" fill="currentColor"><path d="M12 22s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12zm0-9a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" /></svg>
                <span className="absolute bottom-2 left-2 text-[11px] px-2 py-1 rounded-full bg-black/60 border border-gold-500/40 text-ink-100">{th ? "ใช้ตำแหน่งปัจจุบัน" : "Use current location"}</span>
              </div>
              <input value={address} onChange={(e) => setAddress(e.target.value)} className="input-dark h-12" placeholder={loc === "hotel" ? (th ? "ชื่อโรงแรม / ที่อยู่" : "Hotel name / address") : (th ? "ชื่ออาคาร / ที่อยู่" : "Building / address")} aria-label={th ? "ที่อยู่" : "Address"} />
              <input value={room} onChange={(e) => setRoom(e.target.value)} className="input-dark h-12" placeholder={th ? "เลขห้อง / ชั้น" : "Room / floor"} aria-label={th ? "เลขห้อง" : "Room"} />
            </div>
          ) : (
            <div className="mt-3">
              <label className="block">
                <span className="text-xs text-ink-300 mb-1.5 block">{th ? `จุดนัดพบ (${pl.th})` : `Meeting point (${pl.en})`}</span>
                <input value={address} onChange={(e) => setAddress(e.target.value)} className="input-dark h-12" placeholder={pl.hint} />
              </label>
            </div>
          )}
        </section>

        <label className="block">
          <span className="text-xs text-ink-300 mb-1.5 block">{th ? "หมายเหตุถึงเพื่อน" : "Note to your companion"}</span>
          <input value={note} onChange={(e) => setNote(e.target.value)} className="input-dark h-12" placeholder={th ? "เช่น อยากไปร้านอาหารญี่ปุ่น มีที่จอดรถ" : "e.g. Japanese dinner, parking available"} />
        </label>
      </div>

      <div className="fixed left-1/2 -translate-x-1/2 w-full max-w-[480px] z-30 px-4" style={{ bottom: "calc(16px + env(safe-area-inset-bottom))" }}>
        <div className="rounded-2xl border border-ink-600 bg-ink-900/95 backdrop-blur-xl p-3 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-ink-300 truncate">{th ? "เพื่อน" : "Companion"} {hrs} {th ? "ชม." : "h"} · {loc === "spa" ? spaObj?.name : th ? pl.th : pl.en}</p>
            <p className="font-display font-semibold text-xl text-gold-300">{baht(price)}</p>
          </div>
          <button onClick={next} disabled={!ready} className="btn-crimson h-12 px-6 rounded-xl font-display font-semibold">
            {ready ? (th ? "ถัดไป" : "Next") : (th ? "ใส่จุดนัดก่อน" : "Add a place")}
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
