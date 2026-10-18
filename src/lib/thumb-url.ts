// ต่อ ?w= ให้รูปจากเส้นทางสาธารณะของเรา (รูป Part-Time / โลโก้ / รูปสินค้า) — รูปอื่น (ไฟล์ใน /brand, ลิงก์นอก) คืนตามเดิม
// ใช้ได้ทั้งฝั่งเซิร์ฟเวอร์และเบราว์เซอร์ · ความกว้างที่เซิร์ฟเวอร์รับ: 240 / 480 / 960
export function sized(src: string, w: 240 | 480 | 960): string {
  if (!src || !/^\/api\/(public\/(pt-photo|avatar)|market\/image)\?/.test(src) || /[?&]w=/.test(src)) return src;
  return `${src}&w=${w}`;
}
