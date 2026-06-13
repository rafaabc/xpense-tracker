import { auth } from "@/lib/auth";

// Redirect unauthenticated users to landing page (US-02 BR1)
export const proxy = auth((req) => {
  if (!req.auth && req.nextUrl.pathname !== "/") {
    return Response.redirect(new URL("/", req.nextUrl.origin));
  }
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
