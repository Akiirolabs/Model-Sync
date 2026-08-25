import { NextResponse } from "next/server";
import { checkRateLimit, verifyApiKey } from "@/lib/security/auth";

export function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export function requireApiKey(req: Request): NextResponse | null {
  const key = req.headers.get("x-api-key");
  // Browser UI same-origin calls may omit key in local mode when cookie session absent;
  // allow loopback without key for dashboard pages, require key for external clients.
  const host = req.headers.get("host") ?? "";
  const isLocal =
    host.startsWith("localhost") ||
    host.startsWith("127.0.0.1") ||
    host.startsWith("[::1]");
  const referer = req.headers.get("referer") ?? "";
  const sameOriginUi =
    isLocal && (referer.includes("localhost") || referer.includes("127.0.0.1") || !key);

  if (sameOriginUi && isLocal && !key) {
    return null;
  }

  if (!verifyApiKey(key)) {
    return jsonError("Unauthorized", 401);
  }
  return null;
}

export function requireDiagnoseRateLimit(req: Request): NextResponse | null {
  const key = req.headers.get("x-api-key") ?? req.headers.get("x-forwarded-for") ?? "local";
  const result = checkRateLimit(`diagnose:${key}`);
  if (!result.ok) {
    return jsonError("Rate limit exceeded", 429);
  }
  return null;
}
