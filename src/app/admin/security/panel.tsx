"use client";

import { useState } from "react";
import type { SecurityStatus } from "@/lib/admin-mfa";
import { ROLE_LABEL } from "@/lib/admin-auth";
import { Card, Pill } from "../admin-nav";
import { FlashMsg, useConfirm, useFlash } from "../confirm";

const inp = "h-11 px-3 rounded-xl border border-[rgba(240,200,90,.38)] bg-[#130e0e] text-[#f6efe4] outline-none focus:border-[#f0c75a]";
const btn = "h-11 px-5 rounded-full font-semibold text-[#1a1206] disabled:opacity-60";
const ghost = "h-11 px-5 rounded-full border border-[rgba(240,200,90,.38)] text-[#d3c7bc] disabled:opacity-60";
const gold = { background: "#f0c75a" };
const fmt = (d: string | null) => (d ? new Date(d).toLocaleString("th-TH", { timeZone: "Asia/Bangkok" }) : "-");

type Resp = { ok?: boolean; error?: string; secret?: string; uri?: string; qr?: string | null; recovery?: string[]; enforce?: boolean };
async function call(body: Record<string, unknown>) {
  const res = await fetch("/api/admin/security", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const data = (await res.json().catch(() => ({}))) as Resp;
  return { res, data };
}

function CodeInput({ value, onChange, recovery = false }: { value: string; onChange: (v: string) => void; recovery?: boolean }) {
  return recovery
    ? <input aria-label="รหัส 6 หลัก หรือรหัสกู้คืน" autoComplete="off" value={value} onChange={(e) => onChange(e.target.value)} placeholder="รหัส 6 หลัก หรือรหัสกู้คืน" className={`${inp} w-full sm:w-[240px]`} />
    : <input aria-label="รหัส 6 หลัก" inputMode="numeric" maxLength={6} autoComplete="one-time-code" value={value} onChange={(e) => onChange(e.target.value.replace(/\D/g, ""))} placeholder="000000" className={`${inp} w-[150px] tracking-[0.35em] text-lg`} />;
}

export function SecurityPanel({ initial, required }: { initial: SecurityStatus; required: boolean }) {
  const [st, setSt] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [setup, setSetup] = useState<{ secret: string; uri: string; qr: string | null } | null>(null);
  const [codes, setCodes] = useState<string[] | null>(null);
  const [code, setCode] = useState("");
  const [code2, setCode2] = useState("");
  const { msg, fromRes, flash } = useFlash(6000);
  const [confirmUi, ask] = useConfirm();

  const refresh = async () => {
    const r = await fetch("/api/admin/security", { cache: "no-store" });
    if (r.ok) setSt(await r.json());
  };
  const run = async (body: Record<string, unknown>, okText: string, after?: (d: Resp) => void) => {
    setBusy(true);
    try {
      const { res, data } = await call(body);
      if (!res.ok || !data.ok) { fromRes(res, data.error || "ทำรายการไม่สำเร็จ", false); return false; }
      after?.(data);
      if (okText) flash(okText, { ok: true });
      await refresh();
      return true;
    } catch {
      flash("เชื่อมต่อไม่ได้ ลองใหม่อีกครั้ง", { ok: false });
      return false;
    } finally {
      setBusy(false);
    }
  };
  // ผ่าน 2 ชั้นแล้วตอนถูกบังคับ → กลับไปใช้งานหน้าอื่นได้
  const leave = () => { if (required || st.enforce) window.location.href = "/admin"; };

  const needStepUp = st.enrolled && !st.mfa_session;
  const blocked = (st.enforce || required) && !st.mfa_session && !st.mfa_off;

  return (
    <div className="flex flex-col gap-4 max-w-[760px]">
      {confirmUi}
      {st.mfa_off && <p role="alert" className="rounded-2xl border border-crimson-500 bg-crimson-500/10 px-4 py-3 text-sm">ตอนนี้ปิดระบบ 2 ชั้นชั่วคราวทั้งระบบ (ADMIN_MFA_OFF=1 ใน env) — เข้าสู่ระบบด้วยรหัสผ่านอย่างเดียว · ลบค่านี้ออกเมื่อแก้ปัญหาเสร็จ</p>}
      {blocked && (
        <p role="alert" className="rounded-2xl border border-gold-500 bg-[rgba(240,200,90,.08)] px-4 py-3 text-sm text-[#f6efe4]">
          {st.enrolled ? "ใส่รหัส 6 หลักจากแอปเพื่อยืนยันตัวตน แล้วจึงใช้งานหน้าอื่นได้" : "ระบบบังคับให้ทุกบัญชีแอดมินตั้งค่ายืนยันตัวตน 2 ชั้น · ตั้งค่าให้เสร็จก่อนจึงใช้งานหน้าอื่นได้"}
        </p>
      )}
      <FlashMsg msg={msg} />

      <Card className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <b className="text-[16px]">ยืนยันตัวตน 2 ชั้น</b>
          {st.enrolled ? <Pill tone="green">เปิดอยู่</Pill> : <Pill tone="muted">ยังไม่เปิด</Pill>}
          <span className="ml-auto text-xs text-[#9a8a85] truncate">{st.email} · {ROLE_LABEL[st.role]}</span>
        </div>

        {!st.enrolled && !setup && !codes && (
          <>
            <p className="text-sm text-[#d3c7bc]">ใช้แอป Google Authenticator, Microsoft Authenticator หรือแอปที่รองรับรหัสตามเวลา · เข้าสู่ระบบครั้งต่อไปต้องใส่รหัส 6 หลักจากแอปด้วย</p>
            <div>
              <button disabled={busy} className={btn} style={gold} onClick={() => run({ action: "start" }, "", (d) => { setSetup({ secret: d.secret ?? "", uri: d.uri ?? "", qr: d.qr ?? null }); setCode(""); })}>เริ่มตั้งค่า</button>
            </div>
          </>
        )}

        {setup && !codes && (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-[#d3c7bc]">1) เปิดแอป Authenticator แล้วสแกน QR นี้ (หรือพิมพ์รหัสลับด้านล่างเอง)</p>
            <div className="flex flex-wrap gap-4 items-start">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {setup.qr && <img src={setup.qr} alt="QR สำหรับแอป Authenticator" width={200} height={200} className="rounded-xl bg-white p-2" />}
              <div className="min-w-0 flex-1 flex flex-col gap-1 text-sm">
                <span className="text-[#cdbfb3]">รหัสลับ (พิมพ์เองในแอป · เลือกแบบ &quot;ตามเวลา&quot;)</span>
                <code className="break-all text-[15px] tracking-wider text-[#ffd76a] select-all">{setup.secret.replace(/(.{4})/g, "$1 ").trim()}</code>
                <details className="text-xs text-[#9a8a85]">
                  <summary className="cursor-pointer">ลิงก์ otpauth://</summary>
                  <code className="break-all select-all">{setup.uri}</code>
                </details>
              </div>
            </div>
            <p className="text-sm text-[#d3c7bc]">2) ใส่รหัส 6 หลักที่แอปแสดงเพื่อยืนยัน</p>
            <div className="flex flex-wrap gap-2">
              <CodeInput value={code} onChange={setCode} />
              <button disabled={busy || code.length !== 6} className={btn} style={gold} onClick={() => run({ action: "confirm", code }, "เปิดยืนยันตัวตน 2 ชั้นแล้ว", (d) => { setCodes(d.recovery ?? []); setSetup(null); setCode(""); })}>ยืนยันและเปิดใช้</button>
              <button disabled={busy} className={ghost} onClick={() => { setSetup(null); setCode(""); }}>ยกเลิก</button>
            </div>
          </div>
        )}

        {codes && (
          <div className="flex flex-col gap-3 rounded-xl border border-gold-500 p-3">
            <b className="text-[#ffd76a]">รหัสกู้คืน {codes.length} ชุด — แสดงครั้งเดียวเท่านั้น</b>
            <p className="text-sm text-[#d3c7bc]">จดหรือเก็บไว้ที่ปลอดภัย (ไม่ใช่ในโทรศัพท์เครื่องเดียวกับแอป) · ใช้แทนรหัส 6 หลักได้ชุดละ 1 ครั้ง ตอนโทรศัพท์หาย</p>
            <ol className="grid grid-cols-2 gap-x-6 gap-y-1 font-mono text-[15px] list-decimal pl-6">{codes.map((c) => <li key={c} className="select-all">{c}</li>)}</ol>
            <div className="flex flex-wrap gap-2">
              <button className={ghost} onClick={() => { navigator.clipboard?.writeText(codes.join("\n")).then(() => flash("คัดลอกแล้ว", { ok: true }), () => flash("คัดลอกไม่ได้ จดจากหน้าจอแทน", { ok: false })); }}>คัดลอกทั้งหมด</button>
              <button className={btn} style={gold} onClick={() => { setCodes(null); leave(); }}>เก็บรหัสแล้ว</button>
            </div>
          </div>
        )}

        {needStepUp && !codes && (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-[#d3c7bc]">เซสชันนี้ยังไม่ได้ยืนยันด้วยรหัส 2 ชั้น · ใส่รหัส 6 หลัก (หรือรหัสกู้คืน)</p>
            <div className="flex flex-wrap gap-2">
              <CodeInput value={code2} onChange={setCode2} recovery />
              <button disabled={busy || !code2} className={btn} style={gold} onClick={() => run({ action: "stepup", code: code2 }, "ยืนยันแล้ว", () => { setCode2(""); leave(); })}>ยืนยัน</button>
            </div>
          </div>
        )}

        {st.enrolled && !codes && (
          <div className="flex flex-col gap-3 text-sm">
            <p className="text-[#d3c7bc]">เปิดเมื่อ {fmt(st.enabled_at)} · รหัสกู้คืนเหลือ <b className={st.recovery_left <= 2 ? "text-[#fca5a5]" : "text-[#f6efe4]"}>{st.recovery_left}</b> ชุด</p>
            {st.broken && <p role="alert" className="text-[#fca5a5]">อ่านรหัสลับไม่ได้ (ADMIN_SESSION_SECRET ถูกเปลี่ยน) — ใช้รหัสกู้คืน หรือให้ CEO ล้าง 2 ชั้นแล้วตั้งใหม่</p>}
            <div className="flex flex-wrap gap-2 items-center">
              <CodeInput value={code} onChange={setCode} recovery />
              <button disabled={busy || !/^\d{6}$/.test(code)} className={ghost} onClick={async () => {
                if (!(await ask({ title: "สร้างรหัสกู้คืนชุดใหม่?", body: "รหัสกู้คืนชุดเดิมทั้งหมดจะใช้ไม่ได้ทันที", ok: "สร้างใหม่" }))) return;
                await run({ action: "recovery", code }, "สร้างรหัสกู้คืนชุดใหม่แล้ว", (d) => { setCodes(d.recovery ?? []); setCode(""); });
              }}>สร้างรหัสกู้คืนใหม่</button>
              <button disabled={busy || !code} className="h-11 px-5 rounded-full border border-crimson-500 text-crimson-200 disabled:opacity-60" onClick={async () => {
                if (!(await ask({ title: "ปิดยืนยันตัวตน 2 ชั้น?", body: st.enforce ? "ระบบเปิดบังคับอยู่ — ปิดแล้วต้องตั้งค่าใหม่ทันทีจึงจะใช้งานต่อได้" : "เข้าสู่ระบบครั้งต่อไปใช้รหัสผ่านอย่างเดียว (ปลอดภัยน้อยลง)", ok: "ปิด 2 ชั้น", danger: true }))) return;
                await run({ action: "disable", code }, "ปิดยืนยันตัวตน 2 ชั้นแล้ว", () => setCode(""));
              }}>ปิด 2 ชั้น</button>
            </div>
            <p className="text-xs text-[#9a8a85]">สร้างรหัสกู้คืนใหม่ต้องใช้รหัส 6 หลักจากแอป · ปิด 2 ชั้นใช้รหัส 6 หลักหรือรหัสกู้คืนก็ได้</p>
          </div>
        )}
      </Card>

      {st.role === "ceo" && (
        <Card className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <b className="text-[16px]">บังคับทุกบัญชีแอดมินใช้ 2 ชั้น</b>
            {st.enforce ? <Pill tone="green">เปิดบังคับ</Pill> : <Pill tone="muted">ไม่บังคับ</Pill>}
          </div>
          <p className="text-sm text-[#d3c7bc]">เปิดแล้ว: แอดมินที่ยังไม่ตั้ง 2 ชั้นจะถูกพามาหน้านี้ทันทีหลังเข้าสู่ระบบ และใช้หน้าอื่นไม่ได้จนกว่าจะตั้งเสร็จ{st.policy_at ? ` · แก้ล่าสุด ${fmt(st.policy_at)} โดย ${st.policy_by ?? "-"}` : ""}</p>
          {!st.enforce && !st.mfa_session && <p className="text-xs text-[#fca5a5]">ต้องตั้ง 2 ชั้นของบัญชีคุณ และยืนยันรหัส 6 หลักในเซสชันนี้ก่อน จึงจะเปิดบังคับได้</p>}
          <div>
            <button disabled={busy || (!st.enforce && !st.mfa_session)} className={st.enforce ? ghost : btn} style={st.enforce ? undefined : gold} onClick={async () => {
              const on = !st.enforce;
              const left = (st.accounts ?? []).filter((a) => !a.enrolled).length;
              const ok = await ask(on
                ? { title: "เปิดบังคับ 2 ชั้นทุกบัญชี?", body: left ? `ยังมี ${left} บัญชีที่ไม่ได้ตั้ง — ต้องตั้งก่อนจึงใช้งานต่อได้` : "ทุกบัญชีตั้ง 2 ชั้นแล้ว", ok: "เปิดบังคับ" }
                : { title: "ปิดการบังคับ 2 ชั้น?", body: "บัญชีที่ตั้งไว้แล้วยังต้องใส่รหัส 6 หลักตอนเข้าสู่ระบบเหมือนเดิม", ok: "ปิดการบังคับ", danger: true });
              if (ok) await run({ action: "enforce", on }, on ? "เปิดบังคับ 2 ชั้นแล้ว" : "ปิดการบังคับแล้ว");
            }}>{st.enforce ? "ปิดการบังคับ" : "เปิดบังคับ"}</button>
          </div>
          {!!st.accounts?.length && (
            <div className="flex flex-col divide-y divide-[rgba(240,200,90,.2)] text-sm">
              {st.accounts.map((a) => (
                <div key={a.email} className="flex flex-wrap items-center gap-2 py-2">
                  <span className="min-w-0 flex-1 truncate">{a.email} <span className="text-[#9a8a85]">· {a.role ? ROLE_LABEL[a.role] : "ไม่อยู่ในรายชื่อแล้ว"}</span></span>
                  {a.enrolled ? <Pill tone="green">ตั้งแล้ว</Pill> : <Pill tone="red">ยังไม่ตั้ง</Pill>}
                  {a.enrolled && a.email !== st.email && (
                    <button disabled={busy || !st.mfa_session} className="text-xs text-crimson-200 min-h-9 px-2 disabled:opacity-50" onClick={async () => {
                      if (!(await ask({ title: `ล้าง 2 ชั้นของ ${a.email}?`, body: "ใช้เมื่อเจ้าของบัญชีทำโทรศัพท์หายและรหัสกู้คืนหมด · เขาต้องตั้งค่าใหม่เองหลังเข้าสู่ระบบ", ok: "ล้าง 2 ชั้น", danger: true }))) return;
                      await run({ action: "reset", email: a.email }, "ล้าง 2 ชั้นแล้ว");
                    }}>ล้าง 2 ชั้น</button>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
