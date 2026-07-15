import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { mediaUrl } from "../../mediaUrl";
import {
  IconPlus,
  IconEdit,
  IconTrash,
  IconClose,
  IconSearch,
  IconShop,
  IconChevronLeft,
  IconChevronRight,
  IconCopy,
  IconExternal,
  IconRefresh,
  IconAlert,
  IconSort,
} from "./icons";

type Business = {
  id: string;
  plan_id: string | null;
  name: string;
  address: string;
  email: string;
  phone: string;
  is_active: boolean;
  public_slug: string;
  public_description: string | null;
  allow_any_barber: boolean;
  /** Future fields — ignored by API today */
  business_type?: string | null;
  city?: string | null;
  owner_name?: string | null;
  timezone?: string | null;
  created_at?: string | null;
  employees_count?: number | null;
  customers_count?: number | null;
  appointments_month?: number | null;
  monthly_revenue?: number | null;
  logo_url?: string | null;
  whatsapp?: string | null;
};

type BusinessListResponse = {
  items: Business[];
  page: number;
  per_page: number;
  total: number;
  pages: number;
};

type PlanRow = {
  id: string;
  name: string;
  price: number;
};

type PlanListResponse = {
  items: PlanRow[];
  page: number;
  per_page: number;
  total: number;
  pages: number;
};

type BusinessForm = {
  plan_id: string;
  name: string;
  address: string;
  email: string;
  phone: string;
  is_active: boolean;
  public_slug: string;
  public_description: string;
  allow_any_barber: boolean;
  business_type: string;
  city: string;
  owner_name: string;
  timezone: string;
  whatsapp: string;
};

const API_BASE_URL = "http://127.0.0.1:5000";

/** UI catalog only — not persisted until backend supports it. */
const BUSINESS_TYPES: { value: string; label: string }[] = [
  { value: "", label: "Sin definir" },
  { value: "barbershop", label: "Barbershop" },
  { value: "salon", label: "Salón" },
  { value: "dental", label: "Clínica dental" },
  { value: "tattoo", label: "Estudio de tatuajes" },
  { value: "spa", label: "Spa" },
  { value: "gym", label: "Gimnasio" },
  { value: "other", label: "Otro" },
];

const TIMEZONES = [
  "",
  "America/Mexico_City",
  "America/Costa_Rica",
  "America/Bogota",
  "America/Lima",
  "America/Santiago",
  "America/Argentina/Buenos_Aires",
  "UTC",
];

function formatPlanPrice(value: number): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
  }).format(value);
}

function formatMoney(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatStat(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("es-MX").format(value);
}

function typeLabel(value: string | null | undefined): string {
  const found = BUSINESS_TYPES.find((t) => t.value === (value || ""));
  return found?.label ?? "Sin definir";
}

/** Best-effort city from address until API exposes city. */
function deriveCity(b: Business): string {
  if (b.city?.trim()) return b.city.trim();
  const parts = (b.address || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length >= 2) return parts[parts.length - 1];
  return "—";
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

type BusinessStats = {
  employees_count: number;
  customers_count: number;
  appointments_month: number;
  monthly_revenue: number;
};

type SortDir = "asc" | "desc";

export const Business: React.FC = () => {
  const [items, setItems] = useState<Business[]>([]);
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [panelStats, setPanelStats] = useState<BusinessStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [panelLogoUrl, setPanelLogoUrl] = useState<string | null>(null);
  const logoFileRef = useRef<HTMLInputElement | null>(null);

  const [page, setPage] = useState(1);
  const perPage = 20;
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [error, setError] = useState<string>("");

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [planFilter, setPlanFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [cityFilter, setCityFilter] = useState("");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [panelOpen, setPanelOpen] = useState(false);

  const emptyForm: BusinessForm = useMemo(
    () => ({
      plan_id: "",
      name: "",
      address: "",
      email: "",
      phone: "",
      is_active: true,
      public_slug: "",
      public_description: "",
      allow_any_barber: true,
      business_type: "",
      city: "",
      owner_name: "",
      timezone: "",
      whatsapp: "",
    }),
    [],
  );

  const [mode, setMode] = useState<"create" | "edit">("create");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<BusinessForm>(emptyForm);

  const load = useCallback(
    async (targetPage: number) => {
      setLoading(true);
      setError("");
      try {
        const res = await axios.get<BusinessListResponse>(
          `${API_BASE_URL}/api/business`,
          { params: { page: targetPage, per_page: perPage } },
        );
        setItems(res.data.items);
        setPage(res.data.page);
        setTotalPages(res.data.pages || 1);
        setTotal(res.data.total);
      } catch (e) {
        setError("No fue posible cargar los negocios. Revisa la consola.");
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

  const loadPlans = useCallback(async () => {
    try {
      const res = await axios.get<PlanListResponse>(`${API_BASE_URL}/api/plan`, {
        params: { page: 1, per_page: 500 },
      });
      setPlans(res.data.items);
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    void loadPlans();
  }, [loadPlans]);

  const resetForm = useCallback(() => {
    setMode("create");
    setSelectedId(null);
    setForm({
      ...emptyForm,
      plan_id: plans[0]?.id ?? "",
    });
  }, [emptyForm, plans]);

  const startEdit = useCallback((b: Business) => {
    setMode("edit");
    setSelectedId(b.id);
    setForm({
      plan_id: b.plan_id ?? "",
      name: b.name,
      address: b.address,
      email: b.email,
      phone: b.phone,
      is_active: b.is_active,
      public_slug: b.public_slug ?? "",
      public_description: b.public_description ?? "",
      allow_any_barber: b.allow_any_barber ?? true,
      business_type: b.business_type ?? "",
      city: b.city ?? (deriveCity(b) === "—" ? "" : deriveCity(b)),
      owner_name: b.owner_name ?? "",
      timezone: b.timezone ?? "",
      whatsapp: b.whatsapp ?? "",
    });
  }, []);

  useEffect(() => {
    if (plans.length === 0) return;
    if (mode !== "create" || selectedId !== null) return;
    setForm((f) => {
      if (f.plan_id !== "") return f;
      return { ...f, plan_id: plans[0].id };
    });
  }, [plans, mode, selectedId]);

  const validate = useCallback(() => {
    const missing: string[] = [];
    if (!form.name.trim()) missing.push("Nombre");
    if (!form.address.trim()) missing.push("Dirección");
    if (!form.email.trim()) missing.push("Email");
    if (!form.phone.trim()) missing.push("Teléfono");
    return missing;
  }, [form]);

  const submit = useCallback(async () => {
    const missing = validate();
    if (missing.length > 0) {
      setError(`Faltan campos requeridos: ${missing.join(", ")}`);
      return;
    }

    setLoading(true);
    setError("");
    try {
      // Only send fields the API currently accepts.
      const payload: Record<string, unknown> = {
        name: form.name.trim(),
        address: form.address.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        is_active: form.is_active,
        plan_id: form.plan_id.trim() ? form.plan_id.trim() : null,
        public_description: form.public_description.trim() || null,
        allow_any_barber: form.allow_any_barber,
      };
      if (mode === "edit" && form.public_slug.trim()) {
        payload.public_slug = form.public_slug.trim().toLowerCase();
      }

      if (mode === "create") {
        await axios.post(`${API_BASE_URL}/api/business`, payload);
      } else {
        if (!selectedId) throw new Error("Missing selectedId");
        await axios.put(`${API_BASE_URL}/api/business/${selectedId}`, payload);
      }

      await load(page);
      resetForm();
      setPanelOpen(false);
    } catch (e) {
      setError("No fue posible guardar los cambios. Revisa la consola.");
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [form, load, mode, page, resetForm, selectedId, validate]);

  const remove = useCallback(
    async (id: string) => {
      const ok = window.confirm(
        "¿Seguro que deseas eliminar este negocio? Esta acción no se puede deshacer.",
      );
      if (!ok) return;

      setLoading(true);
      setError("");
      try {
        await axios.delete(`${API_BASE_URL}/api/business/${id}`);
        const nextPage = page > 1 && items.length === 1 ? page - 1 : page;
        await load(nextPage);
        resetForm();
      } catch (e) {
        setError("No fue posible eliminar el negocio. Revisa la consola.");
        console.error(e);
      } finally {
        setLoading(false);
      }
    },
    [items.length, load, page, resetForm],
  );

  const publicBookingUrl = useCallback((slug: string) => {
    if (typeof window === "undefined") return `/book/${slug}`;
    return `${window.location.origin}/book/${slug}`;
  }, []);

  const copyBookingLink = useCallback(
    async (slug: string) => {
      try {
        await navigator.clipboard.writeText(publicBookingUrl(slug));
      } catch {
        setError("No se pudo copiar el enlace.");
      }
    },
    [publicBookingUrl],
  );

  const openBookingPage = useCallback(
    (slug: string) => {
      window.open(publicBookingUrl(slug), "_blank", "noopener,noreferrer");
    },
    [publicBookingUrl],
  );

  const regenerateSlug = useCallback(
    async (id: string) => {
      const ok = window.confirm(
        "¿Regenerar el enlace público? El slug anterior dejará de funcionar.",
      );
      if (!ok) return;
      setLoading(true);
      setError("");
      try {
        await axios.post(
          `${API_BASE_URL}/api/business/${id}/regenerate-public-slug`,
        );
        await load(page);
      } catch (e) {
        setError("No se pudo regenerar el slug.");
        console.error(e);
      } finally {
        setLoading(false);
      }
    },
    [load, page],
  );

  const openCreate = useCallback(() => {
    resetForm();
    setPanelStats(null);
    setPanelLogoUrl(null);
    setError("");
    setPanelOpen(true);
  }, [resetForm]);

  const uploadPanelLogo = useCallback(
    async (file: File) => {
      if (!selectedId) return;
      setLogoUploading(true);
      setError("");
      try {
        const body = new FormData();
        body.append("logo", file);
        const res = await axios.post<Business>(
          `${API_BASE_URL}/api/business/${selectedId}/logo`,
          body,
          { headers: { "Content-Type": "multipart/form-data" } },
        );
        setPanelLogoUrl(res.data.logo_url ?? null);
        setItems((prev) =>
          prev.map((row) => (row.id === selectedId ? { ...row, ...res.data } : row)),
        );
      } catch (e: unknown) {
        const msg =
          axios.isAxiosError(e) && e.response?.data && typeof e.response.data === "object"
            ? (e.response.data as { error?: string }).error
            : null;
        setError(msg ?? "No se pudo subir el logo.");
      } finally {
        setLogoUploading(false);
        if (logoFileRef.current) logoFileRef.current.value = "";
      }
    },
    [selectedId],
  );

  const removePanelLogo = useCallback(async () => {
    if (!selectedId) return;
    setLogoUploading(true);
    setError("");
    try {
      const res = await axios.delete<Business>(
        `${API_BASE_URL}/api/business/${selectedId}/logo`,
      );
      setPanelLogoUrl(null);
      setItems((prev) =>
        prev.map((row) => (row.id === selectedId ? { ...row, ...res.data } : row)),
      );
    } catch {
      setError("No se pudo eliminar el logo.");
    } finally {
      setLogoUploading(false);
    }
  }, [selectedId]);

  const loadPanelStats = useCallback(async (businessId: string) => {
    setStatsLoading(true);
    try {
      const res = await axios.get<BusinessStats>(
        `${API_BASE_URL}/api/business/${businessId}/stats`,
      );
      const stats: BusinessStats = {
        employees_count: res.data.employees_count ?? 0,
        customers_count: res.data.customers_count ?? 0,
        appointments_month: res.data.appointments_month ?? 0,
        monthly_revenue: res.data.monthly_revenue ?? 0,
      };
      setPanelStats(stats);
      setItems((prev) =>
        prev.map((row) => (row.id === businessId ? { ...row, ...stats } : row)),
      );
    } catch (e) {
      console.error(e);
      setPanelStats(null);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const openEdit = useCallback(
    (b: Business) => {
      startEdit(b);
      setError("");
      setPanelLogoUrl(b.logo_url ?? null);
      setPanelStats({
        employees_count: b.employees_count ?? 0,
        customers_count: b.customers_count ?? 0,
        appointments_month: b.appointments_month ?? 0,
        monthly_revenue: b.monthly_revenue ?? 0,
      });
      setPanelOpen(true);
      void loadPanelStats(b.id);
    },
    [loadPanelStats, startEdit],
  );

  const closePanel = useCallback(() => {
    resetForm();
    setPanelStats(null);
    setPanelLogoUrl(null);
    setPanelOpen(false);
    setError("");
  }, [resetForm]);

  const planName = useCallback(
    (planId: string | null) =>
      planId
        ? plans.find((p) => p.id === planId)?.name ?? planId.slice(0, 8) + "…"
        : "—",
    [plans],
  );

  const cityOptions = useMemo(() => {
    const set = new Set<string>();
    for (const b of items) {
      const c = deriveCity(b);
      if (c && c !== "—") set.add(c);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "es"));
  }, [items]);

  const visibleItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    let out = items;
    if (q) {
      out = out.filter((b) =>
        [b.name, b.email, b.address, b.phone, b.public_slug, b.owner_name, deriveCity(b)]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q)),
      );
    }
    if (typeFilter) {
      out = out.filter((b) => (b.business_type || "") === typeFilter);
    }
    if (planFilter) {
      out = out.filter((b) => (b.plan_id || "") === planFilter);
    }
    if (statusFilter === "active") out = out.filter((b) => b.is_active);
    if (statusFilter === "inactive") out = out.filter((b) => !b.is_active);
    if (cityFilter) {
      out = out.filter((b) => deriveCity(b) === cityFilter);
    }
    const sorted = [...out].sort((a, b) =>
      a.name.localeCompare(b.name, "es", { sensitivity: "base" }),
    );
    if (sortDir === "desc") sorted.reverse();
    return sorted;
  }, [items, search, sortDir, typeFilter, planFilter, statusFilter, cityFilter]);

  const selectedBusiness = useMemo(
    () => (selectedId ? items.find((b) => b.id === selectedId) ?? null : null),
    [items, selectedId],
  );

  const colCount = 12;

  return (
    <>
      <div className="sa-filters">
        <div className="sa-toolbar__search">
          <IconSearch />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, email, ciudad…"
          />
        </div>
        <select
          className="sa-select sa-filters__select"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          aria-label="Tipo de negocio"
        >
          <option value="">Tipo: todos</option>
          {BUSINESS_TYPES.filter((t) => t.value).map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        <select
          className="sa-select sa-filters__select"
          value={planFilter}
          onChange={(e) => setPlanFilter(e.target.value)}
          aria-label="Plan"
        >
          <option value="">Plan: todos</option>
          {plans.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <select
          className="sa-select sa-filters__select"
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value as "all" | "active" | "inactive")
          }
          aria-label="Estado"
        >
          <option value="all">Estado: todos</option>
          <option value="active">Activos</option>
          <option value="inactive">Inactivos</option>
        </select>
        <select
          className="sa-select sa-filters__select"
          value={cityFilter}
          onChange={(e) => setCityFilter(e.target.value)}
          aria-label="Ciudad"
        >
          <option value="">Ciudad: todas</option>
          {cityOptions.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <div className="sa-toolbar__spacer" />
        <div className="sa-filters__actions">
          <span className="sa-badge sa-badge--neutral">{total} negocios</span>
          <button
            type="button"
            className="sa-btn sa-btn--primary"
            onClick={openCreate}
            disabled={loading}
          >
            <IconPlus />
            Nuevo negocio
          </button>
        </div>
      </div>

      {error && !panelOpen ? (
        <div className="sa-alert sa-alert--error" style={{ marginBottom: 16 }}>
          <IconAlert />
          <span>{error}</span>
        </div>
      ) : null}

      <div className="sa-table-wrap sa-table-wrap--desktop">
        <div className="sa-table-scroll sa-table-scroll--wide">
          <table className="sa-table sa-table--dense">
            <thead>
              <tr>
                <th
                  className="sa-th--sortable"
                  onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
                >
                  <span className="sa-th__inner">
                    Negocio
                    <IconSort className="sa-th__sort" style={{ width: 13, height: 13 }} />
                  </span>
                </th>
                <th>Tipo</th>
                <th>Plan</th>
                <th>Titular</th>
                <th>Email</th>
                <th>Teléfono</th>
                <th>Ciudad</th>
                <th>Estado</th>
                <th>Reserva</th>
                <th>Equipo</th>
                <th>Ingresos</th>
                <th style={{ textAlign: "right" }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading && items.length === 0 ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={`sk-${i}`}>
                    {Array.from({ length: colCount }).map((__, j) => (
                      <td key={j}>
                        <span
                          className="sa-skeleton"
                          style={{ width: `${55 + ((i + j) % 3) * 14}%` }}
                        />
                      </td>
                    ))}
                  </tr>
                ))
              ) : visibleItems.length === 0 ? (
                <tr>
                  <td colSpan={colCount} style={{ padding: 0 }}>
                    <div className="sa-empty">
                      <div className="sa-empty__icon">
                        <IconShop />
                      </div>
                      <div className="sa-empty__title">
                        {search || typeFilter || planFilter || statusFilter !== "all" || cityFilter
                          ? "Sin resultados"
                          : "No hay negocios registrados"}
                      </div>
                      <div className="sa-empty__text">
                        {search || typeFilter || planFilter || statusFilter !== "all" || cityFilter
                          ? "Ajusta los filtros o el término de búsqueda."
                          : "Crea el primer negocio para comenzar a operar la plataforma."}
                      </div>
                      {!search && !typeFilter && !planFilter && statusFilter === "all" && !cityFilter ? (
                        <button
                          type="button"
                          className="sa-btn sa-btn--primary sa-btn--sm"
                          onClick={openCreate}
                        >
                          <IconPlus />
                          Nuevo negocio
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ) : (
                visibleItems.map((b) => (
                  <tr key={b.id}>
                    <td>
                      <div className="sa-biz-cell">
                        <div className="sa-biz-avatar" aria-hidden>
                          {mediaUrl(b.logo_url) ? (
                            <img src={mediaUrl(b.logo_url) ?? ""} alt="" />
                          ) : (
                            initials(b.name || "N")
                          )}
                        </div>
                        <div>
                          <div className="sa-cell-strong">{b.name}</div>
                          <div className="sa-cell-muted sa-cell-ellipsis">
                            {b.address || "Sin dirección"}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="sa-badge sa-badge--neutral">
                        {typeLabel(b.business_type)}
                      </span>
                    </td>
                    <td>
                      <span className="sa-badge sa-badge--primary">
                        {planName(b.plan_id)}
                      </span>
                    </td>
                    <td>
                      <span className="sa-cell-muted">
                        {b.owner_name?.trim() || "—"}
                      </span>
                    </td>
                    <td>
                      <span className="sa-cell-ellipsis" title={b.email}>
                        {b.email}
                      </span>
                    </td>
                    <td>{b.phone || "—"}</td>
                    <td>{deriveCity(b)}</td>
                    <td>
                      <span
                        className={`sa-badge ${
                          b.is_active ? "sa-badge--success" : "sa-badge--neutral"
                        }`}
                      >
                        <span className="sa-badge__dot" />
                        {b.is_active ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td>
                      <code className="sa-code">/{b.public_slug || "—"}</code>
                      <div className="sa-inline-actions">
                        <button
                          type="button"
                          className="sa-btn sa-btn--secondary sa-btn--sm"
                          onClick={() => void copyBookingLink(b.public_slug)}
                          title="Copiar enlace de reserva"
                        >
                          <IconCopy />
                        </button>
                        <button
                          type="button"
                          className="sa-btn sa-btn--secondary sa-btn--sm"
                          onClick={() => openBookingPage(b.public_slug)}
                          title="Abrir reserva pública"
                        >
                          <IconExternal />
                        </button>
                      </div>
                    </td>
                    <td>
                      <span
                        className="sa-stat-pill"
                        title="Empleados · Clientes · Citas (mes) — datos próximamente"
                      >
                        {formatStat(b.employees_count)} · {formatStat(b.customers_count)} ·{" "}
                        {formatStat(b.appointments_month)}
                      </span>
                    </td>
                    <td>
                      <span className="sa-cell-muted" title="Ingresos mensuales — próximamente">
                        {formatMoney(b.monthly_revenue)}
                      </span>
                    </td>
                    <td>
                      <div className="sa-cell-actions">
                        <button
                          type="button"
                          className="sa-btn sa-btn--secondary sa-btn--sm"
                          onClick={() => openEdit(b)}
                        >
                          <IconEdit />
                          Editar
                        </button>
                        <button
                          type="button"
                          className="sa-btn sa-btn--danger sa-btn--sm"
                          onClick={() => void remove(b.id)}
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
            Página {page} de {totalPages} · {total} negocios
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

      {/* Mobile / tablet card directory */}
      <div className="sa-biz-cards">
        {loading && items.length === 0 ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div className="sa-biz-card" key={`msk-${i}`}>
              <span className="sa-skeleton" style={{ width: "55%", height: 18 }} />
              <span className="sa-skeleton" style={{ width: "80%", height: 14, marginTop: 10 }} />
              <span className="sa-skeleton" style={{ width: "40%", height: 14, marginTop: 10 }} />
            </div>
          ))
        ) : visibleItems.length === 0 ? (
          <div className="sa-empty">
            <div className="sa-empty__icon">
              <IconShop />
            </div>
            <div className="sa-empty__title">
              {search || typeFilter || planFilter || statusFilter !== "all" || cityFilter
                ? "Sin resultados"
                : "No hay negocios registrados"}
            </div>
            <div className="sa-empty__text">
              {search || typeFilter || planFilter || statusFilter !== "all" || cityFilter
                ? "Ajusta los filtros o el término de búsqueda."
                : "Crea el primer negocio para comenzar a operar la plataforma."}
            </div>
          </div>
        ) : (
          visibleItems.map((b) => (
            <article className="sa-biz-card" key={b.id}>
              <div className="sa-biz-card__head">
                <div className="sa-biz-avatar sa-biz-avatar--lg" aria-hidden>
                  {mediaUrl(b.logo_url) ? (
                    <img src={mediaUrl(b.logo_url) ?? ""} alt="" />
                  ) : (
                    initials(b.name || "N")
                  )}
                </div>
                <div className="sa-biz-card__titles">
                  <h3 className="sa-biz-card__name">{b.name}</h3>
                  <p className="sa-biz-card__meta">{deriveCity(b)} · {b.email}</p>
                  <div className="sa-biz-card__badges">
                    <span className="sa-badge sa-badge--neutral">{typeLabel(b.business_type)}</span>
                    <span className="sa-badge sa-badge--primary">{planName(b.plan_id)}</span>
                    <span
                      className={`sa-badge ${
                        b.is_active ? "sa-badge--success" : "sa-badge--neutral"
                      }`}
                    >
                      <span className="sa-badge__dot" />
                      {b.is_active ? "Activo" : "Inactivo"}
                    </span>
                  </div>
                </div>
              </div>
              <dl className="sa-biz-card__stats">
                <div>
                  <dt>Equipo</dt>
                  <dd>{formatStat(b.employees_count)}</dd>
                </div>
                <div>
                  <dt>Clientes</dt>
                  <dd>{formatStat(b.customers_count)}</dd>
                </div>
                <div>
                  <dt>Citas mes</dt>
                  <dd>{formatStat(b.appointments_month)}</dd>
                </div>
                <div>
                  <dt>Ingresos</dt>
                  <dd>{formatMoney(b.monthly_revenue)}</dd>
                </div>
              </dl>
              <div className="sa-biz-card__booking">
                <code className="sa-code">/book/{b.public_slug || "—"}</code>
                <div className="sa-inline-actions" style={{ marginTop: 0 }}>
                  <button
                    type="button"
                    className="sa-btn sa-btn--secondary sa-btn--sm"
                    onClick={() => void copyBookingLink(b.public_slug)}
                    title="Copiar enlace"
                  >
                    <IconCopy />
                  </button>
                  <button
                    type="button"
                    className="sa-btn sa-btn--secondary sa-btn--sm"
                    onClick={() => openBookingPage(b.public_slug)}
                    title="Abrir reserva"
                  >
                    <IconExternal />
                  </button>
                </div>
              </div>
              <div className="sa-biz-card__actions">
                <button
                  type="button"
                  className="sa-btn sa-btn--secondary sa-btn--sm"
                  onClick={() => openEdit(b)}
                >
                  <IconEdit />
                  Editar
                </button>
                <button
                  type="button"
                  className="sa-btn sa-btn--danger sa-btn--sm"
                  onClick={() => void remove(b.id)}
                  disabled={loading}
                >
                  <IconTrash />
                  Eliminar
                </button>
              </div>
            </article>
          ))
        )}

        <div className="sa-pagination sa-pagination--cards">
          <span className="sa-pagination__info">
            Página {page} de {totalPages} · {total} negocios
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
          <div className="sa-panel sa-panel--wide" role="dialog" aria-modal="true">
            <div className="sa-panel__header">
              <div className="sa-panel-hero">
                <div className="sa-biz-avatar sa-biz-avatar--lg" aria-hidden>
                  {form.name ? initials(form.name) : "N"}
                </div>
                <div>
                  <h2 className="sa-panel__title">
                    {mode === "create" ? "Nuevo negocio" : form.name || "Editar negocio"}
                  </h2>
                  <p className="sa-panel__subtitle">
                    {mode === "create"
                      ? "Registra un nuevo negocio (tenant) en la plataforma."
                      : "Actualiza la ficha del negocio. Algunos campos están listos para datos futuros."}
                  </p>
                </div>
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

              <section className="sa-panel-section">
                <h3 className="sa-panel-section__title">Identidad</h3>
                <div className="sa-field">
                  <label className="sa-label">Nombre del negocio</label>
                  <input
                    className="sa-input"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="Ej. Studio Norte"
                  />
                </div>
                <div className="sa-field__row">
                  <div className="sa-field">
                    <label className="sa-label">
                      Tipo de negocio{" "}
                      <span className="sa-hint-inline">(próximamente)</span>
                    </label>
                    <select
                      className="sa-select"
                      value={form.business_type}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, business_type: e.target.value }))
                      }
                      disabled={loading}
                    >
                      {BUSINESS_TYPES.map((t) => (
                        <option key={t.value || "none"} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="sa-field">
                    <label className="sa-label">
                      Titular / owner{" "}
                      <span className="sa-hint-inline">(próximamente)</span>
                    </label>
                    <input
                      className="sa-input"
                      value={form.owner_name}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, owner_name: e.target.value }))
                      }
                      placeholder="Nombre del responsable"
                    />
                  </div>
                </div>
                <div className="sa-logo-placeholder">
                  <div className="sa-biz-avatar sa-biz-avatar--lg" aria-hidden>
                    {mediaUrl(panelLogoUrl) ? (
                      <img src={mediaUrl(panelLogoUrl) ?? ""} alt="" />
                    ) : form.name ? (
                      initials(form.name)
                    ) : (
                      "?"
                    )}
                  </div>
                  <div>
                    <div className="sa-cell-strong">Logo del negocio</div>
                    <div className="sa-cell-muted">
                      PNG, JPG, WEBP o GIF · máx. 2 MB
                    </div>
                    {mode === "edit" && selectedId ? (
                      <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                        <input
                          ref={logoFileRef}
                          type="file"
                          accept="image/png,image/jpeg,image/webp,image/gif"
                          hidden
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) void uploadPanelLogo(file);
                          }}
                        />
                        <button
                          type="button"
                          className="sa-btn sa-btn--secondary sa-btn--sm"
                          disabled={logoUploading || loading}
                          onClick={() => logoFileRef.current?.click()}
                        >
                          {logoUploading
                            ? "Subiendo…"
                            : panelLogoUrl
                              ? "Cambiar logo"
                              : "Subir logo"}
                        </button>
                        {panelLogoUrl ? (
                          <button
                            type="button"
                            className="sa-btn sa-btn--ghost sa-btn--sm"
                            disabled={logoUploading || loading}
                            onClick={() => void removePanelLogo()}
                          >
                            Quitar
                          </button>
                        ) : null}
                      </div>
                    ) : (
                      <div className="sa-cell-muted" style={{ marginTop: 8 }}>
                        Guarda el negocio primero para poder subir el logo.
                      </div>
                    )}
                  </div>
                </div>
              </section>

              <section className="sa-panel-section">
                <h3 className="sa-panel-section__title">Suscripción y estado</h3>
                <div className="sa-field">
                  <label className="sa-label">Plan de suscripción</label>
                  <select
                    className="sa-select"
                    value={form.plan_id}
                    onChange={(e) => setForm((f) => ({ ...f, plan_id: e.target.value }))}
                    disabled={loading}
                  >
                    <option value="">
                      {plans.length === 0 ? "Cargando planes…" : "Sin plan"}
                    </option>
                    {plans.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} — {formatPlanPrice(p.price)}
                      </option>
                    ))}
                  </select>
                  {plans.length === 0 ? (
                    <span className="sa-hint">
                      Crea planes en Suscripciones para asignarlos aquí.
                    </span>
                  ) : null}
                </div>
                <label className="sa-switch-row">
                  <span className="sa-switch-row__text">Negocio activo en la plataforma</span>
                  <span className="sa-switch">
                    <input
                      type="checkbox"
                      checked={form.is_active}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, is_active: e.target.checked }))
                      }
                    />
                    <span className="sa-switch__track" />
                    <span className="sa-switch__thumb" />
                  </span>
                </label>
              </section>

              <section className="sa-panel-section">
                <h3 className="sa-panel-section__title">Contacto y ubicación</h3>
                <div className="sa-field__row">
                  <div className="sa-field">
                    <label className="sa-label">Email</label>
                    <input
                      className="sa-input"
                      value={form.email}
                      onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                      placeholder="contacto@negocio.com"
                    />
                  </div>
                  <div className="sa-field">
                    <label className="sa-label">Teléfono</label>
                    <input
                      className="sa-input"
                      value={form.phone}
                      onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                      placeholder="+52 55 1234 5678"
                    />
                  </div>
                </div>
                <div className="sa-field__row">
                  <div className="sa-field">
                    <label className="sa-label">
                      WhatsApp <span className="sa-hint-inline">(próximamente)</span>
                    </label>
                    <input
                      className="sa-input"
                      value={form.whatsapp}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, whatsapp: e.target.value }))
                      }
                      placeholder="+506 8888 8888"
                    />
                  </div>
                  <div className="sa-field">
                    <label className="sa-label">
                      Ciudad <span className="sa-hint-inline">(próximamente)</span>
                    </label>
                    <input
                      className="sa-input"
                      value={form.city}
                      onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                      placeholder="Ciudad"
                    />
                  </div>
                </div>
                <div className="sa-field">
                  <label className="sa-label">Dirección</label>
                  <textarea
                    className="sa-textarea"
                    value={form.address}
                    onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                    placeholder="Calle, número, colonia, ciudad…"
                  />
                </div>
                <div className="sa-field">
                  <label className="sa-label">
                    Zona horaria <span className="sa-hint-inline">(próximamente)</span>
                  </label>
                  <select
                    className="sa-select"
                    value={form.timezone}
                    onChange={(e) => setForm((f) => ({ ...f, timezone: e.target.value }))}
                  >
                    <option value="">Sin definir</option>
                    {TIMEZONES.filter(Boolean).map((tz) => (
                      <option key={tz} value={tz}>
                        {tz}
                      </option>
                    ))}
                  </select>
                </div>
              </section>

              <section className="sa-panel-section">
                <h3 className="sa-panel-section__title">Reserva pública</h3>
                {mode === "edit" ? (
                  <div className="sa-field">
                    <label className="sa-label">Slug / URL de reserva</label>
                    <input
                      className="sa-input"
                      value={form.public_slug}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          public_slug: e.target.value
                            .toLowerCase()
                            .replace(/[^a-z0-9-]/g, ""),
                        }))
                      }
                      placeholder="mi-negocio"
                    />
                    <span className="sa-hint">
                      Enlace: {publicBookingUrl(form.public_slug || "slug")}
                    </span>
                    <div className="sa-inline-actions" style={{ marginTop: 8 }}>
                      <button
                        type="button"
                        className="sa-btn sa-btn--secondary sa-btn--sm"
                        onClick={() => void copyBookingLink(form.public_slug)}
                      >
                        <IconCopy />
                        Copiar
                      </button>
                      <button
                        type="button"
                        className="sa-btn sa-btn--secondary sa-btn--sm"
                        onClick={() => openBookingPage(form.public_slug)}
                      >
                        <IconExternal />
                        Abrir
                      </button>
                      {selectedId ? (
                        <button
                          type="button"
                          className="sa-btn sa-btn--secondary sa-btn--sm"
                          onClick={() => void regenerateSlug(selectedId)}
                        >
                          <IconRefresh />
                          Regenerar
                        </button>
                      ) : null}
                    </div>
                  </div>
                ) : (
                  <span className="sa-hint">
                    Al crear, se generará un enlace público único de reservas. Podrás
                    editarlo después.
                  </span>
                )}
                <div className="sa-field">
                  <label className="sa-label">Descripción pública</label>
                  <textarea
                    className="sa-textarea"
                    value={form.public_description}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, public_description: e.target.value }))
                    }
                    placeholder="Texto breve que verán los clientes en la página de reserva."
                  />
                </div>
                <label className="sa-switch-row">
                  <span className="sa-switch-row__text">
                    Permitir “Cualquier profesional” en reserva pública
                  </span>
                  <span className="sa-switch">
                    <input
                      type="checkbox"
                      checked={form.allow_any_barber}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, allow_any_barber: e.target.checked }))
                      }
                    />
                    <span className="sa-switch__track" />
                    <span className="sa-switch__thumb" />
                  </span>
                </label>
              </section>

              {mode === "edit" ? (
                <section className="sa-panel-section">
                  <h3 className="sa-panel-section__title">Estadísticas y actividad</h3>
                  <div className="sa-stat-grid">
                    <div className="sa-stat-card">
                      <div className="sa-stat-card__label">Empleados</div>
                      <div className="sa-stat-card__value">
                        {statsLoading && panelStats == null ? (
                          <span className="sa-skeleton" style={{ width: "40%", height: 22 }} />
                        ) : (
                          formatStat(
                            panelStats?.employees_count ?? selectedBusiness?.employees_count,
                          )
                        )}
                      </div>
                    </div>
                    <div className="sa-stat-card">
                      <div className="sa-stat-card__label">Clientes</div>
                      <div className="sa-stat-card__value">
                        {statsLoading && panelStats == null ? (
                          <span className="sa-skeleton" style={{ width: "40%", height: 22 }} />
                        ) : (
                          formatStat(
                            panelStats?.customers_count ?? selectedBusiness?.customers_count,
                          )
                        )}
                      </div>
                    </div>
                    <div className="sa-stat-card">
                      <div className="sa-stat-card__label">Citas este mes</div>
                      <div className="sa-stat-card__value">
                        {statsLoading && panelStats == null ? (
                          <span className="sa-skeleton" style={{ width: "40%", height: 22 }} />
                        ) : (
                          formatStat(
                            panelStats?.appointments_month ??
                              selectedBusiness?.appointments_month,
                          )
                        )}
                      </div>
                    </div>
                    <div className="sa-stat-card">
                      <div className="sa-stat-card__label">Ingresos mensuales</div>
                      <div className="sa-stat-card__value">
                        {statsLoading && panelStats == null ? (
                          <span className="sa-skeleton" style={{ width: "55%", height: 22 }} />
                        ) : (
                          formatMoney(
                            panelStats?.monthly_revenue ?? selectedBusiness?.monthly_revenue,
                          )
                        )}
                      </div>
                    </div>
                  </div>
                  <p className="sa-hint" style={{ marginTop: 12 }}>
                    Empleados activos, clientes del negocio, citas con inicio en el mes
                    calendario actual e ingresos de ventas completadas (POS) del mismo periodo.
                  </p>
                </section>
              ) : null}
            </div>

            <div className="sa-panel__footer">
              <button
                type="button"
                className="sa-btn sa-btn--secondary"
                onClick={closePanel}
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="sa-btn sa-btn--primary"
                onClick={() => void submit()}
                disabled={loading}
              >
                {loading
                  ? "Guardando..."
                  : mode === "create"
                    ? "Crear negocio"
                    : "Guardar cambios"}
              </button>
            </div>
          </div>
        </>
      ) : null}
    </>
  );
};
