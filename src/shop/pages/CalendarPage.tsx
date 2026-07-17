import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { API_BASE_URL } from "../../config";
import {
  IconAlert,
  IconCalendar,
  IconChevronLeft,
  IconChevronRight,
  IconClose,
  IconPlus,
} from "../icons";
import { staffLabel } from "../staffLabel";

type Appointment = {
  id: string;
  client_id: string;
  service_type_id: string;
  employee_id: string;
  client_name: string;
  client_email: string;
  client_phone: string;
  start_time: string | null;
  end_time: string | null;
  status: string;
  notes: string | null;
};

type StaffOpt = {
  employee_id: string;
  email: string | null;
  display_name: string | null;
  label?: string | null;
  full_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
};
type SvcOpt = { id: string; name?: string };

type ViewMode = "day" | "week";

const DAY_START_HOUR = 8;
const DAY_END_HOUR = 20;
const SLOT_MINUTES = 30;

function statusClass(status: string): string {
  const s = status.toLowerCase().replace("cancelled", "canceled");
  if (s === "confirmed") return "bp-cal-event--confirmed";
  if (s === "completed") return "bp-cal-event--completed";
  if (s === "canceled" || s === "no_show") return "bp-cal-event--canceled";
  return "bp-cal-event--scheduled";
}

function statusBadge(status: string): string {
  const s = status.toLowerCase();
  if (s === "confirmed") return "bp-badge--success";
  if (s === "completed") return "bp-badge--neutral";
  if (s === "canceled" || s === "cancelled" || s === "no_show") return "bp-badge--danger";
  return "bp-badge--info";
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    scheduled: "Programada",
    confirmed: "Confirmada",
    completed: "Completada",
    canceled: "Cancelada",
    cancelled: "Cancelada",
    no_show: "No asistió",
    pending: "Pendiente",
  };
  return map[status] ?? status;
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function mondayOf(d: Date): Date {
  const x = startOfDay(d);
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  return addDays(x, diff);
}

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function slots(): { label: string; minutes: number }[] {
  const out: { label: string; minutes: number }[] = [];
  for (let m = DAY_START_HOUR * 60; m < DAY_END_HOUR * 60; m += SLOT_MINUTES) {
    const h = Math.floor(m / 60);
    const mm = m % 60;
    out.push({
      label: `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`,
      minutes: m,
    });
  }
  return out;
}

function minutesOfDay(iso: string | null): number {
  if (!iso) return 0;
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes();
}

export function CalendarPage() {
  const [view, setView] = useState<ViewMode>("day");
  const [anchor, setAnchor] = useState(() => startOfDay(new Date()));
  const [items, setItems] = useState<Appointment[]>([]);
  const [staff, setStaff] = useState<StaffOpt[]>([]);
  const [services, setServices] = useState<SvcOpt[]>([]);
  const [employeeId, setEmployeeId] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Appointment | null>(null);
  const [saving, setSaving] = useState(false);

  const range = useMemo(() => {
    if (view === "day") {
      const from = startOfDay(anchor);
      const to = addDays(from, 1);
      to.setMilliseconds(-1);
      return { from, to };
    }
    const from = mondayOf(anchor);
    const to = addDays(from, 7);
    to.setMilliseconds(-1);
    return { from, to };
  }, [anchor, view]);

  const weekDays = useMemo(() => {
    const mon = mondayOf(anchor);
    return Array.from({ length: 7 }, (_, i) => addDays(mon, i));
  }, [anchor]);

  const loadRefs = useCallback(async () => {
    const [s, t] = await Promise.all([
      axios.get<{ items: SvcOpt[] }>(`${API_BASE_URL}/api/shop/services`),
      axios.get<{ items: StaffOpt[] }>(`${API_BASE_URL}/api/shop/staff`),
    ]);
    setServices(s.data.items);
    setStaff(t.data.items);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const params: Record<string, string> = {
        from: range.from.toISOString(),
        to: range.to.toISOString(),
      };
      if (employeeId) params.employee_id = employeeId;
      const res = await axios.get<{ items: Appointment[] }>(
        `${API_BASE_URL}/api/shop/appointments`,
        { params },
      );
      setItems(
        [...res.data.items].sort((a, b) => {
          const ta = a.start_time ? new Date(a.start_time).getTime() : 0;
          const tb = b.start_time ? new Date(b.start_time).getTime() : 0;
          return ta - tb;
        }),
      );
    } catch {
      setErr("No se pudo cargar el calendario.");
    } finally {
      setLoading(false);
    }
  }, [range, employeeId]);

  useEffect(() => {
    void loadRefs();
  }, [loadRefs]);

  useEffect(() => {
    void load();
  }, [load]);

  const serviceName = (id: string) => services.find((s) => s.id === id)?.name ?? "Servicio";
  const resolveStaffLabel = (id: string) => {
    const s = staff.find((x) => x.employee_id === id);
    if (!s) return "Staff";
    return staffLabel(s);
  };

  const dayItems = useMemo(() => {
    const key = startOfDay(anchor).toDateString();
    return items.filter(
      (a) => a.start_time && startOfDay(new Date(a.start_time)).toDateString() === key,
    );
  }, [items, anchor]);

  const patchStatus = async (id: string, status: string) => {
    const a = items.find((x) => x.id === id) ?? selected;
    if (!a?.start_time || !a.end_time) return;
    setSaving(true);
    try {
      await axios.put(`${API_BASE_URL}/api/shop/appointments/${id}`, {
        status,
        start_time: a.start_time,
        end_time: a.end_time,
      });
      await load();
      setSelected((prev) => (prev && prev.id === id ? { ...prev, status } : prev));
    } catch {
      setErr("No se pudo actualizar el estado.");
    } finally {
      setSaving(false);
    }
  };

  const reschedule = async () => {
    if (!selected?.start_time || !selected.end_time) return;
    setSaving(true);
    try {
      await axios.put(`${API_BASE_URL}/api/shop/appointments/${selected.id}`, {
        start_time: new Date(toLocalInput(selected.start_time)).toISOString(),
        end_time: new Date(toLocalInput(selected.end_time)).toISOString(),
        status: selected.status,
        notes: selected.notes,
      });
      await load();
      setSelected(null);
    } catch {
      setErr("No se pudo reprogramar.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm("¿Eliminar esta cita?")) return;
    try {
      await axios.delete(`${API_BASE_URL}/api/shop/appointments/${id}`);
      setSelected(null);
      await load();
    } catch {
      setErr("No se pudo eliminar.");
    }
  };

  const title =
    view === "day"
      ? anchor.toLocaleDateString("es-MX", {
          weekday: "long",
          day: "numeric",
          month: "long",
        })
      : `${weekDays[0].toLocaleDateString("es-MX", { day: "numeric", month: "short" })} – ${weekDays[6].toLocaleDateString("es-MX", { day: "numeric", month: "short" })}`;

  const slotList = slots();
  const pxPerMinute = 1.2;

  return (
    <div>
      <div className="bp-page__head">
        <div>
          <h1 className="bp-page__title">Calendario</h1>
          <p className="bp-page__subtitle">
            Vista operativa del día. Agenda visual para tu equipo.
          </p>
        </div>
        <div className="bp-page__actions">
          <Link to="/shop/appointments" className="bp-btn bp-btn--secondary">
            Lista de citas
          </Link>
          <Link to="/shop/appointments" className="bp-btn bp-btn--primary">
            <IconPlus />
            Nueva cita
          </Link>
        </div>
      </div>

      {err ? (
        <div className="bp-alert bp-alert--error" style={{ marginBottom: 16 }}>
          <IconAlert />
          <span>{err}</span>
        </div>
      ) : null}

      <div className="bp-cal-toolbar">
        <div className="bp-cal-toolbar__nav">
          <button
            type="button"
            className="bp-icon-btn"
            onClick={() => setAnchor(addDays(anchor, view === "day" ? -1 : -7))}
            aria-label="Anterior"
          >
            <IconChevronLeft />
          </button>
          <button
            type="button"
            className="bp-btn bp-btn--ghost bp-btn--sm"
            onClick={() => setAnchor(startOfDay(new Date()))}
          >
            Hoy
          </button>
          <button
            type="button"
            className="bp-icon-btn"
            onClick={() => setAnchor(addDays(anchor, view === "day" ? 1 : 7))}
            aria-label="Siguiente"
          >
            <IconChevronRight />
          </button>
          <h2 className="bp-cal-toolbar__title">{title}</h2>
        </div>
        <div className="bp-cal-toolbar__filters">
          <div className="bp-chart-tabs">
            <button type="button" className={view === "day" ? "is-active" : ""} onClick={() => setView("day")}>
              Día
            </button>
            <button type="button" className={view === "week" ? "is-active" : ""} onClick={() => setView("week")}>
              Semana
            </button>
          </div>
          <select
            className="bp-select"
            style={{ width: 200 }}
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
          >
            <option value="">Todo el equipo</option>
            {staff.map((s) => (
              <option key={s.employee_id} value={s.employee_id}>
                {staffLabel(s)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading && items.length === 0 ? (
        <div className="bp-card" style={{ minHeight: 320 }}>
          <div className="bp-empty">
            <span className="bp-skeleton" style={{ width: 180, height: 18 }} />
          </div>
        </div>
      ) : items.length === 0 ? (
        <div className="bp-card">
          <div className="bp-empty" style={{ padding: "48px 20px" }}>
            <div className="bp-empty__icon">
              <IconCalendar />
            </div>
            <div className="bp-empty__title">Agenda libre</div>
            <div className="bp-empty__text">
              No hay citas en este periodo. Crea la primera para llenar el calendario.
            </div>
            <Link to="/shop/appointments" className="bp-btn bp-btn--primary" style={{ marginTop: 12 }}>
              <IconPlus />
              Crear cita
            </Link>
          </div>
        </div>
      ) : view === "day" ? (
        <div className="bp-cal-day">
          <div className="bp-cal-day__rail">
            {slotList.map((s) => (
              <div key={s.label} className="bp-cal-day__slot-label" style={{ height: SLOT_MINUTES * pxPerMinute }}>
                {s.label}
              </div>
            ))}
          </div>
          <div
            className="bp-cal-day__grid"
            style={{ height: (DAY_END_HOUR - DAY_START_HOUR) * 60 * pxPerMinute }}
          >
            {slotList.map((s) => (
              <div
                key={s.label}
                className="bp-cal-day__line"
                style={{ top: (s.minutes - DAY_START_HOUR * 60) * pxPerMinute }}
              />
            ))}
            {dayItems.map((a) => {
              const startM = minutesOfDay(a.start_time);
              const endM = a.end_time ? minutesOfDay(a.end_time) : startM + 30;
              const top = Math.max(0, (startM - DAY_START_HOUR * 60) * pxPerMinute);
              const height = Math.max(28, (endM - startM) * pxPerMinute - 4);
              return (
                <button
                  type="button"
                  key={a.id}
                  className={`bp-cal-event ${statusClass(a.status)}`}
                  style={{ top, height }}
                  onClick={() => setSelected(a)}
                  draggable
                  title="Arrastra próximamente · clic para abrir"
                  onDragStart={(e) => {
                    e.dataTransfer.setData("text/appointment-id", a.id);
                    e.dataTransfer.effectAllowed = "move";
                  }}
                >
                  <strong>{a.client_name}</strong>
                  <span>{serviceName(a.service_type_id)}</span>
                  <span>{resolveStaffLabel(a.employee_id)}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="bp-cal-week">
          {weekDays.map((day) => {
            const key = day.toDateString();
            const list = items.filter(
              (a) => a.start_time && startOfDay(new Date(a.start_time)).toDateString() === key,
            );
            const isToday = key === startOfDay(new Date()).toDateString();
            return (
              <div key={key} className={`bp-cal-week__col ${isToday ? "is-today" : ""}`}>
                <div className="bp-cal-week__head">
                  <span>{day.toLocaleDateString("es-MX", { weekday: "short" })}</span>
                  <strong>{day.getDate()}</strong>
                </div>
                <div className="bp-cal-week__body">
                  {list.length === 0 ? (
                    <div className="bp-cal-week__empty">—</div>
                  ) : (
                    list.map((a) => (
                      <button
                        type="button"
                        key={a.id}
                        className={`bp-cal-week__event ${statusClass(a.status)}`}
                        onClick={() => setSelected(a)}
                      >
                        <span>
                          {a.start_time
                            ? new Date(a.start_time).toLocaleTimeString("es-MX", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : ""}
                        </span>
                        <strong>{a.client_name}</strong>
                        <em>{serviceName(a.service_type_id)}</em>
                      </button>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="bp-meta-note">
        Arrastrar para reprogramar: preparado en la UI. Por ahora usa el drawer para editar horario.
      </p>

      {selected ? (
        <>
          <div className="bp-panel__overlay" onClick={() => setSelected(null)} />
          <div className="bp-panel" role="dialog" aria-modal="true">
            <div className="bp-panel__header">
              <div>
                <h2 className="bp-panel__title">{selected.client_name}</h2>
                <p className="bp-panel__subtitle">{serviceName(selected.service_type_id)}</p>
              </div>
              <button type="button" className="bp-icon-btn" onClick={() => setSelected(null)}>
                <IconClose />
              </button>
            </div>
            <div className="bp-panel__body">
              <div style={{ marginBottom: 12 }}>
                <span className={`bp-badge ${statusBadge(selected.status)}`}>
                  {statusLabel(selected.status)}
                </span>
              </div>
              <div className="bp-field">
                <label className="bp-label">Teléfono</label>
                <div>{selected.client_phone || "—"}</div>
              </div>
              <div className="bp-field">
                <label className="bp-label">Email</label>
                <div>{selected.client_email || "—"}</div>
              </div>
              <div className="bp-field">
                <label className="bp-label">Barbero</label>
                <div>{resolveStaffLabel(selected.employee_id)}</div>
              </div>
              <div className="bp-field__row">
                <div className="bp-field">
                  <label className="bp-label">Inicio</label>
                  <input
                    className="bp-input"
                    type="datetime-local"
                    value={toLocalInput(selected.start_time)}
                    onChange={(e) =>
                      setSelected((s) =>
                        s ? { ...s, start_time: new Date(e.target.value).toISOString() } : s,
                      )
                    }
                  />
                </div>
                <div className="bp-field">
                  <label className="bp-label">Fin</label>
                  <input
                    className="bp-input"
                    type="datetime-local"
                    value={toLocalInput(selected.end_time)}
                    onChange={(e) =>
                      setSelected((s) =>
                        s ? { ...s, end_time: new Date(e.target.value).toISOString() } : s,
                      )
                    }
                  />
                </div>
              </div>
              <div className="bp-field">
                <label className="bp-label">Notas</label>
                <textarea
                  className="bp-textarea"
                  value={selected.notes ?? ""}
                  onChange={(e) =>
                    setSelected((s) => (s ? { ...s, notes: e.target.value } : s))
                  }
                />
              </div>
            </div>
            <div className="bp-panel__footer" style={{ flexWrap: "wrap", gap: 8 }}>
              <button
                type="button"
                className="bp-btn bp-btn--secondary bp-btn--sm"
                disabled={saving}
                onClick={() => void patchStatus(selected.id, "completed")}
              >
                Completar
              </button>
              <button
                type="button"
                className="bp-btn bp-btn--secondary bp-btn--sm"
                disabled={saving}
                onClick={() => void patchStatus(selected.id, "canceled")}
              >
                Cancelar cita
              </button>
              <button
                type="button"
                className="bp-btn bp-btn--danger bp-btn--sm"
                onClick={() => void remove(selected.id)}
              >
                Eliminar
              </button>
              <button
                type="button"
                className="bp-btn bp-btn--primary"
                disabled={saving}
                onClick={() => void reschedule()}
              >
                {saving ? "Guardando…" : "Guardar cambios"}
              </button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
