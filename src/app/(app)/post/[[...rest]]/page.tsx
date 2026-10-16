import { redirect } from "next/navigation";

// ประกาศ/โพสต์แบบเดิม → โพสต์หาเพื่อน (บอร์ด C-JobPost)
export default function Page() {
  redirect("/jobs");
}
