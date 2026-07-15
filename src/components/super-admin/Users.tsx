import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  IconPlus,
  IconEdit,
  IconTrash,
  IconClose,
  IconSearch,
  IconUsers,
  IconRefresh,
  IconAlert,
} from "./icons";

type Business = {
  id: string;
  name: string;
  is_active: boolean;
};

type BusinessListResponse = {
  items: Business[];
};

type ApiUserEmployee = { business_id?: string | null } | null;

type ApiUser = {
  id: string;
  email: string;
  role: "admin" | "employee" | string;
  is_active: boolean;
  business_id?: string | null;
  employee?: ApiUserEmployee;
};

type ApiUserEnvelope = {
  user: ApiUser;
  employee: ApiUserEmployee;
};

type UsersListResponse = {
  items: ApiUserEnvelope[] | ApiUser[];
};

type UserForm = {
  email: string;
  password: string;
  role: "admin" | "employee";
  is_active: boolean;
  business_id: string;
};

const API_BASE_URL = "http://127.0.0.1:5000";

function normalizeUsersPayload(data: unknown): ApiUser[] {
  if (!data) return [];
  if (Array.isArray(data)) {
    return data
      .map((row) => {
        if (row && typeof row === "object" && "user" in row) {
          const env = row as ApiUserEnvelope;
          return { ...env.user, employee: env.employee ?? env.user.employee ?? null };
        }
        return row as ApiUser;
      })
      .filter(Boolean) as ApiUser[];
  }
  if (typeof data === "object" && data !== null) {
    if ("items" in data && Array.isArray((data as { items?: unknown }).items)) {
      const items = (data as UsersListResponse).items as unknown[];
      return normalizeUsersPayload(items);
    }
  }
  return [];
}

function normalizeSingleUser(data: unknown): ApiUser | null {
  if (!data) return null;
  if (typeof data === "object" && data !== null) {
    if ("user" in data) {
      const env = data as ApiUserEnvelope;
      return { ...env.user, employee: env.employee ?? env.user.employee ?? null };
    }
    if ("id" in data && "email" in data) return data as ApiUser;
  }
  return null;
}

function getBusinessId(u: ApiUser): string | null {
  return (
    (typeof u.business_id === "string" ? u.business_id : null) ??
    (typeof u.employee?.business_id === "string" ? u.employee.business_id : null)
  );
}

export const Users: React.FC = () => {
  const [items, setItems] = useState<ApiUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  const [businesses, setBusinesses] = useState<Business[]>([]);

  const [filterRole, setFilterRole] = useState<"" | "admin" | "employee">("");
  const [filterBusinessId, setFilterBusinessId] = useState<string>("");
  const [search, setSearch] = useState("");
  const [panelOpen, setPanelOpen] = useState(false);

  const emptyForm: UserForm = useMemo(
    () => ({
      email: "",
      password: "",
      role: "employee",
      is_active: true,
      business_id: "",
    }),
    [],
  );

  const [mode, setMode] = useState<"create" | "edit">("create");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null);
  const [form, setForm] = useState<UserForm>(emptyForm);

  const loadBusinesses = useCallback(async () => {
    try {
      const res = await axios.get<BusinessListResponse>(`${API_BASE_URL}/api/business`, {
        params: { page: 1, per_page: 500 },
      });
      setBusinesses(res.data.items || []);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params: Record<string, string> = {};
      if (filterRole) params.role = filterRole;
      if (filterBusinessId) params.business_id = filterBusinessId;
      const res = await axios.get(`${API_BASE_URL}/api/users`, { params });
      setItems(normalizeUsersPayload(res.data));
    } catch (e) {
      setError("No fue posible cargar los usuarios. Revisa la consola.");
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [filterBusinessId, filterRole]);

  useEffect(() => {
    void loadBusinesses();
    void load();
  }, [load, loadBusinesses]);

  const resetForm = useCallback(() => {
    setMode("create");
    setSelectedId(null);
    setSelectedBusinessId(null);
    setForm(emptyForm);
  }, [emptyForm]);

  const startEdit = useCallback(async (u: ApiUser) => {
    setLoading(true);
    setError("");
    try {
      const res = await axios.get(`${API_BASE_URL}/api/users/${u.id}`);
      const api = normalizeSingleUser(res.data);
      if (!api) throw new Error("Unexpected user payload");
      const bId = getBusinessId(api);
      setMode("edit");
      setSelectedId(api.id);
      setSelectedBusinessId(bId);
      setForm((f) => ({
        ...f,
        email: api.email ?? "",
        password: "",
        role: (api.role === "admin" ? "admin" : "employee") as "admin" | "employee",
        is_active: Boolean(api.is_active),
        business_id: bId ?? "",
      }));
    } catch (e) {
      setError("No fue posible cargar el usuario. Revisa la consola.");
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  const validate = useCallback(() => {
    const missing: string[] = [];
    if (!form.email.trim()) missing.push("Email");
    if (mode === "create" && !form.password) missing.push("Contraseña");
    if (!form.business_id) missing.push("Negocio");
    return missing;
  }, [form, mode]);

  const submit = useCallback(async () => {
    const missing = validate();
    if (missing.length > 0) {
      setError(`Faltan campos requeridos: ${missing.join(", ")}`);
      return;
    }

    setLoading(true);
    setError("");
    try {
      if (mode === "create") {
        await axios.post(`${API_BASE_URL}/api/users`, {
          user: {
            email: form.email.trim(),
            password: form.password,
            role: form.role,
            is_active: form.is_active,
          },
          employee: {
            business_id: form.business_id,
          },
        });
      } else {
        if (!selectedId) throw new Error("Missing selectedId");
        const userPatch: Record<string, unknown> = {};

        if (form.email.trim()) userPatch.email = form.email.trim();
        userPatch.is_active = form.is_active;
        if (form.password) userPatch.password = form.password;
        userPatch.role = form.role;

        await axios.put(`${API_BASE_URL}/api/users/${selectedId}`, { user: userPatch });
      }

      await load();
      resetForm();
      setPanelOpen(false);
    } catch (e) {
      setError("No fue posible guardar los cambios. Revisa la consola.");
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [form, load, mode, resetForm, selectedId, validate]);

  const remove = useCallback(
    async (id: string) => {
      const ok = window.confirm(
        "¿Seguro que deseas eliminar este usuario? Esta acción no se puede deshacer.",
      );
      if (!ok) return;

      setLoading(true);
      setError("");
      try {
        await axios.delete(`${API_BASE_URL}/api/users/${id}`);
        await load();
        resetForm();
      } catch (e) {
        setError("No fue posible eliminar el usuario. Revisa la consola.");
        console.error(e);
      } finally {
        setLoading(false);
      }
    },
    [load, resetForm],
  );

  const openCreate = useCallback(() => {
    resetForm();
    setError("");
    setPanelOpen(true);
  }, [resetForm]);

  const openEdit = useCallback(
    (u: ApiUser) => {
      setError("");
      setPanelOpen(true);
      void startEdit(u);
    },
    [startEdit],
  );

  const closePanel = useCallback(() => {
    resetForm();
    setPanelOpen(false);
    setError("");
  }, [resetForm]);

  const businessNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const b of businesses) map.set(b.id, b.name);
    return map;
  }, [businesses]);

  const visibleItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((u) => u.email.toLowerCase().includes(q));
  }, [items, search]);

  return (
    <>
      <div className="sa-toolbar">
        <div className="sa-toolbar__search">
          <IconSearch />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por email…"
          />
        </div>

        <select
          className="sa-select"
          style={{ width: 220 }}
          value={filterBusinessId}
          onChange={(e) => setFilterBusinessId(e.target.value)}
          disabled={loading}
        >
          <option value="">Todos los negocios</option>
          {businesses.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>

        <select
          className="sa-select"
          style={{ width: 160 }}
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value as "" | "admin" | "employee")}
          disabled={loading}
        >
          <option value="">Todos los roles</option>
          <option value="admin">Admin</option>
          <option value="employee">Empleado</option>
        </select>

        <button
          type="button"
          className="sa-btn sa-btn--secondary"
          onClick={() => void load()}
          disabled={loading}
          title="Recargar"
        >
          <IconRefresh />
        </button>

        <div className="sa-toolbar__spacer" />

        <button type="button" className="sa-btn sa-btn--primary" onClick={openCreate} disabled={loading}>
          <IconPlus />
          Nuevo usuario
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
                <th>Email</th>
                <th>Rol</th>
                <th>Negocio</th>
                <th>Estado</th>
                <th style={{ textAlign: "right" }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading && items.length === 0 ? (
                Array.from({ length: 5 }).map((_, i) => (
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
                        <IconUsers />
                      </div>
                      <div className="sa-empty__title">
                        {search ? "Sin resultados" : "No hay usuarios para mostrar"}
                      </div>
                      <div className="sa-empty__text">
                        {search
                          ? "Prueba con otro término de búsqueda."
                          : "Crea un usuario y su empleado asociado a un negocio."}
                      </div>
                      {!search ? (
                        <button type="button" className="sa-btn sa-btn--primary sa-btn--sm" onClick={openCreate}>
                          <IconPlus />
                          Nuevo usuario
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ) : (
                visibleItems.map((u) => {
                  const bId = getBusinessId(u);
                  const bName = bId ? businessNameById.get(bId) : undefined;
                  const isAdmin = u.role === "admin";
                  return (
                    <tr key={u.id}>
                      <td className="sa-cell-strong">{u.email}</td>
                      <td>
                        <span className={`sa-badge ${isAdmin ? "sa-badge--primary" : "sa-badge--neutral"}`}>
                          {isAdmin ? "Admin" : "Empleado"}
                        </span>
                      </td>
                      <td>
                        <div className="sa-cell-strong">
                          {bName || (bId ? "Negocio (sin nombre)" : "—")}
                        </div>
                        {bId ? <div className="sa-cell-muted">{bId}</div> : null}
                      </td>
                      <td>
                        <span className={`sa-badge ${u.is_active ? "sa-badge--success" : "sa-badge--neutral"}`}>
                          <span className="sa-badge__dot" />
                          {u.is_active ? "Activo" : "Inactivo"}
                        </span>
                      </td>
                      <td>
                        <div className="sa-cell-actions">
                          <button
                            type="button"
                            className="sa-btn sa-btn--secondary sa-btn--sm"
                            onClick={() => openEdit(u)}
                          >
                            <IconEdit />
                            Editar
                          </button>
                          <button
                            type="button"
                            className="sa-btn sa-btn--danger sa-btn--sm"
                            onClick={() => void remove(u.id)}
                            disabled={loading}
                          >
                            <IconTrash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="sa-pagination">
          <span className="sa-pagination__info">{items.length} usuarios</span>
        </div>
      </div>

      {panelOpen ? (
        <>
          <div className="sa-panel__overlay" onClick={closePanel} />
          <div className="sa-panel" role="dialog" aria-modal="true">
            <div className="sa-panel__header">
              <div>
                <h2 className="sa-panel__title">
                  {mode === "create" ? "Nuevo usuario" : "Editar usuario"}
                </h2>
                <p className="sa-panel__subtitle">
                  {mode === "create"
                    ? "Crea un usuario y su empleado asociado (requiere un negocio)."
                    : "Actualiza email, contraseña, rol y estado. El negocio no se puede cambiar."}
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
                <label className="sa-label">Email</label>
                <input
                  className="sa-input"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="user@demo.com"
                />
              </div>

              <div className="sa-field">
                <label className="sa-label">
                  Contraseña {mode === "edit" ? "(opcional)" : "(requerida)"}
                </label>
                <input
                  type="password"
                  className="sa-input"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  placeholder={mode === "create" ? "Password123." : "Dejar en blanco para no cambiar"}
                />
              </div>

              <div className="sa-field">
                <label className="sa-label">Rol</label>
                <div className="sa-segment">
                  {(["admin", "employee"] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      className={`sa-segment__opt${form.role === r ? " sa-segment__opt--active" : ""}`}
                      onClick={() => setForm((f) => ({ ...f, role: r }))}
                    >
                      {r === "admin" ? "Admin" : "Empleado"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="sa-field">
                <label className="sa-label">Negocio</label>
                <select
                  className="sa-select"
                  value={form.business_id}
                  onChange={(e) => setForm((f) => ({ ...f, business_id: e.target.value }))}
                  disabled={loading || mode === "edit"}
                >
                  <option value="">Selecciona un negocio…</option>
                  {businesses.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} {b.is_active ? "" : "(inactiva)"}
                    </option>
                  ))}
                </select>
                {mode === "edit" && selectedBusinessId ? (
                  <span className="sa-hint">
                    Asociada a: <b>{businessNameById.get(selectedBusinessId) || "—"}</b>
                  </span>
                ) : null}
              </div>

              <label className="sa-switch-row">
                <span className="sa-switch-row__text">Activo</span>
                <span className="sa-switch">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                  />
                  <span className="sa-switch__track" />
                  <span className="sa-switch__thumb" />
                </span>
              </label>
            </div>

            <div className="sa-panel__footer">
              <button type="button" className="sa-btn sa-btn--secondary" onClick={closePanel} disabled={loading}>
                Cancelar
              </button>
              <button type="button" className="sa-btn sa-btn--primary" onClick={() => void submit()} disabled={loading}>
                {loading ? "Guardando..." : mode === "create" ? "Crear usuario" : "Guardar cambios"}
              </button>
            </div>
          </div>
        </>
      ) : null}
    </>
  );
};
