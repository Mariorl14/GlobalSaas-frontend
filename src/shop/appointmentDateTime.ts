import {
  hhmmValue,
  joinDateTimeLocal,
  snapToBookingMinute,
} from "../public-booking/formatters";

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
