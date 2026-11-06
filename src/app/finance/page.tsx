import { cookies } from "next/headers";
import { ADMIN_COOKIE, ROLE_LABEL, verifySession } from "@/lib/admin-auth";
import { getFinancePlan } from "@/lib/finance/store";
import { FinanceApp } from "./finance-app";

export const dynamic = "force-dynamic";

export default async function Page() {
  const s = await verifySession((await cookies()).get(ADMIN_COOKIE)?.value);
  return <FinanceApp view="overview" initial={await getFinancePlan()} who={s ? `${s.email} · ${ROLE_LABEL[s.role]}` : ""} />;
}
