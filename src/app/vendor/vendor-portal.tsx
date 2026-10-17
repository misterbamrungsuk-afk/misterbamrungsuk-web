"use client";

import Link from "next/link";
import { useState } from "react";
import { Logo } from "@/components/ui";
import { OwnerWallet } from "@/components/owner-wallet";
import { AvatarEditor, AvatarView } from "@/components/avatar-editor";
import { CARRIERS, CLAIM_NOTE, ORDER_STATUS_LABEL, baht, carrierName, flaggedClaims, imageUrl, type Product } from "@/lib/market/config";
import type { VendorData } from "@/lib/market/vendor-data";

const money = (n: number | null | undefined) => (n == null ? "รอกำหนด" : `฿${n.toLocaleString("th-TH", { maximumFractionDigits: 2 })}`);
const dt = (s: string | null) => (s ? new Date(s).toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short" }) : "—");
const card = "rounded-2xl border border-ink-600 bg-ink-800 p-4";
const lbl = "block text-xs text-ink-300 mb-1";

async function post(url: string, body: unknown) {
  const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return (await r.json().catch(() => ({}))) as { ok?: boolean; error?: string; [k: string]: unknown };
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full max-w-sm glass rounded-3xl p-7">
      <div className="flex items-center gap-2 mb-5"><Logo size={28} /><span className="text-[11px] font-semibold tracking-[0.2em] text-gold-500">VENDOR PORTAL</span></div>
      {children}
    </div>
  );
}

export function VendorLogin() {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const go = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setErr("");
    const d = await post("/api/market/vendor/auth", { op: "login", email, password: pw });
    setBusy(false);
    if (d.ok) location.reload(); else setErr(d.error || "เข้าสู่ระบบไม่สำเร็จ");
  };
  return (
    <div className="min-h-dvh grid place-items-center px-4">
      <Shell>
        <h1 className="text-2xl font-semibold">เข้าสู่ระบบร้านค้า</h1>
        <p className="text-sm text-ink-300 mt-1">สำหรับร้านค้าพาร์ทเนอร์ที่ได้รับลิงก์เชิญจากทีมงาน</p>
        <form onSubmit={go} className="flex flex-col gap-3 mt-5">
          <div><label className={lbl} htmlFor="em">อีเมล</label><input id="em" type="email" autoComplete="username" className="input-dark w-full" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <div><label className={lbl} htmlFor="pw">รหัสผ่าน</label><input id="pw" type="password" autoComplete="current-password" className="input-dark w-full" value={pw} onChange={(e) => setPw(e.target.value)} /></div>
          {err && <p role="alert" className="text-sm text-crimson-300">{err}</p>}
          <button disabled={busy} className="btn-crimson h-12 rounded-full font-semibold">{busy ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบ"}</button>
        </form>
        <p className="text-xs text-[#9a8a85] mt-4">ลืมรหัสผ่าน? ติดต่อทีมงานเพื่อขอลิงก์ตั้งรหัสใหม่ · <Link href="/" className="underline">กลับหน้าแรก</Link></p>
      </Shell>
    </div>
  );
}

export function VendorAccept({ t, email, shop }: { t: string; email: string; shop: string }) {
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [err, setErr] = useState("");
  const go = async (e: React.FormEvent) => {
    e.preventDefault(); setErr("");
    if (pw.length < 8) return setErr("รหัสผ่านอย่างน้อย 8 ตัวอักษร");
    if (pw !== pw2) return setErr("รหัสผ่านไม่ตรงกัน");
    const d = await post("/api/market/vendor/auth", { op: "accept", t, password: pw });
    if (d.ok) location.href = "/vendor"; else setErr(d.error || "ไม่สำเร็จ");
  };
  return (
    <Shell>
      <h1 className="text-2xl font-semibold">ตั้งรหัสผ่าน</h1>
      <p className="text-sm text-ink-300 mt-1">{shop} · {email}</p>
      <form onSubmit={go} className="flex flex-col gap-3 mt-5">
        <input type="email" value={email} readOnly hidden autoComplete="username" />
        <div><label className={lbl} htmlFor="p1">รหัสผ่านใหม่ (อย่างน้อย 8 ตัว)</label><input id="p1" type="password" autoComplete="new-password" className="input-dark w-full" value={pw} onChange={(e) => setPw(e.target.value)} /></div>
        <div><label className={lbl} htmlFor="p2">ยืนยันรหัสผ่าน</label><input id="p2" type="password" autoComplete="new-password" className="input-dark w-full" value={pw2} onChange={(e) => setPw2(e.target.value)} /></div>
        {err && <p role="alert" className="text-sm text-crimson-300">{err}</p>}
        <button className="btn-crimson h-12 rounded-full font-semibold">บันทึกและเข้าสู่ระบบ</button>
      </form>
    </Shell>
  );
}

const TABS = [["orders", "คำสั่งซื้อ"], ["products", "สินค้า"], ["wallet", "กระเป๋าเงิน / ถอน"], ["payout", "รายงานยอดขาย"], ["profile", "รูปโปรไฟล์ร้าน"]] as const;

export function VendorPortal({ email, initial }: { email: string; initial: VendorData }) {
  const [d, setD] = useState(initial);
  const [tab, setTab] = useState<(typeof TABS)[number][0]>("orders");
  const [msg, setMsg] = useState("");
  const reload = async () => {
    const r = await fetch("/api/market/vendor", { cache: "no-store" });
    if (r.ok) setD((await r.json()) as VendorData);
  };
  const logout = async () => { await post("/api/market/vendor/auth", { op: "logout" }); location.reload(); };
  const toShip = d.orders.filter((o) => o.status === "paid" && !o.tracking).length;
  return (
    <>
      <header className="sticky top-0 z-30 bg-ink-900/90 backdrop-blur-xl border-b border-ink-600">
        <div className="max-w-6xl mx-auto flex items-center gap-3 px-4 h-14">
          <Logo size={26} />
          <button type="button" onClick={() => setTab("profile")} aria-label="รูปโปรไฟล์ร้าน"><AvatarView as="vendor" letter={d.vendor.name} size={32} /></button>
          <div className="min-w-0"><p className="text-sm font-semibold truncate">{d.vendor.name}</p><p className="text-[11px] text-[#9a8a85] truncate">{email}</p></div>
          <Link href={`/shop/${d.vendor.slug}`} className="ml-auto text-xs text-gold-300 hidden sm:inline">ดูหน้าร้าน ↗</Link>
          <button onClick={logout} className="chip h-8 px-3 text-xs">ออกจากระบบ</button>
        </div>
      </header>
      <div className="max-w-6xl mx-auto px-4 py-6 flex flex-col gap-4">
        <div className="flex flex-wrap gap-2">
          {TABS.map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={`chip h-9 px-3.5 ${tab === k ? "chip-red" : ""}`}>{l}{k === "orders" && toShip ? ` (${toShip} รอส่ง)` : ""}</button>)}
        </div>
        {msg && <p role="status" className="rounded-2xl border border-gold-500/40 px-4 py-2 text-sm">{msg}</p>}
        {tab === "orders" && <Orders d={d} reload={reload} setMsg={setMsg} />}
        {tab === "products" && <Products d={d} reload={reload} setMsg={setMsg} />}
        {tab === "wallet" && <div className="max-w-[560px]"><OwnerWallet api="/api/market/vendor/wallet" source="ส่วนของร้านจากออเดอร์ที่สำเร็จ (หัก GP แล้ว รวมค่าส่ง)" /></div>}
        {tab === "payout" && <Payout d={d} />}
        {tab === "profile" && <section className="max-w-[420px] rounded-2xl border border-ink-600 p-5 flex flex-col items-center gap-2"><b className="self-start">รูปโปรไฟล์ / โลโก้ร้าน</b><span className="text-xs text-ink-300 self-start">แสดงบนหน้าร้านค้าสาธารณะ</span><AvatarEditor as="vendor" letter={d.vendor.name} size={140} /></section>}
      </div>
    </>
  );
}

type Sub = { d: VendorData; reload: () => Promise<void>; setMsg: (s: string) => void };

function Orders({ d, reload, setMsg }: Sub) {
  const [f, setF] = useState<Record<string, { no: string; carrier: string }>>({});
  const save = async (id: string, no: string) => {
    const v = f[id] ?? { no: "", carrier: "thaipost" };
    const out = await post(`/api/market/vendor/orders/${id}`, { tracking_no: v.no, carrier: v.carrier });
    setMsg(out.ok ? `${no}: บันทึกเลขพัสดุแล้ว${out.shipped ? " · แจ้งผู้ซื้อทาง SMS แล้ว" : ""}` : out.error || "ไม่สำเร็จ");
    if (out.ok) await reload();
  };
  if (!d.orders.length) return <div className={card}><p className="text-sm text-ink-300">ยังไม่มีคำสั่งซื้อที่ยืนยันชำระแล้ว</p></div>;
  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-[#9a8a85]">แสดงเฉพาะรายการสินค้าของร้านคุณ ในคำสั่งซื้อที่ทีมงานยืนยันการชำระแล้ว · แพ็กมิดชิด ไม่ระบุชื่อสินค้าหน้ากล่อง</p>
      {d.orders.map((o) => {
        const v = f[o.id] ?? { no: o.tracking?.tracking_no ?? "", carrier: o.tracking?.carrier ?? "thaipost" };
        return (
          <section key={o.id} className={card}>
            <div className="flex flex-wrap items-start gap-4">
              <div className="flex-1 min-w-[220px]">
                <p><b>{o.order_no}</b> <span className="text-xs text-gold-300 ml-1">{ORDER_STATUS_LABEL[o.status]}</span></p>
                <p className="text-sm mt-1">{o.buyer_name} · {o.phone}</p>
                <p className="text-xs text-ink-300 whitespace-pre-line">{o.address}</p>
                <ul className="text-sm mt-2">{o.items.map((i) => <li key={i.product_id}>{i.name} × {i.qty} — ฿{baht(i.price * i.qty)}</li>)}</ul>
                <p className="text-xs text-[#9a8a85] mt-1">ยืนยันชำระ {dt(o.paid_at)}</p>
              </div>
              {o.split && (
                <div className="text-sm min-w-[200px]">
                  <p className="flex justify-between gap-4"><span className="text-ink-300">ยอดสินค้า</span><span>{money(o.split.gross)}</span></p>
                  {o.split.discount > 0 && <p className="flex justify-between gap-4"><span className="text-ink-300">ส่วนลด</span><span>−{money(o.split.discount)}</span></p>}
                  <p className="flex justify-between gap-4"><span className="text-ink-300">GP {o.split.gp_pct == null ? "" : `${o.split.gp_pct}%`}</span><span>{o.split.gp == null ? "รอกำหนด" : `−${money(o.split.gp)}`}</span></p>
                  <p className="flex justify-between gap-4"><span className="text-ink-300">ค่าส่ง</span><span>+{money(o.split.shipping)}</span></p>
                  <p className="flex justify-between gap-4 font-semibold"><span>รับสุทธิ</span><span className="text-gold-300">{money(o.split.payout)}</span></p>
                </div>
              )}
            </div>
            {(o.status === "paid" || o.status === "shipped") && (
              <div className="flex flex-wrap gap-2 mt-3 items-center">
                <select value={v.carrier} onChange={(e) => setF({ ...f, [o.id]: { ...v, carrier: e.target.value } })} className="input-dark h-9 text-sm" aria-label="ขนส่ง">
                  {CARRIERS.map((c) => <option key={c.key} value={c.key}>{c.name}</option>)}
                </select>
                <input value={v.no} onChange={(e) => setF({ ...f, [o.id]: { ...v, no: e.target.value } })} placeholder="เลขพัสดุ" className="input-dark h-9 w-44 text-sm" />
                <button onClick={() => save(o.id, o.order_no)} className="btn-crimson h-9 px-4 rounded-full text-sm">{o.tracking ? "แก้เลขพัสดุ" : "บันทึกเลขพัสดุ"}</button>
                {o.tracking && <span className="text-xs text-ink-300">ล่าสุด: {carrierName(o.tracking.carrier)} {o.tracking.tracking_no}</span>}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

const EMPTY = { id: "", name: "", description: "", warning: "", price: "", stock: "0", fda_no: "", category_id: "", published: false, age_restricted: true, images: [] as string[] };

function Products({ d, reload, setMsg }: Sub) {
  const [f, setF] = useState(EMPTY);
  const [files, setFiles] = useState<FileList | null>(null);
  const [busy, setBusy] = useState(false);
  const flagged = flaggedClaims(`${f.name} ${f.description}`);
  const edit = (p: Product) => setF({ ...EMPTY, ...p, price: String(p.price), stock: String(p.stock), fda_no: p.fda_no ?? "", category_id: p.category_id ?? "" });
  const save = async () => {
    if (f.published && !f.fda_no.trim()) return setMsg("ต้องใส่เลข อย. ก่อนขอเผยแพร่");
    setBusy(true);
    const fd = new FormData();
    for (const k of ["id", "name", "description", "warning", "price", "stock", "fda_no", "category_id"] as const) fd.append(k, String(f[k]));
    fd.append("published", f.published ? "1" : "0");
    fd.append("age_restricted", f.age_restricted ? "1" : "0");
    if (f.id) fd.append("keep_images", f.images.join(","));
    for (const file of Array.from(files ?? [])) fd.append("image", file);
    const r = await fetch("/api/market/vendor/products", { method: "POST", body: fd });
    const out = (await r.json().catch(() => ({}))) as { ok?: boolean; error?: string; flagged?: string[]; product?: Product };
    setBusy(false);
    if (!out.ok) return setMsg(out.error || "บันทึกไม่สำเร็จ");
    setMsg(`บันทึกแล้ว${out.product?.approved ? "" : " — รอทีมงานตรวจและอนุมัติก่อนแสดงบนเว็บ"}${out.flagged?.length ? ` · ตรวจคำโฆษณา: ${out.flagged.join(", ")}` : ""}`);
    setF(EMPTY); setFiles(null);
    await reload();
  };
  const status = (p: Product) => (!p.published ? ["ฉบับร่าง", "text-ink-300"] : !p.fda_no ? ["ขาดเลข อย.", "text-crimson-300"] : p.approved === false ? ["รออนุมัติ", "text-gold-300"] : ["แสดงบนเว็บ", "text-emerald-300"]);
  return (
    <div className="grid lg:grid-cols-[1fr_420px] gap-4 items-start">
      <div className="flex flex-col gap-3">
        {!d.products.length && <div className={card}><p className="text-sm text-ink-300">ยังไม่มีสินค้า เพิ่มสินค้าแรกได้ทางขวา</p></div>}
        {d.products.map((p) => {
          const [s, c] = status(p);
          return (
            <div key={p.id} className={`${card} flex items-center gap-3`}>
              {p.images[0]
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={imageUrl(p.images[0])} alt="" className="w-14 h-14 rounded-xl object-cover" />
                : <div className="w-14 h-14 rounded-xl bg-ink-700" />}
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{p.name}</p>
                <p className="text-xs text-ink-300">฿{baht(p.price)} · สต็อก {p.stock} · อย. {p.fda_no || "—"}</p>
              </div>
              <span className={`text-xs ${c}`}>{s}</span>
              <button onClick={() => edit(p)} className="chip h-8 px-3 text-xs">แก้ไข</button>
            </div>
          );
        })}
      </div>
      <section className={card}>
        <h3 className="font-semibold">{f.id ? "แก้ไขสินค้า" : "เพิ่มสินค้า"}</h3>
        <p className="mt-2 rounded-xl border border-crimson-500/50 bg-crimson-500/5 p-3 text-xs leading-relaxed">{CLAIM_NOTE}</p>
        <p className="mt-2 text-xs text-[#9a8a85]">สินค้าจะแสดงบนเว็บเมื่อ: เปิด “ขอเผยแพร่” + มีเลข อย. + ทีมงานอนุมัติ · แก้ชื่อ/รายละเอียด/รูป/เลข อย. ต้องรออนุมัติใหม่</p>
        <div className="flex flex-col gap-3 mt-3">
          <div><label className={lbl}>ชื่อสินค้า *</label><input className="input-dark w-full" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><label className={lbl}>ราคา (บาท) *</label><input inputMode="numeric" className="input-dark w-full" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value.replace(/\D/g, "") })} /></div>
            <div><label className={lbl}>สต็อก</label><input inputMode="numeric" className="input-dark w-full" value={f.stock} onChange={(e) => setF({ ...f, stock: e.target.value.replace(/\D/g, "") })} /></div>
          </div>
          <div><label className={lbl}>หมวดหมู่</label>
            <select className="input-dark w-full" value={f.category_id} onChange={(e) => setF({ ...f, category_id: e.target.value })}>
              <option value="">ไม่ระบุ</option>
              {d.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select></div>
          <div><label className={lbl}>เลข อย. (บังคับก่อนเผยแพร่)</label><input className="input-dark w-full" value={f.fda_no} onChange={(e) => setF({ ...f, fda_no: e.target.value })} /></div>
          <div><label className={lbl}>รายละเอียด</label><textarea rows={4} className="input-dark w-full" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
          {flagged.length > 0 && <p className="text-xs text-crimson-300">พบคำที่อาจเข้าข่ายโฆษณาเกินจริง: {flagged.join(", ")}</p>}
          <div><label className={lbl}>คำเตือนการใช้</label><textarea rows={2} className="input-dark w-full" value={f.warning} onChange={(e) => setF({ ...f, warning: e.target.value })} /></div>
          {f.images.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {f.images.map((src) => (
                <button key={src} type="button" title="แตะเพื่อลบ" onClick={() => setF({ ...f, images: f.images.filter((x) => x !== src) })}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imageUrl(src)} alt="" className="w-14 h-14 rounded-lg object-cover border border-ink-600" />
                </button>
              ))}
            </div>
          )}
          <div><label className={lbl}>รูปสินค้า</label><input type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={(e) => setFiles(e.target.files)} className="text-sm" /></div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.age_restricted} onChange={(e) => setF({ ...f, age_restricted: e.target.checked })} /> จำกัดอายุ 20+</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.published} onChange={(e) => setF({ ...f, published: e.target.checked })} /> ขอเผยแพร่บนหน้าเว็บ</label>
          <div className="flex gap-2">
            <button onClick={save} disabled={busy} className="btn-crimson h-10 px-5 rounded-full text-sm flex-1">{busy ? "กำลังบันทึก…" : "บันทึก"}</button>
            {f.id && <button onClick={() => setF(EMPTY)} className="chip h-10 px-4">ยกเลิก</button>}
          </div>
        </div>
      </section>
    </div>
  );
}

function Payout({ d }: { d: VendorData }) {
  return (
    <div className="flex flex-col gap-4">
      <section className={card}>
        <div className="flex items-center mb-3">
          <p className="text-xs text-ink-300">ยอดที่ต้องโอน = ยอดสินค้า − ส่วนลด − GP + ค่าส่ง · GP คิดจากยอดสินค้าที่ลูกค้าจ่ายจริง (ไม่รวมค่าส่ง)</p>
          <a href="/api/market/vendor?format=csv" className="ml-auto chip h-8 px-3 text-xs shrink-0">ดาวน์โหลด CSV</a>
        </div>
        {!d.report.length ? <p className="text-sm text-ink-300">ยังไม่มียอด</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-ink-300 text-xs"><th className="py-2">เดือน</th><th className="text-right">ออเดอร์</th><th className="text-right">ยอดสินค้า</th><th className="text-right">ส่วนลด</th><th className="text-right">GP</th><th className="text-right">ค่าส่ง</th><th className="text-right">ส่วนของร้าน</th><th className="text-right">สถานะ</th></tr></thead>
              <tbody>
                {d.report.map((r) => (
                  <tr key={r.month} className="border-t border-ink-600">
                    <td className="py-2">{r.month}</td><td className="text-right">{r.orders}</td><td className="text-right">{money(r.gross)}</td>
                    <td className="text-right">{money(r.discount)}</td><td className="text-right">{r.pendingGp ? "รอกำหนด" : money(r.gp)}</td><td className="text-right">{money(r.shipping)}</td>
                    <td className="text-right font-semibold text-gold-300">{r.pendingGp ? "รอกำหนด" : money(r.payout)}</td>
                    <td className="text-right text-xs">{r.paid ? <span className="text-emerald-300">โอนแล้ว {new Date(r.paid.paid_at).toLocaleDateString("th-TH")} · {r.paid.ref}</span> : <span className="text-ink-300">เข้ากระเป๋าเมื่อออเดอร์สำเร็จ</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      {d.payouts.length > 0 && (
        <section className={card}>
          <h3 className="font-semibold mb-2">ประวัติการโอน</h3>
          <ul className="text-sm flex flex-col gap-1">{d.payouts.map((p) => <li key={p.id} className="flex justify-between"><span>{p.month} · อ้างอิง {p.ref}</span><span className="text-gold-300">{money(p.amount)} · {new Date(p.paid_at).toLocaleDateString("th-TH")}</span></li>)}</ul>
        </section>
      )}
    </div>
  );
}
