import { NextResponse } from "next/server";
import { hhAuthUrl } from "@/lib/hh";

export function GET() {
  if (!process.env.HH_CLIENT_ID) {
    return NextResponse.json(
      { error: "Заполни HH_CLIENT_ID и HH_CLIENT_SECRET в .env (приложение регистрируется на dev.hh.ru)" },
      { status: 400 }
    );
  }
  return NextResponse.redirect(hhAuthUrl());
}
