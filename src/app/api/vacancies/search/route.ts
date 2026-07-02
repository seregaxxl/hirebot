import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { searchVacancies } from "@/lib/hh";
import { scoreVacancy, type Role } from "@/lib/scoring";

// Поиск на hh.ru + скоринг + сохранение в базу
export async function POST(req: NextRequest) {
  const body = await req.json();
  const role: Role = ["PM", "PRODUCT", "CTO"].includes(body.role) ? body.role : "PM";

  try {
    const blacklist = new Set(
      (await prisma.blacklistedEmployer.findMany()).map((b) => b.id)
    );
    const { items, found } = await searchVacancies({
      text: body.text ?? "",
      area: body.area || undefined,
      salary: body.salary ? Number(body.salary) : undefined,
      onlyWithSalary: Boolean(body.onlyWithSalary),
      remote: Boolean(body.remote),
    });

    let saved = 0;
    for (const v of items) {
      const { score, details } = scoreVacancy(v, role, {
        blacklistedEmployerIds: blacklist,
        minSalary: body.salary ? Number(body.salary) : undefined,
      });
      const data = {
        name: v.name,
        employerId: v.employer?.id ?? null,
        employerName: v.employer?.name ?? "—",
        areaName: v.area?.name ?? null,
        salaryFrom: v.salary?.from ?? null,
        salaryTo: v.salary?.to ?? null,
        currency: v.salary?.currency ?? null,
        url: v.alternate_url,
        description: [v.snippet?.responsibility, v.snippet?.requirement]
          .filter(Boolean)
          .join(" "),
        publishedAt: v.published_at ? new Date(v.published_at) : null,
        hasTest: Boolean(v.has_test),
        score,
        scoreDetails: JSON.stringify(details),
      };
      await prisma.vacancy.upsert({
        where: { id: v.id },
        create: { id: v.id, ...data },
        update: data,
      });
      saved++;
    }
    return NextResponse.json({ found, saved });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
