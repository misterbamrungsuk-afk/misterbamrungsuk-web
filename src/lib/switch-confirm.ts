// หน้ายืนยันก่อนสลับบัญชีจากลิงก์ (กันคนส่งลิงก์ของตัวเองมาให้กด แล้วเครื่องเราถูกสลับไปบัญชีเขาโดยไม่รู้ตัว)
// ใช้เมื่อเครื่องนี้ล็อกอินบัญชีอื่นอยู่แล้วเท่านั้น — เครื่องใหม่เข้าได้ทันทีเหมือนเดิม
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

export function switchPage(action: string, fields: Record<string, string>, who: string, current: string) {
  const inputs = Object.entries(fields).map(([k, v]) => `<input type="hidden" name="${esc(k)}" value="${esc(v)}">`).join("");
  const html = `<!doctype html><html lang="th"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>ยืนยันการสลับบัญชี</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#171211;color:#f3ead9;font-family:system-ui,'Noto Sans Thai',sans-serif;padding:16px}main{max-width:380px;width:100%;background:#211a18;border:1px solid rgba(232,196,114,.45);border-radius:20px;padding:22px;display:flex;flex-direction:column;gap:12px}h1{margin:0;font-size:20px}p{margin:0;color:#d9c9b4;font-size:15px;line-height:1.6}b{color:#e8c472}button,a{height:48px;border-radius:14px;font-size:16px;font-weight:600;display:grid;place-items:center;text-decoration:none}button{border:0;background:#e8c472;color:#1b130b;width:100%;cursor:pointer}a{border:1px solid rgba(243,234,217,.2);color:#f3ead9}</style></head>
<body><main><h1>สลับบัญชี?</h1><p>เครื่องนี้เข้าสู่ระบบ <b>${esc(current)}</b> อยู่ ลิงก์นี้จะเปลี่ยนเป็น <b>${esc(who)}</b></p><p>ถ้าคุณไม่ได้ขอลิงก์นี้เอง ให้กด "ยกเลิก"</p>
<form method="post" action="${esc(action)}">${inputs}<button type="submit">ยืนยัน เปลี่ยนบัญชี</button></form><a href="/">ยกเลิก</a></main></body></html>`;
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Frame-Options": "DENY" } });
}

/** POST ยืนยัน ต้องมาจากหน้าของเว็บเราเอง */
export function sameOrigin(req: Request) {
  const o = req.headers.get("origin");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (!o) return req.headers.get("sec-fetch-site") !== "cross-site";
  try { return new URL(o).host === host; } catch { return false; }
}
