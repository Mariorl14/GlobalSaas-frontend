import {
  hhmmValue,
  joinDateTimeLocal,
  snapToBookingMinute,
} from "../public-booking/formatters";

const pad2 = (n: number) => String(n).padStart(2, "0");

/**
 * Naive local ISO for shop APIs (`YYYY-MM-DDTHH:mm:ss`).
 * Matches walk-in, public booking, and backend insights (local wall-clock).
 */
export function toNaiveLocalIso(value: string | null | undefined): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  const m = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})(?::(\d{2}))?/.exec(raw);
  if (m) {
    return `${m[1]}T${m[2]}:${m[3] ?? "00"}`;
  }
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}:00`;
}

/** Format a Date as naive local ISO (no timezone suffix). */
export function dateToNaiveLocalIso(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}

export function localDayStartIso(d = new Date()): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T00:00:00`;
}

export function localDayEndIso(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T23:59:59`;
}

/** Default start: today, ~30 minutes from now, snapped to booking grid. */
export function defaultAppointmentStart(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() + 30, 0, 0);
  const snapped = snapToBookingMinute(d.getMinutes());
  const pad = (n: number) => String(n).padStart(2, "0");
  const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  return joinDateTimeLocal(date, hhmmValue(d.getHours(), snapped));
}

export function endFromStartAndDuration(start: string, durationMinutes: number): string {
  if (!start || durationMinutes <= 0) return "";
  const d = new Date(start);
  if (Number.isNaN(d.getTime())) return "";
  d.setMinutes(d.getMinutes() + durationMinutes);
  const pad = (n: number) => String(n).padStart(2, "0");
  const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  return joinDateTimeLocal(date, hhmmValue(d.getHours(), snapToBookingMinute(d.getMinutes())));
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
