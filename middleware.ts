import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const { nextUrl, nextauth } = req;
    const isLoggedIn = !!nextauth?.token;
    const pathname = nextUrl.pathname;

    const isAuthPage =
      pathname === "/" ||
      pathname.startsWith("/login") ||
      pathname.startsWith("/signup");

    const isPublicReserveEndpoint =
      pathname.startsWith("/api/orders/") && pathname.endsWith("/reserve");

    // ✅ Skip auth check for /api/orders/[id]/reserve
    if (isPublicReserveEndpoint) {
      return NextResponse.next();
    }

    // ✅ Redirect logged-in users away from auth pages
    if (isLoggedIn && isAuthPage) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token, // Require login for other routes
    },
  }
);

export const config = {
  matcher: [
    "/dashboard/:path*",
    // "/api/orders/:path*",
    "/api/inventory/:path*",
    "/api/products/:path*",
  ],
};
