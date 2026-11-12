import type { NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Run on every request except Next.js internals, static assets, the
     * Serwist service worker route, and common file extensions.
     */
    "/((?!_next/static|_next/image|favicon.ico|icons/|serwist/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml|webmanifest)$).*)",
  ],
};
