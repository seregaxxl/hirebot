import { prisma } from "@/lib/db";
import { OutreachBoard } from "../outreach-board";

export const dynamic = "force-dynamic";

export default async function OutreachPage() {
  const [items, profile] = await Promise.all([
    prisma.outreach.findMany({ orderBy: { updatedAt: "desc" } }),
    prisma.setting.findUnique({ where: { key: "outreach_profile" } }),
  ]);
  return <OutreachBoard initialItems={items} initialCases={profile?.value ?? ""} />;
}
