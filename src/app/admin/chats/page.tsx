import Link from "next/link";
import { listAll, recentMessages } from "@/lib/bookings";
import { getChatRules } from "@/lib/chat-guard";
import { PageHead } from "../admin-nav";
import { RulesForm } from "./rules-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "แชท · คำห้ามส่ง — แอดมิน" };

// แชทลูกค้า ↔ Part-Time ทั้งหมด (เก็บถาวร รวมข้อความที่ถูกกัน) · เรียงห้องที่มีข้อความล่าสุด · ห้องที่มีการฝ่าฝืนขึ้นก่อนเมื่อกรอง
export default async function ChatsPage({ searchParams }: { searchParams: Promise<{ f?: string }> }) {
  const { f } = await searchParams;
  const [msgs, bookings, rules] = await Promise.all([recentMessages(5000).catch(() => []), listAll(5000).catch(() => []), getChatRules()]);
  const byId = new Map(bookings.map((b) => [b.id, b]));
  const rooms = new Map<string, { n: number; blocked: number; last: string; preview: string }>();
  for (const m of msgs) {
    if (m.sender_type === "system") continue;
    const r = rooms.get(m.booking_id) ?? { n: 0, blocked: 0, last: m.created_at, preview: m.body };
    r.n++; if (m.blocked) r.blocked++;
    rooms.set(m.booking_id, r);
  }
  let list = [...rooms.entries()].map(([id, r]) => ({ id, ...r, b: byId.get(id) })).sort((a, b) => b.last.localeCompare(a.last));
  if (f === "flag") list = list.filter((r) => r.blocked > 0).sort((a, b) => b.blocked - a.blocked);
  const flagged = [...rooms.values()].filter((r) => r.blocked > 0).length;
  return (
    <>
      <PageHead title="แชท · คำห้ามส่ง" sub="ทุกข้อความถูกเก็บไว้ (รวมที่ถูกกัน) · ทีมงานเปิดอ่านได้เพื่อตรวจข้อพิพาท/ความปลอดภัย" />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px] items-start">
        <section className="flex flex-col gap-2">
          <div className="flex gap-2">
            <Link href="/admin/chats" className={`chip h-9 px-3.5 inline-flex items-center ${f !== "flag" ? "chip-red" : ""}`}>ทุกห้อง ({rooms.size})</Link>
            <Link href="/admin/chats?f=flag" className={`chip h-9 px-3.5 inline-flex items-center ${f === "flag" ? "chip-red" : ""}`}>มีข้อความต้องห้าม ({flagged})</Link>
          </div>
          {!list.length && <p className="rounded-2xl border border-ink-600 p-6 text-center text-ink-300">ยังไม่มีแชท</p>}
          {list.map((r) => (
            <Link key={r.id} href={`/admin/chats/${r.id}`} className="rounded-2xl border border-ink-600 hover:border-gold-500 p-3 flex gap-3 items-center">
              <div className="flex-1 min-w-0 text-[13.5px]">
                <div className="font-semibold">{r.b?.code ?? r.id.slice(0, 8)} · {r.b?.customer_email ?? "ลูกค้า"} ↔ {r.b?.parttime_nick ?? ""} ({r.b?.parttime_mb ?? ""})</div>
                <div className="text-ink-300 truncate">{r.preview}</div>
                <div className="text-[11.5px] text-[#9a8a85]">{new Date(r.last).toLocaleString("th-TH", { timeZone: "Asia/Bangkok" })} · {r.n} ข้อความ</div>
              </div>
              {r.blocked > 0 && <span className="shrink-0 rounded-full px-2.5 h-6 grid place-items-center text-[11px] font-semibold bg-crimson-500 text-white">ถูกกัน {r.blocked}</span>}
            </Link>
          ))}
        </section>
        <RulesForm words={rules.words} strikeLimit={rules.strikeLimit} edited={rules.history[0] ?? null} />
      </div>
    </>
  );
}
