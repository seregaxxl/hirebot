import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";

export async function GET(req: NextRequest) {
  const mode = req.nextUrl.searchParams.get("mode") ?? "auto";

  let where: Prisma.VacancyWhereInput;
  if (mode === "manual") {
    // с обязательным тестом — только ручной отклик на hh
    where = { hasTest: true, status: { in: ["NEW", "MANUAL_REQUIRED"] } };
  } else if (mode === "applied") {
    where = { status: "APPLIED" };
  } else {
    // доступны для автоотклика
    where = { status: "NEW", hasTest: false };
  }

  const vacancies = await prisma.vacancy.findMany({
    where,
    orderBy: [{ score: "desc" }, { publishedAt: "desc" }],
    take: 300,
  });
  return NextResponse.json(vacancies);
}
