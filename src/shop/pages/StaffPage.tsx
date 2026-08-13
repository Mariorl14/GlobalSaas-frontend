import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { API_BASE_URL } from "../../config";
import { session } from "../../auth/session";
import { isShopAdmin, shopRoleLabel } from "../../auth/roles";
import { IconTeam, IconEdit, IconClose, IconAlert } from "../icons";
import { staffLabel } from "../staffLabel";
import { BusinessHoursEditor } from "../BusinessHoursEditor";
import {
  parseBusinessHoursJson,
  serializeWeeklySchedule,
  summarizeWorkDays,
  validateWeeklySchedule,
  type WeeklySchedule,
} from "../businessHours";

type StaffRow = {
  employee_id: string;
  user_id: string;
  email: string | null;
  personal_email?: string | null;
  role: string | null;
  display_name: string | null;
  label?: string | null;
  full_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  phone: string | null;
  is_active: boolean;
  work_hours_json?: string | null;
  follows_business_hours?: boolean;
  commission_percentage?: number | null;
};

function initials(row: StaffRow): string {
  const name = staffLabel(row);
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function StaffPage() {
  const [items, setItems] = useState<StaffRow[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState({
    display_name: "",
    phone: "",
    personal_email: "",
    is_active: true,
    commission_percentage: "50",
  });
  const [followBusinessHours, setFollowBusinessHours] = useState(true);
  const [hours, setHours] = useState<WeeklySchedule>(() => parseBusinessHoursJson(null));
  const [panelOpen, setPanelOpen] = useState(false);
  const admin = isShopAdmin(session.getUser());

  const load = useCallback(async () => {
    try {
      const res = await axios.get<{ items: StaffRow[] }>(`${API_BASE_URL}/api/shop/staff`);
      setItems(res.data.items);
    } catch {
      setErr("Error al cargar equipo.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!okMsg) return;
    const t = window.setTimeout(() => setOkMsg(null), 3500);
    return () => window.clearTimeout(t);
  }, [okMsg]);

  const startEdit = (r: StaffRow) => {
    setEditing(r.employee_id);
    setForm({
      display_name: r.display_name ?? "",
      phone: r.phone ?? "",
      personal_email: r.personal_email ?? "",
      is_active: r.is_active,
      commission_percentage: String(
        r.commission_percentage != null ? r.commission_percentage : 50,
      ),
    });
    const follows =
      r.follows_business_hours ?? !(r.work_hours_json && r.work_hours_json.trim());
    setFollowBusinessHours(follows);
    setHours(parseBusinessHoursJson(r.work_hours_json));
    setErr(null);
    setPanelOpen(true);
  };

  const closePanel = () => {
    setEditing(null);
    setPanelOpen(false);
    setErr(null);
  };

  const save = async () => {
    if (!editing) return;

    let work_hours_json: string | null = null;
    if (!followBusinessHours) {
      const hoursErr = validateWeeklySchedule(hours);
      if (hoursErr) {
        setErr(hoursErr);
        return;
      }
      work_hours_json = serializeWeeklySchedule(hours);
    }

    try {
      const pct = Number(form.commission_percentage);
      const current = items.find((r) => r.employee_id === editing) ?? null;
      const res = await axios.put<StaffRow>(`${API_BASE_URL}/api/shop/staff/${editing}`, {
        display_name: form.display_name.trim() || null,
        phone: form.phone.trim() || null,
        personal_email: form.personal_email.trim() || null,
        is_active: form.is_active,
        work_hours_json,
        commission_percentage: pct,
      });
      const name = staffLabel(current ?? res.data);
      const savedPct = res.data.commission_percentage ?? pct;
      closePanel();
      await load();
      setOkMsg(`La comisión de ${name} se actualizó a ${savedPct}%.`);
    } catch (e: unknown) {
      const msg =
        axios.isAxiosError(e) && e.response?.data && typeof e.response.data === "object"
          ? (e.response.data as { error?: string }).error
          : null;
      setErr(msg ?? "Solo el administrador de tienda puede editar staff.");
    }
  };

  const editingRow = items.find((r) => r.employee_id === editing) ?? null;

  return (
    <div>
      <div className="bp-page__head">
        <div>
          <h1 className="bp-page__title">Equipo</h1>
          <p className="bp-page__subtitle">
            Barberos y staff de tu negocio. Perfiles, comisión de servicios y días laborales.
          </p>
        </div>
      </div>

      {okMsg ? (
        <div
          className="bp-alert"
          style={{
            marginBottom: 16,
            background: "var(--bp-success-soft)",
            color: "var(--bp-success)",
          }}
        >
          {okMsg}
        </div>
      ) : null}

      {err && !panelOpen ? (
        <div className="bp-alert bp-alert--error" style={{ marginBottom: 16 }}>
          <IconAlert />
          <span>{err}</span>
        </div>
      ) : null}

      {!admin ? (
        <div className="bp-alert bp-alert--warning" style={{ marginBottom: 16 }}>
          <IconAlert />
          <span>Solo administradores pueden editar perfiles de equipo.</span>
        </div>
      ) : null}

      {items.length === 0 ? (
        <div className="bp-card">
          <div className="bp-empty">
            <div className="bp-empty__icon">
              <IconTeam />
            </div>
            <div className="bp-empty__title">Sin miembros del equipo</div>
            <div className="bp-empty__text">
              Los usuarios vinculados a tu negocio aparecerán aquí.
            </div>
          </div>
        </div>
      ) : (
        <div className="bp-cards">
          {items.map((r) => (
            <article className="bp-product-card" key={r.employee_id}>
              <div className="bp-product-card__top">
                <div className="bp-person">
                  <div
                    className={`bp-avatar bp-avatar--lg ${
                      r.role === "admin" || r.role === "owner" ? "bp-avatar--violet" : ""
                    }`}
                  >
                    {initials(r)}
                  </div>
                  <div>
                    <h3 className="bp-product-card__name">{staffLabel(r)}</h3>
                    <p className="bp-product-card__meta">{r.email}</p>
                  </div>
                </div>
                <span className={`bp-badge ${r.is_active ? "bp-badge--success" : "bp-badge--neutral"}`}>
                  <span className="bp-badge__dot" />
                  {r.is_active ? "Activo" : "Inactivo"}
                </span>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <span
                  className={`bp-badge ${
                    r.role === "admin" || r.role === "owner"
                      ? "bp-badge--primary"
                      : "bp-badge--neutral"
                  }`}
                >
                  {shopRoleLabel(r.role)}
                </span>
                {r.phone ? <span className="bp-badge bp-badge--neutral">{r.phone}</span> : null}
                <span className="bp-badge bp-badge--info">
                  Comisión {r.commission_percentage != null ? r.commission_percentage : 50}%
                </span>
                <span className="bp-badge bp-badge--neutral">
                  {summarizeWorkDays(r.work_hours_json)}
                </span>
              </div>
              {admin ? (
                <div className="bp-product-card__footer">
                  <button
                    type="button"
                    className="bp-btn bp-btn--secondary bp-btn--sm"
                    onClick={() => startEdit(r)}
                  >
                    <IconEdit />
                    Editar perfil
                  </button>
                </div>
              ) : null}
            </article>
          ))}
        </div>
      )}

      <p className="bp-hint" style={{ marginTop: 20 }}>
        El horario del negocio (Ajustes) marca la apertura del local. Cada persona puede usar ese
        mismo horario o definir sus propios días y horas.
      </p>

      {panelOpen && editingRow ? (
        <>
          <div className="bp-panel__overlay" onClick={closePanel} />
          <div className="bp-panel bp-panel--wide" role="dialog" aria-modal="true">
            <div className="bp-panel__header">
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div className="bp-avatar bp-avatar--lg">{initials(editingRow)}</div>
                <div>
                  <h2 className="bp-panel__title">Editar perfil</h2>
                  <p className="bp-panel__subtitle">{editingRow.email}</p>
                </div>
              </div>
              <button type="button" className="bp-icon-btn" onClick={closePanel} aria-label="Cerrar">
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
                <label className="bp-label">Nombre visible</label>
                <input
                  className="bp-input"
                  value={form.display_name}
                  onChange={(e) => setForm((f) => ({ ...f, display_name: e.target.value }))}
                  placeholder="Ej. Carlos"
                />
              </div>
              <div className="bp-field">
                <label className="bp-label">Teléfono</label>
                <input
                  className="bp-input"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                />
              </div>
              <div className="bp-field">
                <label className="bp-label">Email personal</label>
                <input
                  className="bp-input"
                  type="email"
                  value={form.personal_email}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, personal_email: e.target.value }))
                  }
                  placeholder="correo@gmail.com"
                />
                <p className="bp-hint" style={{ marginTop: 6 }}>
                  Alertas de citas nuevas. El acceso al portal sigue siendo{" "}
                  <strong>{editingRow.email}</strong>.
                </p>
              </div>
              <label className="bp-switch-row">
                <span className="bp-switch-row__text">Activo en el equipo</span>
                <span className="bp-switch">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                  />
                  <span className="bp-switch__track" />
                  <span className="bp-switch__thumb" />
                </span>
              </label>

              <div className="bp-field">
                <label className="bp-label" htmlFor="staff-commission">
                  Comisión de servicios
                </label>
                <div style={{ display: "flex", alignItems: "center", gap: 8, maxWidth: 160 }}>
                  <input
                    id="staff-commission"
                    className="bp-input"
                    type="number"
                    min={0}
                    max={100}
                    step="1"
                    value={form.commission_percentage}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, commission_percentage: e.target.value }))
                    }
                  />
                  <span>%</span>
                </div>
                <p className="bp-hint" style={{ marginTop: 6 }}>
                  Porcentaje del precio del servicio que gana esta persona al completar una cita.
                  El resto queda para el negocio. No aplica a venta de productos.
                </p>
              </div>

              <div className="bp-field" style={{ marginTop: 8 }}>
                <label className="bp-label">Horario laboral</label>
                <p className="bp-hint" style={{ marginTop: 0 }}>
                  Si todos trabajan los mismos días, deja “horario del negocio”. Si no, marca los días
                  de esta persona (ej. Lun–Mié). Solo se ofrecen citas en la intersección con el
                  horario del local.
                </p>
                <label className="bp-switch-row" style={{ marginBottom: 12 }}>
                  <span className="bp-switch-row__text">Usar horario del negocio</span>
                  <span className="bp-switch">
                    <input
                      type="checkbox"
                      checked={followBusinessHours}
                      onChange={(e) => setFollowBusinessHours(e.target.checked)}
                    />
                    <span className="bp-switch__track" />
                    <span className="bp-switch__thumb" />
                  </span>
                </label>
                {!followBusinessHours ? (
                  <BusinessHoursEditor value={hours} onChange={setHours} />
                ) : null}
              </div>
            </div>
            <div className="bp-panel__footer">
              <button type="button" className="bp-btn bp-btn--secondary" onClick={closePanel}>
                Cancelar
              </button>
              <button type="button" className="bp-btn bp-btn--primary" onClick={() => void save()}>
                Guardar
              </button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
