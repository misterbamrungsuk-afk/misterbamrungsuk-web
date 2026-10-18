"use client";

// กล่องแจ้งเตือนของพอร์ทัล (พาร์ทเนอร์ / ร้านค้า) — รายการ + อ่านแล้ว + เปิด push บนเครื่องนี้ · กระดิ่งนับที่ยังไม่อ่าน
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { PushButton } from "./push-button";

export type InboxNotice = { id: number; kind: string; title: string; body: string | null; url: string | null; read_at: string | null; created_at: string };
const when = (s: string) => new Date(s).toLocaleString("th-TH", { timeZone: "Asia/Bangkok", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const unreadEvent = "mb-inbox-unread";

/** กระดิ่ง + ตัวเลขที่ยังไม่อ่าน — href = หน้ากล่องแจ้งเตือน หรือ onClick (แท็บในหน้าเดียว) */
export function NoticeBell({ api, href, onClick }: { api: string; href?: string; onClick?: () => void }) {
  const [n, setN] = useState(0);
  const path = usePathname();
  useEffect(() => {
    let live = true;
    const load = () => fetch(`${api}?count=1`, { cache: "no-store" }).then((r) => r.json()).then((j: { unread?: number }) => { if (live) setN(j.unread ?? 0); }).catch(() => {});
    load();
    const t = setInterval(load, 60_000);
    const on = (e: Event) => setN((e as CustomEvent<number>).detail ?? 0);
    window.addEventListener(unreadEvent, on);
    return () => { live = false; clearInterval(t); window.removeEventListener(unreadEvent, on); };
  }, [api, path]);
  const label = n ? `แจ้งเตือน ${n} รายการที่ยังไม่อ่าน` : "แจ้งเตือน";
  const inner = (
    <>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="w-[22px] h-[22px]" aria-hidden="true"><path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z" /><path d="M10 20a2 2 0 0 0 4 0" /></svg>
      {n > 0 && <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-crimson-500 text-white text-[11px] font-semibold leading-[18px] text-center">{n > 99 ? "99+" : n}</span>}
    </>
  );
  const cls = "relative shrink-0 w-10 h-10 grid place-items-center text-gold-300";
  return href ? <Link href={href} aria-label={label} className={cls}>{inner}</Link> : <button type="button" onClick={onClick} aria-label={label} className={cls}>{inner}</button>;
}

export function NoticeInbox({ api, pushTo, initial = [], devices: dev0 = 0 }: { api: string; pushTo: string; initial?: InboxNotice[]; devices?: number }) {
  const [rows, setRows] = useState<InboxNotice[]>(initial);
  const [devices, setDevices] = useState(dev0);
  const [loaded, setLoaded] = useState(initial.length > 0);
  const tell = (unread: number) => window.dispatchEvent(new CustomEvent(unreadEvent, { detail: unread }));
  const load = useCallback(async () => {
    const j = (await fetch(api, { cache: "no-store" }).then((r) => r.json()).catch(() => null)) as { notices?: InboxNotice[]; devices?: number; unread?: number } | null;
    if (j?.notices) { setRows(j.notices); setDevices(j.devices ?? 0); tell(j.unread ?? 0); }
    setLoaded(true);
  }, [api]);
  useEffect(() => { void load(); }, [load]);
  const read = async (id?: number) => {
    setRows((rs) => rs.map((r) => (id == null || r.id === id ? { ...r, read_at: r.read_at ?? new Date().toISOString() } : r)));
    const j = (await fetch(api, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(id == null ? { all: true } : { id }) }).then((r) => r.json()).catch(() => null)) as { unread?: number } | null;
    if (j) tell(j.unread ?? 0);
  };
  const unread = rows.filter((r) => !r.read_at).length;
  return (
    <div className="flex flex-col gap-3">
      <PushButton to={pushTo} bound={devices > 0} hint={devices > 0 ? `เปิดรับไว้ ${devices} เครื่อง · การจองใหม่ ยกเลิก และเงินเข้าจะเด้งทันที` : "เปิดไว้ การจองใหม่ ยกเลิก และเงินเข้าจะเด้งบนเครื่องนี้ทันที"} />
      <div className="flex items-center gap-2">
        <h2 className="text-base font-semibold m-0">แจ้งเตือน{unread ? ` · ยังไม่อ่าน ${unread}` : ""}</h2>
        {unread > 0 && <button type="button" onClick={() => read()} className="chip h-9 px-3 ml-auto text-xs">อ่านทั้งหมดแล้ว</button>}
      </div>
      {!rows.length ? <p className="text-sm text-ink-300 py-8 text-center">{loaded ? "ยังไม่มีแจ้งเตือน" : "กำลังโหลด…"}</p> : (
        <ul className="flex flex-col gap-2 m-0 p-0 list-none">
          {rows.map((r) => {
            const body = (
              <>
                <div className="flex items-start gap-2">
                  {!r.read_at && <span className="mt-1.5 w-2 h-2 rounded-full bg-crimson-500 shrink-0" aria-label="ยังไม่อ่าน" />}
                  <b className={`text-sm flex-1 ${r.read_at ? "font-normal text-ink-200" : "text-ink-100"}`}>{r.title}</b>
                  <span className="text-[12.5px] text-ink-300 shrink-0">{when(r.created_at)}</span>
                </div>
                {r.body && <p className="m-0 mt-1 text-xs text-ink-300 break-words">{r.body}</p>}
              </>
            );
            const cls = `block rounded-2xl border px-4 py-3 ${r.read_at ? "border-ink-700 bg-transparent" : "border-gold-500/40 bg-gold-500/5"}`;
            return (
              <li key={r.id}>
                {r.url ? <Link href={r.url} onClick={() => { if (!r.read_at) void read(r.id); }} className={cls}>{body}</Link>
                  : <button type="button" onClick={() => { if (!r.read_at) void read(r.id); }} className={`${cls} w-full text-left`}>{body}</button>}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
