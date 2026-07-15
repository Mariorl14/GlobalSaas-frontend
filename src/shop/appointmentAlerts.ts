/**
 * Detect new appointments while the shop portal is open (e.g. public bookings)
 * and play a chime. Tracks seen IDs in sessionStorage for the browser tab.
 */

import { playAppointmentChime } from "./sound";

const STORAGE_KEY = "bp_seen_appointment_ids";
const WARMED_KEY = "bp_appointments_alerts_warmed";

function loadSeen(): Set<string> {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as string[];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function saveSeen(ids: Set<string>) {
  const arr = Array.from(ids).slice(-300);
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
  } catch {
    /* quota / private mode */
  }
}

let seen = loadSeen();

function isWarmed(): boolean {
  return sessionStorage.getItem(WARMED_KEY) === "1";
}

function markWarmed() {
  sessionStorage.setItem(WARMED_KEY, "1");
}

/** Remember IDs without playing (after creating a cita in-app). */
export function rememberAppointmentIds(ids: string[]) {
  for (const id of ids) {
    if (id) seen.add(id);
  }
  saveSeen(seen);
  markWarmed();
}

/**
 * Compare a fresh list of appointment IDs.
 * First call after tab open only warms the set; later new IDs play a chime.
 */
export function syncAppointmentIds(ids: string[]): boolean {
  const incoming = ids.filter(Boolean);
  if (!isWarmed()) {
    for (const id of incoming) seen.add(id);
    saveSeen(seen);
    markWarmed();
    return false;
  }

  let hasNew = false;
  for (const id of incoming) {
    if (!seen.has(id)) {
      hasNew = true;
      seen.add(id);
    }
  }
  if (hasNew) {
    saveSeen(seen);
    playAppointmentChime();
  }
  return hasNew;
}
