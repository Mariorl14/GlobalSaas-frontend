import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { API_BASE_URL } from "../../config";
import { IconPlus, IconEdit, IconTrash, IconClose, IconScissors, IconAlert, IconSearch } from "../icons";

type Service = {
  id: string;
  name: string;
  description: string | null;
  duration: number;
  price: number;
  is_active: boolean;
};

export function ServicesPage() {
  const [items, setItems] = useState<Service[]>([]);
  const [form, setForm] = useState({
    name: "",
    description: "",
    duration: "30",
    price: "",
    is_active: true,
  });
  const [editId, setEditId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await axios.get<{ items: Service[] }>(`${API_BASE_URL}/api/shop/services`);
      setItems(res.data.items);
    } catch {
      setErr("Error al cargar servicios.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const startEdit = (s: Service) => {
    setEditId(s.id);
    setForm({
      name: s.name,
      description: s.description ?? "",
      duration: String(s.duration),
      price: String(s.price),
      is_active: s.is_active,
    });
    setErr(null);
    setPanelOpen(true);
  };

  const openCreate = () => {
    setEditId(null);
    setForm({ name: "", description: "", duration: "30", price: "", is_active: true });
    setErr(null);
    setPanelOpen(true);
  };

  const reset = () => {
    setEditId(null);
    setForm({ name: "", description: "", duration: "30", price: "", is_active: true });
    setPanelOpen(false);
    setErr(null);
  };

  const submit = async () => {
    setErr(null);
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      duration: Number.parseInt(form.duration, 10),
      price: Number(form.price),
      is_active: form.is_active,
    };
    try {
      if (editId) {
        await axios.put(`${API_BASE_URL}/api/shop/services/${editId}`, payload);
      } else {
        await axios.post(`${API_BASE_URL}/api/shop/services`, payload);
      }
      reset();
      await load();
    } catch (e: unknown) {
      const status = axios.isAxiosError(e) ? e.response?.status : undefined;
      if (status === 401) {
        setErr("Sesión expirada o no autorizada. Cierra sesión e inicia de nuevo en el portal.");
      } else if (status === 403) {
        setErr("No tienes permiso para guardar servicios.");
      } else {
        setErr("No se pudo guardar.");
      }
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm("¿Eliminar servicio?")) return;
    try {
      await axios.delete(`${API_BASE_URL}/api/shop/services/${id}`);
      await load();
    } catch {
      setErr("No se pudo eliminar (¿tiene citas?).");
    }
  };

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.description ?? "").toLowerCase().includes(q),
    );
  }, [items, search]);

  return (
    <div>
      <div className="bp-page__head">
        <div>
          <h1 className="bp-page__title">Servicios</h1>
          <p className="bp-page__subtitle">
            Tu catálogo. Duración, precio y estado, listos para reservas.
          </p>
        </div>
        <div className="bp-page__actions">
          <button type="button" className="bp-btn bp-btn--primary" onClick={openCreate}>
            <IconPlus />
            Nuevo servicio
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
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar servicio…"
          />
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="bp-card">
          <div className="bp-empty">
            <div className="bp-empty__icon">
              <IconScissors />
            </div>
            <div className="bp-empty__title">
              {search ? "Sin resultados" : "Sin servicios todavía"}
            </div>
            <div className="bp-empty__text">
              Define cortes, barba y combos para tu agenda pública.
            </div>
            {!search ? (
              <button type="button" className="bp-btn bp-btn--primary bp-btn--sm" onClick={openCreate}>
                <IconPlus />
                Nuevo servicio
              </button>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="bp-cards">
          {visible.map((s) => (
            <article className="bp-product-card" key={s.id}>
              <div className="bp-product-card__top">
                <div>
                  <h3 className="bp-product-card__name">{s.name}</h3>
                  <p className="bp-product-card__meta">
                    {s.duration} min
                    {s.description ? ` · ${s.description}` : ""}
                  </p>
                </div>
                <span className={`bp-badge ${s.is_active ? "bp-badge--success" : "bp-badge--neutral"}`}>
                  <span className="bp-badge__dot" />
                  {s.is_active ? "Activo" : "Inactivo"}
                </span>
              </div>
              <div className="bp-product-card__price">${s.price.toFixed(2)}</div>
              <div className="bp-product-card__footer">
                <button type="button" className="bp-btn bp-btn--secondary bp-btn--sm" onClick={() => startEdit(s)}>
                  <IconEdit />
                  Editar
                </button>
                <button type="button" className="bp-btn bp-btn--danger bp-btn--sm" onClick={() => void remove(s.id)}>
                  <IconTrash />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {panelOpen ? (
        <>
          <div className="bp-panel__overlay" onClick={reset} />
          <div className="bp-panel" role="dialog" aria-modal="true">
            <div className="bp-panel__header">
              <div>
                <h2 className="bp-panel__title">{editId ? "Editar servicio" : "Nuevo servicio"}</h2>
                <p className="bp-panel__subtitle">Nombre, duración y precio para el catálogo.</p>
              </div>
              <button type="button" className="bp-icon-btn" onClick={reset} aria-label="Cerrar">
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
                <label className="bp-label">Nombre</label>
                <input
                  className="bp-input"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Ej. Corte clásico"
                />
              </div>
              <div className="bp-field">
                <label className="bp-label">Descripción</label>
                <textarea
                  className="bp-textarea"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                />
              </div>
              <div className="bp-field__row">
                <div className="bp-field">
                  <label className="bp-label">Duración (min)</label>
                  <input
                    className="bp-input"
                    type="number"
                    value={form.duration}
                    onChange={(e) => setForm((f) => ({ ...f, duration: e.target.value }))}
                  />
                </div>
                <div className="bp-field">
                  <label className="bp-label">Precio</label>
                  <input
                    className="bp-input"
                    type="number"
                    step="0.01"
                    value={form.price}
                    onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                  />
                </div>
              </div>
              <label className="bp-switch-row">
                <span className="bp-switch-row__text">Activo en el catálogo</span>
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
              <button type="button" className="bp-btn bp-btn--secondary" onClick={reset}>
                Cancelar
              </button>
              <button type="button" className="bp-btn bp-btn--primary" onClick={() => void submit()}>
                Guardar
              </button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
