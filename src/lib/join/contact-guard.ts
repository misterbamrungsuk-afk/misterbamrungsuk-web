// กันช่องทางติดต่อนอกแอปในข้อความที่ลูกค้าจะเห็น (เบอร์โทร / LINE / อีเมล / ลิงก์ / โซเชียล)
// ใช้ทั้งหน้าเว็บ (เตือนทันที) และ API (ปฏิเสธจริง) — ไฟล์นี้ต้องไม่พึ่งของฝั่งเซิร์ฟเวอร์
const PATTERNS = [
  /(?:\d[\s\-.]?){9,}/, // เบอร์โทร 9 หลักขึ้นไป (มีขีด/เว้นวรรคคั่นได้)
  /[๐-๙]{9,}/,
  /\bline\b|ไลน์|ไอดีไลน์|line\s*id|@\w{3,}/i,
  /[\w.+-]+@[\w-]+\.[\w.]+/,
  /https?:\/\/|www\.|\.com\b|\.co\b|\.me\b|lin\.ee/i,
  /facebook|instagram|\big\b|ig:|telegram|whatsapp|wechat|tiktok|เฟส|อินสตา|ติ๊กต็อก/i,
];

// เลี่ยงด้วยการสะกดเป็นคำ: เลขคำไทย/อังกฤษ → ตัวเลข (ยาวก่อนสั้น กัน "ศูนย์" ถูกตัดเป็น "ศูน")
const TH_NUM: [RegExp, string][] = [
  [/ศูนย์|ศูนย|ศูน/g, "0"], [/หนึ่ง|นึ่ง|นึง/g, "1"], [/สอง/g, "2"], [/สาม/g, "3"], [/สี่/g, "4"],
  [/ห้า/g, "5"], [/หก/g, "6"], [/เจ็ด/g, "7"], [/แปด/g, "8"], [/เก้า/g, "9"],
];
const EN_NUM: [RegExp, string][] = [
  [/\bzero\b/gi, "0"], [/\bone\b/gi, "1"], [/\btwo\b/gi, "2"], [/\bthree\b/gi, "3"], [/\bfour\b/gi, "4"],
  [/\bfive\b/gi, "5"], [/\bsix\b/gi, "6"], [/\bseven\b/gi, "7"], [/\beight\b/gi, "8"], [/\bnine\b/gi, "9"],
];
const THAI_DIGIT = "๐๑๒๓๔๕๖๗๘๙";

/** แปลงข้อความเป็นตัวเลขเท่าที่ทำได้ (คำ → เลข · O/o ติดเลข → 0 · I/l/i/| ติดเลข → 1) — ใช้ตรวจเบอร์ที่สะกดเลี่ยง */
export function digitize(s: string): string {
  let x = s.replace(/[๐-๙]/g, (d) => String(THAI_DIGIT.indexOf(d)));
  for (const [re, d] of EN_NUM) x = x.replace(re, d);
  for (const [re, d] of TH_NUM) x = x.replace(re, d);
  // ตัวอักษรหน้าตาเหมือนเลข — แปลงเฉพาะที่ติดกับตัวเลข (กันคำปกติอย่าง "hello" โดนแปลง)
  for (let i = 0; i < 6; i++) {
    const y = x.replace(/(\d)[oO]|[oO](?=\d)/g, (m) => m.replace(/[oO]/, "0")).replace(/(\d)[Il|i]|[Il|i](?=\d)/g, (m) => m.replace(/[Il|i]/, "1"));
    if (y === x) break;
    x = y;
  }
  return x;
}

/** เบอร์ไทย (ขึ้นต้น 0 หรือ +66) ที่ซ่อนด้วยคำ/ตัวอักษรคล้ายเลข — ตรวจเฉพาะเมื่อมีการแปลงเกิดขึ้นจริง (เวลา/วันที่ที่เป็นตัวเลขล้วนไม่โดน) */
function spelledPhone(s: string): boolean {
  const base = s.replace(/[๐-๙]/g, (d) => String(THAI_DIGIT.indexOf(d)));
  const d = digitize(s);
  if (d === base) return false;
  // ตัดตัวคั่นระหว่างตัวเลข (เว้นวรรค จุด ขีด ฯลฯ ไม่เกิน 3 ตัว)
  const joined = d.replace(/(\d)[\s.\-_,/\\*~:;()+​-‍﻿]{1,3}(?=\d)/g, "$1");
  return /(?:\+?66|0)\d{8,9}/.test(joined);
}

/** LINE ID / โดเมนที่สะกดเลี่ยง: "ลาย ไอดี", "ไลน์ ไอดี", "dot com", "ดอทคอม" — เทียบหลังตัดช่องว่าง/ตัวคั่น */
const SQUASH_RE = /ลายไอดี|ไอดีลาย|ไลน์?ไอดี|ไอดีไลน์?|แอดลาย|l[i1]neid|lineไอดี|ไลน์id|dot(com|net|me|co)|ดอ[ทต](คอม|เน็ต|เนต|มี)|จุดคอม/i;
const squash = (s: string) => s.toLowerCase().replace(/[\s._\-*/\\|~^'"`,:;()[\]{}​-‍﻿]+/g, "");

export const CONTACT_MSG = "ห้ามใส่เบอร์โทร / LINE / ช่องทางนอกแอป";
export const hasContact = (s: string) => PATTERNS.some((p) => p.test(s)) || SQUASH_RE.test(squash(s)) || spelledPhone(s);
