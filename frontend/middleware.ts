import { NextResponse, type NextRequest } from "next/server";
import { getDashboardPath, getRequiredRoleForPath } from "./lib/auth";
import { createSupabaseMiddlewareClient, getRoleForUser, hasSupabaseServerConfig } from "./lib/auth-server";

const AUTH_PAGES = new Set(["/auth/login", "/auth/signup"]);
const AUTH_SETUP_PAGE = "/auth/setup";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next({
    request: {
      headers: req.headers,
    },
  });

  const pathname = req.nextUrl.pathname;

  if (!hasSupabaseServerConfig()) {
    if (pathname === AUTH_SETUP_PAGE) {
      return res;
    }
    return res;
  }

  if (pathname === AUTH_SETUP_PAGE) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = "/auth/login";
    loginUrl.search = "";
    return NextResponse.redirect(loginUrl);
  }

  const requiredRole = getRequiredRoleForPath(pathname);
  const supabase = createSupabaseMiddlewareClient(req, res);

  if (!supabase) {
    return res;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (requiredRole) {
    if (!user) {
      const loginUrl = req.nextUrl.clone();
      loginUrl.pathname = "/auth/login";
      loginUrl.searchParams.set("next", `${pathname}${req.nextUrl.search}`);
      return NextResponse.redirect(loginUrl);
    }

    const role = await getRoleForUser(supabase, user.id).catch(() => null);

    if (!role || role !== requiredRole) {
      const forbiddenUrl = req.nextUrl.clone();
      forbiddenUrl.pathname = "/403";
      forbiddenUrl.search = "";
      return NextResponse.redirect(forbiddenUrl);
    }

    return res;
  }

  if (AUTH_PAGES.has(pathname) && user) {
    const role = await getRoleForUser(supabase, user.id).catch(() => null);
    if (role) {
      const dashboardUrl = req.nextUrl.clone();
      dashboardUrl.pathname = getDashboardPath(role);
      dashboardUrl.search = "";
      return NextResponse.redirect(dashboardUrl);
    }
  }

  return res;
}

export const config = {
  matcher: ["/auth/login", "/auth/signup", "/auth/setup", "/donor/:path*", "/hospital/:path*", "/admin/:path*"],
};
