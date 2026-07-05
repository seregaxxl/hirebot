import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/db";

export async function GET() {
  const resumes = await prisma.resumeVersion.findMany({ orderBy: { title: "asc" } });
  return NextResponse.json(resumes);
}

// Добавить версию резюме вручную (импорт с hh закрыт вместе с API соискателей).
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const title = String(body.title ?? "").trim();
  const role = ["PM", "PRODUCT", "CTO"].includes(body.role) ? body.role : "PM";
  if (!title) {
    return NextResponse.json({ error: "нужно название резюме" }, { status: 400 });
  }
  const resume = await prisma.resumeVersion.create({
    data: { id: randomUUID(), title, role },
  });
  return NextResponse.json(resume);
}
