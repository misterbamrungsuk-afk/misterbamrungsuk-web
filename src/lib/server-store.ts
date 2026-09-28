// ── Server-side store ──
// โหมด DEMO: เก็บใน memory (globalThis) — mutation จริงในเซสชัน server รีสตาร์ทแล้วรีเซ็ต
// โหมด LIVE: route handlers ใช้ Prisma แทน (เมื่อผูก DATABASE_URL)
import { DEMO_ROOMS, DEMO_POSTS, DEMO_MEMBERS, DEMO_ME } from "./demo-data";
import type { ChatRoom, EscrowOrder } from "./types";

interface Store {
  rooms: ChatRoom[];
  escrow: Record<string, EscrowOrder>;
  interests: Record<string, boolean>;
  interestCounts: Record<string, number>;
  reports: { id: string; targetType: string; targetId: string; reason: string; createdAt: string }[];
  reviews: { id: string; postId: string; rating: number; content: string; createdAt: string }[];
  kycStatus: "none" | "pending" | "verified";
  audit: { id: string; actor: string; action: string; entity: string; at: string }[];
}

const g = globalThis as unknown as { __hamooStore?: Store };

export function seedEscrow(): Record<string, EscrowOrder> {
  return {
    e1: {
      id: "e1", roomId: "room1", hirer: DEMO_ME, provider: DEMO_MEMBERS[0],
      title: "กินข้าว + เดินเล่นสยาม", hours: 3, place: "สยามพารากอน",
      amount: 1500, gpPercent: 20, state: "accepted", createdAt: new Date().toISOString(),
    },
  };
}

export function store(): Store {
  if (!g.__hamooStore) {
    g.__hamooStore = {
      rooms: JSON.parse(JSON.stringify(DEMO_ROOMS)) as ChatRoom[],
      escrow: seedEscrow(),
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
