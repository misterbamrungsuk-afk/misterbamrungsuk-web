// ── Supabase clients (ใช้เมื่อผูก env แล้ว) ──
import { createBrowserClient } from "@supabase/ssr";

export const supabaseEnv = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
};

export const hasSupabase =
  supabaseEnv.url.startsWith("http") && supabaseEnv.anonKey.length > 20;

export function supabaseBrowser() {
  if (!hasSupabase) return null;
  return createBrowserClient(supabaseEnv.url, supabaseEnv.anonKey);
}

export function supabaseLoginUrl(returnTo = "/home") {
  return `/auth/google?next=${encodeURIComponent(returnTo)}`;
}
