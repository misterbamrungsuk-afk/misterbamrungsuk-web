"use client";

import Link from "next/link";
import { useState } from "react";
import { LuxHeader } from "../hotels/venue-client";
import { SiteHeader } from "@/components/site-header";

// นโยบายร้านค้า — ตามบอร์ด Policy.dc.html (ร่าง · ข้อ [รอกำหนด] รอเจ้าของ/ทนายกำหนด)
type Tab = "returns" | "shipping" | "privacy";
const D: Record<Tab, [string, [string, string][]]> = {
  returns: ["คืนสินค้าได้เมื่อสินค้าเสียหาย ผิดรายการ หรือไม่ตรงตามที่สั่ง · สินค้าประเภทรับประทานที่เปิดใช้แล้วคืนไม่ได้ด้วยเหตุผลด้านสุขอนามัย", [
    ["ระยะเวลาแจ้งคืน", "แจ้งภายใน [รอกำหนด] วันนับจากวันที่ได้รับสินค้า\nพร้อมวิดีโอตอนเปิดกล่องและรูปสินค้า"],
    ["เงื่อนไขสินค้าที่คืนได้", "• สินค้าชำรุด แตก หรือหมดอายุ\n• ได้รับสินค้าผิดรายการหรือผิดจำนวน\n• ซีลยังไม่ถูกเปิด (กรณีเปลี่ยนใจ) [รอกำหนด]"],
    ["วิธีขอคืน", "1. ไปที่ \"ติดตามคำสั่งซื้อ\" แล้วกด \"แจ้งปัญหา\"\n2. แนบรูป/วิดีโอ\n3. ร้านและแอดมินตอบกลับภายใน [รอกำหนด] วันทำการ"],
    ["การคืนเงิน", "โอนคืนเข้าบัญชีผู้ซื้อภายใน [รอกำหนด] วันทำการหลังร้านรับสินค้าคืน · ค่าส่งคืน: [รอกำหนด]"],
  ]],
  shipping: ["จัดส่งทั่วประเทศ · แพ็กมิดชิดทุกออเดอร์ (กล่องสีพื้น ไม่ระบุชื่อสินค้าหรือชื่อร้านบนหน้ากล่อง)", [
    ["ระยะเวลาจัดส่ง", "ร้านแพ็กและส่งภายใน [รอกำหนด] วันทำการหลังแอดมินยืนยันสลิป\nขนส่งใช้เวลาประมาณ 1–3 วันทำการ"],
    ["ค่าจัดส่ง", "ค่าส่งมาตรฐาน ฿50 [รอกำหนด]\nส่งฟรีเมื่อซื้อครบ ฿1,500 [รอกำหนด]"],
    ["ขนส่งที่ใช้", "Flash Express · Kerry · ไปรษณีย์ไทย [รอกำหนด]\nเลขพัสดุจะส่งทาง SMS เมื่อร้านจัดส่ง"],
    ["พื้นที่ห่างไกล", "บางพื้นที่อาจมีค่าส่งเพิ่ม [รอกำหนด]"],
  ]],
  privacy: ["เราเก็บข้อมูลเท่าที่จำเป็นต่อการจัดส่งและติดต่อเรื่องคำสั่งซื้อ ตาม พ.ร.บ.คุ้มครองข้อมูลส่วนบุคคล (PDPA)", [
    ["ข้อมูลที่เก็บ", "ชื่อผู้รับ · ที่อยู่จัดส่ง · เบอร์มือถือ · รายการสั่งซื้อ · สลิปการโอน"],
    ["การแชร์ข้อมูล", "แชร์ชื่อ ที่อยู่ และเบอร์ให้ร้านค้าและบริษัทขนส่งเพื่อจัดส่งเท่านั้น · ไม่ขายข้อมูลให้บุคคลอื่น"],
    ["ระยะเวลาเก็บ", "เก็บไว้ [รอกำหนด] ปีตามกฎหมายบัญชี แล้วลบหรือทำให้ไม่ระบุตัวตน"],
    ["สิทธิของคุณ", "ขอดู แก้ไข หรือลบข้อมูลได้ที่ [อีเมล/ช่องทาง รอกำหนด]\nผู้ควบคุมข้อมูล: บริษัท [ชื่อบริษัท รอกำหนด]"],
  ]],
};
const T: [Tab, string][] = [["returns", "คืนสินค้า"], ["shipping", "การจัดส่ง"], ["privacy", "ความเป็นส่วนตัว"]];
const BD = "rgba(232,196,114,.38)";
const GHOST = "flex-1 h-12 rounded-[14px] bg-[#211a18] text-[#e8c472] text-[14px] font-semibold grid place-items-center no-underline";

export function PolicyTabs({ initial }: { initial: Tab }) {
  const [tab, setTab] = useState<Tab>(initial);
  const [open, setOpen] = useState<Record<number, boolean>>({ 0: true });
  const [intro, secs] = D[tab];
  return (
    <main className="min-h-dvh bg-[#171211] text-[#f3ead9] mb-v7 mb-c">
      <SiteHeader />
      <div className="max-w-[480px] mx-auto">
        <LuxHeader back="/market" eyebrow="POLICIES" title="นโยบายร้านค้า" />
        <div className="px-[18px] pt-3.5 pb-6 flex flex-col gap-3">
          <div role="tablist" className="flex gap-1 p-1 rounded-[14px] bg-[#211a18]" style={{ border: `1px solid ${BD}` }}>
            {T.map(([k, label]) => (
              <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => { setTab(k); setOpen({ 0: true }); }}
                className="flex-1 min-h-11 rounded-[10px] text-[13px] font-semibold" style={{ background: tab === k ? "#e8c472" : "transparent", color: tab === k ? "#1b130b" : "#d9c9b4" }}>{label}</button>
            ))}
          </div>
          <div className="p-3.5 rounded-2xl text-[12.5px] text-[#d9c9b4] leading-[1.6] bg-[#1d1712]" style={{ border: "1px solid rgba(227,195,92,.35)" }}>{intro}</div>
          {secs.map(([h, body], i) => {
            const on = !!open[i];
            return (
              <div key={tab + i} className="rounded-2xl bg-[#211a18] overflow-hidden" style={{ border: `1px solid ${BD}` }}>
                <button type="button" onClick={() => setOpen({ ...open, [i]: !on })} aria-expanded={on} className="w-full min-h-[52px] flex justify-between items-center gap-2.5 px-3.5 text-[#f3ead9] text-left text-[14px] font-semibold">
                  <span>{h}</span><span className="text-[#e8c472] text-[18px]">{on ? "−" : "+"}</span>
                </button>
                {on && <div className="px-3.5 pb-3.5 text-[13px] text-[#d9c9b4] leading-[1.75] whitespace-pre-line">{body}</div>}
              </div>
            );
          })}
          <div className="text-[11.5px] text-[#b5a596] leading-[1.6]">ปรับปรุงล่าสุด [รอกำหนด] · ร่างนี้ต้องให้ทนายตรวจก่อนเปิดใช้งาน</div>
          <div className="flex gap-2">
            <Link href="/orders/track" className={GHOST} style={{ border: `1px solid ${BD}` }}>ติดตามคำสั่งซื้อ</Link>
            <Link href="/market" className={GHOST} style={{ border: `1px solid ${BD}` }}>กลับ Marketplace</Link>
          </div>
        </div>
      </div>
    </main>
  );
}
