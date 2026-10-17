// เซิร์ฟเวอร์ทดสอบแบบ production build (โหมดสาธิต · ข้อมูลในหน่วยความจำ ไม่แตะฐานจริง) — นิ่งและเร็วกว่า next dev สำหรับเทสคลิกทั้งระบบ
// ใช้: node e2e/demo-prod.js [port]   (build ครั้งแรก ~2–4 นาที · ตั้ง SKIP_BUILD=1 เพื่อใช้ build เดิม)
const path = require("path");
const { execFileSync, spawn } = require("child_process");
const WEB = path.join(__dirname, "..");
for (const k of ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "NEXT_PUBLIC_SUPABASE_URL", "GOOGLE_SHEETS_WEBHOOK_URL", "GOOGLE_SHEETS_WEBHOOK_TOKEN", "RESEND_API_KEY", "SLIP2GO_API_SECRET", "THAIBULKSMS_API_KEY", "THAIBULKSMS_API_SECRET", "TURNSTILE_SECRET_KEY", "NEXT_PUBLIC_TURNSTILE_SITE_KEY", "VERCEL_OIDC_TOKEN", "VAPID_PRIVATE_KEY", "VAPID_PUBLIC_KEY", "VERCEL", "VERCEL_ENV"]) process.env[k] = "";
process.env.MB_LOCAL_HTTP = "1";
const port = process.argv[2] || "3300";
const next = path.join(WEB, "node_modules/next/dist/bin/next");
if (!process.env.SKIP_BUILD) execFileSync(process.execPath, [next, "build"], { cwd: WEB, stdio: "inherit", env: { ...process.env, NEXT_DIST_DIR: "" } });
spawn(process.execPath, [next, "start", "-p", port], { cwd: WEB, stdio: "inherit", env: process.env });
