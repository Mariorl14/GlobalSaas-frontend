export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:5000";

/** Canonical customer-facing origin (booking QR, copied links). No trailing slash. */
const CANONICAL_PUBLIC_APP_URL = "https://mrsolutionscostarica.com";

export function publicAppOrigin(): string {
  const fromEnv = String(import.meta.env.VITE_PUBLIC_APP_URL || "").replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host === "localhost" || host === "127.0.0.1") {
      return window.location.origin;
    }
  }
  return CANONICAL_PUBLIC_APP_URL;
}

export function publicBookingUrl(slug: string): string {
  const clean = (slug || "").trim();
  return `${publicAppOrigin()}/book/${clean}`;
}
