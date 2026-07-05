import { prisma } from "@/lib/db";
import { PlanView } from "../plan-view";

export const dynamic = "force-dynamic";

export default async function PlanPage() {
  const row = await prisma.setting.findUnique({ where: { key: "plan_checked" } });
  const checked = row ? (JSON.parse(row.value) as string[]) : [];
  return <PlanView initialChecked={checked} />;
}
