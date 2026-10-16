// ช่อง CSV สำหรับเปิดใน Excel/Google Sheets — ครอบด้วย " และกันสูตร (CSV injection): ค่าที่ขึ้นต้น = + - @ tab CR ใส่ ' นำหน้า
// stripQuote: ตัด ' นำหน้าเดิมออกก่อน (ข้อมูลบางชุดใส่ไว้ให้ Sheets อ่านเลขเป็นข้อความ)
export function csvCell(v: unknown, stripQuote = false): string {
  let t = String(v ?? "");
  if (stripQuote) t = t.replace(/^'/, "");
  if (/^[=+\-@\t\r]/.test(t)) t = "'" + t;
  return `"${t.replace(/"/g, '""')}"`;
}
