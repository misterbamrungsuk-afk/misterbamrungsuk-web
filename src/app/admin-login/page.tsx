import { usingDemoAccounts, adminLoginEnabled, DEMO_ADMIN_EMAILS } from "@/lib/admin-accounts";
import { ROLE_LABEL, type AdminRole } from "@/lib/admin-auth";
import { AdminLoginForm } from "./form";
import { Logo } from "@/components/ui";

export const metadata = { title: "เข้าสู่ระบบแอดมิน — Mister Bamrungsuk" };
export const dynamic = "force-dynamic";

export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<{ next?: string; denied?: string }> }) {
  const sp = await searchParams;
  const demo = usingDemoAccounts();
  // ป้องกัน open redirect: รับเฉพาะ path ภายใน /admin
  const next = sp.next?.startsWith("/admin") && !sp.next.startsWith("//") ? sp.next : "";

  return (
    <main className="min-h-dvh grid lg:grid-cols-[520px_1fr]">
      <section className="px-6 sm:px-12 py-12 lg:py-20 flex flex-col gap-5 max-w-[520px] w-full mx-auto">
        <div>
          <a href="/home" className="inline-flex items-center gap-1 text-sm text-gold-300 min-h-9 mb-4">← กลับหน้าแอป</a>
          <Logo size={32} />
          <p className="text-[11px] font-semibold tracking-[0.15em] text-gold-600 mt-1">ADMIN CONSOLE</p>
        </div>
        <h1 className="text-2xl font-semibold mt-6">เข้าสู่ระบบแอดมิน</h1>
        {!adminLoginEnabled() ? (
          <p className="rounded-2xl border border-crimson-500 bg-crimson-500/10 p-4 text-sm">
            ระบบแอดมินปิดอยู่: ยังไม่ได้ตั้งค่า <code>ADMIN_ACCOUNTS</code> และ <code>ADMIN_SESSION_SECRET</code> ใน env ของเซิร์ฟเวอร์
          </p>
        ) : (
          <AdminLoginForm next={next} />
        )}
        {demo && (
          <div className="rounded-2xl border border-gold-500/50 bg-gold-500/5 p-4 text-sm flex flex-col gap-1.5">
            <p className="font-semibold text-gold-300">โหมดสาธิต · บัญชีทดลอง 4 บทบาท</p>
            {(Object.keys(DEMO_ADMIN_EMAILS) as AdminRole[]).map((r) => (
              <p key={r} className="text-ink-200"><span className="text-ink-300">{ROLE_LABEL[r]}:</span> {DEMO_ADMIN_EMAILS[r]}</p>
            ))}
            <p className="text-xs text-ink-300 mt-1">รหัสผ่านตามค่า ADMIN_DEMO_PASSWORD ใน .env.example · โหมดจริงบัญชีเหล่านี้ใช้ไม่ได้</p>
          </div>
        )}
        <p className="text-xs text-ink-300 mt-auto">ทุกการเข้าสู่ระบบถูกบันทึก · session หมดอายุใน 8 ชั่วโมง</p>
      </section>
      <section className="hidden lg:flex flex-col justify-center gap-4 px-14 border-l border-ink-600">
        <h2 className="text-2xl font-semibold">บทบาทและสิทธิ์</h2>
        <p className="text-sm text-ink-300 -mt-2">แต่ละคนเห็นเฉพาะแท็บที่บทบาทอนุญาต</p>
        <table className="text-sm w-full max-w-2xl">
          <thead><tr className="text-ink-300 text-xs"><th className="text-left py-2 font-medium">สิทธิ์</th>{(Object.keys(ROLE_LABEL) as AdminRole[]).map((r) => <th key={r} className="py-2 font-medium">{ROLE_LABEL[r]}</th>)}</tr></thead>
          <tbody>
            {[
              ["รายได้ GP · Audit log", ["super", "finance", "cs", "kyc"]],
              ["โอนให้หมอ · โปรโมชัน", ["super", "finance"]],
              ["ตรวจงาน / ออเดอร์", ["super", "finance", "cs"]],
              ["คิว KYC", ["super", "kyc"]],
              ["CS tickets", ["super", "cs"]],
              ["รีพอร์ท · สมาชิก / strike", ["super", "cs", "kyc"]],
              ["ตั้งค่าระบบ", ["super"]],
            ].map(([label, roles]) => (
              <tr key={label as string} className="border-t border-ink-600">
                <td className="py-2.5">{label as string}</td>
                {(Object.keys(ROLE_LABEL) as AdminRole[]).map((r) => <td key={r} className={`text-center ${(roles as string[]).includes(r) ? "text-gold-600" : "text-ink-600"}`}>●</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
