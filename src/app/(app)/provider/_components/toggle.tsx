"use client";

export function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)}
      className={`w-12 h-7 my-1 rounded-full p-0.5 transition shrink-0 relative before:absolute before:-inset-2 before:content-[""] ${on ? "bg-crimson-600" : "bg-ink-700"}`}>
      <span className={`block w-6 h-6 rounded-full bg-white transition-transform ${on ? "translate-x-5" : ""}`} />
    </button>
  );
}
