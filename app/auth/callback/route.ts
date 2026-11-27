import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requestBaseUrl, safeNextPath } from "@/lib/request-base-url";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const next = request.nextUrl.searchParams.get("next");
  const base = requestBaseUrl(request);
  const safeNext = safeNextPath(next, base);
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(safeNext, base));
  }
  return NextResponse.redirect(new URL("/login", base));
}
