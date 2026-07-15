import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authApi } from "../api/auth";
import { session } from "../auth/session";
import { IconAlert } from "./icons";
import "./shop.css";

export function ShopLoginView({
  onAuthSuccess,
}: {
  onAuthSuccess?: () => void;
}) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await authApi.shopSignIn({
        email: email.trim(),
        password,
      });
      session.setToken(res.data.access_token);
      session.setUser(res.data.user);
      onAuthSuccess?.();
      navigate("/shop/dashboard", { replace: true });
    } catch {
      setError("Credenciales incorrectas o usuario sin negocio asignado.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bp-app bp-login">
      <div className="bp-login__card">
        <div className="bp-login__eyebrow">Portal del negocio</div>
        <h1 className="bp-login__title">Bienvenido de nuevo</h1>
        <p className="bp-login__text">
          Accede para gestionar citas, clientes y el día a día de tu barbería.
        </p>

        <form
          onSubmit={(ev) => void handleSubmit(ev)}
          style={{ display: "flex", flexDirection: "column", gap: 16 }}
        >
          <div className="bp-field">
            <label className="bp-label">Email</label>
            <input
              className="bp-input"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@barberia.com"
              autoComplete="email"
            />
          </div>
          <div className="bp-field">
            <label className="bp-label">Contraseña</label>
            <input
              className="bp-input"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>

          {error ? (
            <div className="bp-alert bp-alert--error">
              <IconAlert />
              <span>{error}</span>
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="bp-btn bp-btn--primary"
            style={{ height: 46, marginTop: 4 }}
          >
            {loading ? "Entrando…" : "Entrar al panel"}
          </button>
        </form>

        <Link
          to="/login"
          style={{
            display: "inline-block",
            marginTop: 22,
            fontSize: 13,
            color: "var(--bp-text-tertiary)",
            textDecoration: "none",
          }}
        >
          ← Soy administrador de plataforma
        </Link>
      </div>
    </div>
  );
}
