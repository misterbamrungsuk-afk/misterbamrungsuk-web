// เซิร์ฟเวอร์โหมดสาธิต (localhost:3210) — ล้างคีย์ทุกบริการภายนอก → ข้อมูลอยู่ในหน่วยความจำ ไม่แตะฐานจริง
// ใช้: node e2e/demo-server.js   (หรือ npm run e2e จะเปิดให้เอง)
const path = require("path");
const WEB = path.join(__dirname, "..");
for (const k of ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "NEXT_PUBLIC_SUPABASE_URL", "GOOGLE_SHEETS_WEBHOOK_URL", "GOOGLE_SHEETS_WEBHOOK_TOKEN", "RESEND_API_KEY", "SLIP2GO_API_SECRET", "THAIBULKSMS_API_KEY", "THAIBULKSMS_API_SECRET", "TURNSTILE_SECRET_KEY", "NEXT_PUBLIC_TURNSTILE_SITE_KEY", "VERCEL_OIDC_TOKEN", "VAPID_PRIVATE_KEY", "VAPID_PUBLIC_KEY"]) process.env[k] = "";
// ชุดทดสอบเดิมเข้าหน้าลูกค้า/พาร์ทเนอร์ → เปิดเว็บเต็ม (ทดสอบโหมดรับสมัครอย่างเดียว: SITE_MODE=pt-only)
process.env.SITE_MODE ||= "full";
process.argv = [process.argv[0], path.join(WEB, "node_modules/next/dist/bin/next"), "dev", WEB, "-p", process.env.E2E_PORT || "3210"];
require(path.join(WEB, "node_modules/next/dist/bin/next"));
