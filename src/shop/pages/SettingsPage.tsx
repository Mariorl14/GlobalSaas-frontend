import { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import { API_BASE_URL } from "../../config";
import { mediaUrl } from "../../mediaUrl";
import { session } from "../../auth/session";
import { isShopAdmin } from "../../auth/roles";
import { IconAlert } from "../icons";

type Biz = {
  id: string;
  name: string;
  address: string;
  email: string;
  phone: string;
  logo_url: string | null;
  business_hours_json: string | null;
  booking_notes: string | null;
  is_active: boolean;
};

export function SettingsPage() {
  const [data, setData] = useState<Biz | null>(null);
  const [form, setForm] = useState({
    name: "",
    address: "",
    email: "",
    phone: "",
    logo_url: "",
    business_hours_json: "",
    booking_notes: "",
  });
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const admin = isShopAdmin(session.getUser());

  const load = useCallback(async () => {
    try {
      const res = await axios.get<Biz>(`${API_BASE_URL}/api/shop/settings`);
      setData(res.data);
      setForm({
        name: res.data.name,
        address: res.data.address,
        email: res.data.email,
        phone: res.data.phone,
        logo_url: res.data.logo_url ?? "",
        business_hours_json: res.data.business_hours_json ?? "",
        booking_notes: res.data.booking_notes ?? "",
      });
    } catch {
      setErr("Error al cargar ajustes.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    if (!admin) return;
    setSaved(false);
    setErr(null);
    try {
      await axios.put(`${API_BASE_URL}/api/shop/settings`, {
        name: form.name.trim(),
        address: form.address.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        logo_url: form.logo_url.trim() || null,
        business_hours_json: form.business_hours_json.trim() || null,
        booking_notes: form.booking_notes.trim() || null,
      });
      await load();
      setSaved(true);
    } catch {
      setErr("No se pudo guardar (¿permisos?).");
    }
  };

  const uploadLogo = async (file: File) => {
    if (!admin) return;
    setUploading(true);
    setErr(null);
    setSaved(false);
    try {
      const body = new FormData();
      body.append("logo", file);
      const res = await axios.post<Biz>(`${API_BASE_URL}/api/shop/settings/logo`, body, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setData(res.data);
      setForm((f) => ({ ...f, logo_url: res.data.logo_url ?? "" }));
      setSaved(true);
      window.dispatchEvent(new CustomEvent("bp-business-updated"));
    } catch (e: unknown) {
      const msg =
        axios.isAxiosError(e) && e.response?.data && typeof e.response.data === "object"
          ? (e.response.data as { error?: string }).error
          : null;
      setErr(msg ?? "No se pudo subir el logo.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const removeLogo = async () => {
    if (!admin) return;
    setUploading(true);
    setErr(null);
    try {
      const res = await axios.delete<Biz>(`${API_BASE_URL}/api/shop/settings/logo`);
      setData(res.data);
      setForm((f) => ({ ...f, logo_url: "" }));
      setSaved(true);
      window.dispatchEvent(new CustomEvent("bp-business-updated"));
    } catch {
      setErr("No se pudo eliminar el logo.");
    } finally {
      setUploading(false);
    }
  };

  const logoSrc = mediaUrl(form.logo_url);

  if (!data && !err) {
    return (
      <div>
        <span className="bp-skeleton" style={{ width: 180, height: 28 }} />
        <span className="bp-skeleton" style={{ width: "60%", height: 14, display: "block", marginTop: 12 }} />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 720 }}>
      <div className="bp-page__head">
        <div>
          <h1 className="bp-page__title">Ajustes</h1>
          <p className="bp-page__subtitle">
            Identidad, contacto y preferencias de tu negocio.
          </p>
        </div>
        {admin ? (
          <div className="bp-page__actions">
            <button type="button" className="bp-btn bp-btn--primary" onClick={() => void save()}>
              Guardar cambios
            </button>
          </div>
        ) : null}
      </div>

      {err ? (
        <div className="bp-alert bp-alert--error" style={{ marginBottom: 16 }}>
          <IconAlert />
          <span>{err}</span>
        </div>
      ) : null}

      {!admin ? (
        <div className="bp-alert bp-alert--warning" style={{ marginBottom: 16 }}>
          <IconAlert />
          <span>Solo el administrador de la tienda puede editar estos campos.</span>
        </div>
      ) : null}

      {saved ? (
        <div
          className="bp-badge bp-badge--success"
          style={{ marginBottom: 16, padding: "8px 14px" }}
        >
          Cambios guardados
        </div>
      ) : null}

      <section className="bp-settings-section">
        <div className="bp-settings-section__head">
          <h2 className="bp-card__title">Perfil del negocio</h2>
          <p className="bp-card__subtitle">Cómo aparece tu negocio ante clientes y en el portal.</p>
        </div>
        <div className="bp-settings-section__body">
          <div className="bp-field">
            <label className="bp-label">Nombre</label>
            <input
              className="bp-input"
              disabled={!admin}
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div className="bp-field">
            <label className="bp-label">Dirección</label>
            <input
              className="bp-input"
              disabled={!admin}
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
            />
          </div>
          <div className="bp-field__row">
            <div className="bp-field">
              <label className="bp-label">Email</label>
              <input
                className="bp-input"
                disabled={!admin}
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div className="bp-field">
              <label className="bp-label">Teléfono</label>
              <input
                className="bp-input"
                disabled={!admin}
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </div>
          </div>

          <div className="bp-field">
            <label className="bp-label">Logo</label>
            <div className="bp-logo-upload">
              <div className="bp-logo-upload__preview" aria-hidden>
                {logoSrc ? (
                  <img src={logoSrc} alt="" />
                ) : (
                  <span>{(form.name || "N").charAt(0).toUpperCase()}</span>
                )}
              </div>
              <div className="bp-logo-upload__meta">
                <p className="bp-hint" style={{ margin: "0 0 10px" }}>
                  PNG, JPG, WEBP o GIF · máx. 2 MB. Se usa en el portal y la reserva pública.
                </p>
                {admin ? (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      hidden
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void uploadLogo(file);
                      }}
                    />
                    <button
                      type="button"
                      className="bp-btn bp-btn--secondary bp-btn--sm"
                      disabled={uploading}
                      onClick={() => fileRef.current?.click()}
                    >
                      {uploading ? "Subiendo…" : logoSrc ? "Cambiar logo" : "Subir logo"}
                    </button>
                    {logoSrc ? (
                      <button
                        type="button"
                        className="bp-btn bp-btn--ghost bp-btn--sm"
                        disabled={uploading}
                        onClick={() => void removeLogo()}
                      >
                        Quitar
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bp-settings-section">
        <div className="bp-settings-section__head">
          <h2 className="bp-card__title">Horarios</h2>
          <p className="bp-card__subtitle">
            Formato JSON por ahora. Más adelante: editor visual por día.
          </p>
        </div>
        <div className="bp-settings-section__body">
          <div className="bp-field">
            <label className="bp-label">business_hours_json</label>
            <textarea
              className="bp-textarea"
              style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 13, minHeight: 120 }}
              disabled={!admin}
              placeholder='{"mon":[{"open":"09:00","close":"18:00"}]}'
              value={form.business_hours_json}
              onChange={(e) => setForm((f) => ({ ...f, business_hours_json: e.target.value }))}
            />
          </div>
        </div>
      </section>

      <section className="bp-settings-section">
        <div className="bp-settings-section__head">
          <h2 className="bp-card__title">Reservas públicas</h2>
          <p className="bp-card__subtitle">Notas y preferencias visibles en el booking.</p>
        </div>
        <div className="bp-settings-section__body">
          <div className="bp-field">
            <label className="bp-label">Notas de reserva</label>
            <textarea
              className="bp-textarea"
              disabled={!admin}
              value={form.booking_notes}
              onChange={(e) => setForm((f) => ({ ...f, booking_notes: e.target.value }))}
              placeholder="Políticas de cancelación, cómo llegar…"
            />
          </div>
        </div>
      </section>

      {admin ? (
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
          <button type="button" className="bp-btn bp-btn--primary" onClick={() => void save()}>
            Guardar cambios
          </button>
        </div>
      ) : null}
    </div>
  );
}
