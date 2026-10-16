/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { redirect } from "next/navigation";
import { currentCustomer } from "@/lib/customer/auth";
import { interestsFor, listMine } from "@/lib/posts";
import { getLivePeople, publicId } from "@/lib/home/live";
import { priceOf } from "@/lib/home/people";
import { ClosePost } from "./close";

export const dynamic = "force-dynamic";
export const metadata = { title: "คนที่สนใจ — Mister Bamrungsuk" };

const GOLD = "#e8c472";

// บอร์ด C-JobInterested "คนที่สนใจ" — เลือกเพื่อนแล้วไปหน้าจองตามปกติ · ปิดโพสต์ได้ทุกเมื่อ
export default async function InterestedPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const me = await currentCustomer();
  if (!me) redirect("/login");
  const { id } = await searchParams;
  const post = (await listMine(me.sub).catch(() => [])).find((p) => p.id === id);
  if (!post) redirect("/jobs");
  const [ints, people] = await Promise.all([interestsFor([post.id]).catch(() => []), getLivePeople().catch(() => [])]);
  const list = ints.map((i) => ({ i, p: people.find((x) => x.id === publicId(i.parttime_mb)) })).filter((r) => r.p);
  const open = post.status === "open" && Date.parse(post.expires_at) > Date.now();
  const left = Math.max(0, Math.round((Date.parse(post.expires_at) - Date.now()) / 3600_000));
  return (
    <div className="min-h-dvh pb-[110px]">
      <header className="flex items-center gap-3 h-[68px] px-4" style={{ background: "#251d1b" }}>
        <Link href="/jobs" aria-label="ย้อนกลับ" className="w-11 h-11 rounded-full bg-[#211a18] grid place-items-center text-[#f3ead9] hover:text-[#f3ead9]"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg></Link>
        <h1 className="m-0 flex-1 font-semibold text-[18px]">คนที่สนใจ · {list.length} คน</h1>
      </header>
      <main className="flex flex-col gap-4" style={{ padding: "20px 16px 0" }}>
        <div className="rounded-2xl bg-[#211a18]" style={{ padding: 16 }}>
          <div className="flex justify-between items-center gap-3"><span className="font-semibold">{post.activity} · {new Date(post.starts_at).toLocaleString("th-TH", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} · {post.hours} ชม.</span>
            <span className="text-[12px] font-semibold rounded-full shrink-0" style={{ padding: "2px 10px", background: open ? "rgba(29,159,77,.14)" : "rgba(243,234,217,.07)", color: open ? "#7fd6a3" : "#b5a596" }}>{open ? `เปิดอยู่ · ${left} ชม.` : "ปิดแล้ว"}</span></div>
          <div className="text-[13px] font-light text-[#d9c9b4]">{post.area}{post.note ? ` · ${post.note}` : ""}</div>
        </div>
        {!list.length && <p className="m-0 text-center text-[14px] text-[#d9c9b4]" style={{ padding: 20 }}>{open ? "ยังไม่มีเพื่อนกดสนใจ · เราแจ้งเตือนคุณทันทีเมื่อมีคนสนใจ" : "โพสต์นี้ปิดแล้ว"}</p>}
        {list.map(({ i, p }) => (
          <div key={i.parttime_id} className="rounded-2xl bg-[#211a18] flex gap-3 items-center" style={{ padding: 16 }}>
            <img src={p!.img} alt="" className="w-16 h-20 rounded-xl object-cover" style={{ objectPosition: p!.pos }} />
            <div className="flex-1 min-w-0"><div className="font-semibold">{p!.nick} <span className="text-[12px] font-light text-[#b5a596]">★ {p!.rating}</span></div>{i.message && <div className="text-[13px] font-light text-[#d9c9b4]">{i.message}</div>}<div className="font-semibold" style={{ color: GOLD }}>฿{priceOf(p!).toLocaleString("en-US")} / 3 ชม.</div></div>
            <Link href={`/book/${p!.id}`} className="min-h-10 px-[14px] rounded-full text-[13px] font-semibold grid place-items-center hover:text-[#e8c472]" style={{ background: "rgba(232,196,114,0.14)", color: GOLD }}>จอง</Link>
          </div>
        ))}
        <div className="text-center text-[12px] font-light text-[#b5a596]">เลือกเพื่อนแล้วไปหน้าจองตามปกติ · ปิดโพสต์ได้ทุกเมื่อ</div>
        {open && <ClosePost id={post.id} />}
      </main>
    </div>
  );
}
