import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import axios from "axios";
import { API_BASE_URL } from "../config";
import { dateLineEs, timeFromIso } from "./formatters";
import "./public-booking.css";

type Preview = {
  status: string;
  business_name: string;
  customer_name: string;
  service_name: string;
  barber_name: string;
  original_start_time: string | null;
  proposed_start_time: string | null;
  message: string | null;
};

function whenLine(iso: string | null): string {
  if (!iso) return "—";
  return `${dateLineEs(iso)} a las ${timeFromIso(iso)}`;
}

export function RescheduleConfirmPage() {
  const { token } = useParams<{ token: string }>();
  const [preview, setPreview] = useState<Preview | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState<{ when_label: string; business_name: string } | null>(
    null,
  );

  useEffect(() => {
    if (!token) {
      setErr("Este enlace ya no es válido. Contacta el negocio si necesitas ayuda.");
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await axios.get<Preview>(
          `${API_BASE_URL}/api/public/appointments/reschedule/${encodeURIComponent(token)}`,
        );
        if (!cancelled) setPreview(res.data);
      } catch (e: unknown) {
        const msg =
          axios.isAxiosError(e) &&
          e.response?.data &&
          typeof e.response.data === "object"
            ? (e.response.data as { error?: string }).error
            : null;
        if (!cancelled) {
          setErr(msg ?? "Este enlace ya no es válido. Contacta el negocio si necesitas ayuda.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const accept = async () => {
    if (!token) return;
    setAccepting(true);
    setErr(null);
    try {
      const res = await axios.post<{ when_label: string; business_name: string }>(
        `${API_BASE_URL}/api/public/appointments/reschedule/${encodeURIComponent(token)}/accept`,
      );
      setAccepted({
        when_label: res.data.when_label,
        business_name: res.data.business_name,
      });
      setPreview(null);
    } catch (e: unknown) {
      const msg =
        axios.isAxiosError(e) &&
        e.response?.data &&
        typeof e.response.data === "object"
          ? (e.response.data as { error?: string }).error
          : null;
      setErr(
        msg ??
          "Lamentablemente este horario ya no está disponible. Contacta el negocio para elegir otro.",
      );
    } finally {
      setAccepting(false);
    }
  };

  return (
    <div className="pb-root">
      <div className="pb-inner" style={{ padding: "48px 20px", maxWidth: 520 }}>
        {loading ? <p>Cargando…</p> : null}

        {accepted ? (
          <div className="pb-card" style={{ padding: 28 }}>
            <h1 style={{ margin: "0 0 8px", fontSize: 22 }}>Cita actualizada</h1>
            <p style={{ margin: "0 0 16px", color: "#475569" }}>
              Tu cita se movió a:
            </p>
            <p style={{ margin: "0 0 8px", fontWeight: 700, fontSize: 18 }}>
              {accepted.when_label}
            </p>
            {accepted.business_name ? (
              <p style={{ margin: 0, color: "#64748b" }}>Negocio: {accepted.business_name}</p>
            ) : null}
          </div>
        ) : null}

        {!loading && preview && !accepted ? (
          <div className="pb-card" style={{ padding: 28 }}>
            <h1 style={{ margin: "0 0 8px", fontSize: 22 }}>Nuevo horario propuesto</h1>
            <p style={{ margin: "0 0 20px", color: "#475569" }}>
              Hola {preview.customer_name}, {preview.business_name} propone un cambio en tu cita.
            </p>
            <p style={{ margin: "0 0 8px" }}>
              <strong>Original:</strong> {whenLine(preview.original_start_time)}
            </p>
            <p style={{ margin: "0 0 8px" }}>
              <strong>Nuevo horario:</strong> {whenLine(preview.proposed_start_time)}
            </p>
            <p style={{ margin: "0 0 8px" }}>
              <strong>Servicio:</strong> {preview.service_name}
            </p>
            <p style={{ margin: "0 0 16px" }}>
              <strong>Barbero:</strong> {preview.barber_name}
            </p>
            {preview.message ? (
              <p style={{ margin: "0 0 20px", fontStyle: "italic" }}>“{preview.message}”</p>
            ) : null}
            {err ? (
              <p style={{ color: "#b91c1c", margin: "0 0 16px" }}>{err}</p>
            ) : null}
            <button
              type="button"
              className="pb-btn pb-btn-primary"
              disabled={accepting}
              onClick={() => void accept()}
            >
              {accepting ? "Confirmando…" : "Aceptar nuevo horario"}
            </button>
            <p style={{ margin: "16px 0 0", color: "#64748b", fontSize: 14 }}>
              Si el horario no te funciona, contacta el negocio.
            </p>
          </div>
        ) : null}

        {!loading && err && !preview && !accepted ? (
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
