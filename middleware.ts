import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const { nextUrl, nextauth } = req;
    const isLoggedIn = !!nextauth?.token;
    const pathname = nextUrl.pathname;

    const isAuthPage =
      pathname.startsWith("/auth/signin") ||
      pathname.startsWith("/auth/signup");

    const isLandingPage = pathname === "/"; // ✅ Add this

    const isPublicReserveEndpoint =
      pathname.startsWith("/api/orders/") && pathname.endsWith("/reserve");

    if (isPublicReserveEndpoint) {
      return NextResponse.next();
    }

    // ✅ Redirect logged-in users from landing page to dashboard
    if (isLoggedIn && isLandingPage) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    // Redirect logged-in users away from auth pages
    if (isLoggedIn && isAuthPage) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;

        // ✅ Allow landing page for everyone
        if (pathname === "/") {
          return true;
        }

        // ✅ Always allow auth pages, even if not logged in
        if (
          pathname.startsWith("/auth/signin") ||
          pathname.startsWith("/auth/signup")
        ) {
          return true;
        }

        // ✅ Protect everything else
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    "/", // ✅ Add landing page to matcher
    "/auth/signin",
    "/auth/signup",
    "/dashboard/:path*",
    "/api/inventory/:path*",
    "/api/products/:path*",
  ],
};
