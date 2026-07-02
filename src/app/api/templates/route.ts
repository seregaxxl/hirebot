import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const templates = await prisma.coverLetterTemplate.findMany({ orderBy: { id: "asc" } });
  return NextResponse.json(templates);
}

export async function POST(req: NextRequest) {
  const { name, body } = await req.json();
  if (!name || !body) {
    return NextResponse.json({ error: "нужны name и body" }, { status: 400 });
  }
  const tpl = await prisma.coverLetterTemplate.create({ data: { name, body } });
  return NextResponse.json(tpl);
}
