import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { API_BASE_URL } from "../../config";
import {
  IconPlus,
  IconEdit,
  IconTrash,
  IconClose,
  IconPackage,
  IconAlert,
  IconSearch,
  IconDollar,
  IconArrowUp,
  IconArrowDown,
  IconActivity,
} from "../icons";

type Row = {
  id: string;
  name: string;
  category: string | null;
  stock: number;
  min_stock: number;
  price: number;
  unit_cost: number | null;
  supplier: string | null;
  is_active: boolean;
  low_stock: boolean;
};

type Movement = {
  id: string;
  product_id: string;
  product_name?: string | null;
  movement_type: string;
  quantity: number;
  quantity_before: number;
  quantity_after: number;
  unit_cost: number | null;
  unit_sale_price: number | null;
  total_cost: number | null;
  total_revenue: number | null;
  notes: string | null;
  created_at: string | null;
  is_sale: boolean;
};

type Mode = "idle" | "create" | "edit" | "add" | "reduce" | "sale" | "history";

const ADD_TYPES = [
  { value: "restock", label: "Reposición" },
  { value: "purchase", label: "Compra" },
  { value: "return", label: "Devolución" },
  { value: "correction_increase", label: "Corrección (+)" },
];

const REDUCE_TYPES = [
  { value: "sale", label: "Venta" },
  { value: "damaged", label: "Dañado" },
  { value: "lost", label: "Perdido" },
  { value: "internal_use", label: "Uso interno" },
  { value: "correction_decrease", label: "Corrección (−)" },
];

function movementBadge(type: string): string {
  if (type === "sale") return "bp-badge--primary";
  if (type === "restock" || type === "purchase" || type === "return") return "bp-badge--success";
  if (type === "damaged") return "bp-badge--warning";
  if (type === "lost") return "bp-badge--danger";
  if (type === "internal_use") return "bp-badge--neutral";
  return "bp-badge--info";
}

function movementLabel(type: string): string {
  const map: Record<string, string> = {
    purchase: "Compra",
    restock: "Reposición",
    sale: "Venta",
    damaged: "Dañado",
    lost: "Perdido",
    internal_use: "Uso interno",
    correction_increase: "Corrección +",
    correction_decrease: "Corrección −",
    return: "Devolución",
  };
  return map[type] ?? type;
}

function newIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `inv-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function InventoryPage() {
  const [items, setItems] = useState<Row[]>([]);
  const [form, setForm] = useState({
    name: "",
    category: "",
    stock: "0",
    min_stock: "0",
    price: "",
    unit_cost: "",
    supplier: "",
    is_active: true,
  });
  const [editId, setEditId] = useState<string | null>(null);
  const [activeProduct, setActiveProduct] = useState<Row | null>(null);
  const [mode, setMode] = useState<Mode>("idle");
  const [err, setErr] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("");
  const [saving, setSaving] = useState(false);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [histType, setHistType] = useState("");
  const [histSalesOnly, setHistSalesOnly] = useState("");

  const [moveQty, setMoveQty] = useState("1");
  const [moveType, setMoveType] = useState("restock");
  const [moveCost, setMoveCost] = useState("");
  const [movePrice, setMovePrice] = useState("");
  const [moveNotes, setMoveNotes] = useState("");
  const [idemKey, setIdemKey] = useState(() => newIdempotencyKey());

  const load = useCallback(async () => {
    try {
      const res = await axios.get<{ items: Row[] }>(`${API_BASE_URL}/api/shop/inventory`);
      setItems(res.data.items);
    } catch {
      setErr("Error al cargar inventario.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const panelOpen = mode !== "idle";

  const closePanel = () => {
    setMode("idle");
    setEditId(null);
    setActiveProduct(null);
    setErr(null);
    setSaving(false);
    setMovements([]);
    setIdemKey(newIdempotencyKey());
  };

  const openCreate = () => {
    setEditId(null);
    setActiveProduct(null);
    setForm({
      name: "",
      category: "",
      stock: "0",
      min_stock: "0",
      price: "",
      unit_cost: "",
      supplier: "",
      is_active: true,
    });
    setErr(null);
    setMode("create");
  };

  const startEdit = (p: Row) => {
    setEditId(p.id);
    setActiveProduct(p);
    setForm({
      name: p.name,
      category: p.category ?? "",
      stock: String(p.stock),
      min_stock: String(p.min_stock),
      price: String(p.price),
      unit_cost: p.unit_cost != null ? String(p.unit_cost) : "",
      supplier: p.supplier ?? "",
      is_active: p.is_active,
    });
    setErr(null);
    setMode("edit");
  };

  const openAdd = (p: Row) => {
    setActiveProduct(p);
    setMoveQty("1");
    setMoveType("restock");
    setMoveCost(p.unit_cost != null ? String(p.unit_cost) : "");
    setMoveNotes("");
    setIdemKey(newIdempotencyKey());
    setErr(null);
    setMode("add");
  };

  const openReduce = (p: Row) => {
    setActiveProduct(p);
    setMoveQty("1");
    setMoveType("damaged");
    setMovePrice(String(p.price));
    setMoveCost(p.unit_cost != null ? String(p.unit_cost) : "");
    setMoveNotes("");
    setIdemKey(newIdempotencyKey());
    setErr(null);
    setMode("reduce");
  };

  const openSale = (p: Row) => {
    setActiveProduct(p);
    setMoveQty("1");
    setMoveType("sale");
    setMovePrice(String(p.price));
    setMoveCost(p.unit_cost != null ? String(p.unit_cost) : "");
    setMoveNotes("");
    setIdemKey(newIdempotencyKey());
    setErr(null);
    setMode("sale");
  };

  const openHistory = async (p: Row | null) => {
    setActiveProduct(p);
    setErr(null);
    setMode("history");
    try {
      const params: Record<string, string> = {};
      if (p) params.product_id = p.id;
      if (histType) params.movement_type = histType;
      if (histSalesOnly) params.sales_only = histSalesOnly;
      const res = await axios.get<{ items: Movement[] }>(
        `${API_BASE_URL}/api/shop/inventory/movements`,
        { params },
      );
      setMovements(res.data.items);
    } catch {
      setErr("No se pudo cargar el historial.");
    }
  };

  const submitProduct = async () => {
    setErr(null);
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      category: form.category.trim() || null,
      stock: Number.parseInt(form.stock, 10),
      min_stock: Number.parseInt(form.min_stock, 10),
      price: Number(form.price),
      unit_cost: form.unit_cost ? Number(form.unit_cost) : null,
      supplier: form.supplier.trim() || null,
      is_active: form.is_active,
    };
    try {
      if (editId) {
        // Prefer not changing stock from edit form; still send min_stock etc.
        const { stock: _stock, ...rest } = payload;
        await axios.put(`${API_BASE_URL}/api/shop/inventory/${editId}`, {
          ...rest,
          // corrections only if user changed stock intentionally in edit
          ...(Number.parseInt(form.stock, 10) !== (activeProduct?.stock ?? -1)
            ? { stock: payload.stock }
            : {}),
        });
      } else {
        await axios.post(`${API_BASE_URL}/api/shop/inventory`, payload);
      }
      setOkMsg("Producto guardado");
      closePanel();
      await load();
    } catch (e: unknown) {
      const msg =
        axios.isAxiosError(e) && e.response?.data && typeof e.response.data === "object"
          ? (e.response.data as { error?: string }).error
          : null;
      setErr(msg ?? "No se pudo guardar.");
    } finally {
      setSaving(false);
    }
  };

  const submitMovement = async () => {
    if (!activeProduct) return;
    setErr(null);
    setSaving(true);
    const qty = Number.parseInt(moveQty, 10);
    try {
      if (mode === "sale") {
        await axios.post(
          `${API_BASE_URL}/api/shop/inventory/${activeProduct.id}/sale`,
          {
            quantity: qty,
            unit_sale_price: movePrice ? Number(movePrice) : undefined,
            unit_cost: moveCost ? Number(moveCost) : undefined,
            notes: moveNotes || undefined,
            idempotency_key: idemKey,
          },
        );
        setOkMsg("Venta registrada");
      } else {
        const mtype = mode === "add" ? moveType : moveType;
        await axios.post(
          `${API_BASE_URL}/api/shop/inventory/${activeProduct.id}/movements`,
          {
            movement_type: mtype,
            quantity: qty,
            unit_cost: moveCost ? Number(moveCost) : undefined,
            unit_sale_price:
              mtype === "sale" && movePrice ? Number(movePrice) : undefined,
            notes: moveNotes || undefined,
            idempotency_key: idemKey,
            update_product_cost: mode === "add" && Boolean(moveCost),
          },
        );
        setOkMsg(mode === "add" ? "Stock aumentado" : "Stock reducido");
      }
      closePanel();
      await load();
    } catch (e: unknown) {
      const msg =
        axios.isAxiosError(e) && e.response?.data && typeof e.response.data === "object"
          ? (e.response.data as { error?: string }).error
          : null;
      setErr(msg ?? "No se pudo registrar el movimiento.");
      setIdemKey(newIdempotencyKey());
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm("¿Eliminar artículo?")) return;
    try {
      await axios.delete(`${API_BASE_URL}/api/shop/inventory/${id}`);
      await load();
    } catch {
      setErr("No se pudo eliminar.");
    }
  };

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const i of items) {
      if (i.category) set.add(i.category);
    }
    return Array.from(set).sort();
  }, [items]);

  const visible = useMemo(() => {
    let out = items;
    if (filterCat) out = out.filter((i) => i.category === filterCat);
    const q = search.trim().toLowerCase();
    if (q) {
      out = out.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          (i.category ?? "").toLowerCase().includes(q) ||
          (i.supplier ?? "").toLowerCase().includes(q),
      );
    }
    return out;
  }, [items, search, filterCat]);

  const lowCount = items.filter((i) => i.low_stock).length;
  const projectedQty =
    activeProduct && moveQty
      ? mode === "add"
        ? activeProduct.stock + (Number.parseInt(moveQty, 10) || 0)
        : activeProduct.stock - (Number.parseInt(moveQty, 10) || 0)
      : null;
  const saleTotal =
    (Number.parseInt(moveQty, 10) || 0) * (Number(movePrice) || 0);

  useEffect(() => {
    if (!okMsg) return;
    const t = window.setTimeout(() => setOkMsg(null), 2500);
    return () => window.clearTimeout(t);
  }, [okMsg]);

  useEffect(() => {
    if (mode === "history") {
      void openHistory(activeProduct);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [histType, histSalesOnly]);

  return (
    <div>
      <div className="bp-page__head">
        <div>
          <h1 className="bp-page__title">Inventario</h1>
          <p className="bp-page__subtitle">
            Entradas, salidas y ventas con historial. Las ventas alimentan Insights.
          </p>
        </div>
        <div className="bp-page__actions">
          {lowCount > 0 ? (
            <span className="bp-badge bp-badge--warning">{lowCount} con stock bajo</span>
          ) : null}
          <button
            type="button"
            className="bp-btn bp-btn--secondary"
            onClick={() => void openHistory(null)}
          >
            <IconActivity />
            Historial
          </button>
          <button type="button" className="bp-btn bp-btn--primary" onClick={openCreate}>
            <IconPlus />
            Nuevo artículo
          </button>
        </div>
      </div>

      {okMsg ? (
        <div className="bp-alert" style={{ marginBottom: 16, background: "var(--bp-success-soft)", color: "var(--bp-success)" }}>
          {okMsg}
        </div>
      ) : null}

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
            placeholder="Buscar artículo…"
          />
        </div>
        <select
          className="bp-select"
          style={{ width: 180 }}
          value={filterCat}
          onChange={(e) => setFilterCat(e.target.value)}
        >
          <option value="">Todas las categorías</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {visible.length === 0 ? (
        <div className="bp-card">
          <div className="bp-empty">
            <div className="bp-empty__icon">
              <IconPackage />
            </div>
            <div className="bp-empty__title">
              {search || filterCat ? "Sin resultados" : "Inventario vacío"}
            </div>
            <div className="bp-empty__text">Registra productos e inicia con reposición de stock.</div>
            {!search && !filterCat ? (
              <button type="button" className="bp-btn bp-btn--primary bp-btn--sm" onClick={openCreate}>
                <IconPlus />
                Nuevo artículo
              </button>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="bp-cards">
          {visible.map((p) => {
            const pct = Math.min(
              100,
              Math.round((p.stock / Math.max(1, p.min_stock * 2 || 1)) * 100),
            );
            const fillClass = p.low_stock
              ? pct < 40
                ? "bp-stock-bar__fill--critical"
                : "bp-stock-bar__fill--low"
              : "";
            return (
              <article className="bp-product-card" key={p.id}>
                <div className="bp-product-card__top">
                  <div>
                    <h3 className="bp-product-card__name">{p.name}</h3>
                    <p className="bp-product-card__meta">
                      {p.category ?? "Sin categoría"}
                      {p.supplier ? ` · ${p.supplier}` : ""}
                    </p>
                  </div>
                  {p.stock <= 0 ? (
                    <span className="bp-badge bp-badge--danger">Agotado</span>
                  ) : p.low_stock ? (
                    <span className="bp-badge bp-badge--warning">Stock bajo</span>
                  ) : (
                    <span className={`bp-badge ${p.is_active ? "bp-badge--success" : "bp-badge--neutral"}`}>
                      {p.is_active ? "Activo" : "Inactivo"}
                    </span>
                  )}
                </div>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <span style={{ fontSize: 13, color: "var(--bp-text-secondary)" }}>
                      {p.stock} uds · mín {p.min_stock}
                    </span>
                    <span className="bp-product-card__price" style={{ fontSize: 16 }}>
                      ${p.price.toFixed(2)}
                    </span>
                  </div>
                  <div className="bp-stock-bar">
                    <div className={`bp-stock-bar__fill ${fillClass}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
                <div className="bp-product-card__footer" style={{ flexWrap: "wrap", gap: 6 }}>
                  <button type="button" className="bp-btn bp-btn--secondary bp-btn--sm" onClick={() => openAdd(p)}>
                    <IconArrowUp />
                    Entrada
                  </button>
                  <button type="button" className="bp-btn bp-btn--secondary bp-btn--sm" onClick={() => openReduce(p)}>
                    <IconArrowDown />
                    Salida
                  </button>
                  <button type="button" className="bp-btn bp-btn--primary bp-btn--sm" onClick={() => openSale(p)}>
                    <IconDollar />
                    Venta
                  </button>
                  <button type="button" className="bp-btn bp-btn--ghost bp-btn--sm" onClick={() => void openHistory(p)}>
                    Historial
                  </button>
                  <button type="button" className="bp-btn bp-btn--ghost bp-btn--sm" onClick={() => startEdit(p)}>
                    <IconEdit />
                  </button>
                  <button type="button" className="bp-btn bp-btn--danger bp-btn--sm" onClick={() => void remove(p.id)}>
                    <IconTrash />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {panelOpen ? (
        <>
          <div className="bp-panel__overlay" onClick={closePanel} />
          <div className={`bp-panel ${mode === "history" ? "bp-panel--wide" : ""}`} role="dialog" aria-modal="true">
            <div className="bp-panel__header">
              <div>
                <h2 className="bp-panel__title">
                  {mode === "create" && "Nuevo artículo"}
                  {mode === "edit" && "Editar artículo"}
                  {mode === "add" && "Agregar stock"}
                  {mode === "reduce" && "Reducir stock"}
                  {mode === "sale" && "Registrar venta"}
                  {mode === "history" && "Historial de movimientos"}
                </h2>
                <p className="bp-panel__subtitle">
                  {activeProduct
                    ? `${activeProduct.name} · stock actual ${activeProduct.stock}`
                    : mode === "history"
                      ? "Movimientos del negocio"
                      : "Stock, costos y proveedor"}
                </p>
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

              {(mode === "create" || mode === "edit") && (
                <>
                  <div className="bp-field">
                    <label className="bp-label">Nombre</label>
                    <input
                      className="bp-input"
                      value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    />
                  </div>
                  <div className="bp-field">
                    <label className="bp-label">Categoría</label>
                    <input
                      className="bp-input"
                      value={form.category}
                      onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                    />
                  </div>
                  <div className="bp-field__row">
                    {mode === "create" ? (
                      <div className="bp-field">
                        <label className="bp-label">Stock inicial</label>
                        <input
                          className="bp-input"
                          type="number"
                          value={form.stock}
                          onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))}
                        />
                      </div>
                    ) : (
                      <div className="bp-field">
                        <label className="bp-label">Stock (corrección manual)</label>
                        <input
                          className="bp-input"
                          type="number"
                          value={form.stock}
                          onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))}
                        />
                        <span className="bp-hint">Cambiar stock crea un movimiento de corrección.</span>
                      </div>
                    )}
                    <div className="bp-field">
                      <label className="bp-label">Stock mínimo</label>
                      <input
                        className="bp-input"
                        type="number"
                        value={form.min_stock}
                        onChange={(e) => setForm((f) => ({ ...f, min_stock: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="bp-field__row">
                    <div className="bp-field">
                      <label className="bp-label">Precio venta</label>
                      <input
                        className="bp-input"
                        type="number"
                        step="0.01"
                        value={form.price}
                        onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                      />
                    </div>
                    <div className="bp-field">
                      <label className="bp-label">Costo unitario</label>
                      <input
                        className="bp-input"
                        type="number"
                        step="0.01"
                        value={form.unit_cost}
                        onChange={(e) => setForm((f) => ({ ...f, unit_cost: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="bp-field">
                    <label className="bp-label">Proveedor</label>
                    <input
                      className="bp-input"
                      value={form.supplier}
                      onChange={(e) => setForm((f) => ({ ...f, supplier: e.target.value }))}
                    />
                  </div>
                  <label className="bp-switch-row">
                    <span className="bp-switch-row__text">Activo</span>
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
                </>
              )}

              {(mode === "add" || mode === "reduce" || mode === "sale") && activeProduct && (
                <>
                  {mode !== "sale" ? (
                    <div className="bp-field">
                      <label className="bp-label">Motivo</label>
                      <select
                        className="bp-select"
                        value={moveType}
                        onChange={(e) => setMoveType(e.target.value)}
                      >
                        {(mode === "add" ? ADD_TYPES : REDUCE_TYPES).map((t) => (
                          <option key={t.value} value={t.value}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : null}
                  <div className="bp-field">
                    <label className="bp-label">Cantidad</label>
                    <input
                      className="bp-input"
                      type="number"
                      min={1}
                      value={moveQty}
                      onChange={(e) => setMoveQty(e.target.value)}
                    />
                  </div>
                  {(mode === "sale" || moveType === "sale") && (
                    <div className="bp-field">
                      <label className="bp-label">Precio unitario de venta</label>
                      <input
                        className="bp-input"
                        type="number"
                        step="0.01"
                        value={movePrice}
                        onChange={(e) => setMovePrice(e.target.value)}
                      />
                      <span className="bp-hint">Total: ${saleTotal.toFixed(2)}</span>
                    </div>
                  )}
                  {(mode === "add" || mode === "sale") && (
                    <div className="bp-field">
                      <label className="bp-label">Costo unitario (opcional)</label>
                      <input
                        className="bp-input"
                        type="number"
                        step="0.01"
                        value={moveCost}
                        onChange={(e) => setMoveCost(e.target.value)}
                      />
                    </div>
                  )}
                  <div className="bp-field">
                    <label className="bp-label">Notas</label>
                    <input
                      className="bp-input"
                      value={moveNotes}
                      onChange={(e) => setMoveNotes(e.target.value)}
                      placeholder="Opcional"
                    />
                  </div>
                  {projectedQty != null ? (
                    <div className="bp-obs__item">
                      <span className="bp-obs__dot bp-obs__dot--info" />
                      Stock proyectado: <strong style={{ marginLeft: 4 }}>{projectedQty}</strong>
                      {projectedQty < 0 ? (
                        <span className="bp-badge bp-badge--danger" style={{ marginLeft: "auto" }}>
                          Insuficiente
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                </>
              )}

              {mode === "history" && (
                <>
                  <div className="bp-field__row">
                    <div className="bp-field">
                      <label className="bp-label">Tipo</label>
                      <select
                        className="bp-select"
                        value={histType}
                        onChange={(e) => setHistType(e.target.value)}
                      >
                        <option value="">Todos</option>
                        {[...ADD_TYPES, ...REDUCE_TYPES].map((t) => (
                          <option key={t.value} value={t.value}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="bp-field">
                      <label className="bp-label">Ventas</label>
                      <select
                        className="bp-select"
                        value={histSalesOnly}
                        onChange={(e) => setHistSalesOnly(e.target.value)}
                      >
                        <option value="">Todas</option>
                        <option value="true">Solo ventas</option>
                        <option value="false">Sin ventas</option>
                      </select>
                    </div>
                  </div>
                  {movements.length === 0 ? (
                    <div className="bp-empty" style={{ padding: "24px 0" }}>
                      <div className="bp-empty__title">Sin movimientos</div>
                      <div className="bp-empty__text">
                        Cuando agregues, reduzcas o vendas stock, el historial aparece aquí.
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: "grid", gap: 10 }}>
                      {movements.map((m) => (
                        <div
                          key={m.id}
                          style={{
                            border: "1px solid var(--bp-border)",
                            borderRadius: 12,
                            padding: "12px 14px",
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
                            <strong style={{ fontSize: 14 }}>
                              {m.product_name ?? "Producto"}
                            </strong>
                            <span className={`bp-badge ${movementBadge(m.movement_type)}`}>
                              {movementLabel(m.movement_type)}
                            </span>
                          </div>
                          <div className="bp-cell-muted" style={{ fontSize: 12 }}>
                            {m.created_at
                              ? new Date(m.created_at).toLocaleString("es-MX")
                              : "—"}
                            {" · "}
                            {m.quantity} uds · {m.quantity_before} → {m.quantity_after}
                            {m.total_revenue != null ? ` · $${m.total_revenue.toFixed(2)}` : ""}
                            {m.notes ? ` · ${m.notes}` : ""}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="bp-panel__footer">
              <button type="button" className="bp-btn bp-btn--secondary" onClick={closePanel}>
                {mode === "history" ? "Cerrar" : "Cancelar"}
              </button>
              {mode === "create" || mode === "edit" ? (
                <button
                  type="button"
                  className="bp-btn bp-btn--primary"
                  disabled={saving}
                  onClick={() => void submitProduct()}
                >
                  {saving ? "Guardando…" : "Guardar"}
                </button>
              ) : null}
              {mode === "add" || mode === "reduce" || mode === "sale" ? (
                <button
                  type="button"
                  className="bp-btn bp-btn--primary"
                  disabled={saving || (projectedQty != null && projectedQty < 0)}
                  onClick={() => void submitMovement()}
                >
                  {saving ? "Procesando…" : "Confirmar"}
                </button>
              ) : null}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
