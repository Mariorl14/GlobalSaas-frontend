import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { API_BASE_URL } from "../../config";
import { IconPlus, IconClose, IconSearch, IconUsers, IconAlert, IconEdit } from "../icons";

type Client = {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string | null;
  notes: string | null;
  preferred_employee_id: string | null;
};

function initials(first: string, last: string): string {
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase() || "?";
}

export function CustomersPage() {
  const [items, setItems] = useState<Client[]>([]);
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<Client | null>(null);
  const [history, setHistory] = useState<{ id: string; start_time: string | null; status: string }[]>([]);
  const [salesHistory, setSalesHistory] = useState<
    { id: string; invoice_number: string; total: number; created_at: string | null; products_summary: string; services_summary: string }[]
  >([]);
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    email: "",
    notes: "",
  });
  const [err, setErr] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [mode, setMode] = useState<"create" | "edit">("create");

  const load = useCallback(async () => {
    setErr(null);
    try {
      const res = await axios.get<{ items: Client[] }>(`${API_BASE_URL}/api/shop/clients`, {
        params: q ? { q } : {},
      });
      setItems(res.data.items);
    } catch {
      setErr("Error al cargar clientes.");
    }
  }, [q]);

  useEffect(() => {
    void load();
  }, [load]);

  const loadHistory = async (c: Client) => {
    setSel(c);
    setMode("edit");
    setForm({
      first_name: c.first_name,
      last_name: c.last_name,
      phone: c.phone,
      email: c.email ?? "",
      notes: c.notes ?? "",
    });
    setPanelOpen(true);
    try {
      const [appts, sales] = await Promise.all([
        axios.get<{ items: { id: string; start_time: string | null; status: string }[] }>(
          `${API_BASE_URL}/api/shop/clients/${c.id}/appointments`,
        ),
        axios.get<{
          items: {
            id: string;
            invoice_number: string;
            total: number;
            created_at: string | null;
            products_summary: string;
            services_summary: string;
          }[];
        }>(`${API_BASE_URL}/api/shop/clients/${c.id}/sales`),
      ]);
      setHistory(appts.data.items);
      setSalesHistory(sales.data.items);
    } catch {
      setHistory([]);
      setSalesHistory([]);
    }
  };

  const openCreate = () => {
    setSel(null);
    setMode("create");
    setHistory([]);
    setSalesHistory([]);
    setForm({ first_name: "", last_name: "", phone: "", email: "", notes: "" });
    setErr(null);
    setPanelOpen(true);
  };

  const closePanel = () => {
    setPanelOpen(false);
    setSel(null);
    setErr(null);
  };

  const save = async () => {
    if (!sel) return;
    try {
      await axios.put(`${API_BASE_URL}/api/shop/clients/${sel.id}`, {
        first_name: form.first_name,
        last_name: form.last_name,
        phone: form.phone,
        email: form.email || null,
        notes: form.notes || null,
      });
      await load();
      closePanel();
    } catch {
      setErr("No se pudo guardar.");
    }
  };

  const create = async () => {
    try {
      await axios.post(`${API_BASE_URL}/api/shop/clients`, {
        first_name: form.first_name,
        last_name: form.last_name,
        phone: form.phone,
        email: form.email || null,
        notes: form.notes || null,
      });
      setForm({ first_name: "", last_name: "", phone: "", email: "", notes: "" });
      await load();
      closePanel();
    } catch {
      setErr("No se pudo crear.");
    }
  };

  return (
    <div>
      <div className="bp-page__head">
        <div>
          <h1 className="bp-page__title">Clientes</h1>
          <p className="bp-page__subtitle">
            Perfiles de tu clientela. Historial, notas y contacto en un solo lugar.
          </p>
        </div>
        <div className="bp-page__actions">
          <button type="button" className="bp-btn bp-btn--primary" onClick={openCreate}>
            <IconPlus />
            Nuevo cliente
          </button>
        </div>
      </div>

      {err && !panelOpen ? (
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
            placeholder="Buscar nombre, teléfono, email…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <span className="bp-badge bp-badge--neutral">{items.length} clientes</span>
      </div>

      <div className="bp-table-wrap">
        <div className="bp-table-scroll">
          <table className="bp-table">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Teléfono</th>
                <th>Email</th>
                <th style={{ textAlign: "right" }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ padding: 0 }}>
                    <div className="bp-empty">
                      <div className="bp-empty__icon">
                        <IconUsers />
                      </div>
                      <div className="bp-empty__title">
                        {q ? "Sin resultados" : "Aún no hay clientes"}
                      </div>
                      <div className="bp-empty__text">
                        {q
                          ? "Prueba con otro término."
                          : "Crea el primero para empezar a agendar citas."}
                      </div>
                      {!q ? (
                        <button type="button" className="bp-btn bp-btn--primary bp-btn--sm" onClick={openCreate}>
                          <IconPlus />
                          Nuevo cliente
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ) : (
                items.map((c) => (
                  <tr
                    key={c.id}
                    className="bp-row--clickable"
                    onClick={() => void loadHistory(c)}
                  >
                    <td>
                      <div className="bp-person">
                        <div className="bp-avatar">{initials(c.first_name, c.last_name)}</div>
                        <div>
                          <div className="bp-cell-strong">
                            {c.first_name} {c.last_name}
                          </div>
                          {c.notes ? (
                            <div className="bp-cell-muted" style={{ maxWidth: 280, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {c.notes}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td>{c.phone}</td>
                    <td className="bp-cell-muted">{c.email ?? "—"}</td>
                    <td>
                      <div className="bp-cell-actions">
                        <button
                          type="button"
                          className="bp-btn bp-btn--secondary bp-btn--sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            void loadHistory(c);
                          }}
                        >
                          <IconEdit />
                          Perfil
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {panelOpen ? (
        <>
          <div className="bp-panel__overlay" onClick={closePanel} />
          <div className="bp-panel" role="dialog" aria-modal="true">
            <div className="bp-panel__header">
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                {mode === "edit" && sel ? (
                  <div className="bp-avatar bp-avatar--lg">
                    {initials(sel.first_name, sel.last_name)}
                  </div>
                ) : null}
                <div>
                  <h2 className="bp-panel__title">
                    {mode === "create" ? "Nuevo cliente" : `${form.first_name} ${form.last_name}`}
                  </h2>
                  <p className="bp-panel__subtitle">
                    {mode === "create"
                      ? "Agrega un cliente a tu negocio."
                      : "Perfil, contacto e historial de citas."}
                  </p>
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

              <div className="bp-field__row">
                <div className="bp-field">
                  <label className="bp-label">Nombre</label>
                  <input
                    className="bp-input"
                    value={form.first_name}
                    onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))}
                  />
                </div>
                <div className="bp-field">
                  <label className="bp-label">Apellidos</label>
                  <input
                    className="bp-input"
                    value={form.last_name}
                    onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))}
                  />
                </div>
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
                <label className="bp-label">Email</label>
                <input
                  className="bp-input"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                />
              </div>
              <div className="bp-field">
                <label className="bp-label">Notas</label>
                <textarea
                  className="bp-textarea"
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="Preferencias, alergias, estilo favorito…"
                />
              </div>

              {mode === "edit" ? (
                <div>
                  <div className="bp-label" style={{ marginBottom: 10 }}>
                    Historial de citas
                  </div>
                  {history.length === 0 ? (
                    <p className="bp-cell-muted" style={{ margin: 0 }}>
                      Sin citas registradas.
                    </p>
                  ) : (
                    <div className="bp-timeline">
                      {history.map((h) => (
                        <div className="bp-timeline__item" key={h.id}>
                          <div className="bp-timeline__dot" />
                          <div>
                            <div className="bp-timeline__title">
                              {h.start_time
                                ? new Date(h.start_time).toLocaleString("es-MX")
                                : "—"}
                            </div>
                            <div className="bp-timeline__meta">{h.status}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="bp-label" style={{ margin: "22px 0 10px" }}>
                    Historial de ventas
                  </div>
                  {salesHistory.length === 0 ? (
                    <p className="bp-cell-muted" style={{ margin: 0 }}>
                      Sin ventas registradas.
                    </p>
                  ) : (
                    <div className="bp-timeline">
                      {salesHistory.map((s) => (
                        <div className="bp-timeline__item" key={s.id}>
                          <div className="bp-timeline__dot" />
                          <div>
                            <div className="bp-timeline__title">
                              {s.invoice_number} · ${Number(s.total).toFixed(2)}
                            </div>
                            <div className="bp-timeline__meta">
                              {s.created_at
                                ? new Date(s.created_at).toLocaleString("es-MX")
                                : "—"}
                              {" · "}
                              {s.services_summary} / {s.products_summary}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}
            </div>
            <div className="bp-panel__footer">
              <button type="button" className="bp-btn bp-btn--secondary" onClick={closePanel}>
                Cancelar
              </button>
              <button
                type="button"
                className="bp-btn bp-btn--primary"
                onClick={() => void (mode === "edit" ? save() : create())}
              >
                {mode === "edit" ? "Guardar cambios" : "Crear cliente"}
              </button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
