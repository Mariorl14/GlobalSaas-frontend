import { useState, type ReactNode } from "react";
import { customerRegister, customerSignIn } from "./bookingApi";
import type { PublicClient } from "./customerSession";
import { CustomerBookingForm, type CustomerFormValues } from "./CustomerBookingForm";

type Mode = "guest" | "signin" | "register";

export function customerFromAccount(
  c: PublicClient,
  notes = "",
): CustomerFormValues {
  return {
    first_name: c.first_name || "",
    last_name: c.last_name || "",
    phone: c.phone || "",
    email: c.email || "",
    notes,
  };
}

export function CustomerAccountPanel({
  slug,
  client,
  customer,
  onCustomerChange,
  onAuthed,
  onLogout,
  form,
}: {
  slug: string;
  client: PublicClient | null;
  customer: CustomerFormValues;
  onCustomerChange: (v: CustomerFormValues) => void;
  onAuthed: (c: PublicClient) => void;
  onLogout: () => void;
  form: ReactNode;
}) {
  const [mode, setMode] = useState<Mode>("guest");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);

  const applyClientToForm = (c: PublicClient) => {
    onCustomerChange(customerFromAccount(c, customer.notes));
    onAuthed(c);
    setEditing(false);
  };

  const handleSignIn = async () => {
    setErr(null);
    setBusy(true);
    try {
      const res = await customerSignIn(slug, {
        username: username.trim(),
        password,
      });
      applyClientToForm(res.client);
      setMode("guest");
      setPassword("");
    } catch (e: unknown) {
      setErr(apiError(e, "No se pudo iniciar sesión."));
    } finally {
      setBusy(false);
    }
  };

  const handleRegister = async () => {
    setErr(null);
    if (!customer.first_name.trim() || !customer.last_name.trim() || !customer.phone.trim()) {
      setErr("Completa nombre, apellido y teléfono antes de crear la cuenta.");
      return;
    }
    setBusy(true);
    try {
      const res = await customerRegister(slug, {
        username: username.trim(),
        password,
        first_name: customer.first_name.trim(),
        last_name: customer.last_name.trim(),
        phone: customer.phone.trim(),
        email: customer.email.trim() || undefined,
      });
      applyClientToForm(res.client);
      setMode("guest");
      setPassword("");
    } catch (e: unknown) {
      setErr(apiError(e, "No se pudo crear la cuenta."));
    } finally {
      setBusy(false);
    }
  };

  if (client) {
    const fullName = [customer.first_name || client.first_name, customer.last_name || client.last_name]
      .filter(Boolean)
      .join(" ");
    const phone = customer.phone || client.phone || "—";
    const email = customer.email || client.email || null;

    return (
      <div className="pb-step-stack" style={{ gap: "1rem" }}>
        <div className="pb-account-banner">
          <div>
            <p className="pb-account-banner__title">Hola, {client.first_name}</p>
            <p className="pb-field-hint" style={{ margin: 0, maxWidth: "none" }}>
              Usaremos tu cuenta para esta reserva.
            </p>
          </div>
          <button type="button" className="pb-btn pb-btn-secondary" onClick={onLogout}>
            Cerrar sesión
          </button>
        </div>

        {!editing ? (
          <div className="pb-account-summary">
            <div className="pb-account-summary__row">
              <span className="pb-account-summary__label">Nombre</span>
              <span className="pb-account-summary__value">{fullName || "—"}</span>
            </div>
            <div className="pb-account-summary__row">
              <span className="pb-account-summary__label">Teléfono</span>
              <span className="pb-account-summary__value">{phone}</span>
            </div>
            {email ? (
              <div className="pb-account-summary__row">
                <span className="pb-account-summary__label">Email</span>
                <span className="pb-account-summary__value">{email}</span>
              </div>
            ) : null}
            <button
              type="button"
              className="pb-btn pb-btn-secondary"
              style={{ marginTop: "0.75rem" }}
              onClick={() => setEditing(true)}
            >
              Editar datos
            </button>
          </div>
        ) : (
          <div>
            <CustomerBookingForm value={customer} onChange={onCustomerChange} />
            <button
              type="button"
              className="pb-btn pb-btn-secondary"
              style={{ marginTop: "0.75rem" }}
              onClick={() => {
                onCustomerChange(customerFromAccount(client, customer.notes));
                setEditing(false);
              }}
            >
              Usar datos de la cuenta
            </button>
          </div>
        )}

        {!editing ? (
          <div className="pb-field-block">
            <label className="pb-field-label" htmlFor="pb-notes-logged">
              Notas <span style={{ fontWeight: 500, color: "#94a3b8" }}>(opcional)</span>
            </label>
            <textarea
              id="pb-notes-logged"
              className="pb-textarea"
              maxLength={4000}
              value={customer.notes}
              onChange={(e) => onCustomerChange({ ...customer, notes: e.target.value })}
              placeholder="Alergias, preferencia de estilo, etc."
            />
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="pb-account-panel">
      <div className="pb-seg" role="tablist" aria-label="Cuenta de cliente" style={{ marginBottom: "1rem" }}>
        <button
          type="button"
          className={`pb-seg__btn${mode === "guest" ? " pb-seg__btn--on" : ""}`}
          onClick={() => {
            setMode("guest");
            setErr(null);
          }}
        >
          Continuar como invitado
        </button>
        <button
          type="button"
          className={`pb-seg__btn${mode === "signin" ? " pb-seg__btn--on" : ""}`}
          onClick={() => {
            setMode("signin");
            setErr(null);
          }}
        >
          Ya tengo cuenta
        </button>
        <button
          type="button"
          className={`pb-seg__btn${mode === "register" ? " pb-seg__btn--on" : ""}`}
          onClick={() => {
            setMode("register");
            setErr(null);
          }}
        >
          Crear cuenta
        </button>
      </div>

      {err ? <div className="pb-alert">{err}</div> : null}

      {mode === "signin" ? (
        <div className="pb-form-grid-2" style={{ marginBottom: "0.5rem" }}>
          <div className="pb-field-block">
            <label className="pb-field-label" htmlFor="pb-cu">
              Usuario
            </label>
            <input
              id="pb-cu"
              className="pb-input"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          <div className="pb-field-block">
            <label className="pb-field-label" htmlFor="pb-cp">
              Contraseña
            </label>
            <input
              id="pb-cp"
              className="pb-input"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button
            type="button"
            className="pb-btn pb-btn-primary"
            style={{ gridColumn: "1 / -1", justifySelf: "start" }}
            disabled={busy || !username.trim() || !password}
            onClick={() => void handleSignIn()}
          >
            {busy ? "Entrando…" : "Iniciar sesión"}
          </button>
        </div>
      ) : null}

      {mode === "guest" ? (
        <p className="pb-field-hint" style={{ marginBottom: "1rem", maxWidth: "none" }}>
          Si vienes seguido, crea una cuenta con usuario y contraseña para no repetir tus datos.
        </p>
      ) : null}

      {mode === "register" ? (
        <p className="pb-field-hint" style={{ marginBottom: "1rem", maxWidth: "none" }}>
          Completa tus datos y elige un usuario y contraseña. La próxima vez solo inicias sesión.
        </p>
      ) : null}

      {mode !== "signin" ? form : null}

      {mode === "register" ? (
        <div style={{ marginTop: "1rem" }}>
          <div className="pb-form-grid-2">
            <div className="pb-field-block">
              <label className="pb-field-label" htmlFor="pb-ru">
                Usuario
              </label>
              <input
                id="pb-ru"
                className="pb-input"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div className="pb-field-block">
              <label className="pb-field-label" htmlFor="pb-rp">
                Contraseña (mín. 6)
              </label>
              <input
                id="pb-rp"
                className="pb-input"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>
          <button
            type="button"
            className="pb-btn pb-btn-primary"
            style={{ marginTop: "0.75rem" }}
            disabled={busy || username.trim().length < 3 || password.length < 6}
            onClick={() => void handleRegister()}
          >
            {busy ? "Creando…" : "Crear cuenta y guardar datos"}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function apiError(e: unknown, fallback: string): string {
  if (
    typeof e === "object" &&
    e !== null &&
    "response" in e &&
    typeof (e as { response?: { data?: { error?: string } } }).response?.data?.error === "string"
  ) {
    return (e as { response: { data: { error: string } } }).response.data.error;
  }
  return fallback;
}
