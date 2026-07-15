import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { API_BASE_URL } from "../../config";
import { rememberAppointmentIds } from "../appointmentAlerts";
import {
  IconPlus,
  IconTrash,
  IconClose,
  IconCalendar,
  IconAlert,
  IconSearch,
} from "../icons";
import { playAppointmentChime, unlockShopAudio } from "../sound";

type Appointment = {
  id: string;
  client_id: string;
  service_type_id: string;
  employee_id: string;
  client_name: string;
  start_time: string | null;
  end_time: string | null;
  status: string;
  notes: string | null;
};

type Opt = { id: string; name?: string; first_name?: string; last_name?: string; email?: string };

function statusClass(status: string): string {
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

function railClass(status: string): string {
  const s = status.toLowerCase().replace("cancelled", "canceled");
  return `bp-appt-card__rail bp-appt-card__rail--${s}`;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

type Period = "week" | "today" | "two_weeks" | "month" | "all" | "custom";

function startOfLocalDay(d = new Date()): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfLocalDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function rangeForPeriod(
  period: Period,
  customFrom: string,
  customTo: string,
): { from?: string; to?: string } {
  const today = startOfLocalDay();

  if (period === "all") return {};

  if (period === "today") {
    return { from: today.toISOString(), to: endOfLocalDay(today).toISOString() };
  }

  if (period === "week") {
    const end = new Date(today);
    end.setDate(end.getDate() + 6);
    return { from: today.toISOString(), to: endOfLocalDay(end).toISOString() };
  }

  if (period === "two_weeks") {
    const end = new Date(today);
    end.setDate(end.getDate() + 13);
    return { from: today.toISOString(), to: endOfLocalDay(end).toISOString() };
  }

  if (period === "month") {
    const end = new Date(today);
    end.setMonth(end.getMonth() + 1);
    end.setDate(end.getDate() - 1);
    return { from: today.toISOString(), to: endOfLocalDay(end).toISOString() };
  }

  // custom
  const params: { from?: string; to?: string } = {};
  if (customFrom) params.from = new Date(customFrom).toISOString();
  if (customTo) params.to = new Date(customTo).toISOString();
  return params;
}

export function AppointmentsPage() {
  const [items, setItems] = useState<Appointment[]>([]);
  const [clients, setClients] = useState<Opt[]>([]);
  const [services, setServices] = useState<Opt[]>([]);
  const [staff, setStaff] = useState<
    { employee_id: string; email: string | null; display_name: string | null }[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [period, setPeriod] = useState<Period>("week");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [statusF, setStatusF] = useState("");
  const [search, setSearch] = useState("");
  const [panelOpen, setPanelOpen] = useState(false);
  const [clientMode, setClientMode] = useState<"existing" | "new">("existing");
  const [newClient, setNewClient] = useState({
    first_name: "",
    last_name: "",
    phone: "",
  });
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    client_id: "",
    service_type_id: "",
    employee_id: "",
    start: "",
    end: "",
    status: "scheduled",
    notes: "",
  });

  const loadRefs = useCallback(async () => {
    const [c, s, t] = await Promise.all([
      axios.get<{ items: Opt[] }>(`${API_BASE_URL}/api/shop/clients`),
      axios.get<{ items: Opt[] }>(`${API_BASE_URL}/api/shop/services`),
      axios.get<{
        items: { employee_id: string; email: string | null; display_name: string | null }[];
      }>(`${API_BASE_URL}/api/shop/staff`),
    ]);
    setClients(c.data.items);
    setServices(s.data.items);
    setStaff(t.data.items);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const range = rangeForPeriod(period, customFrom, customTo);
      const params: Record<string, string> = {};
      if (range.from) params.from = range.from;
      if (range.to) params.to = range.to;
      if (statusF) params.status = statusF;
      const res = await axios.get<{ items: Appointment[] }>(
        `${API_BASE_URL}/api/shop/appointments`,
        { params },
      );
      const sorted = [...res.data.items].sort((a, b) => {
        const ta = a.start_time ? new Date(a.start_time).getTime() : 0;
        const tb = b.start_time ? new Date(b.start_time).getTime() : 0;
        return period === "all" ? tb - ta : ta - tb;
      });
      setItems(sorted);
    } catch {
      setErr("Error al cargar citas.");
    } finally {
      setLoading(false);
    }
  }, [period, customFrom, customTo, statusF]);

  useEffect(() => {
    void loadRefs();
  }, [loadRefs]);

  useEffect(() => {
    if (period === "custom" && !customFrom && !customTo) return;
    void load();
  }, [load, period, customFrom, customTo]);

  const resetPanel = () => {
    setForm({
      client_id: "",
      service_type_id: "",
      employee_id: "",
      start: "",
      end: "",
      status: "scheduled",
      notes: "",
    });
    setClientMode("existing");
    setNewClient({ first_name: "", last_name: "", phone: "" });
    setErr(null);
  };

  const create = async () => {
    setErr(null);
    if (!form.service_type_id || !form.employee_id || !form.start || !form.end) {
      setErr("Completa servicio, staff e horario.");
      return;
    }

    setSaving(true);
    try {
      let clientId = form.client_id;
      if (clientMode === "new") {
        const fn = newClient.first_name.trim();
        const ln = newClient.last_name.trim() || "—";
        const phone = newClient.phone.trim();
        if (!fn || !phone) {
          setErr("Para un cliente nuevo indica al menos nombre y teléfono.");
          return;
        }
        const created = await axios.post<{ id: string }>(`${API_BASE_URL}/api/shop/clients`, {
          first_name: fn,
          last_name: ln,
          phone,
        });
        clientId = created.data.id;
        await loadRefs();
      } else if (!clientId) {
        setErr("Selecciona un cliente o crea uno nuevo.");
        return;
      }

      const createdAppt = await axios.post<{ id: string }>(
        `${API_BASE_URL}/api/shop/appointments`,
        {
          client_id: clientId,
          service_type_id: form.service_type_id,
          employee_id: form.employee_id,
          start_time: new Date(form.start).toISOString(),
          end_time: new Date(form.end).toISOString(),
          status: form.status,
          notes: form.notes || undefined,
        },
      );
      if (createdAppt.data?.id) {
        rememberAppointmentIds([createdAppt.data.id]);
      }
      playAppointmentChime();
      resetPanel();
      setPanelOpen(false);
      await load();
    } catch (e: unknown) {
      const msg =
        axios.isAxiosError(e) && e.response?.data && typeof e.response.data === "object"
          ? (e.response.data as { error?: string }).error
          : "No se pudo crear.";
      setErr(msg ?? "No se pudo crear.");
    } finally {
      setSaving(false);
    }
  };

  const patchStatus = async (id: string, status: string) => {
    const a = items.find((x) => x.id === id);
    if (!a || !a.start_time || !a.end_time) return;
    try {
      await axios.put(`${API_BASE_URL}/api/shop/appointments/${id}`, {
        status,
        start_time: a.start_time,
        end_time: a.end_time,
      });
      await load();
    } catch {
      setErr("No se pudo actualizar estado.");
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm("¿Eliminar esta cita?")) return;
    try {
      await axios.delete(`${API_BASE_URL}/api/shop/appointments/${id}`);
      await load();
    } catch {
      setErr("No se pudo eliminar.");
    }
  };

  const serviceName = useCallback(
    (id: string) => services.find((s) => s.id === id)?.name ?? "Servicio",
    [services],
  );

  const staffLabel = useCallback(
    (id: string) => {
      const s = staff.find((x) => x.employee_id === id);
      if (!s) return "Staff";
      return s.display_name?.trim() || s.email?.split("@")[0] || "Staff";
    },
    [staff],
  );

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((a) => a.client_name.toLowerCase().includes(q));
  }, [items, search]);

  const grouped = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    for (const a of visible) {
      const key = a.start_time
        ? new Date(a.start_time).toLocaleDateString("es-MX", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })
        : "Sin fecha";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(a);
    }
    return Array.from(map.entries());
  }, [visible]);

  return (
    <div>
      <div className="bp-page__head">
        <div>
          <h1 className="bp-page__title">Citas</h1>
          <p className="bp-page__subtitle">
            Próximos 7 días por defecto. Cambia el periodo cuando necesites ver más.
          </p>
        </div>
        <div className="bp-page__actions">
          <button
            type="button"
            className="bp-btn bp-btn--primary"
            onClick={() => {
              unlockShopAudio();
              resetPanel();
              setPanelOpen(true);
            }}
          >
            <IconPlus />
            Nueva cita
          </button>
        </div>
      </div>

      {err && !panelOpen ? (
        <div className="bp-alert bp-alert--error" style={{ marginBottom: 16 }}>
          <IconAlert />
          <span>{err}</span>
        </div>
      ) : null}

      <div className="bp-toolbar">
        <div className="bp-toolbar__search">
          <IconSearch />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por cliente…"
          />
        </div>
        <select
          className="bp-select"
          style={{ width: 180 }}
          value={period}
          onChange={(e) => setPeriod(e.target.value as Period)}
          aria-label="Periodo"
        >
          <option value="week">Próximos 7 días</option>
          <option value="today">Hoy</option>
          <option value="two_weeks">Próximas 2 semanas</option>
          <option value="month">Próximo mes</option>
          <option value="custom">Personalizado</option>
          <option value="all">Todo el historial</option>
        </select>
        {period === "custom" ? (
          <>
            <input
              className="bp-input"
              style={{ width: 190 }}
              type="datetime-local"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              title="Desde"
            />
            <input
              className="bp-input"
              style={{ width: 190 }}
              type="datetime-local"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              title="Hasta"
            />
          </>
        ) : null}
        <select className="bp-select" style={{ width: 160 }} value={statusF} onChange={(e) => setStatusF(e.target.value)}>
          <option value="">Todos los estados</option>
          <option value="scheduled">Programada</option>
          <option value="confirmed">Confirmada</option>
          <option value="completed">Completada</option>
          <option value="canceled">Cancelada</option>
          <option value="no_show">No asistió</option>
        </select>
      </div>

      {loading && items.length === 0 ? (
        <div className="bp-appt-list">
          {[0, 1, 2].map((i) => (
            <div className="bp-appt-card" key={i}>
              <div className="bp-appt-card__rail" />
              <div style={{ flex: 1 }}>
                <span className="bp-skeleton" style={{ width: "30%" }} />
                <span className="bp-skeleton" style={{ width: "50%", marginTop: 8, display: "block" }} />
              </div>
            </div>
          ))}
        </div>
      ) : grouped.length === 0 ? (
        <div className="bp-card">
          <div className="bp-empty">
            <div className="bp-empty__icon">
              <IconCalendar />
            </div>
            <div className="bp-empty__title">
              {period === "week" ? "Sin citas esta semana" : "No hay citas con estos filtros"}
            </div>
            <div className="bp-empty__text">
              {period === "week"
                ? "Tu agenda de los próximos 7 días está libre. Crea una cita o revisa todo el historial."
                : "Ajusta el periodo o crea una nueva cita para comenzar."}
            </div>
            <button type="button" className="bp-btn bp-btn--primary bp-btn--sm" onClick={() => { resetPanel(); setPanelOpen(true); }}>
              <IconPlus />
              Nueva cita
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 28 }}>
          {grouped.map(([day, list]) => (
            <section key={day}>
              <h2
                style={{
                  margin: "0 0 12px",
                  fontSize: 13,
                  fontWeight: 650,
                  color: "var(--bp-text-secondary)",
                  textTransform: "capitalize",
                  letterSpacing: "0.02em",
                }}
              >
                {day}
              </h2>
              <div className="bp-appt-list">
                {list.map((a) => (
                  <div className="bp-appt-card" key={a.id}>
                    <div className={railClass(a.status)} />
                    <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
                      <div className="bp-avatar">{initials(a.client_name)}</div>
                      <div style={{ minWidth: 0 }}>
                        <div className="bp-appt-card__time">
                          {a.start_time
                            ? new Date(a.start_time).toLocaleTimeString("es-MX", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "—"}
                          {a.end_time
                            ? ` – ${new Date(a.end_time).toLocaleTimeString("es-MX", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}`
                            : ""}
                        </div>
                        <div className="bp-appt-card__client">{a.client_name}</div>
                        <div className="bp-appt-card__meta">
                          {serviceName(a.service_type_id)} · {staffLabel(a.employee_id)}
                          {a.notes ? ` · ${a.notes}` : ""}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
                      <span className={`bp-badge ${statusClass(a.status)}`}>
                        <span className="bp-badge__dot" />
                        {statusLabel(a.status)}
                      </span>
                      <select
                        className="bp-select"
                        style={{ width: 140, padding: "6px 28px 6px 10px", fontSize: 13 }}
                        value={a.status}
                        onChange={(e) => void patchStatus(a.id, e.target.value)}
                      >
                        <option value="scheduled">Programada</option>
                        <option value="confirmed">Confirmada</option>
                        <option value="completed">Completada</option>
                        <option value="canceled">Cancelada</option>
                        <option value="no_show">No asistió</option>
                      </select>
                      <button
                        type="button"
                        className="bp-btn bp-btn--danger bp-btn--sm"
                        onClick={() => void remove(a.id)}
                        title="Eliminar"
                      >
                        <IconTrash />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {panelOpen ? (
        <>
          <div
            className="bp-panel__overlay"
            onClick={() => {
              setPanelOpen(false);
              resetPanel();
            }}
          />
          <div className="bp-panel bp-panel--wide" role="dialog" aria-modal="true">
            <div className="bp-panel__header">
              <div>
                <h2 className="bp-panel__title">Nueva cita</h2>
                <p className="bp-panel__subtitle">Reserva un horario para un cliente de tu negocio.</p>
              </div>
              <button
                type="button"
                className="bp-icon-btn"
                onClick={() => {
                  setPanelOpen(false);
                  resetPanel();
                }}
                aria-label="Cerrar"
              >
                <IconClose />
              </button>
            </div>
            <div className="bp-panel__body">
              {err ? (
                <div className="bp-alert bp-alert--error">
                  <IconAlert />
                  <span>{err}</span>
                </div>
              ) : null}
              <div className="bp-field">
                <label className="bp-label">Cliente</label>
                <div className="bp-seg" role="tablist" aria-label="Tipo de cliente">
                  <button
                    type="button"
                    role="tab"
                    className={clientMode === "existing" ? "is-active" : ""}
                    aria-selected={clientMode === "existing"}
                    onClick={() => setClientMode("existing")}
                  >
                    Existente
                  </button>
                  <button
                    type="button"
                    role="tab"
                    className={clientMode === "new" ? "is-active" : ""}
                    aria-selected={clientMode === "new"}
                    onClick={() => setClientMode("new")}
                  >
                    Cliente nuevo
                  </button>
                </div>
              </div>
              {clientMode === "existing" ? (
                <div className="bp-field">
                  <select
                    className="bp-select"
                    value={form.client_id}
                    onChange={(e) => setForm((f) => ({ ...f, client_id: e.target.value }))}
                  >
                    <option value="">Selecciona un cliente</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {(c.first_name ?? "") + " " + (c.last_name ?? "")}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="bp-field__row">
                  <div className="bp-field">
                    <label className="bp-label">Nombre</label>
                    <input
                      className="bp-input"
                      placeholder="Ej. María"
                      value={newClient.first_name}
                      onChange={(e) =>
                        setNewClient((c) => ({ ...c, first_name: e.target.value }))
                      }
                    />
                  </div>
                  <div className="bp-field">
                    <label className="bp-label">Apellido</label>
                    <input
                      className="bp-input"
                      placeholder="Opcional"
                      value={newClient.last_name}
                      onChange={(e) =>
                        setNewClient((c) => ({ ...c, last_name: e.target.value }))
                      }
                    />
                  </div>
                  <div className="bp-field" style={{ gridColumn: "1 / -1" }}>
                    <label className="bp-label">Teléfono</label>
                    <input
                      className="bp-input"
                      placeholder="Para contactar / WhatsApp"
                      value={newClient.phone}
                      onChange={(e) =>
                        setNewClient((c) => ({ ...c, phone: e.target.value }))
                      }
                    />
                  </div>
                </div>
              )}
              <div className="bp-field">
                <label className="bp-label">Servicio</label>
                <select
                  className="bp-select"
                  value={form.service_type_id}
                  onChange={(e) => setForm((f) => ({ ...f, service_type_id: e.target.value }))}
                >
                  <option value="">Selecciona un servicio</option>
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="bp-field">
                <label className="bp-label">Barbero / staff</label>
                <select
                  className="bp-select"
                  value={form.employee_id}
                  onChange={(e) => setForm((f) => ({ ...f, employee_id: e.target.value }))}
                >
                  <option value="">Selecciona staff</option>
                  {staff.map((s) => (
                    <option key={s.employee_id} value={s.employee_id}>
                      {s.display_name?.trim() || s.email?.split("@")[0] || "Staff"}
                    </option>
                  ))}
                </select>
              </div>
              <div className="bp-field__row">
                <div className="bp-field">
                  <label className="bp-label">Inicio</label>
                  <input
                    className="bp-input"
                    type="datetime-local"
                    value={form.start}
                    onChange={(e) => setForm((f) => ({ ...f, start: e.target.value }))}
                  />
                </div>
                <div className="bp-field">
                  <label className="bp-label">Fin</label>
                  <input
                    className="bp-input"
                    type="datetime-local"
                    value={form.end}
                    onChange={(e) => setForm((f) => ({ ...f, end: e.target.value }))}
                  />
                </div>
              </div>
              <div className="bp-field">
                <label className="bp-label">Estado inicial</label>
                <select
                  className="bp-select"
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                >
                  <option value="scheduled">Programada</option>
                  <option value="confirmed">Confirmada</option>
                  <option value="completed">Completada</option>
                  <option value="canceled">Cancelada</option>
                  <option value="no_show">No asistió</option>
                </select>
              </div>
              <div className="bp-field">
                <label className="bp-label">Notas</label>
                <input
                  className="bp-input"
                  placeholder="Opcional"
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                />
              </div>
            </div>
            <div className="bp-panel__footer">
              <button
                type="button"
                className="bp-btn bp-btn--secondary"
                onClick={() => {
                  setPanelOpen(false);
                  resetPanel();
                }}
                disabled={saving}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="bp-btn bp-btn--primary"
                onClick={() => void create()}
                disabled={saving}
              >
                {saving ? "Creando…" : "Crear cita"}
              </button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
