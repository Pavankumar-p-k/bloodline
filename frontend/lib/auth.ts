import type { AppRole } from "./types"

export type { AppRole }

export function isAppRole(role: string | null | undefined): role is AppRole {
  return role === "donor" || role === "hospital" || role === "admin"
}

export function getDashboardPath(role: AppRole): string {
  switch (role) {
    case "donor":
      return "/donor/dashboard"
    case "hospital":
      return "/hospital/dashboard"
    case "admin":
      return "/admin/dashboard"
  }
}

const rolePathMap: Record<string, AppRole> = {
  "/donor/dashboard": "donor",
  "/dashboard/donor": "donor",
  "/donor/register": "donor",
  "/hospital/dashboard": "hospital",
  "/dashboard/hospital": "hospital",
  "/dashboard/hospital/profile": "hospital",
  "/admin/dashboard": "admin",
  "/dashboard/admin": "admin",
}

export function getRequiredRoleForPath(pathname: string): AppRole | null {
  return rolePathMap[pathname] ?? null
}
