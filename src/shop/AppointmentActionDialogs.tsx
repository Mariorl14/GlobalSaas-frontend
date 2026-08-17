import { useEffect, useState } from "react";
import axios from "axios";
import { API_BASE_URL } from "../config";
import { IconClose } from "./icons";
import { dateLineEs, normalizeBookingHhmm, timeFromIso } from "../public-booking/formatters";
import { TimeSelect12h } from "./TimeSelect12h";

export type LifecycleAppointment = {
  id: string;
  client_name: string;
  client_email?: string | null;
  start_time: string | null;
  end_time: string | null;
  status: string;
  service_type_id: string;
  employee_id: string;
};

export const CANCEL_REASONS = [
  { id: "barber_unavailable", label: "Barbero no disponible" },
  { id: "business_closed", label: "Negocio cerrado" },
  { id: "scheduling_conflict", label: "Conflicto de agenda" },
  { id: "customer_requested", label: "El cliente pidió cancelar" },
  { id: "other", label: "Otro" },
] as const;

export function hasCustomerEmail(email?: string | null): boolean {
  const t = (email || "").trim();
  return t.includes("@") && t !== "—" && t !== "-";
}

function splitLocal(iso: string | null): { date: string; time: string } {
  if (!iso) {
    const n = new Date();
    const pad = (v: number) => String(v).padStart(2, "0");
    return {
      date: `${n.getFullYear()}-${pad(n.getMonth() + 1)}-${pad(n.getDate())}`,
      time: normalizeBookingHhmm(`${pad(n.getHours())}:${pad(n.getMinutes())}`) || "09:00",
    };
  }
  const raw = String(iso).replace(" ", "T");
  return {
    date: raw.slice(0, 10),
    time: normalizeBookingHhmm(raw.slice(11, 16) || "09:00") || "09:00",
  };
}

function naiveIso(date: string, time: string): string {
  const hhmm = time.length >= 5 ? time.slice(0, 5) : time;
  return `${date}T${hhmm}:00`;
}

function formatWhen(iso: string | null): string {
  if (!iso) return "—";
  return `${dateLineEs(iso)} · ${timeFromIso(iso)}`;
}

function extractError(e: unknown, fallback: string): string {
  if (
    axios.isAxiosError(e) &&
    e.response?.data &&
    typeof e.response.data === "object"
  ) {
    const msg = (e.response.data as { error?: string }).error;
    if (msg) return msg;
  }
  return fallback;
}

type SharedProps = {
  appointment: LifecycleAppointment;
  serviceName: string;
  barberName: string;
  onClose: () => void;
  onDone: (warning?: string | null) => void;
};

export function AppointmentRescheduleDialog({
  appointment,
  serviceName,
  barberName,
  onClose,
  onDone,
}: SharedProps) {
  const current = splitLocal(appointment.start_time);
  const [date, setDate] = useState(current.date);
  const [time, setTime] = useState(current.time);
  const [message, setMessage] = useState("");
  const [sendEmail, setSendEmail] = useState(hasCustomerEmail(appointment.client_email));
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setSendEmail(hasCustomerEmail(appointment.client_email));
  }, [appointment.client_email]);

  const submit = async () => {
    if (!date || !time) {
      setErr("Elige fecha y hora.");
      return;
    }
    setSaving(true);
    setErr(null);
    try {
      const res = await axios.post<{ warning?: string }>(
        `${API_BASE_URL}/api/shop/appointments/${appointment.id}/reschedule`,
        {
          start_time: naiveIso(date, time),
          message: message.trim() || null,
          send_email: sendEmail,
        },
      );
      onDone(res.data.warning ?? null);
    } catch (e: unknown) {
      setErr(extractError(e, "No se pudo proponer el nuevo horario."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <button type="button" className="bp-panel__overlay" aria-label="Cerrar" onClick={onClose} />
      <div className="bp-panel" role="dialog" aria-modal="true">
        <div className="bp-panel__header">
          <div>
            <h2 className="bp-panel__title">Reprogramar cita</h2>
            <p className="bp-panel__subtitle">Propón un nuevo horario al cliente.</p>
          </div>
          <button type="button" className="bp-icon-btn" onClick={onClose}>
            <IconClose />
          </button>
        </div>
        <div className="bp-panel__body">
          {err ? (
            <div className="bp-alert bp-alert--error">
              <span>{err}</span>
            </div>
          ) : null}
          <div className="bp-field">
            <label className="bp-label">Cita actual</label>
            <div>{formatWhen(appointment.start_time)}</div>
            <div style={{ marginTop: 4, color: "var(--bp-text-muted, #64748b)", fontSize: 13 }}>
              {appointment.client_name} · {serviceName} · {barberName}
            </div>
          </div>
          <div className="bp-field__row">
            <div className="bp-field">
              <label className="bp-label" htmlFor="rs-date">
                Nueva fecha
              </label>
              <input
                id="rs-date"
                className="bp-input"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="bp-field">
              <label className="bp-label" htmlFor="rs-time">
                Nueva hora
              </label>
              <TimeSelect12h
                id="rs-time"
                value={time}
                onChange={setTime}
                aria-label="Nueva hora"
              />
            </div>
          </div>
          <div className="bp-field">
            <label className="bp-label" htmlFor="rs-msg">
              Mensaje al cliente (opcional)
            </label>
            <textarea
              id="rs-msg"
              className="bp-textarea"
              rows={3}
              placeholder="Vamos aproximadamente 30 minutos atrasados hoy."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>
          <label className="bp-check" style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
            <input
              type="checkbox"
              checked={sendEmail}
              disabled={!hasCustomerEmail(appointment.client_email)}
              onChange={(e) => setSendEmail(e.target.checked)}
            />
            <span>
              Enviar correo al cliente
              {!hasCustomerEmail(appointment.client_email) ? (
                <span style={{ color: "var(--bp-text-muted, #64748b)" }}> — este cliente no tiene correo</span>
              ) : null}
            </span>
          </label>
        </div>
        <div className="bp-panel__footer">
          <button type="button" className="bp-btn bp-btn--secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </button>
          <button type="button" className="bp-btn bp-btn--primary" onClick={() => void submit()} disabled={saving}>
            {saving ? "Enviando…" : "Proponer nuevo horario"}
          </button>
        </div>
      </div>
    </>
  );
}

export function AppointmentCancelDialog({
  appointment,
  serviceName,
  barberName,
  onClose,
  onDone,
}: SharedProps) {
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [sendEmail, setSendEmail] = useState(hasCustomerEmail(appointment.client_email));
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    setSaving(true);
    setErr(null);
    try {
      const res = await axios.post<{ warning?: string }>(
        `${API_BASE_URL}/api/shop/appointments/${appointment.id}/cancel`,
        {
          reason: reason || null,
          message: message.trim() || null,
          send_email: sendEmail,
        },
      );
      onDone(res.data.warning ?? null);
    } catch (e: unknown) {
      setErr(extractError(e, "No se pudo cancelar la cita."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <button type="button" className="bp-panel__overlay" aria-label="Cerrar" onClick={onClose} />
      <div className="bp-panel" role="dialog" aria-modal="true">
        <div className="bp-panel__header">
          <div>
            <h2 className="bp-panel__title">¿Cancelar cita?</h2>
            <p className="bp-panel__subtitle">
              {appointment.client_name} · {formatWhen(appointment.start_time)}
            </p>
          </div>
          <button type="button" className="bp-icon-btn" onClick={onClose}>
            <IconClose />
          </button>
        </div>
        <div className="bp-panel__body">
          {err ? (
            <div className="bp-alert bp-alert--error">
              <span>{err}</span>
            </div>
          ) : null}
          <div style={{ marginBottom: 12, color: "var(--bp-text-muted, #64748b)", fontSize: 13 }}>
            {serviceName} · {barberName}
          </div>
          <div className="bp-field">
            <label className="bp-label" htmlFor="cx-reason">
              Motivo (opcional)
            </label>
            <select
              id="cx-reason"
              className="bp-select"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            >
              <option value="">Sin motivo</option>
              {CANCEL_REASONS.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
          <div className="bp-field">
            <label className="bp-label" htmlFor="cx-msg">
              Mensaje (opcional)
            </label>
            <textarea
              id="cx-msg"
              className="bp-textarea"
              rows={3}
              placeholder="Lamentablemente Juan no estará disponible esta tarde."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>
          <label className="bp-check" style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
            <input
              type="checkbox"
              checked={sendEmail}
              disabled={!hasCustomerEmail(appointment.client_email)}
              onChange={(e) => setSendEmail(e.target.checked)}
            />
            <span>
              Enviar correo de cancelación
              {!hasCustomerEmail(appointment.client_email) ? (
                <span style={{ color: "var(--bp-text-muted, #64748b)" }}> — este cliente no tiene correo</span>
              ) : null}
            </span>
          </label>
        </div>
        <div className="bp-panel__footer">
          <button type="button" className="bp-btn bp-btn--secondary" onClick={onClose} disabled={saving}>
            Volver
          </button>
          <button type="button" className="bp-btn bp-btn--danger" onClick={() => void submit()} disabled={saving}>
            {saving ? "Cancelando…" : "Cancelar cita"}
          </button>
        </div>
      </div>
    </>
  );
}
