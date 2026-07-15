import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { API_BASE_URL } from "../../config";
import {
  IconPlus,
  IconEdit,
  IconTrash,
  IconClose,
  IconSearch,
  IconSubscription,
  IconChevronLeft,
  IconChevronRight,
  IconAlert,
  IconSort,
} from "./icons";

type Plan = {
  id: string;
  name: string;
  price: number;
  max_employees: number;
  max_appointments: number;
};

type PlanListResponse = {
  items: Plan[];
  page: number;
  per_page: number;
  total: number;
  pages: number;
};

type PlanForm = {
  name: string;
  price: string;
  max_employees: string;
  max_appointments: string;
};

function formatPrice(value: number): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
  }).format(value);
}

type SortDir = "asc" | "desc";

export const Plans: React.FC = () => {
  const [items, setItems] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(false);

  const [page, setPage] = useState(1);
  const perPage = 20;
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [error, setError] = useState<string>("");

  const [search, setSearch] = useState("");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [panelOpen, setPanelOpen] = useState(false);

  const emptyForm: PlanForm = useMemo(
    () => ({
      name: "",
      price: "",
      max_employees: "",
      max_appointments: "",
    }),
    [],
  );

  const [mode, setMode] = useState<"create" | "edit">("create");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<PlanForm>(emptyForm);

  const load = useCallback(
    async (targetPage: number) => {
      setLoading(true);
      setError("");
      try {
        const res = await axios.get<PlanListResponse>(
          `${API_BASE_URL}/api/plan`,
          { params: { page: targetPage, per_page: perPage } },
        );
        setItems(res.data.items);
        setPage(res.data.page);
        setTotalPages(res.data.pages || 1);
        setTotal(res.data.total);
      } catch (e) {
        setError("No fue posible cargar los planes. Revisa la consola.");
        console.error(e);
      } finally {
        setLoading(false);
      }
    },
    [perPage],
  );

  useEffect(() => {
    void load(1);
  }, [load]);

  const resetForm = useCallback(() => {
    setMode("create");
    setSelectedId(null);
    setForm(emptyForm);
  }, [emptyForm]);

  const startEdit = useCallback((p: Plan) => {
    setMode("edit");
    setSelectedId(p.id);
    setForm({
      name: p.name,
      price: String(p.price),
      max_employees: String(p.max_employees),
      max_appointments: String(p.max_appointments),
    });
  }, []);

  const validate = useCallback(() => {
    const missing: string[] = [];
    if (!form.name.trim()) missing.push("Nombre");
    const priceNorm = form.price.trim().replace(",", ".");
    const priceNum = Number(priceNorm);
    if (priceNorm === "" || Number.isNaN(priceNum) || priceNum < 0) {
      missing.push("Precio válido (≥ 0)");
    }
    const me = Number.parseInt(form.max_employees.trim(), 10);
    const ma = Number.parseInt(form.max_appointments.trim(), 10);
    if (
      form.max_employees.trim() === "" ||
      Number.isNaN(me) ||
      me < 0
    ) {
      missing.push("Máx. empleados (entero ≥ 0)");
    }
    if (
      form.max_appointments.trim() === "" ||
      Number.isNaN(ma) ||
      ma < 0
    ) {
      missing.push("Máx. citas (entero ≥ 0)");
    }
    return missing;
  }, [form]);

  const submit = useCallback(async () => {
    const missing = validate();
    if (missing.length > 0) {
      setError(`Revisa: ${missing.join(", ")}`);
      return;
    }

    const priceNorm = form.price.trim().replace(",", ".");
    const priceNum = Number(priceNorm);
    const maxEmployees = Number.parseInt(form.max_employees.trim(), 10);
    const maxAppointments = Number.parseInt(form.max_appointments.trim(), 10);

    setLoading(true);
    setError("");
    try {
      const payload = {
        name: form.name.trim(),
        price: priceNum,
        max_employees: maxEmployees,
        max_appointments: maxAppointments,
      };

      if (mode === "create") {
        await axios.post(`${API_BASE_URL}/api/plan`, payload);
      } else {
        if (!selectedId) throw new Error("Missing selectedId");
        await axios.put(`${API_BASE_URL}/api/plan/${selectedId}`, payload);
      }

      await load(page);
      resetForm();
      setPanelOpen(false);
    } catch (e) {
      setError("No fue posible guardar el plan. Revisa la consola.");
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [form, load, mode, page, resetForm, selectedId, validate]);

  const remove = useCallback(
    async (id: string) => {
      const ok = window.confirm(
        "¿Eliminar este plan? Los negocios que lo usan quedarán sin plan asignado.",
      );
      if (!ok) return;

      setLoading(true);
      setError("");
      try {
        await axios.delete(`${API_BASE_URL}/api/plan/${id}`);
        const nextPage = page > 1 && items.length === 1 ? page - 1 : page;
        await load(nextPage);
        resetForm();
      } catch (e) {
        setError("No fue posible eliminar el plan. Revisa la consola.");
        console.error(e);
      } finally {
        setLoading(false);
      }
    },
    [items.length, load, page, resetForm],
  );

  const openCreate = useCallback(() => {
    resetForm();
    setError("");
    setPanelOpen(true);
  }, [resetForm]);

  const openEdit = useCallback(
    (p: Plan) => {
      startEdit(p);
      setError("");
      setPanelOpen(true);
    },
    [startEdit],
  );

  const closePanel = useCallback(() => {
    resetForm();
    setPanelOpen(false);
    setError("");
  }, [resetForm]);

  const visibleItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    let out = items;
    if (q) {
      out = items.filter((p) => p.name.toLowerCase().includes(q));
    }
    const sorted = [...out].sort((a, b) =>
      a.name.localeCompare(b.name, "es", { sensitivity: "base" }),
    );
    if (sortDir === "desc") sorted.reverse();
    return sorted;
  }, [items, search, sortDir]);

  return (
    <>
      <div className="sa-toolbar">
        <div className="sa-toolbar__search">
          <IconSearch />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar plan por nombre…"
          />
        </div>
        <div className="sa-toolbar__spacer" />
        <span className="sa-badge sa-badge--neutral">{total} en total</span>
        <button type="button" className="sa-btn sa-btn--primary" onClick={openCreate} disabled={loading}>
          <IconPlus />
          Nuevo plan
        </button>
      </div>

      {error && !panelOpen ? (
        <div className="sa-alert sa-alert--error" style={{ marginBottom: 16 }}>
          <IconAlert />
          <span>{error}</span>
        </div>
      ) : null}

      <div className="sa-table-wrap">
        <div className="sa-table-scroll">
          <table className="sa-table">
            <thead>
              <tr>
                <th
                  className="sa-th--sortable"
                  onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
                >
                  <span className="sa-th__inner">
                    Nombre
                    <IconSort className="sa-th__sort" style={{ width: 13, height: 13 }} />
                  </span>
                </th>
                <th>Precio mensual</th>
                <th>Máx. empleados</th>
                <th>Máx. citas / mes</th>
                <th style={{ textAlign: "right" }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading && items.length === 0 ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={`sk-${i}`}>
                    {Array.from({ length: 5 }).map((__, j) => (
                      <td key={j}>
                        <span className="sa-skeleton" style={{ width: `${55 + ((i + j) % 3) * 12}%` }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : visibleItems.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: 0 }}>
                    <div className="sa-empty">
                      <div className="sa-empty__icon">
                        <IconSubscription />
                      </div>
                      <div className="sa-empty__title">
                        {search ? "Sin resultados" : "No hay planes de suscripción"}
                      </div>
                      <div className="sa-empty__text">
                        {search
                          ? "Prueba con otro término de búsqueda."
                          : "Crea un plan para asignarlo a los negocios."}
                      </div>
                      {!search ? (
                        <button type="button" className="sa-btn sa-btn--primary sa-btn--sm" onClick={openCreate}>
                          <IconPlus />
                          Nuevo plan
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ) : (
                visibleItems.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div className="sa-cell-strong">{p.name}</div>
                    </td>
                    <td>
                      <span className="sa-badge sa-badge--primary">{formatPrice(p.price)}</span>
                    </td>
                    <td className="sa-cell-muted">{p.max_employees}</td>
                    <td className="sa-cell-muted">{p.max_appointments}</td>
                    <td>
                      <div className="sa-cell-actions">
                        <button
                          type="button"
                          className="sa-btn sa-btn--secondary sa-btn--sm"
                          onClick={() => openEdit(p)}
                        >
                          <IconEdit />
                          Editar
                        </button>
                        <button
                          type="button"
                          className="sa-btn sa-btn--danger sa-btn--sm"
                          onClick={() => void remove(p.id)}
                          disabled={loading}
                        >
                          <IconTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="sa-pagination">
          <span className="sa-pagination__info">
            Página {page} de {totalPages} · {total} planes
          </span>
          <div className="sa-pagination__controls">
            <button
              type="button"
              className="sa-btn sa-btn--secondary sa-btn--sm"
              onClick={() => void load(Math.max(1, page - 1))}
              disabled={loading || page <= 1}
            >
              <IconChevronLeft />
              Anterior
            </button>
            <button
              type="button"
              className="sa-btn sa-btn--secondary sa-btn--sm"
              onClick={() => void load(Math.min(totalPages, page + 1))}
              disabled={loading || page >= totalPages}
            >
              Siguiente
              <IconChevronRight />
            </button>
          </div>
        </div>
      </div>

      {panelOpen ? (
        <>
          <div className="sa-panel__overlay" onClick={closePanel} />
          <div className="sa-panel" role="dialog" aria-modal="true">
            <div className="sa-panel__header">
              <div>
                <h2 className="sa-panel__title">
                  {mode === "create" ? "Nuevo plan" : "Editar plan"}
                </h2>
                <p className="sa-panel__subtitle">
                  {mode === "create"
                    ? "Define un plan de suscripción para asignar a negocios."
                    : "Actualiza límites y precio del plan seleccionado."}
                </p>
              </div>
              <button type="button" className="sa-icon-btn" onClick={closePanel} aria-label="Cerrar">
                <IconClose />
              </button>
            </div>

            <div className="sa-panel__body">
              {error ? (
                <div className="sa-alert sa-alert--error">
                  <IconAlert />
                  <span>{error}</span>
                </div>
              ) : null}

              <div className="sa-field">
                <label className="sa-label">Nombre del plan</label>
                <input
                  className="sa-input"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Ej. Profesional"
                />
              </div>

              <div className="sa-field">
                <label className="sa-label">Precio mensual</label>
                <input
                  className="sa-input"
                  type="text"
                  inputMode="decimal"
                  value={form.price}
                  onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                  placeholder="Ej. 299.00"
                />
              </div>

              <div className="sa-field__row">
                <div className="sa-field">
                  <label className="sa-label">Máx. empleados</label>
                  <input
                    className="sa-input"
                    type="number"
                    min={0}
                    step={1}
                    value={form.max_employees}
                    onChange={(e) => setForm((f) => ({ ...f, max_employees: e.target.value }))}
                    placeholder="0"
                  />
                </div>
                <div className="sa-field">
                  <label className="sa-label">Máx. citas / mes</label>
                  <input
                    className="sa-input"
                    type="number"
                    min={0}
                    step={1}
                    value={form.max_appointments}
                    onChange={(e) => setForm((f) => ({ ...f, max_appointments: e.target.value }))}
                    placeholder="0"
                  />
                </div>
              </div>
            </div>

            <div className="sa-panel__footer">
              <button type="button" className="sa-btn sa-btn--secondary" onClick={closePanel} disabled={loading}>
                Cancelar
              </button>
              <button type="button" className="sa-btn sa-btn--primary" onClick={() => void submit()} disabled={loading}>
                {loading ? "Guardando..." : mode === "create" ? "Crear plan" : "Guardar cambios"}
              </button>
            </div>
          </div>
        </>
      ) : null}
    </>
  );
};
