import { redirect } from "next/navigation";

// หน้าต้อนรับเดิม → บอร์ด C-Onboarding
export default function WelcomePage() {
  redirect("/onboarding");
}
