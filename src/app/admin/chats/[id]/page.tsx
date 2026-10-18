import Link from "next/link";
import { notFound } from "next/navigation";
import { getBooking, listMessages } from "@/lib/bookings";
import { adminChatTags } from "@/lib/bookings/chat-manage";
import { PageHead } from "../../admin-nav";
import { WarnBox } from "./warn";

export const dynamic = "force-dynamic";
export const metadata = { title: "แชทของนัด — แอดมิน" };

const WHO = { customer: "ลูกค้า", parttime: "Part-Time", system: "ระบบ" } as const;

// บันทึกแชทเต็มของ 1 นัด (ทีมงานเท่านั้น) — ข้อความที่ถูกกันแสดงพร้อมเหตุผล (อีกฝ่ายไม่เคยเห็น)
// ผู้ใช้ยกเลิกการส่ง/ลบข้อความ/ลบกล่องแชท = ยังแสดงข้อความเดิมครบ พร้อมป้ายว่าทำอะไร (ใช้ตรวจข้อพิพาท)
export default async function ChatTranscript({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const b = await getBooking(id);
  if (!b) notFound();
  const ms = await listMessages(b.id, 0);
  const { tags, boxes } = await adminChatTags(b.id, ms).catch(() => ({ tags: new Map<number, string[]>(), boxes: [] as string[] }));
  const t = (s: string) => new Date(s).toLocaleString("th-TH", { timeZone: "Asia/Bangkok", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", second: "2-digit" });
  return (
    <>
      <PageHead title={`แชท ${b.code}`} sub={`${b.customer_name ?? ""} ${b.customer_email ?? ""} ↔ ${b.parttime_nick ?? ""} (${b.parttime_mb}) · สถานะ ${b.status} · ${ms.length} ข้อความ`} right={<Link href="/admin/chats" className="chip h-9 px-3.5 inline-flex items-center">← ทุกห้อง</Link>} />
      <div className="max-w-[760px] flex flex-col gap-2">
        <WarnBox bookingId={b.id} />
        {!!boxes.length && <div className="rounded-xl border border-ink-600 p-3 text-[12.5px] text-ink-300">ฝั่งผู้ใช้: {boxes.join(" · ")} · ทีมงานยังเห็นข้อความครบ</div>}
        {ms.map((m) => (
          <div key={m.id} className={`rounded-xl border p-3 text-[13.5px] ${m.blocked ? "border-crimson-500 bg-crimson-500/10" : m.sender_type === "system" ? "border-ink-600 bg-transparent text-ink-300" : "border-ink-600 bg-ink-800"}`}>
            <div className="flex justify-between gap-2 text-[11.5px] text-[#9a8a85] mb-1">
              <span className={m.sender_type === "customer" ? "text-sky-300" : m.sender_type === "parttime" ? "text-amber-300" : ""}>{WHO[m.sender_type]}</span>
              <span>{t(m.created_at)}{m.read_at ? " · อ่านแล้ว" : ""}</span>
            </div>
            <div className="whitespace-pre-wrap break-words">{m.body}</div>
            {m.blocked && <div className="mt-1 text-[12px] text-crimson-200">ถูกกัน · {m.flag?.startsWith("word:") ? `คำห้าม “${m.flag.slice(5)}”` : "ช่องทางติดต่อนอกแอป"} · อีกฝ่ายไม่เห็น</div>}
            {!!tags.get(m.id)?.length && <div className="mt-1.5 flex flex-wrap gap-1.5">{tags.get(m.id)!.map((x) => <span key={x} className="rounded-full border border-ink-600 px-2 py-0.5 text-[11.5px] text-amber-200">{x}</span>)}</div>}
          </div>
        ))}
        {!ms.length && <p className="text-ink-300">ยังไม่มีข้อความ</p>}
      </div>
    </>
  );
}
