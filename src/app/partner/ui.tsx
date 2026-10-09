import type { TimelineStep } from "@/lib/partner/status";

// ชิ้นส่วนร่วมของหน้าพาร์ทเนอร์ตามบอร์ด (PartnerDone / PartnerQC / PartnerLogin)
export const BD = "border-[rgba(240,200,90,.38)]";
export const CARD = `rounded-2xl bg-[#241717] border ${BD} p-4 min-w-0 [overflow-wrap:anywhere]`;
export const CTA = "btn-red-lux font-lux h-[52px] rounded-[14px] w-full text-[15px] grid place-items-center disabled:opacity-45";
export const GHOST = `h-12 rounded-[14px] border ${BD} bg-[#241717] text-[#ffd76a] text-sm font-semibold w-full`;

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-[#0e0a0a]">
      <main className="mx-auto max-w-[480px] min-h-dvh pb-6 text-[#f6efe4] font-lux-body [&_a]:text-[#ffd76a]">{children}</main>
    </div>
  );
}

export function CheckIcon({ size = 30 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="m5 12 5 5 9-10" /></svg>;
}

export function Timeline({ steps }: { steps: TimelineStep[] }) {
  return (
    <ol className="flex flex-col">
      {steps.map((t, i) => {
        const done = t.st === "done";
        const fail = t.st === "fail";
        const bd = fail ? "#ef6b7b" : t.st === "todo" ? "#5a4a4d" : "#f0c75a";
        return (
          <li key={t.n} className="flex gap-2.5">
            <div className="flex flex-col items-center shrink-0">
              <span className="w-5 h-5 rounded-full grid place-items-center text-[11px] font-bold text-[#0e0a0a]"
                style={{ background: done ? "#f0c75a" : "transparent", border: `1.5px solid ${bd}`, color: fail ? "#ef6b7b" : undefined }}>
                {done ? "✓" : fail ? "!" : ""}
              </span>
              <span className="flex-1 w-px min-h-2" style={{ background: i === steps.length - 1 ? "transparent" : "rgba(240,200,90,.38)" }} />
            </div>
            <div className="pb-2 min-w-0">
              <div className="text-[13px]" style={{ color: t.st === "todo" ? "#cdbfb3" : "#f6efe4" }}>{t.n}</div>
              {t.sub && <div className="text-[11.5px]" style={{ color: fail ? "#ef6b7b" : "#ffd76a" }}>{t.sub}</div>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
