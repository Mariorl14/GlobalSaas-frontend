export type StaffSwatch = {
  bg: string;
  fg: string;
  accent: string;
};

/** Distinct palettes so each barber is recognizable on the calendar. */
export const STAFF_SWATCHES: StaffSwatch[] = [
  { bg: "#e0f2fe", fg: "#0c4a6e", accent: "#0284c7" },
  { bg: "#fce7f3", fg: "#9d174d", accent: "#db2777" },
  { bg: "#ecfdf5", fg: "#065f46", accent: "#059669" },
  { bg: "#fef3c7", fg: "#92400e", accent: "#d97706" },
  { bg: "#ede9fe", fg: "#5b21b6", accent: "#7c3aed" },
  { bg: "#ffedd5", fg: "#9a3412", accent: "#ea580c" },
  { bg: "#e0e7ff", fg: "#3730a3", accent: "#4f46e5" },
  { bg: "#ccfbf1", fg: "#115e59", accent: "#0d9488" },
  { bg: "#fee2e2", fg: "#991b1b", accent: "#dc2626" },
  { bg: "#f3e8ff", fg: "#6b21a8", accent: "#9333ea" },
  { bg: "#ecfeff", fg: "#155e75", accent: "#0891b2" },
  { bg: "#fef9c3", fg: "#854d0e", accent: "#ca8a04" },
];

export function staffSwatch(
  employeeId: string | null | undefined,
  roster: string[] = [],
): StaffSwatch {
  const id = employeeId || "";
  const fromRoster = roster.indexOf(id);
  if (fromRoster >= 0) {
    return STAFF_SWATCHES[fromRoster % STAFF_SWATCHES.length];
  }
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (Math.imul(h, 31) + id.charCodeAt(i)) | 0;
  }
  return STAFF_SWATCHES[Math.abs(h) % STAFF_SWATCHES.length];
}
