import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import axios from "axios";
import { API_BASE_URL } from "../config";
import { BookingCalendar } from "./BookingCalendar";
import { TimeSlotPicker } from "./TimeSlotPicker";
import type { Slot } from "./bookingApi";
import { dateLineEs, timeFromIso } from "./formatters";
import "./public-booking.css";

type Preview = {
  status: string;
  business_name: string;
  business_slug: string;
  customer_name: string;
  service_name: string;
  barber_name: string;
  start_time: string | null;
  end_time: string | null;
  duration: number;
};

function todayIsoLocal() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function whenLine(iso: string | null): string {
  if (!iso) return "—";
  return `${dateLineEs(iso)} a las ${timeFromIso(iso)}`;
}

function extractError(e: unknown, fallback: string): string {
  if (axios.isAxiosError(e) && e.response?.data && typeof e.response.data === "object") {
    return (e.response.data as { error?: string }).error || fallback;
  }
  return fallback;
}

export function ManageAppointmentPage() {
  const { token } = useParams<{ token: string }>();
  const [params] = useSearchParams();
  const initialAction = params.get("action") === "cancel" ? "cancel" : "home";

  const [preview, setPreview] = useState<Preview | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<"home" | "cancel" | "reschedule">(
    initialAction === "cancel" ? "cancel" : "home",
  );
  const [working, setWorking] = useState(false);
  const [done, setDone] = useState<{ kind: "canceled" | "rescheduled"; message: string } | null>(
    null,
  );
  const [bookSlug, setBookSlug] = useState("");

  const [selectedDate, setSelectedDate] = useState("");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotStart, setSlotStart] = useState("");
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [calYear, setCalYear] = useState(() => new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(() => new Date().getMonth() + 1);
  const [dayHints, setDayHints] = useState<Record<string, boolean>>({});
  const minDate = useMemo(() => todayIsoLocal(), []);

  const manageUrl = token
    ? `${API_BASE_URL}/api/public/appointments/manage/${encodeURIComponent(token)}`
    : "";

  useEffect(() => {
    if (!token) {
      setErr("Este enlace ya no es válido. Contacta el negocio si necesitas ayuda.");
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await axios.get<Preview>(manageUrl);
        if (!cancelled) {
          setPreview(res.data);
          setBookSlug(res.data.business_slug || "");
          if (params.get("action") === "reschedule") setMode("reschedule");
        }
      } catch (e: unknown) {
        if (!cancelled) setErr(extractError(e, "Este enlace ya no es válido."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, manageUrl, params]);

  useEffect(() => {
    if (mode !== "reschedule" || !token) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await axios.get<{ days: Record<string, boolean> }>(
          `${manageUrl}/calendar-hints`,
          { params: { year: calYear, month: calMonth } },
        );
        if (!cancelled) setDayHints(res.data.days || {});
      } catch {
        if (!cancelled) setDayHints({});
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mode, token, manageUrl, calYear, calMonth]);

  useEffect(() => {
    if (mode !== "reschedule" || !token || !selectedDate) {
      setSlots([]);
      return;
    }
    let cancelled = false;
    setSlotsLoading(true);
    (async () => {
      try {
        const res = await axios.get<{ slots: Slot[] }>(`${manageUrl}/availability`, {
          params: { date: selectedDate },
        });
        if (!cancelled) {
          setSlots(res.data.slots || []);
          setSlotStart("");
        }
      } catch (e: unknown) {
        if (!cancelled) {
          setSlots([]);
          setErr(extractError(e, "No se pudieron cargar los horarios."));
        }
      } finally {
        if (!cancelled) setSlotsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mode, token, manageUrl, selectedDate]);

  const cancelAppointment = async () => {
    if (!token) return;
    setWorking(true);
    setErr(null);
    try {
      const res = await axios.post<{ message?: string }>(`${manageUrl}/cancel`);
      setDone({
        kind: "canceled",
        message: res.data.message || "Cita cancelada. Ese horario ya está libre.",
      });
      setPreview(null);
    } catch (e: unknown) {
      setErr(extractError(e, "No se pudo cancelar la cita."));
    } finally {
      setWorking(false);
    }
  };

  const saveReschedule = async () => {
    if (!token || !slotStart) return;
    setWorking(true);
    setErr(null);
    try {
      const res = await axios.post<{ when_label?: string; message?: string }>(
        `${manageUrl}/reschedule`,
        { start_time: slotStart },
      );
      setDone({
        kind: "rescheduled",
        message:
          res.data.message ||
          (res.data.when_label
            ? `Tu cita se movió a ${res.data.when_label}. El horario anterior ya está libre.`
            : "Cita reprogramada."),
      });
      setPreview(null);
    } catch (e: unknown) {
      setErr(extractError(e, "Ese horario ya no está disponible. Elige otro."));
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="pb-root">
      <div className="pb-inner" style={{ padding: "48px 20px", maxWidth: 560 }}>
        {loading ? <p>Cargando…</p> : null}

        {done ? (
          <div className="pb-card" style={{ padding: 28 }}>
            <h1 style={{ margin: "0 0 8px", fontSize: 22 }}>
              {done.kind === "canceled" ? "Cita cancelada" : "Cita reprogramada"}
            </h1>
            <p style={{ margin: "0 0 16px", color: "#475569" }}>{done.message}</p>
            {bookSlug ? (
              <Link to={`/book/${bookSlug}`} className="pb-btn pb-btn-secondary">
                Reservar otra cita
              </Link>
            ) : null}
          </div>
        ) : null}

        {!loading && preview && !done && mode === "home" ? (
          <div className="pb-card" style={{ padding: 28 }}>
            <h1 style={{ margin: "0 0 8px", fontSize: 22 }}>Tu cita</h1>
            <p style={{ margin: "0 0 20px", color: "#475569" }}>
              Hola {preview.customer_name}, puedes cancelar o cambiar el horario. El espacio
              anterior queda libre.
            </p>
            <p style={{ margin: "0 0 8px" }}>
              <strong>Cuándo:</strong> {whenLine(preview.start_time)}
            </p>
            <p style={{ margin: "0 0 8px" }}>
              <strong>Servicio:</strong> {preview.service_name}
            </p>
            <p style={{ margin: "0 0 20px" }}>
              <strong>Barbero:</strong> {preview.barber_name}
            </p>
            {err ? <p style={{ color: "#b91c1c", margin: "0 0 16px" }}>{err}</p> : null}
            <div className="pb-btn-row">
              <button
                type="button"
                className="pb-btn pb-btn-primary"
                onClick={() => {
                  setErr(null);
                  setMode("reschedule");
                }}
              >
                Reprogramar
              </button>
              <button
                type="button"
                className="pb-btn pb-btn-danger"
                onClick={() => {
                  setErr(null);
                  setMode("cancel");
                }}
              >
                Cancelar cita
              </button>
            </div>
          </div>
        ) : null}

        {!loading && preview && !done && mode === "cancel" ? (
          <div className="pb-card" style={{ padding: 28 }}>
            <h1 style={{ margin: "0 0 8px", fontSize: 22 }}>Cancelar cita</h1>
            <p style={{ margin: "0 0 16px", color: "#475569" }}>
              Se liberará el horario de {whenLine(preview.start_time)} con {preview.barber_name}.
            </p>
            {err ? <p style={{ color: "#b91c1c", margin: "0 0 16px" }}>{err}</p> : null}
            <div className="pb-btn-row">
              <button
                type="button"
                className="pb-btn pb-btn-danger"
                disabled={working}
                onClick={() => void cancelAppointment()}
              >
                {working ? "Cancelando…" : "Confirmar cancelación"}
              </button>
              <button
                type="button"
                className="pb-btn pb-btn-secondary"
                disabled={working}
                onClick={() => setMode("home")}
              >
                Volver
              </button>
            </div>
          </div>
        ) : null}

        {!loading && preview && !done && mode === "reschedule" ? (
          <div className="pb-card" style={{ padding: 28 }}>
            <h1 style={{ margin: "0 0 8px", fontSize: 22 }}>Cambiar horario</h1>
            <p style={{ margin: "0 0 16px", color: "#475569" }}>
              Cita actual: {whenLine(preview.start_time)}. Elige un espacio libre; el anterior se
              abre de nuevo.
            </p>
            <BookingCalendar
              year={calYear}
              month={calMonth}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              dayHints={dayHints}
              minDate={minDate}
              todayIso={minDate}
              onPrevMonth={() => {
                if (calMonth === 1) {
                  setCalYear((y) => y - 1);
                  setCalMonth(12);
                } else {
                  setCalMonth((m) => m - 1);
                }
              }}
              onNextMonth={() => {
                if (calMonth === 12) {
                  setCalYear((y) => y + 1);
                  setCalMonth(1);
                } else {
                  setCalMonth((m) => m + 1);
                }
              }}
            />
            <div style={{ marginTop: 16 }}>
              <TimeSlotPicker
                slots={slots}
                value={slotStart}
                onChange={setSlotStart}
                loading={slotsLoading}
              />
            </div>
            {err ? <p style={{ color: "#b91c1c", margin: "16px 0 0" }}>{err}</p> : null}
            <div className="pb-btn-row" style={{ marginTop: 20 }}>
              <button
                type="button"
                className="pb-btn pb-btn-primary"
                disabled={working || !slotStart}
                onClick={() => void saveReschedule()}
              >
                {working ? "Guardando…" : "Guardar nuevo horario"}
              </button>
              <button
                type="button"
                className="pb-btn pb-btn-secondary"
                disabled={working}
                onClick={() => {
                  setMode("home");
                  setErr(null);
                }}
              >
                Volver
              </button>
            </div>
          </div>
        ) : null}

        {!loading && err && !preview && !done ? (
          <div className="pb-card" style={{ padding: 28 }}>
            <h1 style={{ margin: "0 0 8px", fontSize: 22 }}>Enlace no válido</h1>
            <p style={{ margin: "0 0 16px", color: "#475569" }}>{err}</p>
            <Link to="/" className="pb-btn pb-btn-secondary">
              Volver
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  );
}
