import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getMyResumes } from "@/lib/hh";

export async function GET() {
  const resumes = await prisma.resumeVersion.findMany({ orderBy: { title: "asc" } });
  return NextResponse.json(resumes);
}

// Синхронизация резюме с hh.ru
export async function POST() {
  try {
    const { items } = await getMyResumes();
    for (const r of items) {
      await prisma.resumeVersion.upsert({
        where: { id: r.id },
        create: { id: r.id, title: r.title },
        update: { title: r.title },
      });
    }
    return NextResponse.json({ synced: items.length });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
