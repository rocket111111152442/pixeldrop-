import { NextResponse, type NextRequest } from "next/server";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const EXEMPT_PREFIXES = ["/api/auth", "/api/stripe/webhook"];

function originOf(value: string | null): string | null {
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

export function proxy(req: NextRequest) {
  if (SAFE_METHODS.has(req.method)) return NextResponse.next();
  if (EXEMPT_PREFIXES.some((p) => req.nextUrl.pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const requestOrigin =
    originOf(req.headers.get("origin")) ||
    originOf(req.headers.get("referer"));

  const allowedOrigins = new Set([req.nextUrl.origin]);
  const host = req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") || req.nextUrl.protocol.replace(":", "");
  if (host) {
    allowedOrigins.add(`${proto}://${host}`);
    const port = host.includes(":") ? `:${host.split(":").pop()}` : "";
    if (host.startsWith("127.0.0.1") || host.startsWith("localhost")) {
      allowedOrigins.add(`${proto}://127.0.0.1${port}`);
      allowedOrigins.add(`${proto}://localhost${port}`);
    }
  }
  const publicSite = process.env.NEXT_PUBLIC_SITE_URL || process.env.AUTH_URL;
  const publicOrigin = originOf(publicSite || null);
  if (publicOrigin) allowedOrigins.add(publicOrigin);

  if (!requestOrigin || !allowedOrigins.has(requestOrigin)) {
    return NextResponse.json(
      { error: "Requête refusée par la protection anti-CSRF." },
      { status: 403 },
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/api/:path*",
};
