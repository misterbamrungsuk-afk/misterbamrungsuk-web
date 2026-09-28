// seed ข้อมูลเริ่มต้น: 26 หมวดบริการ (ใช้งานเมื่อผูก Supabase แล้ว)
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const CATEGORIES = [
  ["eat-travel", "กิน & เที่ยว", "Eat & Travel", "🍽️"],
  ["photographer", "ช่างภาพ", "Photographer", "📸"],
  ["workout", "ออกกำลังกาย", "Workout", "🏋️"],
  ["cafe", "คาเฟ่", "Cafe", "☕"],
  ["video-call", "วิดีโอคอล", "Video Call", "📹"],
  ["movie", "ดูหนัง", "Movies", "🎬"],
  ["chill", "นั่งชิล", "Chill", "🛋️"],
  ["shopping", "ช้อปปิ้ง", "Shopping", "🛍️"],
  ["consult", "ปรึกษา & รับฟัง", "Consulting", "💬"],
  ["language", "ฝึกภาษา", "Language", "🗣️"],
  ["event", "อีเวนต์", "Events", "🎪"],
  ["dharma", "ธรรมะ & ทำบุญ", "Temple", "🙏"],
  ["hospital", "พาไปหาหมอ", "Hospital Visit", "🏥"],
  ["elderly", "เพื่อนผู้สูงอายุ", "Elderly Care", "🧓"],
  ["errand", "ทำธุระ", "Errands", "📋"],
  ["content", "ทำคอนเทนต์", "Content Creator", "🎥"],
  ["gaming", "เล่นเกม", "Gaming", "🎮"],
  ["model", "ถ่ายแบบ", "Modeling", "✨"],
  ["camping", "แคมป์ปิ้ง", "Camping", "⛺"],
  ["upcountry", "ต่างจังหวัด", "Up-country", "🚗"],
  ["abroad", "ต่างประเทศ", "Travel Abroad", "✈️"],
  ["driver", "ขับรถ", "Driver", "🚙"],
  ["fortune", "ดูดวง", "Fortune Telling", "🔮"],
  ["musician", "นักดนตรี", "Musician", "🎸"],
  ["golf", "ตีกอล์ฟ", "Golf", "⛳"],
  ["caddy", "แคดดี้", "Caddy", "🏌️"],
  ["other", "อื่นๆ", "Other", "🌟"],
] as const;

async function main() {
  for (let i = 0; i < CATEGORIES.length; i++) {
    const [slug, th, en, emoji] = CATEGORIES[i];
    await prisma.category.upsert({ where: { slug }, update: { nameTh: th, nameEn: en, emoji, sortOrder: i }, create: { slug, nameTh: th, nameEn: en, emoji, sortOrder: i } });
  }
  // โค้ดโปรโมชันเริ่มต้น
  await prisma.promoCode.upsert({ where: { code: "HAMOO10" }, update: {}, create: { code: "HAMOO10", type: "percent", value: 10, quota: 100 } });
  await prisma.promoCode.upsert({ where: { code: "WELCOME50" }, update: {}, create: { code: "WELCOME50", type: "fixed", value: 50, quota: 50 } });
  console.log("✓ seeded categories + promo codes");
}

main().finally(() => prisma.$disconnect());
