import { NextRequest, NextResponse } from "next/server";
import { exchangeCode } from "@/lib/hh";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.json({ error: "hh.ru не вернул code" }, { status: 400 });
  }
  try {
    await exchangeCode(code);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
  return NextResponse.redirect(new URL("/settings?connected=1", req.nextUrl.origin));
}
