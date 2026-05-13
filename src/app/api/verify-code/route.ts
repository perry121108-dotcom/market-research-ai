import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "請求格式錯誤" }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "請求格式錯誤" }, { status: 400 });
  }

  const { code } = body as Record<string, unknown>;

  if (typeof code !== "string" || code.trim().length === 0) {
    return NextResponse.json({ error: "請輸入授權碼" }, { status: 400 });
  }

  if (code.length > 64) {
    return NextResponse.json({ error: "授權碼格式錯誤" }, { status: 400 });
  }

  const rawCodes = process.env.VALID_ACCESS_CODES ?? "";
  const validCodes = rawCodes
    .split(",")
    .map((c) => c.trim())
    .filter((c) => c.length > 0);

  if (validCodes.length === 0) {
    return NextResponse.json({ error: "伺服器設定錯誤，請聯絡管理員" }, { status: 500 });
  }

  if (validCodes.includes(code.trim())) {
    return NextResponse.json({ valid: true });
  }

  return NextResponse.json({ valid: false, error: "授權碼無效或已使用" }, { status: 401 });
}
