const MONTHS_ES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

const WEEKDAYS_ES = [
  "domingo",
  "lunes",
  "martes",
  "miércoles",
  "jueves",
  "viernes",
  "sábado",
];

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** "2026-08-12T15:30:00" → "15:30" without Date/Intl (Huawei ICU crashes). */
export function timeFromIso(iso: string | null | undefined): string {
  if (!iso) return "--:--";
  const raw = String(iso);
  const tPos = raw.indexOf("T");
  const spPos = raw.indexOf(" ");
  const cut = tPos >= 0 ? tPos : spPos;
  const rest = cut >= 0 ? raw.slice(cut + 1) : raw;
  const hhmm = rest.slice(0, 5);
  return /^\d{2}:\d{2}$/.test(hhmm) ? hhmm : "--:--";
}

export function monthTitleEs(year: number, month: number): string {
  const name = MONTHS_ES[month - 1] || "";
  return `${name} ${year}`;
}

export function dateLineEs(iso: string | null | undefined): string {
  if (!iso) return "—";
  const dayPart = String(iso).slice(0, 10);
  const bits = dayPart.split("-");
  if (bits.length !== 3) return dayPart;
  const year = Number(bits[0]);
  const month = Number(bits[1]);
  const day = Number(bits[2]);
  if (!year || !month || !day) return dayPart;
  const weekday = WEEKDAYS_ES[new Date(year, month - 1, day).getDay()] || "";
  const monthName = MONTHS_ES[month - 1] || "";
  return `${weekday} ${day} de ${monthName} de ${year}`;
}

export function isoDate(year: number, month: number, day: number): string {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}
