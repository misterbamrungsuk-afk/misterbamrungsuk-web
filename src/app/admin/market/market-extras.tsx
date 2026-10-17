"use client";

import { useState } from "react";
import { Card, Pill } from "../admin-nav";
import { TBD, baht, imageUrl, type Banner, type Promo } from "@/lib/market/config";
import type { AdminData } from "@/lib/market/admin-data";

type Sub = { d: AdminData; reload: () => Promise<void>; setMsg: (s: string) => void };
const money = (n: number | null | undefined) => (n == null ? "รอกำหนด" : `฿${n.toLocaleString("th-TH", { maximumFractionDigits: 2 })}`);
const lbl = "block text-xs text-ink-300 mb-1";

async function api(entity: string, body: unknown) {
  const r = await fetch(`/api/market/admin/${entity}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return (await r.json().catch(() => ({}))) as { ok?: boolean; error?: string; invite?: string };
}

export function Extras({ tab, ...p }: Sub & { tab: string }) {
  switch (tab) {
    case "payouts": return <Payouts {...p} />;
    case "accounts": return <Accounts {...p} />;
    case "categories": return <Categories {...p} />;
    case "banners": return <Banners {...p} />;
    case "promos": return <Promos {...p} />;
    case "reviews": return <Reviews {...p} />;
    case "settings": return <Settings {...p} />;
    default: return null;
  }
}

// ── รายงานรายเดือนต่อร้าน + บันทึกการโอน ──
function Payouts({ d, reload, setMsg }: Sub) {
  const [month, setMonth] = useState("");
  const [form, setForm] = useState<{ key: string; paid_at: string; ref: string; slip: File | null } | null>(null);
  const months = [...new Set(d.report.map((r) => r.month))];
  const rows = d.report.filter((r) => !month || r.month === month);
  const save = async (vendor_id: string, m: string) => {
    if (!form) return;
    const fd = new FormData();
    fd.append("vendor_id", vendor_id); fd.append("month", m); fd.append("paid_at", form.paid_at); fd.append("ref", form.ref);
    if (form.slip) fd.append("slip", form.slip);
    const r = await fetch("/api/market/admin/payouts", { method: "POST", body: fd });
    const out = (await r.json().catch(() => ({}))) as { ok?: boolean; error?: string };
    setMsg(out.ok ? `บันทึกการโอนแล้ว (${m})` : out.error || "ไม่สำเร็จ");
    if (out.ok) { setForm(null); await reload(); }
  };
  return (
    <Card>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <select value={month} onChange={(e) => setMonth(e.target.value)} className="input-dark h-9 text-sm" aria-label="เดือน">
          <option value="">ทุกเดือน</option>{months.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <a href={`/api/market/admin/payouts?format=csv${month ? `&month=${month}` : ""}`} className="chip h-9 px-3 text-xs">ส่งออก CSV</a>
        <p className="text-xs text-gold-300 basis-full">ตั้งแต่ 17 ต.ค. 2569 ส่วนของร้านเข้า "กระเป๋าร้าน" อัตโนมัติเมื่อออเดอร์สำเร็จ → ร้านกดขอถอนในพอร์ทัล → CEO อนุมัติ → โอนที่หน้า "โอนเงิน" · ตารางนี้เป็นรายงานเท่านั้น</p>
        <p className="text-xs text-ink-300 basis-full">นับเฉพาะคำสั่งซื้อที่ยืนยันชำระแล้ว · ยอดที่ต้องโอน = ยอดสินค้า − ส่วนลด − GP + ค่าส่ง · GP คิดจากยอดสินค้าหลังส่วนลด (ไม่รวมค่าส่ง)</p>
      </div>
      {!rows.length ? <p className="text-sm text-ink-300">ยังไม่มียอด</p> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-ink-300 text-xs"><th className="py-2">เดือน</th><th>ร้านค้า</th><th className="text-right">ออเดอร์</th><th className="text-right">ยอดสินค้า</th><th className="text-right">ส่วนลด</th><th className="text-right">GP</th><th className="text-right">ค่าส่ง</th><th className="text-right">ต้องโอน</th><th className="text-right">GP รอกำหนด</th><th /></tr></thead>
            <tbody>
              {rows.map((r) => {
                const key = `${r.month}|${r.vendor_id}`;
                return (
                  <tr key={key} className="border-t border-ink-600 align-top">
                    <td className="py-2">{r.month}</td><td>{r.vendor}</td><td className="text-right">{r.orders}</td>
                    <td className="text-right">{money(r.gross)}</td><td className="text-right">{money(r.discount)}</td>
                    <td className="text-right text-gold-300">{money(r.gp)}</td><td className="text-right">{money(r.shipping)}</td>
                    <td className="text-right font-semibold">{money(r.payout)}</td><td className="text-right">{r.pendingGp ? money(r.pendingGp) : "—"}</td>
                    <td className="pl-3 text-right min-w-[220px]">
                      {r.paid ? (
                        <span className="text-xs text-emerald-300">โอนแล้ว {new Date(r.paid.paid_at).toLocaleDateString("th-TH")} · {r.paid.ref}{r.paid.slip_path && <> · <a className="underline" target="_blank" rel="noreferrer" href={`/api/market/admin/payouts?slip=${r.paid.id}`}>สลิป</a></>}</span>
                      ) : form?.key === key ? (
                        <div className="flex flex-col gap-1.5 items-end">
                          <input type="date" value={form.paid_at} onChange={(e) => setForm({ ...form, paid_at: e.target.value })} className="input-dark h-8 text-xs" aria-label="วันที่โอน" />
                          <input placeholder="เลขอ้างอิงการโอน" value={form.ref} onChange={(e) => setForm({ ...form, ref: e.target.value })} className="input-dark h-8 text-xs" />
                          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setForm({ ...form, slip: e.target.files?.[0] ?? null })} className="text-xs" aria-label="สลิปการโอน" />
                          <div className="flex gap-1"><button onClick={() => save(r.vendor_id, r.month)} className="btn-crimson h-8 px-3 rounded-full text-xs">บันทึก</button><button onClick={() => setForm(null)} className="chip h-8 px-3 text-xs">ยกเลิก</button></div>
                        </div>
                      ) : (
                        <span className="text-xs text-ink-300">{r.pendingGp > 0 ? "ตั้ง GP % ก่อน" : "เข้ากระเป๋าร้าน · ร้านขอถอนเอง"}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

// ── บัญชีร้านค้า (เชิญด้วยอีเมล → ลิงก์ตั้งรหัสผ่าน) ──
function Accounts({ d, reload, setMsg }: Sub) {
  const [n, setN] = useState({ vendor_id: "", email: "" });
  const [link, setLink] = useState("");
  const invite = async (vendor_id: string, email: string) => {
    const out = await api("accounts", { op: "invite", vendor_id, email });
    if (!out.ok) return setMsg(out.error || "ไม่สำเร็จ");
    const full = `${location.origin}${out.invite}`;
    setLink(full);
    try { await navigator.clipboard.writeText(full); setMsg("สร้างลิงก์เชิญแล้ว (คัดลอกให้แล้ว) — ส่งให้ร้านค้าทาง LINE/อีเมล ลิงก์ใช้ได้ 7 วัน"); } catch { setMsg("สร้างลิงก์เชิญแล้ว"); }
    await reload();
  };
  const del = async (id: string) => { if (!confirm("ลบบัญชีนี้? ร้านจะเข้าพอร์ทัลไม่ได้")) return; const o = await api("accounts", { op: "delete", id }); setMsg(o.ok ? "ลบบัญชีแล้ว" : o.error || "ไม่สำเร็จ"); await reload(); };
  return (
    <Card>
      <p className="text-xs text-ink-300 mb-3">ร้านค้าเข้า /vendor ด้วยอีเมล + รหัสผ่าน · บัญชีสร้างจากลิงก์เชิญเท่านั้น (เชิญซ้ำ = รีเซ็ตรหัสผ่าน ลิงก์เก่าใช้ไม่ได้)</p>
      <div className="flex flex-wrap gap-2">
        <select className="input-dark h-9 text-sm" value={n.vendor_id} onChange={(e) => setN({ ...n, vendor_id: e.target.value })} aria-label="ร้านค้า">
          <option value="">เลือกร้านค้า</option>{d.vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
        </select>
        <input type="email" placeholder="อีเมลร้านค้า" className="input-dark h-9 text-sm w-64" value={n.email} onChange={(e) => setN({ ...n, email: e.target.value })} />
        <button onClick={() => invite(n.vendor_id, n.email)} className="btn-crimson h-9 px-4 rounded-full text-sm">สร้างลิงก์เชิญ</button>
      </div>
      {link && <p className="mt-2 text-xs break-all rounded-xl border border-gold-500/40 p-2">{link}</p>}
      <table className="w-full text-sm mt-4">
        <thead><tr className="text-left text-ink-300 text-xs"><th className="py-2">อีเมล</th><th>ร้านค้า</th><th>สถานะ</th><th>เข้าล่าสุด</th><th /></tr></thead>
        <tbody>
          {d.accounts.map((a) => (
            <tr key={a.id} className="border-t border-ink-600">
              <td className="py-2">{a.email}</td><td>{d.vendors.find((v) => v.id === a.vendor_id)?.name}</td>
              <td><Pill tone={a.active ? "green" : "gold"}>{a.active ? "ใช้งาน" : "รอตั้งรหัส"}</Pill></td>
              <td className="text-xs text-ink-300">{a.last_login_at ? new Date(a.last_login_at).toLocaleString("th-TH") : "—"}</td>
              <td className="text-right whitespace-nowrap"><button onClick={() => invite(a.vendor_id, a.email)} className="chip h-8 px-3 text-xs">ลิงก์ใหม่</button> <button onClick={() => del(a.id)} className="chip h-8 px-3 text-xs">ลบ</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      {!d.accounts.length && <p className="text-sm text-ink-300 mt-2">ยังไม่มีบัญชีร้านค้า</p>}
    </Card>
  );
}

function Categories({ d, reload, setMsg }: Sub) {
  const [edit, setEdit] = useState<Record<string, { name: string; slug: string; sort: string }>>({});
  const [n, setN] = useState({ name: "", slug: "", sort: "0" });
  const save = async (b: { id?: string; name: string; slug: string; sort: string }) => { const o = await api("categories", b); setMsg(o.ok ? "บันทึกหมวดแล้ว" : o.error || "ไม่สำเร็จ"); if (o.ok) await reload(); return !!o.ok; };
  const del = async (id: string) => { if (!confirm("ลบหมวดนี้? สินค้าในหมวดจะกลายเป็นไม่ระบุหมวด")) return; await api("categories", { op: "delete", id }); await reload(); };
  return (
    <Card>
      <table className="w-full text-sm">
        <thead><tr className="text-left text-ink-300 text-xs"><th className="py-2">ชื่อหมวด</th><th>slug</th><th>ลำดับ</th><th>สินค้า</th><th /></tr></thead>
        <tbody>
          {d.categories.map((c) => {
            const e = edit[c.id] ?? { name: c.name, slug: c.slug, sort: String(c.sort) };
            const set = (p: Partial<typeof e>) => setEdit({ ...edit, [c.id]: { ...e, ...p } });
            return (
              <tr key={c.id} className="border-t border-ink-600">
                <td className="py-2 pr-2"><input className="input-dark h-9 w-full" value={e.name} onChange={(x) => set({ name: x.target.value })} /></td>
                <td className="pr-2"><input className="input-dark h-9 w-36" value={e.slug} onChange={(x) => set({ slug: x.target.value })} /></td>
                <td className="pr-2"><input className="input-dark h-9 w-16" value={e.sort} onChange={(x) => set({ sort: x.target.value })} /></td>
                <td className="text-xs text-ink-300">{d.products.filter((p) => p.category_id === c.id).length}</td>
                <td className="text-right whitespace-nowrap"><button onClick={() => save({ id: c.id, ...e })} className="chip h-9 px-3">บันทึก</button> <button onClick={() => del(c.id)} className="chip h-9 px-3">ลบ</button></td>
              </tr>
            );
          })}
          <tr className="border-t border-ink-600">
            <td className="py-2 pr-2"><input className="input-dark h-9 w-full" placeholder="หมวดใหม่" value={n.name} onChange={(x) => setN({ ...n, name: x.target.value })} /></td>
            <td className="pr-2"><input className="input-dark h-9 w-36" placeholder="อัตโนมัติ" value={n.slug} onChange={(x) => setN({ ...n, slug: x.target.value })} /></td>
            <td className="pr-2"><input className="input-dark h-9 w-16" value={n.sort} onChange={(x) => setN({ ...n, sort: x.target.value })} /></td>
            <td />
            <td className="text-right"><button onClick={async () => { if (await save(n)) setN({ name: "", slug: "", sort: "0" }); }} className="btn-crimson h-9 px-3 rounded-full text-sm">เพิ่ม</button></td>
          </tr>
        </tbody>
      </table>
    </Card>
  );
}

const EMPTY_BANNER = { id: "", title: "", subtitle: "", image: "", link: "", sort: "0", active: true };
function Banners({ d, reload, setMsg }: Sub) {
  const [f, setF] = useState(EMPTY_BANNER);
  const [file, setFile] = useState<File | null>(null);
  const save = async () => {
    const fd = new FormData();
    for (const k of ["id", "title", "subtitle", "image", "link", "sort"] as const) fd.append(k, String(f[k]));
    fd.append("active", f.active ? "1" : "0");
    if (file) fd.append("image", file);
    const r = await fetch("/api/market/admin/banners", { method: "POST", body: fd });
    const o = (await r.json().catch(() => ({}))) as { ok?: boolean; error?: string };
    setMsg(o.ok ? "บันทึกแบนเนอร์แล้ว" : o.error || "ไม่สำเร็จ");
    if (o.ok) { setF(EMPTY_BANNER); setFile(null); await reload(); }
  };
  const del = async (b: Banner) => { if (!confirm(`ลบแบนเนอร์ “${b.title}”?`)) return; await api("banners", { op: "delete", id: b.id }); await reload(); };
  return (
    <div className="grid lg:grid-cols-[1fr_380px] gap-4 items-start">
      <div className="flex flex-col gap-3">
        {d.banners.map((b) => (
          <Card key={b.id} className="flex items-center gap-3">
            {b.image
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={imageUrl(b.image)} alt="" className="w-24 h-14 rounded-lg object-cover" />
              : <div className="w-24 h-14 rounded-lg bg-[linear-gradient(135deg,#2a1014,#0e0a0a)]" />}
            <div className="flex-1 min-w-0"><p className="font-semibold truncate">{b.title}</p><p className="text-xs text-ink-300 truncate">{b.subtitle} · {b.link || "ไม่มีลิงก์"} · ลำดับ {b.sort}</p></div>
            <Pill tone={b.active ? "green" : "muted"}>{b.active ? "แสดง" : "ซ่อน"}</Pill>
            <button onClick={() => setF({ ...b, sort: String(b.sort) })} className="chip h-8 px-3 text-xs">แก้ไข</button>
            <button onClick={() => del(b)} className="chip h-8 px-3 text-xs">ลบ</button>
          </Card>
        ))}
        {!d.banners.length && <Card><p className="text-sm text-ink-300">ยังไม่มีแบนเนอร์</p></Card>}
      </div>
      <Card>
        <h3 className="font-semibold">{f.id ? "แก้ไขแบนเนอร์" : "เพิ่มแบนเนอร์"}</h3>
        <div className="flex flex-col gap-3 mt-3">
          <div><label className={lbl}>หัวข้อ *</label><input className="input-dark w-full" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></div>
          <div><label className={lbl}>ข้อความรอง</label><input className="input-dark w-full" value={f.subtitle} onChange={(e) => setF({ ...f, subtitle: e.target.value })} /></div>
          <div><label className={lbl}>ลิงก์ (ภายในเว็บ เช่น /products?cat=supplement)</label><input className="input-dark w-full" value={f.link} onChange={(e) => setF({ ...f, link: e.target.value })} /></div>
          <div><label className={lbl}>ลำดับ</label><input className="input-dark w-24" value={f.sort} onChange={(e) => setF({ ...f, sort: e.target.value })} /></div>
          <div><label className={lbl}>รูป (แนวนอน ~1600×600)</label><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="text-sm" /></div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} /> แสดงบนหน้าแรก</label>
          <p className="text-[11px] text-[#9a8a85]">ข้อความโปรโมทต้องไม่อ้างสรรพคุณทางการแพทย์หรือสมรรถภาพ</p>
          <div className="flex gap-2"><button onClick={save} className="btn-crimson h-10 px-5 rounded-full text-sm flex-1">บันทึก</button>{f.id && <button onClick={() => setF(EMPTY_BANNER)} className="chip h-10 px-4">ยกเลิก</button>}</div>
        </div>
      </Card>
    </div>
  );
}

const EMPTY_PROMO = { id: "", code: "", kind: "percent" as Promo["kind"], value: "", min_spend: "0", expires_at: "", usage_limit: "", active: true };
function Promos({ d, reload, setMsg }: Sub) {
  const [f, setF] = useState(EMPTY_PROMO);
  const save = async () => {
    const o = await api("promos", { ...f, id: f.id || undefined, expires_at: f.expires_at ? `${f.expires_at}T23:59:59+07:00` : null });
    setMsg(o.ok ? "บันทึกโค้ดแล้ว" : o.error || "ไม่สำเร็จ");
    if (o.ok) { setF(EMPTY_PROMO); await reload(); }
  };
  const del = async (p: Promo) => { if (!confirm(`ลบโค้ด ${p.code}?`)) return; await api("promos", { op: "delete", id: p.id }); await reload(); };
  return (
    <div className="grid lg:grid-cols-[1fr_380px] gap-4 items-start">
      <Card>
        <p className="text-xs text-ink-300 mb-3">ส่วนลดหักจากยอดสินค้าก่อนคิด GP — GP คิดจากยอดสินค้าที่ลูกค้าจ่ายจริง · ค่าส่งคิดจากยอดหลังส่วนลด</p>
        <table className="w-full text-sm">
          <thead><tr className="text-left text-ink-300 text-xs"><th className="py-2">โค้ด</th><th>ส่วนลด</th><th>ขั้นต่ำ</th><th>หมดอายุ</th><th>ใช้แล้ว</th><th>สถานะ</th><th /></tr></thead>
          <tbody>
            {d.promos.map((p) => (
              <tr key={p.id} className="border-t border-ink-600">
                <td className="py-2 font-semibold tracking-wider">{p.code}</td>
                <td>{p.kind === "percent" ? `${p.value}%` : `฿${baht(p.value)}`}</td><td>฿{baht(p.min_spend)}</td>
                <td className="text-xs">{p.expires_at ? new Date(p.expires_at).toLocaleDateString("th-TH") : "ไม่หมดอายุ"}</td>
                <td>{p.used_count}{p.usage_limit != null ? ` / ${p.usage_limit}` : ""}</td>
                <td><Pill tone={p.active ? "green" : "muted"}>{p.active ? "ใช้ได้" : "ปิด"}</Pill></td>
                <td className="text-right whitespace-nowrap">
                  <button onClick={() => setF({ id: p.id, code: p.code, kind: p.kind, value: String(p.value), min_spend: String(p.min_spend), expires_at: p.expires_at ? new Date(Date.parse(p.expires_at) + 7 * 3600_000).toISOString().slice(0, 10) : "", usage_limit: p.usage_limit == null ? "" : String(p.usage_limit), active: p.active })} className="chip h-8 px-3 text-xs">แก้ไข</button>{" "}
                  <button onClick={() => del(p)} className="chip h-8 px-3 text-xs">ลบ</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!d.promos.length && <p className="text-sm text-ink-300 mt-2">ยังไม่มีโค้ดส่วนลด</p>}
      </Card>
      <Card>
        <h3 className="font-semibold">{f.id ? "แก้ไขโค้ด" : "สร้างโค้ด"}</h3>
        <div className="flex flex-col gap-3 mt-3">
          <div><label className={lbl}>โค้ด *</label><input className="input-dark w-full uppercase tracking-wider" value={f.code} onChange={(e) => setF({ ...f, code: e.target.value.toUpperCase() })} /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><label className={lbl}>ประเภท</label><select className="input-dark w-full" value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value as Promo["kind"] })}><option value="percent">เปอร์เซ็นต์</option><option value="fixed">จำนวนเงิน (บาท)</option></select></div>
            <div><label className={lbl}>มูลค่า *</label><input inputMode="decimal" className="input-dark w-full" value={f.value} onChange={(e) => setF({ ...f, value: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><label className={lbl}>ยอดขั้นต่ำ (บาท)</label><input inputMode="numeric" className="input-dark w-full" value={f.min_spend} onChange={(e) => setF({ ...f, min_spend: e.target.value })} /></div>
            <div><label className={lbl}>จำกัดจำนวนครั้ง</label><input inputMode="numeric" placeholder="ไม่จำกัด" className="input-dark w-full" value={f.usage_limit} onChange={(e) => setF({ ...f, usage_limit: e.target.value })} /></div>
          </div>
          <div><label className={lbl}>หมดอายุ (สิ้นวัน เวลาไทย)</label><input type="date" className="input-dark w-full" value={f.expires_at} onChange={(e) => setF({ ...f, expires_at: e.target.value })} /></div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} /> เปิดใช้งาน</label>
          <div className="flex gap-2"><button onClick={save} className="btn-crimson h-10 px-5 rounded-full text-sm flex-1">บันทึก</button>{f.id && <button onClick={() => setF(EMPTY_PROMO)} className="chip h-10 px-4">ยกเลิก</button>}</div>
        </div>
      </Card>
    </div>
  );
}

function Reviews({ d, reload, setMsg }: Sub) {
  const toggle = async (id: string, hidden: boolean) => { const o = await api("reviews", { id, hidden }); setMsg(o.ok ? (hidden ? "ซ่อนรีวิวแล้ว" : "แสดงรีวิวแล้ว") : o.error || "ไม่สำเร็จ"); await reload(); };
  return (
    <div className="flex flex-col gap-3">
      {!d.reviews.length && <Card><p className="text-sm text-ink-300">ยังไม่มีรีวิว — ผู้ซื้อรีวิวได้เมื่อคำสั่งซื้อสถานะ “สำเร็จ”</p></Card>}
      {d.reviews.map((r) => (
        <Card key={r.id} className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm"><span className="text-gold-400">{"★".repeat(r.stars)}</span> <b>{r.name}</b> · {d.products.find((p) => p.id === r.product_id)?.name ?? r.product_id}</p>
            {r.text && <p className="text-sm text-ink-200 mt-1 whitespace-pre-line">{r.text}</p>}
            <p className="text-xs text-[#9a8a85] mt-1">{new Date(r.created_at).toLocaleString("th-TH")} · 0{r.phone.slice(2, 4)}-xxx-{r.phone.slice(-4)} · ออเดอร์ {d.orders.find((o) => o.id === r.order_id)?.order_no ?? "—"}</p>
          </div>
          <Pill tone={r.hidden ? "muted" : "green"}>{r.hidden ? "ซ่อน" : "แสดง"}</Pill>
          <button onClick={() => toggle(r.id, !r.hidden)} className="chip h-8 px-3 text-xs">{r.hidden ? "แสดง" : "ซ่อน"}</button>
        </Card>
      ))}
    </div>
  );
}

function Settings({ d, reload, setMsg }: Sub) {
  const s = d.settings;
  const [f, setF] = useState({
    shipping_fee: s.shipping_fee == null ? "" : String(s.shipping_fee), free_threshold: s.free_threshold == null ? "" : String(s.free_threshold),
    delivery_days: s.delivery_days, policy_returns: s.policy_returns, policy_shipping: s.policy_shipping, policy_privacy: s.policy_privacy, line_notify_url: s.line_notify_url,
  });
  const save = async () => { const o = await api("settings", f); setMsg(o.ok ? "บันทึกการตั้งค่าแล้ว" : o.error || "ไม่สำเร็จ"); if (o.ok) await reload(); };
  return (
    <div className="grid lg:grid-cols-2 gap-4 items-start">
      <Card>
        <h3 className="font-semibold">ค่าจัดส่ง</h3>
        <p className="text-xs text-ink-300 mt-1">ว่าง = {TBD} (คิดเป็น ฿0 และแสดงป้ายในตะกร้า) · ค่าส่งไม่นำมาคิด GP และโอนให้ร้านที่จัดส่ง</p>
        <div className="grid grid-cols-2 gap-2 mt-3">
          <div><label className={lbl}>ค่าส่งเหมา (บาท/ออเดอร์)</label><input inputMode="decimal" placeholder={TBD} className="input-dark w-full" value={f.shipping_fee} onChange={(e) => setF({ ...f, shipping_fee: e.target.value })} /></div>
          <div><label className={lbl}>ส่งฟรีเมื่อยอดสินค้าถึง (บาท)</label><input inputMode="decimal" placeholder="ไม่มี" className="input-dark w-full" value={f.free_threshold} onChange={(e) => setF({ ...f, free_threshold: e.target.value })} /></div>
        </div>
        <div className="mt-2"><label className={lbl}>ระยะเวลาจัดส่งโดยประมาณ (แสดงในตะกร้า)</label><input className="input-dark w-full" placeholder="เช่น 2–4 วันทำการ" value={f.delivery_days} onChange={(e) => setF({ ...f, delivery_days: e.target.value })} /></div>
        <h3 className="font-semibold mt-6">แจ้งเตือน LINE (stub)</h3>
        <p className="text-xs text-ink-300 mt-1">ใส่ URL webhook (https://) — ระบบ POST JSON {"{event, order_no, status, total, tracking_no}"} เมื่อยืนยัน/จัดส่ง · ว่าง = ไม่ส่ง (SMS ยังส่งตามปกติ)</p>
        <input className="input-dark w-full mt-2" placeholder="https://…" value={f.line_notify_url} onChange={(e) => setF({ ...f, line_notify_url: e.target.value })} />
        <button onClick={save} className="btn-crimson h-10 px-5 rounded-full text-sm mt-4">บันทึก</button>
      </Card>
      <Card>
        <h3 className="font-semibold">ข้อความนโยบาย</h3>
        <p className="text-xs text-ink-300 mt-1">ว่าง = แสดงโครงร่างพร้อม {TBD} · ควรให้ทนายตรวจก่อนเผยแพร่</p>
        {([["policy_returns", "นโยบายคืนสินค้า (/policy/returns)"], ["policy_shipping", "นโยบายการจัดส่ง (/policy/shipping)"], ["policy_privacy", "นโยบายความเป็นส่วนตัว (/policy/privacy-shop)"]] as const).map(([k, l]) => (
          <div key={k} className="mt-3"><label className={lbl}>{l}</label><textarea rows={5} className="input-dark w-full" value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} /></div>
        ))}
        <button onClick={save} className="btn-crimson h-10 px-5 rounded-full text-sm mt-4">บันทึก</button>
      </Card>
    </div>
  );
}
