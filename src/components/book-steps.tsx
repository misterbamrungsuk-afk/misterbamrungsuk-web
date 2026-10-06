"use client";

/** แท็บขั้นตอนจอง (ใช้ร่วมกับหน้า checkout) */
export function BookSteps({ step, th }: { step: 1 | 2 | 3 | 4; th: boolean }) {
  const labels = th ? ["เลือกเพื่อน", "เลือกบริการ", "เลือกสถานที่", "ยืนยันและชำระ"] : ["Companion", "Service", "Location", "Confirm & pay"];
  return (
    <ol className="grid grid-cols-4 gap-1 px-4 pt-3">
      {labels.map((l, i) => {
        const n = i + 1, done = n < step, on = n === step;
        return (
          <li key={l} className="flex flex-col items-center gap-1 text-center">
            <span className={`h-1 w-full rounded-full ${done || on ? "bg-gold-500" : "bg-ink-600"}`} />
            <span className={`text-[10.5px] leading-tight ${on ? "text-gold-300 font-semibold" : done ? "text-ink-200" : "text-ink-400"}`}>{done ? "✓ " : ""}{l}</span>
          </li>
        );
      })}
    </ol>
  );
}
