// ── Data access layer ──
// โหมดทำงาน 2 แบบ สลับอัตโนมัติ:
//  • DEMO  — ไม่มี DATABASE_URL → ใช้ข้อมูลจำลอง เปิดชมได้ทันที
//  • LIVE  — มี DATABASE_URL + Prisma → ต่อ Supabase จริง
import { PrismaClient } from "@prisma/client";
import {
  DEMO_POSTS, DEMO_REVIEWS, DEMO_JOBS, DEMO_ROOMS, DEMO_ME, DEMO_MEMBERS,
  DEMO_NOTIS, DEMO_BANKS, DEMO_SAVED_REPLIES, DEMO_AUTO_REPLY, DEMO_PROMOS, DEMO_ORDER,
} from "./demo-data";
import type { Post, Review, JobBoard, ChatRoom, MemberLite, AppNotification, BankAccount, SavedReply, PromoCode, Order } from "./types";

export const isDemo = !process.env.DATABASE_URL;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let prisma: any = null;
export function db(): any {
  if (!prisma) prisma = new PrismaClient();
  return prisma;
}

// ── member ──
export async function getMe(): Promise<MemberLite> {
  if (isDemo) return DEMO_ME;
  // LIVE: ดึงจาก session จริง (hook ที่ auth หลังผูก env)
  return DEMO_ME;
}

export async function getPosts(filters: {
  q?: string; category?: string; gender?: string; province?: string;
  ageMin?: number; ageMax?: number; rateMin?: number; rateMax?: number;
}): Promise<Post[]> {
  if (isDemo) {
    let list = [...DEMO_POSTS];
    if (filters.q) {
      const q = filters.q.toLowerCase();
      list = list.filter((p) =>
        p.member.name.toLowerCase().includes(q) ||
        p.categories.some((c) => c.includes(q)) ||
        (p.personality + p.interests + p.extraInfo).toLowerCase().includes(q)
      );
    }
    if (filters.category) list = list.filter((p) => p.categories.includes(filters.category!));
    if (filters.gender) list = list.filter((p) => p.member.gender === filters.gender);
    if (filters.province) list = list.filter((p) => p.province === filters.province);
    if (filters.ageMin) list = list.filter((p) => (p.member.age ?? 0) >= filters.ageMin!);
    if (filters.ageMax) list = list.filter((p) => (p.member.age ?? 999) <= filters.ageMax!);
    if (filters.rateMin) list = list.filter((p) => p.price3h >= filters.rateMin!);
    if (filters.rateMax) list = list.filter((p) => p.price3h <= filters.rateMax!);
    return list;
  }
  // LIVE (stub — เติมเมื่อผูก Supabase แล้ว)
  return [];
}

export async function getPost(id: string): Promise<Post | null> {
  if (isDemo) return DEMO_POSTS.find((p) => p.id === id) ?? null;
  return null;
}

export async function getReviews(postId: string): Promise<Review[]> {
  if (isDemo) return DEMO_REVIEWS.filter((r) => r.postId === postId);
  return [];
}

export async function getJobs(filters: { role?: string; province?: string; when?: string }): Promise<JobBoard[]> {
  if (isDemo) {
    let list = [...DEMO_JOBS];
    if (filters.role) list = list.filter((j) => j.role === filters.role);
    if (filters.province) list = list.filter((j) => j.province === filters.province);
    return list;
  }
  return [];
}

export async function getRooms(): Promise<ChatRoom[]> {
  if (isDemo) return DEMO_ROOMS;
  return [];
}

export async function getRoom(id: string): Promise<ChatRoom | null> {
  if (isDemo) return DEMO_ROOMS.find((r) => r.id === id) ?? null;
  return null;
}

export async function getOrder(roomId: string): Promise<Order | null> {
  if (isDemo) return DEMO_ORDER.roomId === roomId ? DEMO_ORDER : null;
  return null;
}

export async function getNotifications(): Promise<AppNotification[]> {
  if (isDemo) return DEMO_NOTIS;
  return [];
}

export async function getBanks(): Promise<BankAccount[]> {
  if (isDemo) return DEMO_BANKS;
  return [];
}

export async function getSavedReplies(): Promise<SavedReply[]> {
  if (isDemo) return DEMO_SAVED_REPLIES;
  return [];
}

export async function getAutoReply(): Promise<{ enabled: boolean; message: string }> {
  if (isDemo) return { enabled: true, message: DEMO_AUTO_REPLY };
  return { enabled: false, message: "" };
}

export async function getPromos(): Promise<PromoCode[]> {
  if (isDemo) return DEMO_PROMOS;
  return [];
}

export { DEMO_MEMBERS };
