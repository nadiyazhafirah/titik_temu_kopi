import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const token = request.cookies.get("ttk_session")?.value;
  if (path.startsWith("/login")) {
    if (token) return NextResponse.redirect(new URL("/", request.url));
    return NextResponse.next();
  }
  if (path.startsWith("/api/auth/login") || path.startsWith("/api/auth/logout")) return NextResponse.next();
  if (path.startsWith("/api/") || path === "/") {
    if (!token) {
      if (path.startsWith("/api/")) return NextResponse.json({ message: "Silakan login terlebih dahulu." }, { status: 401 });
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }
  return NextResponse.next();
}

export const config = { matcher: ["/", "/login", "/api/:path*"] };
