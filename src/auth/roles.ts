import type { AuthUser } from "./session";

/** Platform operator (global). */
export function isSuperAdmin(u: AuthUser | null | undefined): boolean {
  return u?.role === "superadmin";
}

/**
 * Tenant user: shop admin (DB role `admin` → product: shop_admin) or staff (`employee` → barber_staff).
 */
export function isShopUser(u: AuthUser | null | undefined): boolean {
  if (!u?.business_id) return false;
  return u.role === "admin" || u.role === "employee";
}

export function isShopAdmin(u: AuthUser | null | undefined): boolean {
  return u?.role === "admin" && Boolean(u.business_id);
}
