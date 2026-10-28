import { LINE_GROUP_LIST, type LineGroup } from "@/lib/join/config";
import { PageHead } from "../admin-nav";
import { CopyLink } from "./copy";

export const dynamic = "force-dynamic";
export const metadata = { title: "กลุ่ม LINE · แอดมิน Mister Bamrungsuk" };

const SECTIONS: [LineGroup["kind"], string, string][] = [
  ["pt", "กลุ่ม Part-Time", "ระบบส่งปุ่มให้ Part-Time อัตโนมัติตามช่องทางที่สมัครมา · ลิงก์เชิญ Secret → กลุ่ม Secret · ทางอื่น → MBM01 / MBT01"],
  ["team", "ทีมงาน · บริษัท", "กลุ่มภายใน"],
  ["other", "กลุ่มอื่น ๆ", ""],
];

// กลุ่ม LINE ทั้งหมด (Canva "Update MB" หน้า 5 · 28 ต.ค. 2569) — ปุ่มเข้ากลุ่ม + คัดลอกลิงก์ · แก้ลิงก์ที่ LINE_GROUP_LIST (lib/join/config)
export default function LineGroupsPage() {
  const dup = new Set(LINE_GROUP_LIST.filter((g, i) => LINE_GROUP_LIST.findIndex((x) => x.url === g.url) !== i).map((g) => g.url));
  return (
    <>
      <PageHead title="กลุ่ม LINE" sub="กดปุ่มเพื่อเข้ากลุ่ม · คัดลอกลิงก์ส่งให้คนอื่น" />
      <div className="flex flex-col gap-5 max-w-[860px]">
        {SECTIONS.map(([k, title, sub]) => (
          <section key={k} data-line-section={k} className="rounded-[20px] bg-white p-5 flex flex-col gap-3 shadow-[0_4px_18px_rgba(90,60,20,.05)]">
            <div className="flex flex-wrap items-baseline gap-x-3"><b className="text-[18px] text-[#2a1d1a]">{title}</b>{sub && <span className="text-[13px] text-[#8a7b75]">{sub}</span>}</div>
            {LINE_GROUP_LIST.filter((g) => g.kind === k).map((g) => (
              <div key={g.key} data-line-group-row={g.key} className="flex flex-wrap items-center gap-3 rounded-2xl border px-4 py-3" style={{ borderColor: "#ebe2d5" }}>
                <span className="min-w-0 flex-1 basis-[220px]">
                  <span className="inline-block rounded-lg px-2.5 py-1 text-[16px] font-semibold text-[#2a1d1a]" style={{ background: "#fdf06b" }}>{g.label}</span>
                  <span className="block mt-1 text-[12.5px] text-[#8a7b75] break-all">{g.note ? `${g.note} · ` : ""}{g.url.replace("https://", "")}</span>
                  {dup.has(g.url) && <span className="block text-[12px] font-semibold text-[#c2610f]">ลิงก์ซ้ำกับกลุ่มอื่น · ตรวจลิงก์อีกครั้ง</span>}
                </span>
                <span className="flex gap-2 shrink-0">
                  <a href={g.url} target="_blank" rel="noopener noreferrer" data-line-join={g.key} className="h-11 px-5 rounded-full bg-[#06c755] text-white text-[14px] font-semibold flex items-center gap-2 hover:text-white">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 4C7 4 3 7.2 3 11c0 3.4 3 6.2 7.2 6.9L10 21l3.6-3.1C18 17.4 21 14.5 21 11c0-3.8-4-7-9-7z" /></svg>
                    {g.url.includes("/ti/p/") ? "แชทแอดมิน" : "เข้ากลุ่ม"}
                  </a>
                  <CopyLink url={g.url} />
                </span>
              </div>
            ))}
          </section>
        ))}
      </div>
    </>
  );
}
