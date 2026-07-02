import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const STATUSES = [
  "SENT",
  "VIEWED",
  "INVITED",
  "DISCARDED",
  "SCREENING",
  "INTERVIEW",
  "FINAL",
  "OFFER",
  "REJECTED",
];

// Ручное продвижение по воронке + заметки
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const data: { status?: string; notes?: string } = {};

  if (body.status) {
    if (!STATUSES.includes(body.status)) {
      return NextResponse.json({ error: `status: ${STATUSES.join(" | ")}` }, { status: 400 });
    }
    data.status = body.status;
  }
  if (typeof body.notes === "string") data.notes = body.notes;

  const app = await prisma.application.update({
    where: { id: Number(id) },
    data: {
      ...data,
      ...(data.status ? { events: { create: { status: data.status, source: "MANUAL" } } } : {}),
    },
  });
  return NextResponse.json(app);
}
