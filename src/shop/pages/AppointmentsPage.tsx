import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
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
import { staffLabel } from "../staffLabel";
import { PaymentMethodField } from "../PaymentMethodField";
import {
  AppointmentCancelDialog,
  AppointmentRescheduleDialog,
} from "../AppointmentActionDialogs";
import { session } from "../../auth/session";
import { isShopStaff } from "../../auth/roles";
import { moneyExact } from "../../money";

type Appointment = {
  id: string;
  client_id: string;
  service_type_id: string;
  employee_id: string;
  client_name: string;
  client_email?: string | null;
  start_time: string | null;
  end_time: string | null;
  status: string;
  notes: string | null;
  source?: string | null;
};

type SvcOpt = Opt & { duration?: number; price?: number };

function todayLocalDate(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

const WALK_IN_HOURS = Array.from({ length: 24 }, (_, h) => h);

function walkInStartIso(date: string, hour: string): string {
  const h = String(Number(hour)).padStart(2, "0");
  return `${date}T${h}:00:00`;
}

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
    reschedule_pending: "Por confirmar",
  };
  return map[status] ?? status;
}

function railClass(status: string): string {
  const s = status.toLowerCase().replace("cancelled", "canceled");
  return `bp-appt-card__rail bp-appt-card__rail--${s}`;
}

function initials(name: string | null | undefined): string {
  if (!name?.trim()) return "?";
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
  const [searchParams, setSearchParams] = useSearchParams();
  const user = session.getUser();
  const staffOnly = isShopStaff(user);
  const myEmployeeId = user?.employee_id ?? "";
  const [items, setItems] = useState<Appointment[]>([]);
  const [clients, setClients] = useState<Opt[]>([]);
  const [services, setServices] = useState<SvcOpt[]>([]);
  const [staff, setStaff] = useState<
    { employee_id: string; email: string | null; display_name: string | null; label?: string | null; full_name?: string | null; first_name?: string | null; last_name?: string | null }[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [period, setPeriod] = useState<Period>("week");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [statusF, setStatusF] = useState("");
  const [search, setSearch] = useState("");
  const [panelOpen, setPanelOpen] = useState(false);
  const [walkInOpen, setWalkInOpen] = useState(false);
  const [walkIn, setWalkIn] = useState({
    name: "",
    phone: "",
    email: "",
    service_type_id: "",
    employee_id: "",
    payment_method: "",
    served_date: todayLocalDate(),
    served_hour: "",
  });
  const [clientMode, setClientMode] = useState<"existing" | "new">("existing");
  const [newClient, setNewClient] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    email: "",
  });
  const [saving, setSaving] = useState(false);
  const [completeTarget, setCompleteTarget] = useState<{
    id: string;
    start_time: string;
    end_time: string;
  } | null>(null);
  const [completePay, setCompletePay] = useState("");
  const [actionTarget, setActionTarget] = useState<{
    kind: "reschedule" | "cancel";
    appointment: Appointment;
  } | null>(null);

  const [form, setForm] = useState({
    client_id: "",
    service_type_id: "",
    employee_id: "",
    start: "",
    end: "",
    status: "scheduled",
    notes: "",
    payment_method: "",
  });

  const loadRefs = useCallback(async () => {
    const [c, s, t] = await Promise.all([
      axios.get<{ items: Opt[] }>(`${API_BASE_URL}/api/shop/clients`),
      axios.get<{ items: SvcOpt[] }>(`${API_BASE_URL}/api/shop/services`),
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

  const resetWalkIn = () => {
    setWalkIn({
      name: "",
      phone: "",
      email: "",
      service_type_id: "",
      employee_id: staffOnly ? myEmployeeId : "",
      payment_method: "",
      served_date: todayLocalDate(),
      served_hour: "",
    });
    setErr(null);
  };

  useEffect(() => {
    if (searchParams.get("walkin") !== "1") return;
    unlockShopAudio();
    resetWalkIn();
    setWalkInOpen(true);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete("walkin");
        return next;
      },
      { replace: true },
    );
  }, [searchParams, setSearchParams]);

  const submitWalkIn = async () => {
    setErr(null);
    const assignedEmployeeId = staffOnly ? myEmployeeId : walkIn.employee_id;
    if (!walkIn.name.trim()) {
      setErr("El nombre es obligatorio.");
      return;
    }
    if (!walkIn.service_type_id || !assignedEmployeeId) {
      setErr(
        staffOnly
          ? "Selecciona el servicio. (Re-inicia sesión si no se detecta tu perfil.)"
          : "Selecciona servicio y barbero.",
      );
      return;
    }
    if (!walkIn.payment_method) {
      setErr("Selecciona el método de pago.");
      return;
    }
    if (!walkIn.served_date || walkIn.served_hour === "") {
      setErr("Selecciona el día y la hora atendida.");
      return;
    }
    const startTime = walkInStartIso(walkIn.served_date, walkIn.served_hour);
    setSaving(true);
    try {
      const created = await axios.post<{ id: string }>(
        `${API_BASE_URL}/api/shop/appointments/walk-in`,
        {
          name: walkIn.name.trim(),
          phone: walkIn.phone.trim(),
          email: walkIn.email.trim() || undefined,
          service_type_id: walkIn.service_type_id,
          employee_id: assignedEmployeeId,
          payment_method: walkIn.payment_method,
          start_time: startTime,
        },
      );
      if (created.data?.id) rememberAppointmentIds([created.data.id]);
      playAppointmentChime();
      setWalkInOpen(false);
      resetWalkIn();
      await load();
      await loadRefs();
    } catch (e: unknown) {
      const msg =
        axios.isAxiosError(e) && e.response?.data && typeof e.response.data === "object"
          ? (e.response.data as { error?: string }).error
          : "No se pudo completar el walk-in.";
      setErr(msg ?? "No se pudo completar el walk-in.");
    } finally {
      setSaving(false);
    }
  };

  const resetPanel = () => {
    setForm({
      client_id: "",
      service_type_id: "",
      employee_id: staffOnly ? myEmployeeId : "",
      start: "",
      end: "",
      status: "scheduled",
      notes: "",
      payment_method: "",
    });
    setClientMode("existing");
    setNewClient({ first_name: "", last_name: "", phone: "", email: "" });
    setErr(null);
  };

  const create = async () => {
    setErr(null);
    const assignedEmployeeId = staffOnly ? myEmployeeId : form.employee_id;
    if (!form.service_type_id || !assignedEmployeeId || !form.start || !form.end) {
      setErr(
        staffOnly
          ? "Completa servicio e horario. (Re-inicia sesión si no se detecta tu perfil.)"
          : "Completa servicio, staff e horario.",
      );
      return;
    }
    if (form.status === "completed" && !form.payment_method) {
      setErr("Selecciona el método de pago para registrar el ingreso.");
      return;
    }

    if (clientMode === "new") {
      if (!newClient.first_name.trim()) {
        setErr("Para un cliente nuevo indica al menos el nombre.");
        return;
      }
    } else if (!form.client_id) {
      setErr("Selecciona un cliente o crea uno nuevo.");
      return;
    }

    setSaving(true);
    try {
      let clientId = form.client_id;
      if (clientMode === "new") {
        const fn = newClient.first_name.trim();
        const ln = newClient.last_name.trim() || "—";
        const phone = newClient.phone.trim();
        const email = newClient.email.trim();
        const created = await axios.post<{ id: string }>(`${API_BASE_URL}/api/shop/clients`, {
          first_name: fn,
          last_name: ln,
          ...(phone ? { phone } : {}),
          ...(email ? { email } : {}),
        });
        clientId = created.data.id;
        await loadRefs();
      }

      const createdAppt = await axios.post<{ id: string }>(
        `${API_BASE_URL}/api/shop/appointments`,
        {
          client_id: clientId,
          service_type_id: form.service_type_id,
          employee_id: assignedEmployeeId,
          start_time: new Date(form.start).toISOString(),
          end_time: new Date(form.end).toISOString(),
          status: form.status,
          notes: form.notes || undefined,
          ...(form.status === "completed"
            ? { payment_method: form.payment_method }
            : {}),
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

  const patchStatus = async (
    id: string,
    status: string,
    paymentMethod?: string,
  ) => {
    const a = items.find((x) => x.id === id);
    if (!a || !a.start_time || !a.end_time) return;
    try {
      await axios.put(`${API_BASE_URL}/api/shop/appointments/${id}`, {
        status,
        start_time: a.start_time,
        end_time: a.end_time,
        ...(status === "completed" && paymentMethod
          ? { payment_method: paymentMethod }
          : {}),
      });
      await load();
    } catch (e: unknown) {
      const msg =
        axios.isAxiosError(e) && e.response?.data && typeof e.response.data === "object"
          ? (e.response.data as { error?: string }).error
          : null;
      setErr(msg ?? "No se pudo actualizar estado.");
    }
  };

  const requestStatusChange = (id: string, status: string) => {
    if (status === "completed") {
      const a = items.find((x) => x.id === id);
      if (!a?.start_time || !a.end_time) return;
      setCompleteTarget({
        id,
        start_time: a.start_time,
        end_time: a.end_time,
      });
      setCompletePay("");
      setErr(null);
      return;
    }
    if (status === "canceled" || status === "cancelled") {
      const a = items.find((x) => x.id === id);
      if (!a) return;
      setActionTarget({ kind: "cancel", appointment: a });
      setErr(null);
      return;
    }
    void patchStatus(id, status);
  };

  const confirmComplete = async () => {
    if (!completeTarget) return;
    if (!completePay) {
      setErr("Selecciona el método de pago.");
      return;
    }
    setSaving(true);
    try {
      await axios.put(`${API_BASE_URL}/api/shop/appointments/${completeTarget.id}`, {
        status: "completed",
        start_time: completeTarget.start_time,
        end_time: completeTarget.end_time,
        payment_method: completePay,
      });
      setCompleteTarget(null);
      setCompletePay("");
      await load();
    } catch (e: unknown) {
      const msg =
        axios.isAxiosError(e) && e.response?.data && typeof e.response.data === "object"
          ? (e.response.data as { error?: string }).error
          : null;
      setErr(msg ?? "No se pudo completar la cita.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm("¿Eliminar esta cita?")) return;
    try {
      await axios.delete(`${API_BASE_URL}/api/shop/appointments/${id}`);
      await load();
    } catch (e: unknown) {
      const msg =
        axios.isAxiosError(e) && e.response?.data && typeof e.response.data === "object"
          ? (e.response.data as { error?: string }).error
          : null;
      setErr(msg ?? "No se pudo eliminar.");
    }
  };

  const serviceName = useCallback(
    (id: string) => services.find((s) => s.id === id)?.name ?? "Servicio",
    [services],
  );

  const resolveStaffLabel = useCallback(
    (id: string) => {
      const s = staff.find((x) => x.employee_id === id);
      if (!s) return "Staff";
      return staffLabel(s);
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
            className="bp-btn bp-btn--secondary"
            onClick={() => {
              unlockShopAudio();
              resetWalkIn();
              setWalkInOpen(true);
            }}
          >
            Walk-in
          </button>
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

      {err && !panelOpen && !walkInOpen ? (
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
          <option value="reschedule_pending">Por confirmar</option>
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
            <button
              type="button"
              className="bp-btn bp-btn--secondary bp-btn--sm"
              onClick={() => {
                resetWalkIn();
                setWalkInOpen(true);
              }}
            >
              Walk-in
            </button>
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
                          {serviceName(a.service_type_id)} · {resolveStaffLabel(a.employee_id)}
                          {a.notes ? ` · ${a.notes}` : ""}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
                      {a.source === "walk_in" ? (
                        <span className="bp-badge bp-badge--info">Walk-in</span>
                      ) : null}
                      <span className={`bp-badge ${statusClass(a.status)}`}>
                        <span className="bp-badge__dot" />
                        {statusLabel(a.status)}
                      </span>
                      <select
                        className="bp-select"
                        style={{ width: 140, padding: "6px 28px 6px 10px", fontSize: 13 }}
                        value={a.status}
                        onChange={(e) => void requestStatusChange(a.id, e.target.value)}
                      >
                        <option value="scheduled">Programada</option>
                        <option value="confirmed">Confirmada</option>
                        <option value="completed">Completada</option>
                        <option value="canceled">Cancelada</option>
                        <option value="no_show">No asistió</option>
                        {a.status === "reschedule_pending" ? (
                          <option value="reschedule_pending">Por confirmar</option>
                        ) : null}
                      </select>
                      <button
                        type="button"
                        className="bp-btn bp-btn--secondary bp-btn--sm"
                        disabled={a.status === "completed" || a.status === "canceled"}
                        onClick={() => {
                          setActionTarget({ kind: "reschedule", appointment: a });
                          setErr(null);
                        }}
                      >
                        Reprogramar
                      </button>
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

      {walkInOpen ? (
        <>
          <div
            className="bp-panel__overlay"
            onClick={() => {
              setWalkInOpen(false);
              resetWalkIn();
            }}
          />
          <div className="bp-panel" role="dialog" aria-modal="true">
            <div className="bp-panel__header">
              <div>
                <h2 className="bp-panel__title">Walk-in</h2>
                <p className="bp-panel__subtitle">
                  Completa la venta. Indica el día y la hora en que se atendió al cliente.
                </p>
              </div>
              <button
                type="button"
                className="bp-icon-btn"
                onClick={() => {
                  setWalkInOpen(false);
                  resetWalkIn();
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
              <div className="bp-field__row">
                <div className="bp-field">
                  <label className="bp-label">Día atendido</label>
                  <input
                    className="bp-input"
                    type="date"
                    value={walkIn.served_date}
                    onChange={(e) => setWalkIn((f) => ({ ...f, served_date: e.target.value }))}
                  />
                </div>
                <div className="bp-field">
                  <label className="bp-label">Hora atendida</label>
                  <select
                    className="bp-select"
                    value={walkIn.served_hour}
                    onChange={(e) => setWalkIn((f) => ({ ...f, served_hour: e.target.value }))}
                    aria-label="Hora atendida"
                  >
                    <option value="">Selecciona la hora</option>
                    {WALK_IN_HOURS.map((h) => {
                      const label = `${String(h).padStart(2, "0")}:00`;
                      return (
                        <option key={h} value={String(h)}>
                          {label}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>
              <div className="bp-field">
                <label className="bp-label">Nombre</label>
                <input
                  className="bp-input"
                  autoFocus
                  placeholder="Carlos"
                  value={walkIn.name}
                  onChange={(e) => setWalkIn((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div className="bp-field">
                <label className="bp-label">Teléfono (opcional)</label>
                <input
                  className="bp-input"
                  inputMode="tel"
                  placeholder="Opcional"
                  value={walkIn.phone}
                  onChange={(e) => setWalkIn((f) => ({ ...f, phone: e.target.value }))}
                />
              </div>
              <div className="bp-field">
                <label className="bp-label">Email (opcional)</label>
                <input
                  className="bp-input"
                  type="email"
                  placeholder="Opcional"
                  value={walkIn.email}
                  onChange={(e) => setWalkIn((f) => ({ ...f, email: e.target.value }))}
                />
              </div>
              <div className="bp-field">
                <label className="bp-label">Servicio</label>
                <select
                  className="bp-select"
                  value={walkIn.service_type_id}
                  onChange={(e) => setWalkIn((f) => ({ ...f, service_type_id: e.target.value }))}
                >
                  <option value="">Selecciona un servicio</option>
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                      {s.price != null ? ` · ${moneyExact(s.price)}` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div className="bp-field">
                <label className="bp-label">Barbero / staff</label>
                {staffOnly ? (
                  <p className="bp-hint" style={{ margin: 0 }}>
                    Se registra a tu nombre.
                  </p>
                ) : (
                  <select
                    className="bp-select"
                    value={walkIn.employee_id}
                    onChange={(e) => setWalkIn((f) => ({ ...f, employee_id: e.target.value }))}
                  >
                    <option value="">Selecciona staff</option>
                    {staff.map((s) => (
                      <option key={s.employee_id} value={s.employee_id}>
                        {staffLabel(s)}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <PaymentMethodField
                value={walkIn.payment_method}
                onChange={(v) => setWalkIn((f) => ({ ...f, payment_method: v }))}
              />
              {walkIn.service_type_id ? (
                <p className="bp-hint">
                  Precio del servicio:{" "}
                  {moneyExact(
                    Number(services.find((s) => s.id === walkIn.service_type_id)?.price ?? 0),
                  )}
                </p>
              ) : null}
            </div>
            <div className="bp-panel__footer">
              <button
                type="button"
                className="bp-btn bp-btn--secondary"
                onClick={() => {
                  setWalkInOpen(false);
                  resetWalkIn();
                }}
                disabled={saving}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="bp-btn bp-btn--primary"
                onClick={() => void submitWalkIn()}
                disabled={saving}
              >
                {saving ? "Completando…" : "Completar walk-in"}
              </button>
            </div>
          </div>
        </>
      ) : null}

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
                    <label className="bp-label">Teléfono (opcional)</label>
                    <input
                      className="bp-input"
                      placeholder="Opcional — para contactar / WhatsApp"
                      value={newClient.phone}
                      onChange={(e) =>
                        setNewClient((c) => ({ ...c, phone: e.target.value }))
                      }
                    />
                  </div>
                  <div className="bp-field" style={{ gridColumn: "1 / -1" }}>
                    <label className="bp-label">Email (opcional)</label>
                    <input
                      className="bp-input"
                      type="email"
                      placeholder="Para enviar confirmación por correo"
                      value={newClient.email}
                      onChange={(e) =>
                        setNewClient((c) => ({ ...c, email: e.target.value }))
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
                {staffOnly ? (
                  <p className="bp-hint" style={{ margin: 0 }}>
                    La cita se asigna a ti automáticamente.
                  </p>
                ) : (
                  <select
                    className="bp-select"
                    value={form.employee_id}
                    onChange={(e) => setForm((f) => ({ ...f, employee_id: e.target.value }))}
                  >
                    <option value="">Selecciona staff</option>
                    {staff.map((s) => (
                      <option key={s.employee_id} value={s.employee_id}>
                        {staffLabel(s)}
                      </option>
                    ))}
                  </select>
                )}
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
              {form.status === "completed" ? (
                <PaymentMethodField
                  value={form.payment_method}
                  onChange={(v) => setForm((f) => ({ ...f, payment_method: v }))}
                />
              ) : null}
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

      {completeTarget ? (
        <>
          <button
            type="button"
            className="bp-panel__overlay"
            aria-label="Cerrar"
            onClick={() => {
              setCompleteTarget(null);
              setCompletePay("");
            }}
          />
          <div className="bp-panel" role="dialog" aria-modal="true">
            <div className="bp-panel__header">
              <div>
                <h2 className="bp-panel__title">Completar cita</h2>
                <p className="bp-panel__subtitle">
                  Elige cómo pagó el cliente. Se registrará un ingreso en Ventas.
                </p>
              </div>
              <button
                type="button"
                className="bp-icon-btn"
                onClick={() => {
                  setCompleteTarget(null);
                  setCompletePay("");
                }}
              >
                <IconClose />
              </button>
            </div>
            <div className="bp-panel__body">
              <PaymentMethodField
                value={completePay}
                onChange={(v) => setCompletePay(v)}
              />
            </div>
            <div className="bp-panel__footer">
              <button
                type="button"
                className="bp-btn bp-btn--secondary"
                onClick={() => {
                  setCompleteTarget(null);
                  setCompletePay("");
                }}
                disabled={saving}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="bp-btn bp-btn--primary"
                onClick={() => void confirmComplete()}
                disabled={saving}
              >
                {saving ? "Guardando…" : "Confirmar pago"}
              </button>
            </div>
          </div>
        </>
      ) : null}

      {actionTarget?.kind === "reschedule" ? (
        <AppointmentRescheduleDialog
          appointment={actionTarget.appointment}
          serviceName={serviceName(actionTarget.appointment.service_type_id)}
          barberName={resolveStaffLabel(actionTarget.appointment.employee_id)}
          onClose={() => setActionTarget(null)}
          onDone={async (warning) => {
            setActionTarget(null);
            await load();
            setErr(warning ?? null);
          }}
        />
      ) : null}

      {actionTarget?.kind === "cancel" ? (
        <AppointmentCancelDialog
          appointment={actionTarget.appointment}
          serviceName={serviceName(actionTarget.appointment.service_type_id)}
          barberName={resolveStaffLabel(actionTarget.appointment.employee_id)}
          onClose={() => setActionTarget(null)}
          onDone={async (warning) => {
            setActionTarget(null);
            await load();
            setErr(warning ?? null);
          }}
        />
      ) : null}
    </div>
  );
}
