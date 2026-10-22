import { canResume } from "@/lib/join/resume";
import { fileHeaders } from "@/lib/file-guard";
import { getByMb, readFile } from "@/lib/join/store";

export const runtime = "nodejs";

// ผู้สมัครเปิดรูปของตัวเอง (รูปโปรไฟล์ / หน้าตรง / เต็มตัว) — ต้องเป็นเจ้าของรหัส และ path ต้องอยู่ในโฟลเดอร์ของใบสมัครนี้
const OK = /^[0-9a-f-]{36}\/(photo|other_doc|profile)(-\d+)?\.(jpg|jpeg|png|webp)$/;

export async function GET(req: Request) {
  const u = new URL(req.url);
  const mb = u.searchParams.get("mb") ?? "";
  const path = u.searchParams.get("path") ?? "";
  if (!/^MB[MT]?-\d{7,}$/.test(mb) || !OK.test(path) || !(await canResume(mb, u.searchParams.get("t")))) return new Response("forbidden", { status: 403 });
  const row = await getByMb(mb);
  if (!row || !path.startsWith(`${row.id}/`)) return new Response("forbidden", { status: 403 });
  const f = await readFile(path);
  if (!f) return new Response("not found", { status: 404 });
  return new Response(new Uint8Array(f.data), { headers: fileHeaders(f.type, "private, max-age=300") });
}
