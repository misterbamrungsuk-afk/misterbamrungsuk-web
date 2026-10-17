import { NextResponse } from "next/server";
import { marketAdmin } from "@/lib/market/admin";
import { signInvite } from "@/lib/market/vendor-auth";
import type { MarketSettings } from "@/lib/market/config";
import {
  deleteAccount, deleteBanner, deleteCategory, deletePromo, inviteAccount, saveBanner, saveCategory, saveFile, savePromo, saveSettings, setReviewHidden,
} from "@/lib/market/store";

export const runtime = "nodejs";

const ok = (data: Record<string, unknown> = {}) => NextResponse.json({ ok: true, ...data });
const bad = (error: string, status = 400) => NextResponse.json({ ok: false, error }, { status });
const optNum = (v: unknown) => (v === null || v === undefined || v === "" ? null : Number(v));

// จัดการข้อมูลรอง: categories | banners | promos | settings | reviews | accounts
// body JSON { op: "save" | "delete" | "invite", ... } — banners รับ multipart (ฟิลด์ + image) ได้
export async function POST(req: Request, { params }: { params: Promise<{ entity: string }> }) {
  const admin = await marketAdmin();
  if (!admin) return NextResponse.json({ ok: false }, { status: 401 });
  const { entity } = await params;
  let b: Record<string, unknown> = {};
  if ((req.headers.get("content-type") ?? "").includes("multipart/form-data")) {
    const fd = await req.formData().catch(() => null);
    if (!fd) return bad("ข้อมูลไม่ถูกต้อง");
    for (const [k, v] of fd.entries()) if (typeof v === "string") b[k] = v;
    const img = fd.get("image");
    if (img instanceof File && img.size) {
      const path = await saveFile("banners", img);
      if (!path) return bad("รูปต้องเป็น JPG/PNG/WebP ไม่เกิน 8MB");
      b.image = path;
    }
    if (b.active !== undefined) b.active = b.active === "1" || b.active === "true";
  } else b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const op = String(b.op ?? "save");
  const id = typeof b.id === "string" && b.id ? b.id : undefined;

  try {
    switch (entity) {
      case "categories":
        if (op === "delete" && id) return ok({ deleted: await deleteCategory(id) });
        if (!String(b.name ?? "").trim()) return bad("ใส่ชื่อหมวด");
        return ok({ category: await saveCategory({ id, name: String(b.name), slug: String(b.slug ?? ""), sort: Number(b.sort ?? 0) }) });
      case "banners":
        if (op === "delete" && id) return ok({ deleted: await deleteBanner(id) });
        if (!String(b.title ?? "").trim()) return bad("ใส่หัวข้อแบนเนอร์");
        // ลิงก์แบนเนอร์: https:// หรือ path ในเว็บ (/...) เท่านั้น — กัน javascript:
        if (b.link && !/^(https:\/\/|\/(?!\/))/.test(String(b.link))) return bad("ลิงก์ต้องขึ้นต้นด้วย https:// หรือ /");
        return ok({ banner: await saveBanner({ id, title: String(b.title), subtitle: String(b.subtitle ?? ""), image: String(b.image ?? ""), link: String(b.link ?? ""), sort: Number(b.sort ?? 0), active: b.active !== false }) });
      case "promos":
        if (op === "delete" && id) return ok({ deleted: await deletePromo(id) });
        return ok({
          promo: await savePromo({
            id, code: String(b.code ?? ""), kind: b.kind === "fixed" ? "fixed" : "percent", value: Number(b.value), min_spend: Number(b.min_spend ?? 0),
            expires_at: b.expires_at ? new Date(String(b.expires_at)).toISOString() : null, usage_limit: optNum(b.usage_limit), active: b.active !== false,
          }),
        });
      case "settings": {
        const patch: Partial<MarketSettings> = {};
        for (const k of ["shipping_fee", "free_threshold"] as const) if (k in b) {
          const n = optNum(b[k]);
          if (n != null && !(Number.isFinite(n) && n >= 0)) return bad("จำนวนเงินไม่ถูกต้อง");
          patch[k] = n;
        }
        for (const k of ["delivery_days", "policy_returns", "policy_shipping", "policy_privacy", "line_notify_url"] as const) if (k in b) patch[k] = String(b[k] ?? "").slice(0, 8000);
        if (patch.line_notify_url) {
          let host = "";
          try { const u = new URL(patch.line_notify_url); host = u.protocol === "https:" ? u.hostname : ""; } catch { /* ignore */ }
          if (!/(^|\.)(line\.me|script\.google\.com|script\.googleusercontent\.com|hooks\.slack\.com|discord\.com)$/.test(host)) return bad("hook URL ต้องเป็น https ของ LINE / Google Apps Script / Slack / Discord");
        }
        return ok({ settings: await saveSettings(patch) });
      }
      case "reviews":
        if (!id) return bad("ไม่พบรีวิว");
        return ok({ review: await setReviewHidden(id, b.hidden !== false) });
      case "accounts": {
        if (op === "delete" && id) return ok({ deleted: await deleteAccount(id) });
        const a = await inviteAccount(String(b.vendor_id ?? ""), String(b.email ?? ""));
        return ok({ account: { id: a.id, email: a.email, vendor_id: a.vendor_id }, invite: `/vendor/invite?t=${encodeURIComponent(signInvite(a))}` });
      }
      default:
        return bad("ไม่พบรายการ", 404);
    }
  } catch (e) {
    return bad((e as Error).message);
  }
}
