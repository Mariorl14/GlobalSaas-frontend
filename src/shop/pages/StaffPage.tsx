import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { API_BASE_URL } from "../../config";
import { session } from "../../auth/session";
import { isShopAdmin } from "../../auth/roles";
import { IconTeam, IconEdit, IconClose, IconAlert } from "../icons";

type StaffRow = {
  employee_id: string;
  user_id: string;
  email: string | null;
  role: string | null;
  display_name: string | null;
  phone: string | null;
  is_active: boolean;
};

function initials(row: StaffRow): string {
  if (row.display_name) {
    return row.display_name
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("");
  }
  return (row.email ?? "?").slice(0, 2).toUpperCase();
}

export function StaffPage() {
  const [items, setItems] = useState<StaffRow[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState({ display_name: "", phone: "", is_active: true });
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

  const startEdit = (r: StaffRow) => {
    setEditing(r.employee_id);
    setForm({
      display_name: r.display_name ?? "",
      phone: r.phone ?? "",
      is_active: r.is_active,
    });
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
    try {
      await axios.put(`${API_BASE_URL}/api/shop/staff/${editing}`, {
        display_name: form.display_name.trim() || null,
        phone: form.phone.trim() || null,
        is_active: form.is_active,
      });
      closePanel();
      await load();
    } catch {
      setErr("Solo el administrador de tienda puede editar staff.");
    }
  };

  const editingRow = items.find((r) => r.employee_id === editing) ?? null;

  return (
    <div>
      <div className="bp-page__head">
        <div>
          <h1 className="bp-page__title">Equipo</h1>
          <p className="bp-page__subtitle">
            Barberos y staff de tu negocio. Perfiles visibles en la agenda.
          </p>
        </div>
      </div>

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
                  <div className={`bp-avatar bp-avatar--lg ${r.role === "admin" ? "bp-avatar--violet" : ""}`}>
                    {initials(r)}
                  </div>
                  <div>
                    <h3 className="bp-product-card__name">
                      {r.display_name || r.email?.split("@")[0] || "Staff"}
                    </h3>
                    <p className="bp-product-card__meta">{r.email}</p>
                  </div>
                </div>
                <span className={`bp-badge ${r.is_active ? "bp-badge--success" : "bp-badge--neutral"}`}>
                  <span className="bp-badge__dot" />
                  {r.is_active ? "Activo" : "Inactivo"}
                </span>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <span className={`bp-badge ${r.role === "admin" ? "bp-badge--primary" : "bp-badge--neutral"}`}>
                  {r.role === "admin" ? "Administrador" : "Staff"}
                </span>
                {r.phone ? <span className="bp-badge bp-badge--neutral">{r.phone}</span> : null}
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
        Próximamente: invitar barberos, disponibilidad y asignación a reservas públicas.
      </p>

      {panelOpen && editingRow ? (
        <>
          <div className="bp-panel__overlay" onClick={closePanel} />
          <div className="bp-panel" role="dialog" aria-modal="true">
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
