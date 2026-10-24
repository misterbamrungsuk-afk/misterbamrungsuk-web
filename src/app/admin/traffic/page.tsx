import { listEvents, summarize } from "@/lib/traffic";
import { PageHead } from "../admin-nav";
import { TrafficBoard } from "./client";

export const dynamic = "force-dynamic";
export const metadata = { title: "สถิติผู้เข้าชมเว็บ · แอดมิน Mister Bamrungsuk" };

const RANGES = [1, 7, 30, 90] as const;

// สถิติผู้เข้าชม (ของเราเอง · supabase/site/0003_site_events.sql) — กี่คน · อยู่นานแค่ไหน · หน้าไหน · มาจากไหน · ใครที่ล็อกอิน
export default async function TrafficPage({ searchParams }: { searchParams: Promise<{ d?: string }> }) {
  const d = Number((await searchParams).d);
  const days = (RANGES as readonly number[]).includes(d) ? d : 7;
  const from = new Date(Date.now() - days * 86400_000).toISOString();
  const { rows, ready } = await listEvents(from);
  return (
    <>
      <PageHead title="สถิติผู้เข้าชมเว็บ" sub="นับจากเว็บเราเอง · ไม่รวมหน้าแอดมิน · ผู้ใช้ที่ระบุตัวได้ = ล็อกอิน + ยินยอมคุกกี้วิเคราะห์" />
      <TrafficBoard s={summarize(rows, days)} days={days} ready={ready} />
    </>
  );
}
