import { clerkMiddleware } from "@clerk/nextjs/server";

/**
 * Belt-and-braces with the `auth()` check inside the page: the page needs
 * `userId` for its query anyway, but gating here means an unauthenticated
 * request never reaches application code.
 *
 * Uses a plain path test rather than Clerk's `createRouteMatcher`, which is
 * deprecated in v7 and warns on every request.
 */
function isProtected(pathname: string): boolean {
  return pathname === "/dashboard" || pathname.startsWith("/dashboard/");
}

export default clerkMiddleware(async (auth, req) => {
  if (isProtected(req.nextUrl.pathname)) await auth.protect();
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/:path*",
  ],
};
