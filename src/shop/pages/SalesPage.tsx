import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { API_BASE_URL } from "../../config";
import {
  IconAlert,
  IconClose,
  IconDollar,
  IconPlus,
  IconSearch,
  IconTrash,
} from "../icons";
import { staffLabel } from "../staffLabel";

type Sale = {
  id: string;
  invoice_number: string;
  client_id: string | null;
  employee_id: string | null;
  customer_name: string | null;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  payment_method: string;
  status: string;
  notes: string | null;
  created_at: string | null;
  services_summary: string;
  products_summary: string;
  services_count: number;
  products_count: number;
  items?: Array<{
    id: string;
    item_type: string;
    name: string;
    quantity: number;
    unit_price: number;
    line_total: number;
  }>;
};

type Opt = { id: string; name?: string; first_name?: string; last_name?: string; price?: number };
type StaffOpt = {
  employee_id: string;
  email: string | null;
  display_name: string | null;
  label?: string | null;
  full_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
};

type Period = "today" | "yesterday" | "week" | "month" | "custom";

type LineDraft = {
  key: string;
  item_type: "service" | "product";
  ref_id: string;
  name: string;
  quantity: number;
  unit_price: number;
};

function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function rangeFor(period: Period, from: string, to: string) {
  const today = startOfDay();
  if (period === "yesterday") {
    const y = new Date(today);
    y.setDate(y.getDate() - 1);
    return { from: y.toISOString(), to: endOfDay(y).toISOString() };
  }
  if (period === "week") {
    const end = new Date(today);
    end.setDate(end.getDate() + 6);
    return { from: today.toISOString(), to: endOfDay(end).toISOString() };
  }
  if (period === "month") {
    const end = new Date(today);
    end.setMonth(end.getMonth() + 1);
    end.setDate(end.getDate() - 1);
    return { from: today.toISOString(), to: endOfDay(end).toISOString() };
  }
  if (period === "custom") {
    const out: { from?: string; to?: string } = {};
    if (from) out.from = new Date(from).toISOString();
    if (to) out.to = new Date(to).toISOString();
    return out;
  }
  return { from: today.toISOString(), to: endOfDay(today).toISOString() };
}

function money(n: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(n);
}

function moneyExact(n: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
  }).format(n);
}

function payLabel(m: string) {
  const map: Record<string, string> = {
    cash: "Efectivo",
    card: "Tarjeta",
    sinpe: "SINPE",
    transfer: "Transferencia",
    other: "Otro",
  };
  return map[m] ?? m;
}

function newKey() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `sale-${Date.now()}`;
}

export function SalesPage() {
  const [items, setItems] = useState<Sale[]>([]);
  const [clients, setClients] = useState<Opt[]>([]);
  const [services, setServices] = useState<Opt[]>([]);
  const [products, setProducts] = useState<Opt[]>([]);
  const [staff, setStaff] = useState<StaffOpt[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [period, setPeriod] = useState<Period>("today");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [paymentF, setPaymentF] = useState("");
  const [search, setSearch] = useState("");
  const [panelOpen, setPanelOpen] = useState(false);
  const [detail, setDetail] = useState<Sale | null>(null);
  const [saving, setSaving] = useState(false);
  const [idemKey, setIdemKey] = useState(newKey);

  const [clientId, setClientId] = useState("");
  const [barberId, setBarberId] = useState("");
  const [payment, setPayment] = useState("cash");
  const [discount, setDiscount] = useState("0");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<LineDraft[]>([]);
  const [addType, setAddType] = useState<"service" | "product">("service");
  const [addRef, setAddRef] = useState("");

  const loadRefs = useCallback(async () => {
    const [c, s, p, t] = await Promise.all([
      axios.get<{ items: Opt[] }>(`${API_BASE_URL}/api/shop/clients`),
      axios.get<{ items: Opt[] }>(`${API_BASE_URL}/api/shop/services`),
      axios.get<{ items: Opt[] }>(`${API_BASE_URL}/api/shop/inventory`),
      axios.get<{ items: StaffOpt[] }>(`${API_BASE_URL}/api/shop/staff`),
    ]);
    setClients(c.data.items);
    setServices(s.data.items);
    setProducts(p.data.items);
    setStaff(t.data.items);
  }, []);

  const load = useCallback(async () => {
    setErr(null);
    try {
      const range = rangeFor(period, customFrom, customTo);
      const params: Record<string, string> = {};
      if (range.from) params.from = range.from;
      if (range.to) params.to = range.to;
      if (employeeId) params.employee_id = employeeId;
      if (paymentF) params.payment_method = paymentF;
      const res = await axios.get<{ items: Sale[] }>(`${API_BASE_URL}/api/shop/sales`, {
        params,
      });
      setItems(res.data.items);
    } catch {
      setErr("No se pudieron cargar las ventas.");
    }
  }, [period, customFrom, customTo, employeeId, paymentF]);

  useEffect(() => {
    void loadRefs();
  }, [loadRefs]);

  useEffect(() => {
    if (period === "custom" && !customFrom && !customTo) return;
    void load();
  }, [load, period, customFrom, customTo]);

  useEffect(() => {
    if (!ok) return;
    const t = window.setTimeout(() => setOk(null), 2500);
    return () => window.clearTimeout(t);
  }, [ok]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (s) =>
        (s.customer_name ?? "").toLowerCase().includes(q) ||
        s.invoice_number.toLowerCase().includes(q) ||
        s.services_summary.toLowerCase().includes(q) ||
        s.products_summary.toLowerCase().includes(q),
    );
  }, [items, search]);

  const kpis = useMemo(() => {
    const completed = items.filter((s) => s.status === "completed");
    const total = completed.reduce((a, s) => a + s.total, 0);
    const productsSold = completed.reduce((a, s) => a + (s.products_count || 0), 0);
    const servicesSold = completed.reduce((a, s) => a + (s.services_count || 0), 0);
    const avg = completed.length ? total / completed.length : 0;
    return { total, count: completed.length, productsSold, servicesSold, avg };
  }, [items]);

  const subtotal = lines.reduce((a, l) => a + l.quantity * l.unit_price, 0);
  const disc = Number(discount) || 0;
  const grand = Math.max(0, subtotal - disc);

  const openCreate = () => {
    setLines([]);
    setClientId("");
    setBarberId("");
    setPayment("cash");
    setDiscount("0");
    setNotes("");
    setAddRef("");
    setIdemKey(newKey());
    setErr(null);
    setPanelOpen(true);
  };

  const addLine = () => {
    if (!addRef) return;
    if (addType === "service") {
      const s = services.find((x) => x.id === addRef);
      if (!s) return;
      setLines((prev) => [
        ...prev,
        {
          key: newKey(),
          item_type: "service",
          ref_id: s.id,
          name: s.name ?? "Servicio",
          quantity: 1,
          unit_price: Number(s.price ?? 0),
        },
      ]);
    } else {
      const p = products.find((x) => x.id === addRef);
      if (!p) return;
      setLines((prev) => [
        ...prev,
        {
          key: newKey(),
          item_type: "product",
          ref_id: p.id,
          name: p.name ?? "Producto",
          quantity: 1,
          unit_price: Number(p.price ?? 0),
        },
      ]);
    }
    setAddRef("");
  };

  const submitSale = async () => {
    if (lines.length === 0) {
      setErr("Agrega al menos un ítem.");
      return;
    }
    setSaving(true);
    setErr(null);
    try {
      const res = await axios.post<{ sale: Sale; replayed?: boolean }>(
        `${API_BASE_URL}/api/shop/sales`,
        {
          client_id: clientId || null,
          employee_id: barberId || null,
          payment_method: payment,
          discount: disc,
          tax: 0,
          notes: notes || null,
          idempotency_key: idemKey,
          items: lines.map((l) =>
            l.item_type === "service"
              ? {
                  item_type: "service",
                  service_type_id: l.ref_id,
                  quantity: l.quantity,
                  unit_price: l.unit_price,
                }
              : {
                  item_type: "product",
                  product_id: l.ref_id,
                  quantity: l.quantity,
                  unit_price: l.unit_price,
                },
          ),
        },
      );
      const created = res.data.sale;
      setOk("Venta registrada");
      setPanelOpen(false);
      if (created) {
        setItems((prev) => [created, ...prev.filter((s) => s.id !== created.id)]);
      }
      await load();
    } catch (e: unknown) {
      const msg =
        axios.isAxiosError(e) && e.response?.data && typeof e.response.data === "object"
          ? (e.response.data as { error?: string }).error
          : null;
      setErr(msg ?? "No se pudo crear la venta.");
      setIdemKey(newKey());
    } finally {
      setSaving(false);
    }
  };

  const openDetail = async (id: string) => {
    try {
      const res = await axios.get<Sale>(`${API_BASE_URL}/api/shop/sales/${id}`);
      setDetail(res.data);
    } catch {
      setErr("No se pudo abrir la venta.");
    }
  };

  return (
    <div>
      <div className="bp-page__head">
        <div>
          <h1 className="bp-page__title">Ventas</h1>
          <p className="bp-page__subtitle">
            Gestiona todas las transacciones completadas.
          </p>
        </div>
        <div className="bp-page__actions">
          <button type="button" className="bp-btn bp-btn--primary" onClick={openCreate}>
            <IconPlus />
            Nueva venta
          </button>
        </div>
      </div>

      {ok ? (
        <div
          className="bp-alert"
          style={{ marginBottom: 16, background: "var(--bp-success-soft)", color: "var(--bp-success)" }}
        >
          {ok}
        </div>
      ) : null}

      {err && !panelOpen ? (
        <div className="bp-alert bp-alert--error" style={{ marginBottom: 16 }}>
          <IconAlert />
          <span>{err}</span>
        </div>
      ) : null}

      <div className="bp-kpi-grid bp-kpi-grid--6" style={{ marginBottom: 18 }}>
        <div className="bp-kpi">
          <div className="bp-kpi__label">Ventas (periodo)</div>
          <div className="bp-kpi__value">{money(kpis.total)}</div>
        </div>
        <div className="bp-kpi">
          <div className="bp-kpi__label">Tickets</div>
          <div className="bp-kpi__value">{kpis.count}</div>
        </div>
        <div className="bp-kpi">
          <div className="bp-kpi__label">Ticket promedio</div>
          <div className="bp-kpi__value">{money(kpis.avg)}</div>
        </div>
        <div className="bp-kpi">
          <div className="bp-kpi__label">Productos vendidos</div>
          <div className="bp-kpi__value">{kpis.productsSold}</div>
        </div>
        <div className="bp-kpi">
          <div className="bp-kpi__label">Servicios vendidos</div>
          <div className="bp-kpi__value">{kpis.servicesSold}</div>
        </div>
        <div className="bp-kpi">
          <div className="bp-kpi__label">Ingresos</div>
          <div className="bp-kpi__value" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <IconDollar style={{ width: 18, height: 18, color: "var(--bp-primary)" }} />
            {moneyExact(kpis.total)}
          </div>
        </div>
      </div>

      <div className="bp-toolbar">
        <div className="bp-toolbar__search">
          <IconSearch />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar factura, cliente…"
          />
        </div>
        <select
          className="bp-select"
          style={{ width: 160 }}
          value={period}
          onChange={(e) => setPeriod(e.target.value as Period)}
        >
          <option value="today">Hoy</option>
          <option value="yesterday">Ayer</option>
          <option value="week">Esta semana</option>
          <option value="month">Este mes</option>
          <option value="custom">Personalizado</option>
        </select>
        {period === "custom" ? (
          <>
            <input className="bp-input" type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
            <input className="bp-input" type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
          </>
        ) : null}
        <select className="bp-select" style={{ width: 180 }} value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
          <option value="">Todos los barberos</option>
          {staff.map((s) => (
            <option key={s.employee_id} value={s.employee_id}>
              {staffLabel(s)}
            </option>
          ))}
        </select>
        <select className="bp-select" style={{ width: 160 }} value={paymentF} onChange={(e) => setPaymentF(e.target.value)}>
          <option value="">Pago</option>
          <option value="cash">Efectivo</option>
          <option value="card">Tarjeta</option>
          <option value="sinpe">SINPE</option>
          <option value="transfer">Transferencia</option>
          <option value="other">Otro</option>
        </select>
      </div>

      <div className="bp-table-wrap">
        <div className="bp-table-scroll">
          <table className="bp-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Factura</th>
                <th>Cliente</th>
                <th>Servicios</th>
                <th>Productos</th>
                <th>Total</th>
                <th>Pago</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <div className="bp-empty" style={{ padding: "36px 0" }}>
                      <div className="bp-empty__title">Sin ventas en este periodo</div>
                      <div className="bp-empty__text">Registra la primera venta para ver ingresos aquí e Insights.</div>
                      <button type="button" className="bp-btn bp-btn--primary bp-btn--sm" onClick={openCreate}>
                        <IconPlus />
                        Nueva venta
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                visible.map((s) => (
                  <tr key={s.id} className="bp-row--clickable" onClick={() => void openDetail(s.id)}>
                    <td>
                      {s.created_at
                        ? new Date(s.created_at).toLocaleString("es-MX", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "—"}
                    </td>
                    <td>
                      <strong>{s.invoice_number}</strong>
                    </td>
                    <td>{s.customer_name || "Cliente general"}</td>
                    <td className="bp-cell-muted">{s.services_summary}</td>
                    <td className="bp-cell-muted">{s.products_summary}</td>
                    <td>
                      <strong>{moneyExact(s.total)}</strong>
                    </td>
                    <td>{payLabel(s.payment_method)}</td>
                    <td>
                      <span
                        className={`bp-badge ${
                          s.status === "completed" ? "bp-badge--success" : "bp-badge--neutral"
                        }`}
                      >
                        {s.status === "completed" ? "Completada" : s.status}
                      </span>
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
          <div className="bp-panel__overlay" onClick={() => setPanelOpen(false)} />
          <div className="bp-panel bp-panel--wide" role="dialog" aria-modal="true">
            <div className="bp-panel__header">
              <div>
                <h2 className="bp-panel__title">Nueva venta</h2>
                <p className="bp-panel__subtitle">Servicios, productos y cobro en un ticket.</p>
              </div>
              <button type="button" className="bp-icon-btn" onClick={() => setPanelOpen(false)}>
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
                  <label className="bp-label">Cliente</label>
                  <select className="bp-select" value={clientId} onChange={(e) => setClientId(e.target.value)}>
                    <option value="">Cliente general</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {(c.first_name ?? "") + " " + (c.last_name ?? "")}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="bp-field">
                  <label className="bp-label">Barbero</label>
                  <select className="bp-select" value={barberId} onChange={(e) => setBarberId(e.target.value)}>
                    <option value="">Sin asignar</option>
                    {staff.map((s) => (
                      <option key={s.employee_id} value={s.employee_id}>
                        {staffLabel(s)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="bp-field__row">
                <div className="bp-field">
                  <label className="bp-label">Agregar</label>
                  <select
                    className="bp-select"
                    value={addType}
                    onChange={(e) => {
                      setAddType(e.target.value as "service" | "product");
                      setAddRef("");
                    }}
                  >
                    <option value="service">Servicio</option>
                    <option value="product">Producto</option>
                  </select>
                </div>
                <div className="bp-field">
                  <label className="bp-label">{addType === "service" ? "Servicio" : "Producto"}</label>
                  <select className="bp-select" value={addRef} onChange={(e) => setAddRef(e.target.value)}>
                    <option value="">Selecciona…</option>
                    {(addType === "service" ? services : products).map((x) => (
                      <option key={x.id} value={x.id}>
                        {x.name} · ${Number(x.price ?? 0).toFixed(2)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <button type="button" className="bp-btn bp-btn--secondary bp-btn--sm" onClick={addLine}>
                <IconPlus />
                Agregar ítem
              </button>

              <div style={{ marginTop: 16, display: "grid", gap: 8 }}>
                {lines.map((l) => (
                  <div
                    key={l.key}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 70px 100px 40px",
                      gap: 8,
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <strong style={{ fontSize: 14 }}>{l.name}</strong>
                      <div className="bp-cell-muted" style={{ fontSize: 12 }}>
                        {l.item_type === "service" ? "Servicio" : "Producto"}
                      </div>
                    </div>
                    <input
                      className="bp-input"
                      type="number"
                      min={1}
                      value={l.quantity}
                      onChange={(e) =>
                        setLines((prev) =>
                          prev.map((x) =>
                            x.key === l.key
                              ? { ...x, quantity: Number.parseInt(e.target.value, 10) || 1 }
                              : x,
                          ),
                        )
                      }
                    />
                    <input
                      className="bp-input"
                      type="number"
                      step="0.01"
                      value={l.unit_price}
                      onChange={(e) =>
                        setLines((prev) =>
                          prev.map((x) =>
                            x.key === l.key ? { ...x, unit_price: Number(e.target.value) || 0 } : x,
                          ),
                        )
                      }
                    />
                    <button
                      type="button"
                      className="bp-btn bp-btn--danger bp-btn--sm"
                      onClick={() => setLines((prev) => prev.filter((x) => x.key !== l.key))}
                    >
                      <IconTrash />
                    </button>
                  </div>
                ))}
              </div>

              <div className="bp-field__row" style={{ marginTop: 16 }}>
                <div className="bp-field">
                  <label className="bp-label">Descuento</label>
                  <input
                    className="bp-input"
                    type="number"
                    min={0}
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                  />
                </div>
                <div className="bp-field">
                  <label className="bp-label">Método de pago</label>
                  <select className="bp-select" value={payment} onChange={(e) => setPayment(e.target.value)}>
                    <option value="cash">Efectivo</option>
                    <option value="card">Tarjeta</option>
                    <option value="sinpe">SINPE</option>
                    <option value="transfer">Transferencia</option>
                    <option value="other">Otro</option>
                  </select>
                </div>
              </div>
              <div className="bp-field">
                <label className="bp-label">Notas</label>
                <input className="bp-input" value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>

              <div className="bp-inv-hero" style={{ marginTop: 8 }}>
                <div className="bp-inv-hero__card">
                  <span>Subtotal</span>
                  <strong>{moneyExact(subtotal)}</strong>
                </div>
                <div className="bp-inv-hero__card">
                  <span>Descuento</span>
                  <strong>{moneyExact(disc)}</strong>
                </div>
                <div className="bp-inv-hero__card bp-inv-hero__card--accent">
                  <span>Total</span>
                  <strong>{moneyExact(grand)}</strong>
                </div>
              </div>
              <p className="bp-meta-note">
                Recibo listo para imprimir / WhatsApp / email en una próxima iteración.
              </p>
            </div>
            <div className="bp-panel__footer">
              <button type="button" className="bp-btn bp-btn--secondary" onClick={() => setPanelOpen(false)}>
                Cancelar
              </button>
              <button
                type="button"
                className="bp-btn bp-btn--primary"
                disabled={saving}
                onClick={() => void submitSale()}
              >
                {saving ? "Registrando…" : "Completar venta"}
              </button>
            </div>
          </div>
        </>
      ) : null}

      {detail ? (
        <>
          <div className="bp-panel__overlay" onClick={() => setDetail(null)} />
          <div className="bp-panel" role="dialog" aria-modal="true">
            <div className="bp-panel__header">
              <div>
                <h2 className="bp-panel__title">{detail.invoice_number}</h2>
                <p className="bp-panel__subtitle">
                  {detail.customer_name || "Cliente general"} · {payLabel(detail.payment_method)}
                </p>
              </div>
              <button type="button" className="bp-icon-btn" onClick={() => setDetail(null)}>
                <IconClose />
              </button>
            </div>
            <div className="bp-panel__body">
              {(detail.items ?? []).map((i) => (
                <div key={i.id} className="bp-obs__item">
                  <span className={`bp-obs__dot ${i.item_type === "sale" ? "" : "bp-obs__dot--info"}`} />
                  {i.name} × {i.quantity}
                  <span style={{ marginLeft: "auto" }}>{moneyExact(i.line_total)}</span>
                </div>
              ))}
              <div style={{ marginTop: 16, textAlign: "right" }}>
                <div className="bp-cell-muted">Subtotal {moneyExact(detail.subtotal)}</div>
                <div className="bp-cell-muted">Descuento {moneyExact(detail.discount)}</div>
                <strong style={{ fontSize: 22 }}>{moneyExact(detail.total)}</strong>
              </div>
            </div>
            <div className="bp-panel__footer">
              <button type="button" className="bp-btn bp-btn--secondary" onClick={() => setDetail(null)}>
                Cerrar
              </button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
