import {
  hhmmValue,
  joinDateTimeLocal,
  parseHhmm,
  snapToBookingMinute,
  splitDateTimeLocal,
} from "../public-booking/formatters";

const pad2 = (n: number) => String(n).padStart(2, "0");

/**
 * Naive local ISO for shop APIs (`YYYY-MM-DDTHH:mm:ss`).
 * Matches walk-in, public booking, and backend insights (Costa Rica wall-clock).
 */
export function toNaiveLocalIso(value: string | null | undefined): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  const { date, time } = splitDateTimeLocal(raw);
  if (date && time) {
    const parsed = parseHhmm(time);
    if (parsed) {
      return `${date}T${hhmmValue(parsed.hour, parsed.minute)}:00`;
    }
  }
  return raw;
}

/** Format a Date as naive local ISO (browser local clock — Costa Rica users). */
export function dateToNaiveLocalIso(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}

export function localDayStartIso(d = new Date()): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T00:00:00`;
}

export function localDayEndIso(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T23:59:59`;
}

/** `YYYY-MM-DD` from a stored appointment timestamp (no Date parsing). */
export function appointmentLocalDate(iso: string | null | undefined): string {
  return splitDateTimeLocal(iso).date;
}

/** Minutes since midnight from stored appointment time (no Date parsing). */
export function appointmentMinutesOfDay(iso: string | null | undefined): number {
  const { time } = splitDateTimeLocal(iso);
  const parsed = parseHhmm(time);
  if (!parsed) return 0;
  return parsed.hour * 60 + parsed.minute;
}

/** Normalize API timestamp to `YYYY-MM-DDTHH:mm` for pickers. */
export function toDateTimeLocalValue(iso: string | null | undefined): string {
  const { date, time } = splitDateTimeLocal(iso);
  return joinDateTimeLocal(date, time);
}

/** Default start: today, ~30 minutes from now, snapped to booking grid. */
export function defaultAppointmentStart(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() + 30, 0, 0);
  const snapped = snapToBookingMinute(d.getMinutes());
  const date = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  return joinDateTimeLocal(date, hhmmValue(d.getHours(), snapped));
}

export function endFromStartAndDuration(start: string, durationMinutes: number): string {
  if (!start || durationMinutes <= 0) return "";
  const { date, time } = splitDateTimeLocal(start);
  if (!date || !time) return "";
  const parsed = parseHhmm(time);
  if (!parsed) return "";

  let totalMinutes = parsed.hour * 60 + parsed.minute + durationMinutes;
  const [year, month, day] = date.split("-").map(Number);
  const base = new Date(year, month - 1, day);
  while (totalMinutes >= 24 * 60) {
    totalMinutes -= 24 * 60;
    base.setDate(base.getDate() + 1);
  }
  while (totalMinutes < 0) {
    totalMinutes += 24 * 60;
    base.setDate(base.getDate() - 1);
  }
  const endDate = `${base.getFullYear()}-${pad2(base.getMonth() + 1)}-${pad2(base.getDate())}`;
  const endHour = Math.floor(totalMinutes / 60);
  const endMinute = snapToBookingMinute(totalMinutes % 60);
  return joinDateTimeLocal(endDate, hhmmValue(endHour, endMinute));
}

/** Use explicit end or derive from service duration. */
export function resolveAppointmentEnd(
  start: string,
  end: string,
  serviceDurationMinutes?: number,
): string {
  if (end) return end;
  if (start && serviceDurationMinutes) {
    return endFromStartAndDuration(start, serviceDurationMinutes);
  }
  return "";
}
