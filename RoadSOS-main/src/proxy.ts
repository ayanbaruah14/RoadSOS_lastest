import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Public routes that don't require authentication
const publicPaths = ["/login", "/signup", "/api/auth/login", "/api/auth/register"];

function isPublicPath(pathname: string): boolean {
  return publicPaths.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Get the token from cookies
  const token = request.cookies.get("token")?.value;

  // If the user is on a public route
  if (isPublicPath(pathname)) {
    // If they're already authenticated and trying to access login/signup,
    // redirect them to the home page (which will then redirect based on role)
    if (token && (pathname === "/login" || pathname === "/signup")) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  // For the root path: if no token, redirect to signup
  // If token exists, let the page handle role-based redirect
  if (pathname === "/") {
    if (!token) {
      return NextResponse.redirect(new URL("/signup", request.url));
    }
    return NextResponse.next();
  }

  // For all other protected routes: if no token, redirect to signup
  if (!token) {
    return NextResponse.redirect(new URL("/signup", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
