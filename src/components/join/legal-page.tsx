import Link from "next/link";
import { Logo } from "@/components/ui";
import { EFFECTIVE_DATE, type LegalSection } from "@/lib/join/legal";

export function LegalPage({ title, version, sections }: { title: string; version: string; sections: LegalSection[] }) {
  return (
    <div className="phone-stage">
      <main className="phone px-5 pb-12">
        <header className="flex items-center gap-3 h-16 sticky top-0 bg-ink-900/95 backdrop-blur z-10 -mx-5 px-5">
          <Link href="/join" aria-label="กลับหน้าสมัคร" className="w-10 h-10 rounded-full border border-white/15 grid place-items-center text-xl shrink-0">‹</Link>
          <Logo size={24} />
        </header>
        <h1 className="font-display text-[26px] font-semibold mt-3 leading-tight">{title}</h1>
        <p className="text-[12px] text-ink-400 mt-1">ฉบับที่ {version} · มีผลตั้งแต่ {EFFECTIVE_DATE}</p>
        <div className="mt-6 flex flex-col gap-6">
          {sections.map((s) => (
            <section key={s.h}>
              <h2 className="text-[16px] font-semibold text-gold-300">{s.h}</h2>
              {s.li && (
                <ul className="mt-2.5 space-y-2">
                  {s.li.map((x) => (
                    <li key={x} className="flex gap-2.5 text-[14px] text-ink-200 leading-relaxed">
                      <span className="w-1.5 h-1.5 rounded-full bg-gold-500 mt-[9px] shrink-0" />
                      <span>{x}</span>
                    </li>
                  ))}
                </ul>
              )}
              {s.p?.map((x) => <p key={x} className="mt-2.5 text-[14px] text-ink-200 leading-relaxed">{x}</p>)}
            </section>
          ))}
        </div>
        <Link href="/join#register" className="btn-crimson h-12 mt-10 grid place-items-center font-semibold">กลับไปหน้าสมัคร</Link>
      </main>
    </div>
  );
}
