// กันช่องทางติดต่อนอกแอปในข้อความที่ลูกค้าจะเห็น (เบอร์โทร / LINE / อีเมล / ลิงก์ / โซเชียล)
// ใช้ทั้งหน้าเว็บ (เตือนทันที) และ API (ปฏิเสธจริง)
const PATTERNS = [
  /(?:\d[\s\-.]?){9,}/, // เบอร์โทร 9 หลักขึ้นไป (มีขีด/เว้นวรรคคั่นได้)
  /[๐-๙]{9,}/,
  /\bline\b|ไลน์|ไอดีไลน์|line\s*id|@\w{3,}/i,
  /[\w.+-]+@[\w-]+\.[\w.]+/,
  /https?:\/\/|www\.|\.com\b|\.co\b|\.me\b|lin\.ee/i,
  /facebook|instagram|\big\b|ig:|telegram|whatsapp|wechat|tiktok|เฟส|อินสตา|ติ๊กต็อก/i,
];
export const CONTACT_MSG = "ห้ามใส่เบอร์โทร / LINE / ช่องทางนอกแอป";
export const hasContact = (s: string) => PATTERNS.some((p) => p.test(s));
