import { NextResponse } from "next/server";
import { generateAdvice, getCachedAdvice } from "@/lib/coach";

export const dynamic = "force-dynamic";
// генерация может занять до ~3 минут
export const maxDuration = 200;

// Последний закешированный совет
export async function GET() {
  const cached = await getCachedAdvice();
  return NextResponse.json(cached ?? { advice: null, at: null });
}

// Сгенерировать свежий совет (вызывает claude -p)
export async function POST() {
  const result = await generateAdvice();
  if (!result) {
    return NextResponse.json(
      { error: "Claude CLI недоступен — проверь, что команда `claude` работает и выполнен вход." },
      { status: 503 }
    );
  }
  return NextResponse.json(result);
}
