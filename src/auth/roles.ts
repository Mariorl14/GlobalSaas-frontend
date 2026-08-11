import type { AuthUser } from "./session";

/** Platform operator (global). */
export function isSuperAdmin(u: AuthUser | null | undefined): boolean {
  return u?.role === "superadmin";
}

/**
 * Tenant user: owner, admin, or staff (`employee`).
 */
export function isShopUser(u: AuthUser | null | undefined): boolean {
  if (!u?.business_id) return false;
  return u.role === "owner" || u.role === "admin" || u.role === "employee";
}

/** Owner or admin — full shop management on their business. */
export function isShopAdmin(u: AuthUser | null | undefined): boolean {
  if (!u?.business_id) return false;
  return u.role === "owner" || u.role === "admin";
}

export function isShopOwner(u: AuthUser | null | undefined): boolean {
  return u?.role === "owner" && Boolean(u.business_id);
}

export function isShopStaff(u: AuthUser | null | undefined): boolean {
  return u?.role === "employee" && Boolean(u.business_id);
}

export function shopRoleLabel(role: string | null | undefined): string {
  if (role === "owner") return "Propietario";
  if (role === "admin") return "Administrador";
  if (role === "employee") return "Staff";
  return role || "Usuario";
}
