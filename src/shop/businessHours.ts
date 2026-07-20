/** Business weekly hours helpers for shop settings + schedule display. */

export const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export type DayKey = (typeof DAY_KEYS)[number];

export type DaySchedule = {
  open: boolean;
  openTime: string;
  closeTime: string;
};

export type WeeklySchedule = Record<DayKey, DaySchedule>;

export const DAY_LABELS: Record<DayKey, string> = {
  mon: "Lunes",
  tue: "Martes",
  wed: "Miércoles",
  thu: "Jueves",
  fri: "Viernes",
  sat: "Sábado",
  sun: "Domingo",
};

/** Sensible starter schedule when a shop has never configured hours. */
export function defaultWeeklySchedule(): WeeklySchedule {
  const week: WeeklySchedule = {
    mon: { open: true, openTime: "09:00", closeTime: "18:00" },
    tue: { open: true, openTime: "09:00", closeTime: "18:00" },
    wed: { open: true, openTime: "09:00", closeTime: "18:00" },
    thu: { open: true, openTime: "09:00", closeTime: "18:00" },
    fri: { open: true, openTime: "09:00", closeTime: "18:00" },
    sat: { open: true, openTime: "09:00", closeTime: "14:00" },
    sun: { open: false, openTime: "10:00", closeTime: "16:00" },
  };
  return week;
}

function normalizeHhmm(value: string, fallback: string): string {
  const v = (value || "").trim();
  if (/^\d{2}:\d{2}/.test(v)) return v.slice(0, 5);
  return fallback;
}

export function parseBusinessHoursJson(raw: string | null | undefined): WeeklySchedule {
  const base = defaultWeeklySchedule();
  if (!raw || !raw.trim()) return base;
  try {
    const data = JSON.parse(raw) as unknown;
    if (!data || typeof data !== "object" || Array.isArray(data)) return base;

    const obj = data as Record<string, unknown>;
    for (let i = 0; i < DAY_KEYS.length; i++) {
      const key = DAY_KEYS[i];
      const blocks = obj[key] ?? obj[String(i)];
      if (blocks === undefined) continue;
      if (!Array.isArray(blocks) || blocks.length === 0) {
        base[key] = {
          open: false,
          openTime: base[key].openTime,
          closeTime: base[key].closeTime,
        };
        continue;
      }
      const first = blocks[0];
      if (!first || typeof first !== "object") continue;
      const openTime = normalizeHhmm(String((first as { open?: string }).open ?? ""), base[key].openTime);
      const closeTime = normalizeHhmm(
        String((first as { close?: string }).close ?? ""),
        base[key].closeTime,
      );
      base[key] = { open: true, openTime, closeTime };
    }
    return base;
  } catch {
    return base;
  }
}

export function serializeWeeklySchedule(schedule: WeeklySchedule): string {
  const out: Record<string, { open: string; close: string }[]> = {};
  for (const key of DAY_KEYS) {
    const day = schedule[key];
    if (!day.open) {
      out[key] = [];
      continue;
    }
    out[key] = [
      {
        open: normalizeHhmm(day.openTime, "09:00"),
        close: normalizeHhmm(day.closeTime, "18:00"),
      },
    ];
  }
  return JSON.stringify(out);
}

export function validateWeeklySchedule(schedule: WeeklySchedule): string | null {
  for (const key of DAY_KEYS) {
    const day = schedule[key];
    if (!day.open) continue;
    const open = normalizeHhmm(day.openTime, "");
    const close = normalizeHhmm(day.closeTime, "");
    if (!open || !close) {
      return `${DAY_LABELS[key]}: indica hora de apertura y cierre.`;
    }
    if (close <= open) {
      return `${DAY_LABELS[key]}: el cierre debe ser después de la apertura.`;
    }
  }
  return null;
}

/** Short label like "Lun, Mar, Mié" or "Horario del negocio". */
export function summarizeWorkDays(raw: string | null | undefined): string {
  if (!raw || !raw.trim()) return "Horario del negocio";
  try {
    const data = JSON.parse(raw) as Record<string, unknown>;
    if (!data || typeof data !== "object") return "Horario personalizado";
    const short: Record<DayKey, string> = {
      mon: "Lun",
      tue: "Mar",
      wed: "Mié",
      thu: "Jue",
      fri: "Vie",
      sat: "Sáb",
      sun: "Dom",
    };
    const openDays = DAY_KEYS.filter((key) => {
      const blocks = data[key];
      return Array.isArray(blocks) && blocks.length > 0;
    });
    if (openDays.length === 0) return "Sin días laborales";
    if (openDays.length === 7) return "Todos los días";
    return openDays.map((k) => short[k]).join(", ");
  } catch {
    return "Horario personalizado";
  }
}
