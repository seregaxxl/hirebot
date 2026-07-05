import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";

export async function GET(req: NextRequest) {
  const mode = req.nextUrl.searchParams.get("mode") ?? "new";

  let where: Prisma.VacancyWhereInput;
  if (mode === "applied") {
    where = { status: "APPLIED" };
  } else {
    // новые в очереди — тест не важен: отклик на hh всё равно ручной
    where = { status: { in: ["NEW", "MANUAL_REQUIRED"] } };
  }

  const vacancies = await prisma.vacancy.findMany({
    where,
    orderBy: [{ score: "desc" }, { publishedAt: "desc" }],
    take: 300,
  });
  return NextResponse.json(vacancies);
}
