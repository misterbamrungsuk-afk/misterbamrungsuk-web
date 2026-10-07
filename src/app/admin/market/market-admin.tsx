"use client";

import { useState } from "react";
import { Card, Pill } from "../admin-nav";
import { CARRIERS, CLAIM_NOTE, ORDER_STATUS_LABEL, baht, carrierName, flaggedClaims, fmtPct, imageUrl, type Order, type OrderStatus, type Product } from "@/lib/market/config";
import type { AdminData } from "@/lib/market/admin-data";
import { Extras } from "./market-extras";

type Data = AdminData;

const TONE: Record<OrderStatus, "gold" | "red" | "muted" | "green"> = { pending: "gold", paid: "green", shipped: "green", done: "muted", rejected: "red" };
const TABS = [["orders", "คำสั่งซื้อ"], ["products", "สินค้า"], ["vendors", "ร้านค้า / GP"], ["payouts", "รายงาน / โอนเงินร้าน"], ["accounts", "บัญชีร้านค้า"], ["categories", "หมวดหมู่"], ["banners", "แบนเนอร์"], ["promos", "โค้ดส่วนลด"], ["reviews", "รีวิว"], ["settings", "ค่าส่ง / นโยบาย"]] as const;
const dt = (s: string | null) => (s ? new Date(s).toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short" }) : "—");
const money = (n: number | null) => (n == null ? "รอกำหนด" : `฿${n.toLocaleString("th-TH", { maximumFractionDigits: 2 })}`);

export function MarketAdmin({ initial }: { initial: Data }) {
  const [d, setD] = useState<Data>(initial);
  const [tab, setTab] = useState<(typeof TABS)[number][0]>("orders");
  const [msg, setMsg] = useState("");
  const reload = async () => {
    const r = await fetch("/api/market/admin", { cache: "no-store" });
    if (r.ok) setD((await r.json()) as Data);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {TABS.map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={`chip h-9 px-3.5 ${tab === k ? "chip-red" : ""}`}>
            {l}{k === "orders" && d.orders.some((o) => o.status === "pending" && o.slip_path) ? ` (${d.orders.filter((o) => o.status === "pending" && o.slip_path).length})` : ""}
            {k === "products" && d.products.some((p) => p.published && p.approved === false) ? ` (${d.products.filter((p) => p.published && p.approved === false).length} รออนุมัติ)` : ""}
          </button>
        ))}
      </div>
      {msg && <p role="status" className="rounded-2xl border border-gold-500/40 px-4 py-2 text-sm">{msg}</p>}
      {tab === "orders" && <Orders d={d} reload={reload} setMsg={setMsg} />}
      {tab === "products" && <Products d={d} reload={reload} setMsg={setMsg} />}
      {tab === "vendors" && <Vendors d={d} reload={reload} setMsg={setMsg} />}
      {!["orders", "products", "vendors"].includes(tab) && <Extras tab={tab} d={d} reload={reload} setMsg={setMsg} />}
    </div>
  );
}

type Sub = { d: Data; reload: () => Promise<void>; setMsg: (s: string) => void };

function Orders({ d, reload, setMsg }: Sub) {
  const [filter, setFilter] = useState<OrderStatus | "all">("all");
  const [track, setTrack] = useState<Record<string, string>>({});
  const [carrier, setCarrier] = useState<Record<string, string>>({});
  const act = async (o: Order, action: string) => {
    let reason: string | undefined;
    if (action === "reject") {
      const r = prompt(`ปฏิเสธคำสั่งซื้อ ${o.order_no} — เหตุผล (ผู้ซื้อจะเห็นในหน้าติดตาม)`, "สลิปไม่ถูกต้อง / ยอดเงินไม่ตรง");
      if (r === null) return;
      reason = r;
    }
    const r = await fetch(`/api/market/admin/orders/${o.id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, tracking_no: track[o.id], carrier: carrier[o.id] ?? "thaipost", reason }) });
    const out = (await r.json().catch(() => ({}))) as { ok?: boolean; error?: string; order?: Order };
    setMsg(out.ok ? `${o.order_no}: ${ORDER_STATUS_LABEL[out.order!.status]} · GP ${money(out.order!.gp_amount)}` : out.error || "ไม่สำเร็จ");
    await reload();
  };
  const rows = d.orders.filter((o) => filter === "all" || o.status === filter);
  return (
    <>
      <div className="flex flex-wrap gap-2">
        {(["all", "pending", "paid", "shipped", "done", "rejected"] as const).map((s) => (
          <button key={s} onClick={() => setFilter(s)} className={`chip h-8 px-3 text-xs ${filter === s ? "chip-red" : ""}`}>{s === "all" ? "ทั้งหมด" : ORDER_STATUS_LABEL[s]}</button>
        ))}
      </div>
      {!rows.length && <Card><p className="text-sm text-ink-300">ยังไม่มีคำสั่งซื้อ</p></Card>}
      {rows.map((o) => (
        <Card key={o.id}>
          <div className="flex flex-wrap items-start gap-4">
            <div className="flex-1 min-w-[220px]">
              <div className="flex flex-wrap items-center gap-2">
                <b>{o.order_no}</b><Pill tone={TONE[o.status]}>{ORDER_STATUS_LABEL[o.status]}</Pill>
                {o.status === "pending" && !o.slip_path && <Pill>ยังไม่แนบสลิป</Pill>}
              </div>
              <p className="text-sm mt-1">{o.buyer_name} · 0{o.phone.slice(2)}</p>
              <p className="text-xs text-ink-300 whitespace-pre-line">{o.address}</p>
              <ul className="text-sm mt-2">{o.items.map((i) => <li key={i.product_id}>{i.name} × {i.qty} — ฿{baht(i.price * i.qty)}</li>)}</ul>
              <p className="text-xs text-ink-400 mt-2">สั่ง {dt(o.created_at)} · ยืนยัน {dt(o.paid_at)}{o.tracking_no ? ` · พัสดุ ${carrierName(o.carrier)} ${o.tracking_no}` : ""}{o.decided_by ? ` · โดย ${o.decided_by}` : ""}</p>
              {Object.keys(o.vendor_tracking ?? {}).length > 0 && <p className="text-xs text-ink-400">เลขพัสดุจากร้าน: {Object.entries(o.vendor_tracking ?? {}).map(([vid, t]) => `${d.vendors.find((v) => v.id === vid)?.name ?? vid}: ${t.tracking_no}`).join(" · ")}</p>}
              {o.reject_reason && <p className="text-xs text-crimson-300">เหตุผลที่ปฏิเสธ: {o.reject_reason}</p>}
            </div>
            <div className="text-sm min-w-[180px]">
              <p className="flex justify-between gap-4"><span className="text-ink-300">ยอดสินค้า</span><span>฿{baht(o.subtotal ?? o.total)}</span></p>
              {!!o.discount && <p className="flex justify-between gap-4"><span className="text-ink-300">ส่วนลด {o.promo_code}</span><span>−฿{baht(o.discount)}</span></p>}
              <p className="flex justify-between gap-4"><span className="text-ink-300">ค่าส่ง</span><span>฿{baht(o.shipping_fee ?? 0)}</span></p>
              <p className="flex justify-between gap-4"><span className="text-ink-300">ยอดชำระ</span><b>฿{baht(o.total)}</b></p>
              <p className="flex justify-between gap-4"><span className="text-ink-300">GP (จากยอดสินค้าหลังส่วนลด)</span><span>{o.status === "pending" || o.status === "rejected" ? "—" : `${fmtPct(o.gp_pct)} · ${money(o.gp_amount)}`}</span></p>
              <p className="flex justify-between gap-4"><span className="text-ink-300">โอนให้ร้าน</span><span>{o.status === "pending" || o.status === "rejected" ? "—" : money(o.vendor_amount)}</span></p>
            </div>
            {o.slip_path && (
              <a href={`/api/market/admin/slip?id=${o.id}`} target="_blank" rel="noreferrer" className="shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/api/market/admin/slip?id=${o.id}`} alt="สลิป" className="w-20 h-28 rounded-xl object-cover border border-ink-600" />
              </a>
            )}
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            {o.status === "pending" && <button disabled={!o.slip_path} onClick={() => act(o, "confirm")} className="btn-crimson h-9 px-4 rounded-full text-sm disabled:opacity-40">ยืนยันชำระ (คิด GP)</button>}
            {(o.status === "pending" || o.status === "paid") && <button onClick={() => act(o, "reject")} className="chip h-9 px-4">ปฏิเสธ</button>}
            {o.status === "paid" && (
              <>
                <select value={carrier[o.id] ?? "thaipost"} onChange={(e) => setCarrier({ ...carrier, [o.id]: e.target.value })} className="input-dark h-9 text-sm" aria-label="ขนส่ง">
                  {CARRIERS.map((c) => <option key={c.key} value={c.key}>{c.name}</option>)}
                </select>
                <input placeholder="เลขพัสดุ" value={track[o.id] ?? ""} onChange={(e) => setTrack({ ...track, [o.id]: e.target.value })} className="input-dark h-9 w-40 text-sm" />
                <button onClick={() => act(o, "ship")} className="btn-crimson h-9 px-4 rounded-full text-sm">บันทึกจัดส่ง</button>
              </>
            )}
            {o.status === "shipped" && <button onClick={() => act(o, "done")} className="chip h-9 px-4">ปิดงาน (สำเร็จ)</button>}
            {["paid", "shipped", "done"].includes(o.status) && o.gp_amount == null && <button onClick={() => act(o, "regp")} className="chip h-9 px-4">คำนวณ GP ใหม่</button>}
          </div>
        </Card>
      ))}
    </>
  );
}

const EMPTY = { id: "", vendor_id: "", name: "", description: "", warning: "", price: "", stock: "0", fda_no: "", category_id: "", bundle_ids: [] as string[], published: false, approved: true, age_restricted: true, images: [] as string[] };

function Products({ d, reload, setMsg }: Sub) {
  const [f, setF] = useState(EMPTY);
  const [files, setFiles] = useState<FileList | null>(null);
  const [busy, setBusy] = useState(false);
  const flagged = flaggedClaims(`${f.name} ${f.description}`);
  const edit = (p: Product) => setF({ ...EMPTY, ...p, price: String(p.price), stock: String(p.stock), fda_no: p.fda_no ?? "", category_id: p.category_id ?? "", bundle_ids: p.bundle_ids ?? [], approved: p.approved !== false });
  const save = async () => {
    if (f.published && !f.fda_no.trim()) return setMsg("ต้องใส่เลข อย. ก่อนเผยแพร่");
    setBusy(true);
    const fd = new FormData();
    for (const k of ["id", "vendor_id", "name", "description", "warning", "price", "stock", "fda_no", "category_id"] as const) fd.append(k, String(f[k]));
    fd.append("bundle_ids", f.bundle_ids.join(","));
    fd.append("published", f.published ? "1" : "0");
    fd.append("approved", f.approved ? "1" : "0");
    fd.append("age_restricted", f.age_restricted ? "1" : "0");
    if (f.id) fd.append("keep_images", f.images.join(","));
    for (const file of Array.from(files ?? [])) fd.append("image", file);
    const r = await fetch("/api/market/admin/products", { method: "POST", body: fd });
    const out = (await r.json().catch(() => ({}))) as { ok?: boolean; error?: string; flagged?: string[] };
    setBusy(false);
    if (!out.ok) return setMsg(out.error || "บันทึกไม่สำเร็จ");
    setMsg(out.flagged?.length ? `บันทึกแล้ว — ตรวจคำโฆษณา: ${out.flagged.join(", ")}` : "บันทึกสินค้าแล้ว");
    setF(EMPTY); setFiles(null);
    await reload();
  };
  const lbl = "block text-xs text-ink-300 mb-1";
  return (
    <div className="grid lg:grid-cols-[1fr_420px] gap-4 items-start">
      <div className="flex flex-col gap-3">
        {d.products.map((p) => (
          <Card key={p.id} className="flex items-center gap-3">
            {p.images[0]
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={imageUrl(p.images[0])} alt="" className="w-14 h-14 rounded-xl object-cover" />
              : <div className="w-14 h-14 rounded-xl bg-ink-700" />}
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">{p.name}</p>
              <p className="text-xs text-ink-300">{d.vendors.find((v) => v.id === p.vendor_id)?.name} · ฿{baht(p.price)} · สต็อก {p.stock} · อย. {p.fda_no || "—"}</p>
            </div>
            <Pill tone={p.published ? (p.approved === false ? "gold" : "green") : "muted"}>{!p.published ? "ฉบับร่าง" : p.approved === false ? "รออนุมัติ" : "เผยแพร่"}</Pill>
            <button onClick={() => edit(p)} className="chip h-8 px-3 text-xs">แก้ไข</button>
          </Card>
        ))}
      </div>
      <Card>
        <h3 className="font-semibold">{f.id ? "แก้ไขสินค้า" : "เพิ่มสินค้า"}</h3>
        <p className="mt-2 rounded-xl border border-crimson-500/50 bg-crimson-500/5 p-3 text-xs leading-relaxed">{CLAIM_NOTE}</p>
        <div className="flex flex-col gap-3 mt-3">
          <div><label className={lbl}>ร้านค้า *</label>
            <select className="input-dark w-full" value={f.vendor_id} onChange={(e) => setF({ ...f, vendor_id: e.target.value })}>
              <option value="">เลือกร้านค้า</option>
              {d.vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select></div>
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
          <div><label className={lbl}>ซื้อคู่กัน (ไม่เลือก = แนะนำอัตโนมัติจากออเดอร์/หมวด)</label>
            <div className="flex flex-wrap gap-1.5">
              {d.products.filter((x) => x.id !== f.id).map((x) => {
                const on = f.bundle_ids.includes(x.id);
                return <button key={x.id} type="button" onClick={() => setF({ ...f, bundle_ids: on ? f.bundle_ids.filter((i) => i !== x.id) : [...f.bundle_ids, x.id] })} className={`chip h-7 px-2.5 text-[11px] ${on ? "chip-red" : ""}`}>{x.name}</button>;
              })}
            </div></div>
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
          <div><label className={lbl}>รูปสินค้า (เพิ่มได้หลายรูป)</label><input type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={(e) => setFiles(e.target.files)} className="text-sm" /></div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.age_restricted} onChange={(e) => setF({ ...f, age_restricted: e.target.checked })} /> จำกัดอายุ 20+</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.published} onChange={(e) => setF({ ...f, published: e.target.checked })} /> เผยแพร่บนหน้าเว็บ</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.approved} onChange={(e) => setF({ ...f, approved: e.target.checked })} /> แอดมินอนุมัติแล้ว (ตรวจคำโฆษณา + เลข อย.)</label>
          <div className="flex gap-2">
            <button onClick={save} disabled={busy} className="btn-crimson h-10 px-5 rounded-full text-sm flex-1">{busy ? "กำลังบันทึก…" : "บันทึก"}</button>
            {f.id && <button onClick={() => setF(EMPTY)} className="chip h-10 px-4">ยกเลิก</button>}
          </div>
        </div>
      </Card>
    </div>
  );
}

function Vendors({ d, reload, setMsg }: Sub) {
  const [edit, setEdit] = useState<Record<string, { name: string; contact: string; gp: string; slug: string; description: string }>>({});
  const [n, setN] = useState({ name: "", contact: "", gp: "", slug: "", description: "" });
  const save = async (body: { id?: string; name: string; contact: string; gp: string; slug: string; description: string }) => {
    const r = await fetch("/api/market/admin/vendors", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: body.id, name: body.name, contact: body.contact, gp_pct: body.gp === "" ? null : Number(body.gp), slug: body.slug || undefined, description: body.description }) });
    const out = (await r.json().catch(() => ({}))) as { ok?: boolean; error?: string };
    setMsg(out.ok ? "บันทึกร้านค้าแล้ว" : out.error || "ไม่สำเร็จ");
    if (out.ok) await reload();
    return !!out.ok;
  };
  return (
    <Card>
      <p className="text-xs text-ink-300 mb-3">GP % ว่าง = [รอกำหนด] — คำสั่งซื้อที่ยืนยันระหว่างนั้นจะเก็บ GP เป็น “รอกำหนด” และกด “คำนวณ GP ใหม่” ได้ภายหลัง</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-ink-300 text-xs"><th className="py-2">ร้านค้า</th><th>ติดต่อ</th><th>GP %</th><th>slug หน้าร้าน (/shop/…)</th><th>คำอธิบายร้าน</th><th /></tr></thead>
          <tbody>
            {d.vendors.map((v) => {
              const e = edit[v.id] ?? { name: v.name, contact: v.contact, gp: v.gp_pct == null ? "" : String(v.gp_pct), slug: v.slug ?? "", description: v.description ?? "" };
              const set = (p: Partial<typeof e>) => setEdit({ ...edit, [v.id]: { ...e, ...p } });
              return (
                <tr key={v.id} className="border-t border-ink-600">
                  <td className="py-2 pr-2"><input className="input-dark h-9 w-full" value={e.name} onChange={(x) => set({ name: x.target.value })} /></td>
                  <td className="pr-2"><input className="input-dark h-9 w-full" value={e.contact} onChange={(x) => set({ contact: x.target.value })} /></td>
                  <td className="pr-2"><input className="input-dark h-9 w-24" placeholder="รอกำหนด" inputMode="decimal" value={e.gp} onChange={(x) => set({ gp: x.target.value })} /></td>
                  <td className="pr-2"><input className="input-dark h-9 w-32" value={e.slug} onChange={(x) => set({ slug: x.target.value })} /></td>
                  <td className="pr-2"><input className="input-dark h-9 w-full min-w-40" placeholder="[รอกำหนด]" value={e.description} onChange={(x) => set({ description: x.target.value })} /></td>
                  <td><button onClick={() => save({ id: v.id, ...e })} className="chip h-9 px-3">บันทึก</button></td>
                </tr>
              );
            })}
            <tr className="border-t border-ink-600">
              <td className="py-2 pr-2"><input className="input-dark h-9 w-full" placeholder="ร้านค้าใหม่" value={n.name} onChange={(x) => setN({ ...n, name: x.target.value })} /></td>
              <td className="pr-2"><input className="input-dark h-9 w-full" placeholder="LINE / โทร" value={n.contact} onChange={(x) => setN({ ...n, contact: x.target.value })} /></td>
              <td className="pr-2"><input className="input-dark h-9 w-24" placeholder="รอกำหนด" inputMode="decimal" value={n.gp} onChange={(x) => setN({ ...n, gp: x.target.value })} /></td>
              <td className="pr-2"><input className="input-dark h-9 w-32" placeholder="อัตโนมัติ" value={n.slug} onChange={(x) => setN({ ...n, slug: x.target.value })} /></td>
              <td className="pr-2"><input className="input-dark h-9 w-full min-w-40" value={n.description} onChange={(x) => setN({ ...n, description: x.target.value })} /></td>
              <td><button onClick={async () => { if (await save(n)) setN({ name: "", contact: "", gp: "", slug: "", description: "" }); }} className="btn-crimson h-9 px-3 rounded-full text-sm">เพิ่ม</button></td>
            </tr>
          </tbody>
        </table>
      </div>
    </Card>
  );
}

