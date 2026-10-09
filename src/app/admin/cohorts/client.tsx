"use client";

import { useMemo, useState } from "react";
import type { Cohort, CohortStatus } from "@/lib/join/cohorts";

export type Member = { id: string; cohort: string; name: string; code: string; att: Record<number, boolean> };

const STATUS_LABEL: Record<CohortStatus, string> = { done: "อบรมเสร็จแล้ว", open: "เปิดรับสมัคร", draft: "ร่าง" };
const STATUS_COLOR: Record<CohortStatus, string> = { done: "#7fd6a3", open: "#f0c75a", draft: "#ffd76a" };

const GOLD_BD = "rgba(240,200,90,.38)";
const HEAD = "'Cormorant Garamond', Kanit";
const RED_BTN: React.CSSProperties = {
  minHeight: 44, padding: "0 16px", borderRadius: 12, fontSize: 13, fontWeight: 600,
  border: "1px solid rgba(245,210,110,.85)",
  background: "linear-gradient(100deg, #7e0a1e 0%, #c8102e 24%, #ff5068 50%, #c8102e 76%, #7e0a1e 100%)",
  boxShadow: "0 8px 24px rgba(255,40,70,.45)", color: "#fff", cursor: "pointer",
};
const CARD: React.CSSProperties = { padding: 14, borderRadius: 16, background: "#241717", border: `1px solid ${GOLD_BD}` };
const IN: React.CSSProperties = {
  height: 48, borderRadius: 12, border: `1px solid ${GOLD_BD}`, background: "#21191a", color: "#f6efe4",
  padding: "0 14px", fontSize: 14, boxSizing: "border-box", width: "100%", fontFamily: "inherit",
};
const LBL: React.CSSProperties = { fontSize: 12, color: "#cdbfb3", margin: "0 0 6px" };

export function CohortsClient({ initialCohorts, initialMembers }: { initialCohorts: Cohort[]; initialMembers: Member[] }) {
  const [cohorts, setCohorts] = useState(initialCohorts);
  const [members, setMembers] = useState(initialMembers);
  const [sel, setSel] = useState(() => {
    const i = initialCohorts.findIndex((c) => c.status === "open");
    return i < 0 ? 0 : i;
  });
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: `กลุ่ม ${initialCohorts.length + 1}`, date_text: "รอประกาศ", venue: "MB Studio ทองหล่อ", sessions: "5", capacity: "50" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const cur = cohorts[sel];
  const sessions = cur?.sessions ?? 5;
  const rows = useMemo(() => members.filter((m) => m.cohort === cur?.key), [members, cur?.key]);
  const present = rows.reduce((s, m) => s + Array.from({ length: sessions }, (_, i) => (m.att[i + 1] ? 1 : 0) as number).reduce((a, b) => a + b, 0), 0);
  // รอบล่าสุด = รอบถัดจากรอบสุดท้ายที่มีคนมาแล้ว (ยังไม่มีใครมา = รอบ 1)
  const lastWithAny = Array.from({ length: sessions }, (_, i) => i + 1).filter((s) => rows.some((m) => m.att[s])).pop() ?? 0;
  const latest = Math.min(sessions, lastWithAny + 1);

  const setAtt = (ids: string[], session: number, v: boolean) =>
    setMembers((ms) => ms.map((m) => (ids.includes(m.id) ? { ...m, att: { ...m.att, [session]: v } } : m)));

  async function toggle(m: Member, session: number) {
    const v = !m.att[session];
    const prev = !!m.att[session];
    setAtt([m.id], session, v);
    const r = await fetch("/api/admin/cohorts/attendance", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ applicant_id: m.id, session, present: v }) }).catch(() => null);
    if (!r?.ok) { setAtt([m.id], session, prev); setErr("บันทึกเช็กชื่อไม่สำเร็จ"); }
  }

  async function markAll() {
    if (!cur || !rows.length) return;
    const snapshot = members;
    setAtt(rows.map((m) => m.id), latest, true);
    const r = await fetch("/api/admin/cohorts/attendance", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ cohort: cur.key, session: latest, present: true }) }).catch(() => null);
    if (!r?.ok) { setMembers(snapshot); setErr("บันทึกเช็กชื่อไม่สำเร็จ"); }
  }

  async function create() {
    if (!form.name.trim()) { setErr("กรอกชื่อกลุ่ม"); return; }
    setBusy(true); setErr("");
    const r = await fetch("/api/admin/cohorts", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...form, sessions: Number(form.sessions), capacity: Number(form.capacity) }) }).catch(() => null);
    const j = r ? await r.json().catch(() => null) : null;
    setBusy(false);
    if (!j?.ok) { setErr(j?.error ?? "สร้างกลุ่มไม่สำเร็จ"); return; }
    setCohorts((cs) => [...cs, j.cohort]);
    setSel(cohorts.length);
    setCreating(false);
    setForm((f) => ({ ...f, name: `กลุ่ม ${cohorts.length + 2}` }));
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18, color: "#f6efe4", fontFamily: "'Cormorant Garamond', 'IBM Plex Sans Thai', sans-serif", fontVariantNumeric: "lining-nums" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: 2.5, color: "#f0c75a", fontWeight: 600 }}>COHORTS</div>
          <h1 style={{ margin: "2px 0 0", fontFamily: HEAD, fontWeight: 700, fontSize: 26 }}>กลุ่มอบรม Part-Time</h1>
        </div>
        <button type="button" onClick={() => setCreating((c) => !c)} style={RED_BTN}>{creating ? "ปิด" : "สร้างกลุ่มใหม่"}</button>
      </div>

      {err && <p role="alert" style={{ margin: 0, fontSize: 12, color: "#ff8a9a" }}>{err}</p>}

      {creating && (
        <div style={{ ...CARD, display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr)) auto", gap: 12, alignItems: "end" }}>
          <label><p style={LBL}>ชื่อกลุ่ม</p><input style={IN} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
          <label><p style={LBL}>วันเริ่ม</p><input style={IN} value={form.date_text} onChange={(e) => setForm({ ...form, date_text: e.target.value })} /></label>
          <label><p style={LBL}>สถานที่</p><input style={IN} value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} /></label>
          <div>
            <p style={LBL}>จำนวนรอบ / ที่นั่ง</p>
            <div style={{ ...IN, display: "flex", alignItems: "center", gap: 6, padding: "0 10px" }}>
              <input aria-label="จำนวนรอบ" type="number" min={1} max={10} value={form.sessions} onChange={(e) => setForm({ ...form, sessions: e.target.value })} style={{ width: 36, background: "transparent", border: 0, color: "inherit", fontSize: 14, fontFamily: "inherit" }} />
              <span>รอบ ·</span>
              <input aria-label="จำนวนที่นั่ง" type="number" min={1} max={500} value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} style={{ width: 44, background: "transparent", border: 0, color: "inherit", fontSize: 14, fontFamily: "inherit" }} />
              <span>ที่</span>
            </div>
          </div>
          <button type="button" disabled={busy} onClick={create} style={{ ...RED_BTN, height: 48, opacity: busy ? 0.6 : 1 }}>{busy ? "กำลังบันทึก…" : "บันทึกกลุ่ม"}</button>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "340px minmax(0,1fr)", gap: 16, minHeight: 0, flex: 1 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {cohorts.map((c, i) => {
            const n = members.filter((m) => m.cohort === c.key).length;
            const on = sel === i;
            const sc = STATUS_COLOR[c.status] ?? "#f0c75a";
            const meta = [c.date_text, c.venue].filter(Boolean).join(" · ");
            return (
              <button key={c.key} type="button" onClick={() => setSel(i)} aria-pressed={on}
                style={{ textAlign: "left", padding: 14, borderRadius: 16, background: on ? "rgba(176,24,44,.16)" : "#241717", border: `1px solid ${on ? "rgba(201,40,61,.55)" : GOLD_BD}`, color: "#f6efe4", display: "flex", flexDirection: "column", gap: 6, minHeight: 44, cursor: "pointer", fontFamily: "inherit" }}>
                <div style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
                  <span style={{ fontFamily: HEAD, fontWeight: 600, fontSize: 16 }}>{c.name}</span>
                  <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 99, border: `1px solid ${sc}`, color: sc }}>{STATUS_LABEL[c.status] ?? c.status}</span>
                </div>
                <span style={{ fontSize: 12, color: "#cdbfb3" }}>{meta || "วันอบรมรอประกาศ"}</span>
                <div style={{ height: 6, borderRadius: 99, background: "#21191a", width: "100%" }}>
                  <div style={{ height: 6, borderRadius: 99, background: "#f0c75a", width: `${Math.min(100, Math.round((n / Math.max(1, c.capacity)) * 100))}%` }} />
                </div>
                <span style={{ fontSize: 11.5, color: "#ffd76a" }}>{n} / {c.capacity} ที่นั่ง</span>
              </button>
            );
          })}
        </div>

        <div style={{ ...CARD, display: "flex", flexDirection: "column", gap: 12, minWidth: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontFamily: HEAD, fontWeight: 600, fontSize: 18 }}>เช็กชื่อ · {cur?.name ?? "-"}</div>
              <div style={{ fontSize: 12, color: "#cdbfb3" }}>แตะช่องเพื่อสลับ มา / ขาด · เข้าร่วม {present} จาก {rows.length * sessions} ช่อง</div>
            </div>
            <button type="button" onClick={markAll} disabled={!rows.length}
              style={{ minHeight: 44, padding: "0 16px", borderRadius: 12, fontSize: 13, fontWeight: 600, border: `1px solid ${GOLD_BD}`, background: "#241717", color: "#ffd76a", cursor: "pointer", fontFamily: "inherit", opacity: rows.length ? 1 : 0.5 }}>
              เช็กชื่อทั้งหมดรอบล่าสุด
            </button>
          </div>
          <div style={{ overflowX: "auto" }}>
            <div style={{ display: "grid", gridTemplateColumns: `1.6fr 1fr repeat(${sessions}, 64px) 90px`, gap: 6, fontSize: 12, color: "#cdbfb3", padding: "0 4px", marginBottom: 6 }}>
              <span>ชื่อ</span><span>รหัส</span>
              {Array.from({ length: sessions }, (_, i) => <span key={i}>รอบ {i + 1}</span>)}
              <span>รวม</span>
            </div>
            {rows.length === 0 && <p style={{ fontSize: 13, color: "#7d6d6a", padding: "12px 4px", borderTop: `1px solid ${GOLD_BD}`, margin: 0 }}>ยังไม่มีผู้สมัครในกลุ่มนี้ — จัดกลุ่มได้ที่หน้าผู้สมัคร</p>}
            {rows.map((m) => {
              const tot = Array.from({ length: sessions }, (_, i) => m.att[i + 1]).filter(Boolean).length;
              return (
                <div key={m.id} style={{ display: "grid", gridTemplateColumns: `1.6fr 1fr repeat(${sessions}, 64px) 90px`, gap: 6, alignItems: "center", padding: 4, borderTop: `1px solid ${GOLD_BD}`, fontSize: 13 }}>
                  <span>{m.name}</span>
                  <span style={{ color: "#cdbfb3", fontFamily: HEAD }}>{m.code}</span>
                  {Array.from({ length: sessions }, (_, i) => {
                    const v = !!m.att[i + 1];
                    return (
                      <button key={i} type="button" onClick={() => toggle(m, i + 1)} aria-label={`${m.name} รอบ ${i + 1}`} aria-pressed={v}
                        style={{ height: 44, borderRadius: 10, border: `1px solid ${v ? "rgba(60,170,110,.5)" : GOLD_BD}`, background: v ? "rgba(60,170,110,.14)" : "#21191a", color: v ? "#7fd6a3" : "#7d6d6a", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
                        {v ? "มา" : "ขาด"}
                      </button>
                    );
                  })}
                  <span style={{ color: tot === sessions ? "#7fd6a3" : "#ffd76a", fontFamily: HEAD }}>{tot} / {sessions}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
