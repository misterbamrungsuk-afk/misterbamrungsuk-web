/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { CONTROLLER } from "@/lib/join/legal";

// ชิ้นส่วน UI ชุดใหม่ (v7) ตามบอร์ด DS-Tokens / DS-Components บน canvas "sale page and register"
// มือถือก่อน: คอลัมน์เดียว ขอบข้าง 16px · md(768) ขอบ 32px · กว้างสุด 1200px
// สี/ฟอนต์ใช้ token mb-* ใน globals.css · ทุกหน้าครอบด้วย <Shell> (class .mb-v7)

type Children = { children?: React.ReactNode };
const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

/** ครอบทั้งหน้า: พื้น + ฟอนต์ + หัวแบรนด์ (+ ท้ายหน้า) */
export function Shell({ children, header, footer = true, className }: Children & { header?: React.ReactNode; footer?: boolean; className?: string }) {
  return (
    <div className={cx("mb-v7 min-h-dvh flex flex-col text-[15px]", className)}>
      {header ?? <BrandHeader />}
      <div className="flex-1">{children}</div>
      {footer && <Footer />}
    </div>
  );
}

/** คอนเทนเนอร์เนื้อหา (ขอบข้าง + กว้างสุด) */
export function Container({ children, className, narrow }: Children & { className?: string; narrow?: boolean }) {
  return <div className={cx("mx-auto w-full px-4 md:px-8", narrow ? "max-w-[720px]" : "max-w-[1200px]", className)}>{children}</div>;
}

/** แถบแบรนด์ด้านบน: โลโก้ + Mister Bamrungsuk (Archivo Black) · ไม่มีป้าย PREMIUM */
export function BrandHeader({ right, href = "/" }: { right?: React.ReactNode; href?: string }) {
  return (
    <header className="border-b border-[rgba(243,234,217,0.07)] bg-mb-bg">
      <div className="mx-auto max-w-[1200px] flex items-center justify-between gap-3 px-4 md:px-8 h-16">
        <Link href={href} className="inline-flex items-center gap-2 min-w-0 text-mb-gold hover:text-mb-gold">
          <img src="/brand/logo.png" alt="Mister Bamrungsuk" width={40} height={40} className="w-10 h-10 object-contain shrink-0" />
          <span className="font-brand text-[12px] md:text-[15px] leading-none whitespace-nowrap">Mister Bamrungsuk</span>
        </Link>
        {right}
      </div>
    </header>
  );
}

/** หัวหน้าย่อย: ปุ่มย้อนกลับ + ชื่อหน้า */
export function SubHeader({ title, back, right }: { title: string; back: string; right?: React.ReactNode }) {
  return (
    <header className="bg-mb-surface2">
      <div className="mx-auto max-w-[1200px] flex items-center gap-3 px-4 md:px-8 h-[68px]">
        <Link href={back} aria-label="ย้อนกลับ" className="shrink-0 w-11 h-11 rounded-full bg-mb-surface text-mb-text grid place-items-center hover:text-mb-text">
          <Icon d="m15 18-6-6 6-6" />
        </Link>
        <h1 className="mb-h flex-1 min-w-0 text-[18px] truncate">{title}</h1>
        {right}
      </div>
    </header>
  );
}

const filled = (v: string) => (v && !v.startsWith("[") ? v : "");

export function Footer() {
  const email = filled(CONTROLLER.email) || "Misterbamrungsuk@gmail.com";
  const phone = filled(CONTROLLER.phone) || "082-853-5954";
  return (
    <footer className="mt-12 border-t border-[rgba(243,234,217,0.07)]">
      <Container className="py-6 flex flex-col gap-3 text-[13px] leading-relaxed font-light md:flex-row md:flex-wrap md:items-center md:justify-between md:gap-x-8">
        <div className="flex items-center justify-between gap-3 md:justify-start">
          <span className="inline-flex items-center gap-2">
            <img src="/brand/logo.png" alt="" width={34} height={34} className="w-[34px] h-[34px] object-contain" />
            <span className="font-brand text-[21px] leading-none text-mb-gold">Bamrungsuk</span>
          </span>
        </div>
        <nav aria-label="เอกสารทางกฎหมาย" className="flex flex-wrap gap-x-3 gap-y-1">
          <Link href="/join/terms" className="text-mb-text hover:underline">ข้อกำหนดและเงื่อนไขการใช้งาน</Link>
          <span aria-hidden className="text-mb-text3">|</span>
          <Link href="/join/privacy" className="text-mb-text hover:underline">นโยบายความเป็นส่วนตัว (PDPA)</Link>
        </nav>
        <div className="text-mb-text select-all">{email} · {phone}</div>
        <div className="text-mb-text3 md:basis-full">© 2569 Mister Bamrungsuk สงวนลิขสิทธิ์</div>
      </Container>
    </footer>
  );
}

/** ไอคอนเส้น 24×24 (path d) */
export function Icon({ d, size = 20, className, stroke = 1.8 }: { d: string; size?: number; className?: string; stroke?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={cx("shrink-0", className)}>
      <path d={d} />
    </svg>
  );
}

type Variant = "primary" | "secondary" | "text" | "danger";
const BTN: Record<Variant, string> = {
  primary: "min-h-[52px] rounded-[14px] bg-mb-gold text-mb-ink font-semibold text-[15px] hover:text-mb-ink hover:brightness-105",
  secondary: "min-h-12 rounded-[14px] bg-[rgba(232,196,114,0.14)] text-mb-gold font-semibold text-[14px] hover:text-mb-gold hover:bg-[rgba(232,196,114,0.2)]",
  text: "min-h-11 text-mb-text2 text-[14px] hover:text-mb-text",
  danger: "min-h-12 rounded-[14px] bg-[rgba(201,40,61,.16)] text-mb-err font-semibold text-[14px] hover:text-mb-err",
};
const btnClass = (v: Variant, block: boolean, extra?: string) =>
  cx("inline-flex items-center justify-center gap-2 px-4 text-center transition active:scale-[.98] disabled:opacity-45 disabled:pointer-events-none", block && v !== "text" && "w-full", BTN[v], extra);

type BtnProps = Children & { variant?: Variant; block?: boolean; className?: string };
/** ปุ่ม: ใส่ href = ลิงก์, ไม่ใส่ = <button> */
export function Button({ variant = "primary", block = true, className, href, loading, children, ...rest }: BtnProps & { href?: string; loading?: boolean } & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "className">) {
  const cls = btnClass(variant, block, className);
  if (href) return <Link href={href} className={cls}>{children}</Link>;
  return (
    <button type="button" className={cls} disabled={loading || rest.disabled} aria-busy={loading || undefined} {...rest}>
      {loading && <span aria-hidden className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />}
      {children}
    </button>
  );
}

export function Card({ children, className, as: As = "section" }: Children & { className?: string; as?: "section" | "div" | "article" }) {
  return <As className={cx("p-4 rounded-2xl bg-mb-surface", className)}>{children}</As>;
}

/** ชิปเลือก (aria-pressed) */
export function Chip({ on, onClick, children, className }: Children & { on?: boolean; onClick?: () => void; className?: string }) {
  return (
    <button type="button" aria-pressed={!!on} onClick={onClick}
      className={cx("min-h-11 px-3.5 rounded-full inline-flex items-center justify-center gap-1.5 text-[13px] transition", on ? "bg-[rgba(232,196,114,0.14)] text-mb-gold font-semibold" : "bg-mb-surface2 text-mb-text hover:bg-[#2d2421]", className)}>
      {children}
    </button>
  );
}

type Tone = "gold" | "ok" | "err" | "top";
const BADGE: Record<Tone, string> = {
  gold: "bg-[rgba(232,196,114,0.14)] text-mb-gold",
  ok: "bg-[rgba(29,159,77,.14)] text-mb-ok",
  err: "bg-[rgba(201,40,61,.16)] text-mb-err",
  top: "bg-[linear-gradient(135deg,#fff1c9,#e8c472_45%,#a8781f)] text-mb-ink tracking-[.2em]",
};
export function Badge({ tone = "gold", children, className }: Children & { tone?: Tone; className?: string }) {
  return <span className={cx("inline-flex items-center gap-1 h-6 px-2.5 rounded-full text-[12px] font-semibold whitespace-nowrap", BADGE[tone], className)}>{children}</span>;
}

/** แถบขั้นตอน (ขั้นที่ x / n) */
export function Stepper({ step, total = 5, label }: { step: number; total?: number; label?: string }) {
  return (
    <div className="flex flex-col gap-2" aria-label={`ขั้นที่ ${step} จาก ${total}`}>
      <div className="flex justify-between text-[12px] font-light text-mb-text3"><span className="text-mb-gold font-semibold">ขั้นที่ {step} / {total}</span>{label && <span>{label}</span>}</div>
      <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${total}, minmax(0, 1fr))` }}>
        {Array.from({ length: total }, (_, i) => <span key={i} className={cx("h-1 rounded-sm", i < step ? "bg-mb-gold" : "bg-[rgba(243,234,217,0.14)]")} />)}
      </div>
    </div>
  );
}

/** ปุ่มหลักของหน้า: มือถือ = ติดล่างจอ (safe-area) · lg = อยู่ในเนื้อหาปกติ (วางในแผงข้าง)
 *  หน้าที่ใช้ต้องเว้นพื้นล่างด้วย <StickySpacer /> */
export function StickyAction({ children, className }: Children & { className?: string }) {
  return (
    <div className={cx("fixed inset-x-0 bottom-0 z-40 px-4 pt-3 pb-[calc(16px+env(safe-area-inset-bottom))] bg-[linear-gradient(180deg,rgba(23,18,17,0),#171211_30%)] lg:static lg:z-auto lg:p-0 lg:bg-none", className)}>
      <div className="mx-auto max-w-[560px] flex flex-col gap-2 lg:max-w-none">{children}</div>
    </div>
  );
}
export function StickySpacer() {
  return <div aria-hidden className="h-36 lg:hidden" />;
}

/** แถวคีย์ / ค่า */
export function Row({ k, v, className }: { k: React.ReactNode; v: React.ReactNode; className?: string }) {
  return <div className={cx("flex justify-between items-baseline gap-3", className)}><span className="min-w-0">{k}</span><span className="text-right font-semibold shrink-0">{v}</span></div>;
}

export const baht = (n: number) => "฿" + Math.round(n).toLocaleString("en-US");
