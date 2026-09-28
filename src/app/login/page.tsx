"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n, LangToggle } from "@/i18n/provider";
import { Logo } from "@/components/ui";
import { hasSupabase } from "@/lib/supabase";
import { isDemo } from "@/lib/data";

export default function LoginPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function login() {
    if (isDemo || !hasSupabase) {
      // โหมดสาธิต — เข้าชมระบบด้วยบัญชีตัวอย่าง
      setLoading(true);
      setTimeout(() => router.push("/home"), 600);
      return;
    }
    const { supabaseBrowser } = await import("@/lib/supabase");
    const supabase = supabaseBrowser();
    if (!supabase) return;
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${location.origin}/auth/callback?next=/home` },
    });
  }

  return (
    <main className="app-frame flex flex-col items-center justify-center px-8 relative overflow-hidden">
      {/* ambient glow */}
      <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-crimson-500/20 blur-[100px]" />
      <div className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-gold-500/10 blur-[100px]" />

      <div className="absolute top-5 right-5"><LangToggle /></div>

      <div className="relative z-10 flex flex-col items-center animate-rise">
        <div className="mb-6"><Logo size={56} /></div>
        <h1 className="font-display text-3xl font-bold mb-2">
          <span className="text-gradient-gold">where new </span>
          <span className="text-gradient-red">friendships</span>
          <span className="text-gradient-gold"> begin</span>
        </h1>
        <p className="text-ink-300 text-sm mb-10 text-center">{t.brandSub}</p>

        <button
          onClick={login}
          disabled={loading}
          className="btn-crimson w-72 rounded-full py-3 font-semibold flex items-center justify-center gap-3 disabled:opacity-60"
        >
          {!loading && (
            <svg width="20" height="20" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C41.4 35.4 44 30.1 44 24c0-1.3-.1-2.6-.4-3.9z"/></svg>
          )}
          {loading ? "…" : t.loginWithGoogle}
        </button>
        <p className="text-ink-400 text-xs mt-4">{t.loginHint}</p>

        {(isDemo || !hasSupabase) && (
          <p className="mt-8 chip chip-gold">🧪 {t.demoBadge} — ข้อมูลจำลอง ไม่ต้องตั้งค่า</p>
        )}
      </div>

      <p className="absolute bottom-8 text-ink-500 text-xs">© 2026 HaMoo · 18+</p>
    </main>
  );
}
