import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authApi } from "../../api/auth";
import type { SignUpPayload, SignInPayload } from "../../api/auth";
import { session } from "../../auth/session";

type AuthMode = "signup" | "signin";

const containerStyle: React.CSSProperties = {
  minHeight: "100vh",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "#0f172a",
  color: "#f8fafc",
  fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  padding: "24px",
};

const cardStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: "420px",
  backgroundColor: "#1e293b",
  borderRadius: "16px",
  padding: "32px",
  boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
};

const titleStyle: React.CSSProperties = {
  margin: "0 0 8px",
  fontSize: "24px",
  fontWeight: 700,
  color: "#f8fafc",
};

const subtitleStyle: React.CSSProperties = {
  margin: "0 0 28px",
  fontSize: "14px",
  color: "#94a3b8",
};

const formStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "16px",
};

const inputStyle: React.CSSProperties = {
  padding: "12px 14px",
  borderRadius: "10px",
  border: "1px solid #334155",
  backgroundColor: "#0f172a",
  color: "#f8fafc",
  fontSize: "15px",
  outline: "none",
};

const labelStyle: React.CSSProperties = {
  fontSize: "13px",
  fontWeight: 500,
  color: "#cbd5e1",
  marginBottom: "-8px",
};

const submitBtnStyle: React.CSSProperties = {
  padding: "14px",
  borderRadius: "10px",
  border: "none",
  backgroundColor: "#3b82f6",
  color: "#ffffff",
  fontSize: "15px",
  fontWeight: 600,
  cursor: "pointer",
  marginTop: "8px",
};

const linkStyle: React.CSSProperties = {
  padding: "8px 0",
  background: "none",
  border: "none",
  color: "#64748b",
  fontSize: "13px",
  cursor: "pointer",
  marginTop: "8px",
  textDecoration: "none",
  display: "inline-block",
};

const errorStyle: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: "8px",
  backgroundColor: "rgba(239, 68, 68, 0.2)",
  color: "#fca5a5",
  fontSize: "13px",
};

const successStyle: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: "8px",
  backgroundColor: "rgba(34, 197, 94, 0.2)",
  color: "#86efac",
  fontSize: "13px",
};

export function AuthView({
  mode,
  onAuthSuccess,
}: {
  mode: AuthMode;
  onAuthSuccess?: () => void;
}) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  // Sign Up fields
  const [signUpData, setSignUpData] = useState({
    email: "",
    password: "",
    seed_token: "",
  });

  // Sign In fields
  const [signInData, setSignInData] = useState({
    email: "",
    password: "",
  });

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setLoading(true);
    try {
      const payload: SignUpPayload = {
        user: {
          email: signUpData.email.trim(),
          password: signUpData.password,
          is_active: true,
        },
        seed_token: signUpData.seed_token.trim(),
      };
      await authApi.signUp(payload);
      setMessage({ type: "success", text: "Cuenta creada correctamente." });
      navigate("/login", { replace: true });
    } catch (err: unknown) {
      const msg = err && typeof err === "object" && "response" in err
        ? (err as { response?: { data?: unknown } }).response?.data
        : null;
      const text = typeof msg === "object" && msg !== null && "message" in msg
        ? String((msg as { message: unknown }).message)
        : "Error al crear la cuenta. Intenta de nuevo.";
      setMessage({ type: "error", text });
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setLoading(true);
    try {
      const payload: SignInPayload = {
        email: signInData.email.trim(),
        password: signInData.password,
      };
      const res = await authApi.signIn(payload);
      session.setToken(res.data.access_token);
      session.setUser(res.data.user);
      setMessage({ type: "success", text: "Sesión iniciada correctamente." });
      onAuthSuccess?.();
    } catch (err: unknown) {
      const msg = err && typeof err === "object" && "response" in err
        ? (err as { response?: { data?: unknown } }).response?.data
        : null;
      const text = typeof msg === "object" && msg !== null && "message" in msg
        ? String((msg as { message: unknown }).message)
        : "Error al iniciar sesión. Verifica tus credenciales.";
      setMessage({ type: "error", text });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <h1 style={titleStyle}>Barber App</h1>
        <p style={subtitleStyle}>
          {mode === "signup" && "Crear nueva cuenta"}
          {mode === "signin" && "Iniciar sesión"}
        </p>

        {mode === "signup" && (
          <form onSubmit={handleSignUp} style={formStyle}>
            <label style={labelStyle}>Email</label>
            <input
              type="email"
              placeholder="super@demo.com"
              value={signUpData.email}
              onChange={(e) =>
                setSignUpData((s) => ({ ...s, email: e.target.value }))
              }
              style={inputStyle}
              required
            />
            <label style={labelStyle}>Contraseña</label>
            <input
              type="password"
              placeholder="TuPassword123!"
              value={signUpData.password}
              onChange={(e) =>
                setSignUpData((s) => ({ ...s, password: e.target.value }))
              }
              style={inputStyle}
              required
            />
            <label style={labelStyle}>Seed token</label>
            <input
              type="text"
              placeholder="TU_TOKEN_AQUI"
              value={signUpData.seed_token}
              onChange={(e) =>
                setSignUpData((s) => ({ ...s, seed_token: e.target.value }))
              }
              style={inputStyle}
              required
            />
            <button type="submit" style={submitBtnStyle} disabled={loading}>
              {loading ? "Creando cuenta..." : "Crear cuenta"}
            </button>
            <Link to="/login" style={linkStyle}>
              ← ¿Ya tienes cuenta? Iniciar sesión
            </Link>
          </form>
        )}

        {mode === "signin" && (
          <form onSubmit={handleSignIn} style={formStyle}>
            <label style={labelStyle}>Email</label>
            <input
              type="email"
              placeholder="super@demo.com"
              value={signInData.email}
              onChange={(e) =>
                setSignInData((s) => ({ ...s, email: e.target.value }))
              }
              style={inputStyle}
              required
            />
            <label style={labelStyle}>Contraseña</label>
            <input
              type="password"
              placeholder="TuPassword123!"
              value={signInData.password}
              onChange={(e) =>
                setSignInData((s) => ({ ...s, password: e.target.value }))
              }
              style={inputStyle}
              required
            />
            <button type="submit" style={submitBtnStyle} disabled={loading}>
              {loading ? "Iniciando sesión..." : "Iniciar sesión"}
            </button>
            <Link to="/shop/login" style={{ ...linkStyle, color: "#38bdf8" }}>
              Entrar como barbería / tienda →
            </Link>
            <Link to="/signup" style={linkStyle}>
              ← ¿No tienes cuenta? Registrarse
            </Link>
          </form>
        )}

        {message && (
          <div
            style={message.type === "error" ? errorStyle : successStyle}
            role="alert"
          >
            {message.text}
          </div>
        )}
      </div>
    </div>
  );
}
