/** Shared label for shop staff dropdowns and lists. */
export type StaffLike = {
  label?: string | null;
  display_name?: string | null;
  full_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
};

export function staffLabel(s: StaffLike | null | undefined, fallback = "Staff"): string {
  if (!s) return fallback;
  const fromLabel = (s.label || "").trim();
  if (fromLabel) return fromLabel;
  const fromDisplay = (s.display_name || "").trim();
  if (fromDisplay) return fromDisplay;
  const fromFull = (s.full_name || "").trim();
  if (fromFull) return fromFull;
  const parts = [s.first_name, s.last_name].map((p) => (p || "").trim()).filter(Boolean);
  if (parts.length) return parts.join(" ");
  const email = (s.email || "").trim();
  if (email.includes("@")) return email.split("@")[0];
  return fallback;
}

export function userDisplayName(user: {
  full_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
} | null | undefined): string {
  if (!user) return "Usuario";
  const full = (user.full_name || "").trim();
  if (full) return full;
  const parts = [user.first_name, user.last_name].map((p) => (p || "").trim()).filter(Boolean);
  if (parts.length) return parts.join(" ");
  const email = (user.email || "").trim();
  if (email.includes("@")) return email.split("@")[0];
  return "Usuario";
}
