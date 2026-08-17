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

const WEEKDAYS_SHORT_ES = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
const MONTHS_SHORT_ES = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
];

/** Allowed minutes for booking / walk-in / cita pickers (includes on-the-hour). */
export const BOOKING_MINUTES = [0, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55] as const;

export type BookingMinute = (typeof BOOKING_MINUTES)[number];

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** 24h clock → "9 AM" or "9:10 PM" without Date/Intl. */
export function formatClock12h(hour24: number, minute: number): string {
  const h24 = ((Math.floor(hour24) % 24) + 24) % 24;
  const m = Math.max(0, Math.min(59, Math.floor(minute)));
  const period = h24 >= 12 ? "PM" : "AM";
  let h12 = h24 % 12;
  if (h12 === 0) h12 = 12;
  if (m === 0) return `${h12} ${period}`;
  return `${h12}:${pad2(m)} ${period}`;
}

export function hhmmValue(hour24: number, minute: number): string {
  return `${pad2(((Math.floor(hour24) % 24) + 24) % 24)}:${pad2(Math.floor(minute))}`;
}

export function parseHhmm(value: string | null | undefined): { hour: number; minute: number } | null {
  if (!value) return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(value).trim());
  if (!m) return null;
  const hour = Number(m[1]);
  const minute = Number(m[2]);
  if (!Number.isFinite(hour) || !Number.isFinite(minute) || hour > 23 || minute > 59) {
    return null;
  }
  return { hour, minute };
}

/** Every allowed clock time in a day for `<select>` pickers. */
export function allDayTimeOptions(): { value: string; label: string }[] {
  const out: { value: string; label: string }[] = [];
  for (let h = 0; h < 24; h += 1) {
    for (const minute of BOOKING_MINUTES) {
      out.push({
        value: hhmmValue(h, minute),
        label: formatClock12h(h, minute),
      });
    }
  }
  return out;
}

const DAY_TIME_OPTIONS = allDayTimeOptions();

export function dayTimeOptions(): { value: string; label: string }[] {
  return DAY_TIME_OPTIONS;
}

export function isAllowedBookingMinute(minute: number): boolean {
  return (BOOKING_MINUTES as readonly number[]).includes(minute);
}

export function snapToBookingMinute(minute: number): number {
  let best: number = BOOKING_MINUTES[0];
  let bestDist = Math.abs(minute - best);
  for (const m of BOOKING_MINUTES) {
    const d = Math.abs(minute - m);
    if (d < bestDist) {
      best = m;
      bestDist = d;
    }
  }
  return best;
}

/** Ensure "HH:mm" is on the booking grid (snap minute if needed). */
export function normalizeBookingHhmm(value: string | null | undefined): string {
  const parsed = parseHhmm(value);
  if (!parsed) return "";
  return hhmmValue(parsed.hour, snapToBookingMinute(parsed.minute));
}

export function splitDateTimeLocal(value: string | null | undefined): { date: string; time: string } {
  if (!value) return { date: "", time: "" };
  const raw = String(value);
  const date = raw.slice(0, 10);
  const timePart = raw.length >= 16 ? raw.slice(11, 16) : "";
  return { date: /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : "", time: normalizeBookingHhmm(timePart) };
}

export function joinDateTimeLocal(date: string, time: string): string {
  if (!date || !time) return "";
  return `${date}T${normalizeBookingHhmm(time) || time}`;
}

/**
 * "2026-08-12T15:30:00" → "3:30 PM" without Date/Intl (Huawei ICU crashes).
 * On the hour → "3 PM".
 */
export function timeFromIso(iso: string | null | undefined): string {
  if (!iso) return "—";
  const raw = String(iso);
  const tPos = raw.indexOf("T");
  const spPos = raw.indexOf(" ");
  const cut = tPos >= 0 ? tPos : spPos;
  const rest = cut >= 0 ? raw.slice(cut + 1) : raw;
  const hhmm = rest.slice(0, 5);
  const parsed = parseHhmm(hhmm);
  if (!parsed) return "—";
  return formatClock12h(parsed.hour, parsed.minute);
}

/** Short date + 12h time for lists (no Intl hour formatting). */
export function dateTimeShortFromIso(iso: string | null | undefined): string {
  if (!iso) return "—";
  const dayPart = String(iso).slice(0, 10);
  const bits = dayPart.split("-");
  if (bits.length !== 3) return timeFromIso(iso);
  const year = Number(bits[0]);
  const month = Number(bits[1]);
  const day = Number(bits[2]);
  if (!year || !month || !day) return timeFromIso(iso);
  const weekday = WEEKDAYS_SHORT_ES[new Date(year, month - 1, day).getDay()] || "";
  const monthName = MONTHS_SHORT_ES[month - 1] || "";
  return `${weekday} ${day} ${monthName} · ${timeFromIso(iso)}`;
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
