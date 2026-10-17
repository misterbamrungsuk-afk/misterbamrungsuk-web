import Link from "next/link";
import { redirect } from "next/navigation";
import { TopBar } from "@/components/shell";
import { currentCustomer } from "@/lib/customer/auth";
import { interestsFor, listMine } from "@/lib/posts";

export const dynamic = "force-dynamic";
export const metadata = { title: "โพสต์หาเพื่อน — Mister Bamrungsuk" };

const GOLD = "#e8c472";
const LN = "rgba(243,234,217,0.07)";

// โพสต์หาเพื่อนของฉัน → แตะดูคนที่สนใจ (บอร์ด C-JobInterested) · + โพสต์ใหม่ (C-JobPost)
export default async function MyPostsPage() {
  const me = await currentCustomer();
  if (!me) redirect("/login");
  const posts = await listMine(me.sub).catch(() => []);
  const ints = await interestsFor(posts.map((p) => p.id)).catch(() => []);
  return (
    <div className="pb-6">
      <TopBar back="/profile" title="โพสต์หาเพื่อน" />
      <div className="flex flex-col gap-3" style={{ padding: "16px 16px 0" }}>
        <Link href="/jobs/create" className="h-[52px] rounded-[14px] bg-[#e8c472] text-[#1b130b] font-semibold grid place-items-center hover:text-[#1b130b]">+ โพสต์ใหม่</Link>
        {!posts.length && <div className="rounded-2xl bg-[#211a18] text-center text-[14px] text-[#d9c9b4]" style={{ padding: 24, border: `1px solid ${LN}` }}>บอกสิ่งที่อยากทำ เพื่อนที่ว่างจะกดสนใจ แล้วคุณเลือกคนที่ชอบได้</div>}
        {posts.map((p) => {
          const open = p.status === "open" && Date.parse(p.expires_at) > Date.now();
          const n = ints.filter((i) => i.post_id === p.id).length;
          return (
            <Link key={p.id} href={`/jobs/interested?id=${p.id}`} className="rounded-2xl bg-[#211a18] flex flex-col gap-1 text-[#f3ead9] hover:text-[#f3ead9]" style={{ padding: 16, border: `1px solid ${LN}` }}>
              <div className="flex justify-between items-center gap-2"><span className="font-semibold">{p.activity} · {new Date(p.starts_at).toLocaleString("th-TH", { timeZone: "Asia/Bangkok", weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} · {p.hours} ชม.</span>
                <span className="text-[12px] font-semibold rounded-full shrink-0" style={{ padding: "2px 10px", background: open ? "rgba(29,159,77,.14)" : "rgba(243,234,217,.07)", color: open ? "#7fd6a3" : "#b5a596" }}>{open ? "เปิดอยู่" : "ปิดแล้ว"}</span></div>
              <div className="text-[13px] font-light text-[#d9c9b4]">{p.area}</div>
              <div className="text-[13px] font-semibold" style={{ color: GOLD }}>คนที่สนใจ {n} คน ›</div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
