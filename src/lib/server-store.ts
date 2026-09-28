// ── Server-side store ──
// โหมด DEMO: เก็บใน memory (globalThis) — mutation จริงในเซสชัน server รีสตาร์ทแล้วรีเซ็ต
// โหมด LIVE: route handlers ใช้ Prisma แทน (เมื่อผูก DATABASE_URL)
import { DEMO_ROOMS, DEMO_POSTS } from "./demo-data";
import type { ChatRoom } from "./types";

interface Store {
  rooms: ChatRoom[];
  interests: Record<string, boolean>;
  interestCounts: Record<string, number>;
  reports: { id: string; targetType: string; targetId: string; reason: string; createdAt: string }[];
  reviews: { id: string; postId: string; rating: number; content: string; createdAt: string }[];
  kycStatus: "none" | "pending" | "verified";
  audit: { id: string; actor: string; action: string; entity: string; at: string }[];
}

const g = globalThis as unknown as { __hamooStore?: Store };

export function store(): Store {
  if (!g.__hamooStore) {
    g.__hamooStore = {
      rooms: JSON.parse(JSON.stringify(DEMO_ROOMS)) as ChatRoom[],
      interests: {},
      interestCounts: Object.fromEntries(DEMO_ROOMS.map((r) => [r.id, 0])),
      reports: [],
      reviews: [],
      kycStatus: "none",
      audit: [
        { id: "a1", actor: "admin@hamoo", action: "kyc.approve", entity: "Member u1", at: "14:02" },
        { id: "a2", actor: "admin@hamoo", action: "strike.add", entity: "Member หมูยอ🐷", at: "13:40" },
      ],
    };
  }
  return g.__hamooStore;
}

export const demoPostsCount = () => DEMO_POSTS.length;
