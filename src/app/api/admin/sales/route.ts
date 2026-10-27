import { NextResponse } from "next/server";
import { fileHeaders } from "@/lib/file-guard";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, canAccess, verifySession } from "@/lib/admin-auth";
import { MemberError, approveSalesPayout, createExternalRep, creditMembership, rejectMembership, settleSalesPayout, signSalesLink, updateExternalRep } from "@/lib/member";
import { getPurchase, patchRep, findRep, listPayouts } from "@/lib/member/store";
import { getMemberSettings, saveMemberSettings, validateMember, TIER_IDS, type MemberSettings } from "@/lib/member/tiers";
import { readFile } from "@/lib/join/store";
import { issueSalesLogin } from "@/lib/member/recruit";
import { ApplyError, approveRecruitApp, rejectRecruitApp } from "@/lib/member/recruit-apply";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const admin = async () => { const s = await verifySession((await cookies()).get(ADMIN_COOKIE)?.value); return s && canAccess(s.role, "/admin/sales") ? s : null; };

// GET ?slip=<purchaseId> = รูปสลิปเปิดเมม
export async function GET(req: Request) {
  if (!(await admin())) return new Response("unauthorized", { status: 401 });
  const p = await getPurchase(new URL(req.url).searchParams.get("slip") ?? "");
  const f = p?.slip_path ? await readFile(p.slip_path) : null;
  if (!f) return new Response("not found", { status: 404 });
  return new Response(new Uint8Array(f.data), { headers: fileHeaders(f.type, "private, no-store") });
}

// แอดมิน: approve / reject (สลิปเปิดเมม) · rep_create / rep_toggle / rep_link · payout_paid / payout_failed
// CEO เท่านั้น: settings (ตัวเลขระดับ) · payout_approve / payout_reject (ค่าคอม Recruit ภายนอก)
export async function POST(req: Request) {
  const s = await admin();
  if (!s) return NextResponse.json({ ok: false }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const act = String(b.action ?? ""), id = String(b.id ?? ""), actor = `admin:${s.email}`;
  const ceoOnly = ["settings", "payout_approve", "payout_reject"];
  if (ceoOnly.includes(act) && s.role !== "ceo") return NextResponse.json({ ok: false, error: "เฉพาะ CEO" }, { status: 403 });
  try {
    if (act === "approve") return NextResponse.json({ ok: true, row: await creditMembership(id, actor) });
    if (act === "reject") return NextResponse.json({ ok: true, row: await rejectMembership(id, actor, String(b.reason ?? "")) });
    if (act === "rep_create") {
      // ต้องมีบัญชีรับค่าคอม (ธนาคาร + เลขบัญชี + ชื่อบัญชี) — ไม่งั้น Recruit ขอรับค่าคอมไม่ได้
      const r = await createExternalRep({ name: String(b.name ?? ""), phone: String(b.phone ?? ""), bank: b.bank }, s.email);
      return NextResponse.json({ ok: true, rep: r, link: `${new URL(req.url).origin}/recruit/go?t=${encodeURIComponent(signSalesLink(r.id))}` });
    }
    // ใบสมัคร Recruit (หน้า /recruit/apply): อนุมัติ = สร้าง Recruit + ID/รหัสผ่าน (แสดงครั้งเดียว) · ไม่อนุมัติต้องมีเหตุผล
    if (act === "app_approve") { const r = await approveRecruitApp(id, s.email, String(b.username ?? "") || undefined); return NextResponse.json({ ok: true, app: r.app, code: r.code, login: r.login, link: `${new URL(req.url).origin}/recruit` }); }
    if (act === "app_reject") return NextResponse.json({ ok: true, app: await rejectRecruitApp(id, s.email, String(b.reason ?? "")) });
    if (act === "rep_update") return NextResponse.json({ ok: true, rep: await updateExternalRep(id, { name: b.name, phone: b.phone, bank: b.bank }) });
    if (act === "rep_toggle") { const r = await findRep({ id }); if (!r) throw new MemberError("ไม่พบ Recruit"); return NextResponse.json({ ok: true, rep: await patchRep(id, { active: !r.active }) }); }
    if (act === "rep_link") { const r = await findRep({ id }); if (!r || r.kind !== "external") throw new MemberError("ไม่พบ Recruit"); return NextResponse.json({ ok: true, link: `${new URL(req.url).origin}/recruit/go?t=${encodeURIComponent(signSalesLink(r.id))}` }); }
    // ID / รหัสผ่านเข้าแดชบอร์ด (ทีมงานออกให้) — รหัสผ่านแสดงครั้งเดียว
    if (act === "rep_login") {
      const r = await findRep({ id });
      if (!r || r.kind !== "external") throw new MemberError("ไม่พบ Recruit");
      try { return NextResponse.json({ ok: true, login: await issueSalesLogin(r, String(b.username ?? ""), s.email) }); }
      catch (e) { throw new MemberError(e instanceof Error ? e.message : "ตั้ง ID ไม่สำเร็จ"); }
    }
    if (act === "payout_approve") return NextResponse.json({ ok: true, row: await approveSalesPayout(id, `ceo:${s.email}`) });
    if (act === "payout_reject") return NextResponse.json({ ok: true, row: await settleSalesPayout(id, `ceo:${s.email}`, false, String(b.note ?? "CEO ไม่อนุมัติ")) });
    if (act === "payout_paid") return NextResponse.json({ ok: true, row: await settleSalesPayout(id, actor, true) });
    if (act === "payout_failed") {
      if (!String(b.note ?? "").trim()) throw new MemberError("ระบุสาเหตุ");
      const cur = (await listPayouts()).find((x) => x.id === id);
      if (cur?.status === "requested" && s.role !== "ceo") return NextResponse.json({ ok: false, error: "คำขอนี้ยังรอ CEO — ปฏิเสธได้เฉพาะ CEO" }, { status: 403 });
      return NextResponse.json({ ok: true, row: await settleSalesPayout(id, actor, false, String(b.note)) });
    }
    if (act === "settings") {
      const m = b.member as Partial<MemberSettings> | undefined;
      const cur = await getMemberSettings();
      const num = (v: unknown, d: number) => (Number.isFinite(Number(v)) ? Number(v) : d);
      const next = {
        enabled: m?.enabled === undefined ? cur.enabled : !!m.enabled, boostMult: num(m?.boostMult, cur.boostMult), basePointsPer100: num(m?.basePointsPer100, cur.basePointsPer100),
        recruit: { A: Math.round(num((m?.recruit as Record<string, unknown> | undefined)?.A, cur.recruit.A)), B: Math.round(num((m?.recruit as Record<string, unknown> | undefined)?.B, cur.recruit.B)), free: Math.round(num((m?.recruit as Record<string, unknown> | undefined)?.free, cur.recruit.free)) },
        tiers: Object.fromEntries(TIER_IDS.map((k) => { const t = (m?.tiers?.[k] ?? {}) as Partial<MemberSettings["tiers"]["gold"]>; const c = cur.tiers[k]; return [k, { id: k, name: String(t.name ?? c.name).slice(0, 30), pay: num(t.pay, c.pay), credit: num(t.credit, c.credit), commission: num(t.commission, c.commission), pointsPer100: num(t.pointsPer100, c.pointsPer100) }]; })) as MemberSettings["tiers"],
      };
      const err = validateMember(next);
      if (err) return NextResponse.json({ ok: false, error: err }, { status: 400 });
      return NextResponse.json({ ok: true, member: await saveMemberSettings(next, s.email, String(b.note ?? "แก้ตั้งค่าเมมเบอร์").slice(0, 200)) });
    }
    return NextResponse.json({ ok: false, error: "action" }, { status: 400 });
  } catch (e) {
    if (e instanceof MemberError || e instanceof ApplyError) return NextResponse.json({ ok: false, error: e.message }, { status: 409 });
    console.error("admin sales", e);
    return NextResponse.json({ ok: false, error: "ระบบขัดข้อง" }, { status: 500 });
  }
}
