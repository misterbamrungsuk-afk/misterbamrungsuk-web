import { NextResponse } from "next/server";
import { store } from "@/lib/server-store";
import { isDemo, db } from "@/lib/data";

type Ctx = { params: Promise<{ roomId: string }> };

// GET /api/chat/[roomId]/messages — ดึงข้อความทั้งห้อง
export async function GET(_req: Request, ctx: Ctx) {
  const { roomId } = await ctx.params;
  if (isDemo) {
    const room = store().rooms.find((r) => r.id === roomId);
    return NextResponse.json({ messages: room?.messages ?? [], state: room ? {
      depositCreated: room.depositCreated, depositConfirmed: room.depositConfirmed,
      finalCreated: room.finalCreated, finalConfirmed: room.finalConfirmed, reviewed: room.reviewed,
    } : null });
  }
  // LIVE (Prisma) — เปิดใช้เมื่อผูก DATABASE_URL
  void db;
  return NextResponse.json({ messages: [] });
}

// POST /api/chat/[roomId]/messages — ส่งข้อความ/การ์ดจ่ายเงิน
export async function POST(req: Request, ctx: Ctx) {
  const { roomId } = await ctx.params;
  const body = await req.json().catch(() => null);
  if (!body?.senderId || (!body.content && !body.payment)) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const msg = {
    id: `srv-${Date.now()}`,
    roomId,
    senderId: String(body.senderId),
    kind: body.payment ? "payment" : body.kind === "image" ? "image" : "text",
    content: body.content ?? "",
    payment: body.payment ?? undefined,
    createdAt: new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }),
    isRead: false,
  };
  if (isDemo) {
    const room = store().rooms.find((r) => r.id === roomId);
    room?.messages.push(msg as never);
  }
  return NextResponse.json({ message: msg });
}
