import Link from "next/link";
import { BrandHeader } from "@/components/mb/ui";
import { EFFECTIVE_DATE, type LegalSection } from "@/lib/join/legal";

export function LegalPage({ title, version, sections }: { title: string; version: string; sections: LegalSection[] }) {
  return (
    <div className="mb-v7 min-h-dvh">
      <BrandHeader right={<Link href="/join" className="min-h-11 inline-flex items-center text-[14px] text-[#e8c472]">‹ กลับหน้าสมัคร</Link>} />
      <main className="mx-auto w-full max-w-[720px] px-4 md:px-8 pb-12">
        <h1 className="text-[26px] md:text-[32px] font-semibold mt-6 leading-tight">{title}</h1>
        <p className="text-[12px] font-light text-[#b5a596] mt-1">ฉบับที่ {version} · มีผลตั้งแต่ {EFFECTIVE_DATE}</p>
        <div className="mt-6 flex flex-col gap-6">
          {sections.map((s) => (
            <section key={s.h}>
              <h2 className="text-[16px] font-semibold text-[#e8c472]">{s.h}</h2>
              {s.li && (
                <ul className="mt-2.5 space-y-2">
                  {s.li.map((x) => (
                    <li key={x} className="flex gap-2.5 text-[15px] font-light text-[#e6d6c4] leading-relaxed">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#e8c472] mt-[10px] shrink-0" />
                      <span>{x}</span>
                    </li>
                  ))}
                </ul>
              )}
              {s.p?.map((x) => <p key={x} className="mt-2.5 text-[15px] font-light text-[#e6d6c4] leading-relaxed">{x}</p>)}
            </section>
          ))}
        </div>
        <Link href="/join#packages" className="btn-crimson min-h-[52px] mt-10 grid place-items-center font-semibold max-w-[420px]">กลับไปหน้าสมัคร</Link>
      </main>
    </div>
  );
}
