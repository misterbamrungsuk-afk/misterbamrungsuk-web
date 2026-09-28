# HaMoo 🐷 — แพลตฟอร์มเพื่อนเช่า (Rent-a-Friend)

> "ทรง Hafriend + ความแน่น Nuaddee" — เว็บแอป mobile-first ธีมดำ-แดง-ทองหรูหรา
> ล็อกอิน Google · KYC · ฟีดโพสต์ 26 หมวด · Jobboard สองทาง · แชท + วงจรเงินในแอป (มัดจำ→สลิป→ยืนยัน→ค่าจ้าง→รีวิว) · เรียกด่วนจับคู่ 15 วิ · แผนที่ติดตาม LIVE · โทรในแอปซ่อนเบอร์ · แอดมิน 3-strike + รายได้ GP

## เริ่มต้น (โหมดสาธิต — ไม่ต้องตั้งค่าอะไรเลย)

```bash
cd web
npm install
npm run dev
```

เปิด http://localhost:3000 → กด "เข้าสู่ระบบด้วย Google" (โหมดสาธิตจะเข้าด้วยบัญชีตัวอย่าง) แล้วเที่ยวชมทุกหน้าได้เลย
ฟีเจอร์ที่ลองเล่นได้: ฟีด/ฟิลเตอร์, โพสต์รายคน, ประกาศงาน, **แชท room1 กดส่งมัดจำ→แนบสลิป→ยืนยัน→ส่งค่าจ้าง→รีวิว**, โค้ด `HAMOO10`, เรียกด่วน (นับ 15 วิ), แผนที่ LIVE, โทรซ่อนเบอร์, หน้าแอดมิน

## อัปเกรดเป็นระบบจริง (Supabase + Google Login)

1. สร้างโปรเจกต์ฟรีที่ [supabase.com](https://supabase.com)
2. **Authentication → Providers → Google**: เปิดใช้ แล้วใส่ Google Cloud OAuth Client ID/Secret (สร้างได้ฟรีที่ console.cloud.google.com → Credentials → OAuth client → Web application, Authorized redirect URL ใช้ตามที่ Supabase แสดง)
3. **SQL Editor**: รันทั้งหมดใน `supabase/setup.sql`
4. Project Settings → API และ Database คัดลอกค่ามาใส่:
   ```bash
   cp .env.example .env.local   # แล้วแก้ค่าให้ครบ
   ```
5. สร้างตาราง + ข้อมูลเริ่มต้น:
   ```bash
   npm run db:push    # สร้างตารางทั้งหมดจาก prisma/schema.prisma
   npm run db:seed    # 26 หมวดบริการ + โค้ดส่วนลด
   ```
6. รีสตาร์ท `npm run dev` — ระบบสลับเป็นโหมดจริงอัตโนมัติ

## โครงสร้าง

```
web/
├─ prisma/schema.prisma     # ฐานข้อมูลเต็มระบบ (25+ ตาราง)
├─ supabase/setup.sql       # storage buckets + RLS + realtime
├─ src/app/
│  ├─ login/                # Google login (demo ข้ามได้)
│  ├─ (app)/home            # ฟีดโพสต์ + 26 หมวด + ฟิลเตอร์
│  ├─ (app)/post/[id]       # โพสต์รายคน + รีวิว + รีพอร์ท
│  ├─ (app)/post/manage     # จัดการโพสต์ (1 โพสต์/บัญชี ต่ออายุ 30 วัน)
│  ├─ (app)/jobs            # Jobboard สองทาง + สนใจ + GPS
│  ├─ (app)/chat            # แชท + ตั้งค่า (auto-reply/saved/banks)
│  ├─ (app)/chat/[roomId]   # วงจรเงินในแชท + Order timeline + โปรโมชัน
│  ├─ (app)/matching        # เรียกด่วน บรอดแคสต์ 15 วิ
│  ├─ (app)/tracking/[id]   # แผนที่ติดตาม LIVE (Leaflet)
│  ├─ (app)/call/[roomId]   # โทรในแอปซ่อนเบอร์ (WebRTC)
│  ├─ (app)/profile/verify  # KYC บัตรประชาชน
│  └─ (app)/admin           # KYC/รีพอร์ท/3-strike/โปรโมชัน/GP
└─ src/lib/                 # data layer (demo↔live สลับอัตโนมัติ), i18n, หมวด/ธนาคาร
```

## เทคโนโลยี
Next.js 15 · TypeScript · Tailwind CSS 4 · Prisma + Supabase (Postgres/Auth/Storage/Realtime) · Leaflet · WebRTC

## Roadmap ต่อยอด
- [ ] เสียบ Omise (OPN) PromptPay จริงแทน QR จำลอง (`PaymentGatewayAdapter`)
- [ ] OTP SMS ยืนยันเบอร์มือถือ
- [ ] ระบบติดตาม GPS จริงผู้ให้บริการ (Supabase Realtime TrackingPoint)
- [ ] Deploy Vercel + โดเมน
