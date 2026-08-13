import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { API_BASE_URL } from "../config";
import { moneyExact } from "../money";
import { PaymentMethodField } from "./PaymentMethodField";
import { IconAlert } from "./icons";
import { session } from "../auth/session";
import { isShopStaff } from "../auth/roles";

type Product = {
  id: string;
  name?: string;
  price?: number | null;
  stock?: number;
  is_active?: boolean;
  is_sellable?: boolean;
};

type SaleResult = {
  sale?: { total?: number };
  product?: { name?: string; stock?: number };
};

function newIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `qs-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

type Props = {
  onSold?: () => void;
};

export function ProductQuickSale({ onSold }: Props) {
  const user = session.getUser();
  const staffOnly = isShopStaff(user);
  const myEmployeeId = user?.employee_id ?? "";

  const [products, setProducts] = useState<Product[]>([]);
  const [query, setQuery] = useState("");
  const [productId, setProductId] = useState("");
  const [qty, setQty] = useState(1);
  const [payment, setPayment] = useState("cash");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [idemKey, setIdemKey] = useState(newIdempotencyKey);
  const qtyRef = useRef<HTMLInputElement>(null);

  const loadProducts = useCallback(async () => {
    try {
      const res = await axios.get<{ items: Product[] }>(
        `${API_BASE_URL}/api/shop/inventory`,
        { params: { sellable: true } },
      );
      setProducts(res.data.items ?? []);
    } catch {
      setProducts([]);
    }
  }, []);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    if (!ok) return;
    const t = window.setTimeout(() => setOk(null), 3500);
    return () => window.clearTimeout(t);
  }, [ok]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = products.filter((p) => p.is_active !== false);
    if (!q) return list;
    return list.filter((p) => (p.name ?? "").toLowerCase().includes(q));
  }, [products, query]);

  const selected = products.find((p) => p.id === productId) ?? null;
  const stock = selected ? Number(selected.stock ?? 0) : 0;
  const price = selected?.price != null ? Number(selected.price) : null;
  const outOfStock = Boolean(selected) && stock <= 0;
  const previewTotal =
    selected && price != null && qty > 0 ? price * qty : null;

  const setQuantity = (next: number) => {
    const max = selected ? Math.max(1, stock) : 99;
    const n = Math.floor(Number.isFinite(next) ? next : 1);
    setQty(Math.min(max, Math.max(1, n)));
  };

  const resetForm = () => {
    setProductId("");
    setQuery("");
    setQty(1);
    setPayment("cash");
    setIdemKey(newIdempotencyKey());
  };

  const submit = async () => {
    if (saving) return;
    if (!productId || !selected) {
      setErr("Selecciona un producto.");
      return;
    }
    if (outOfStock) {
      setErr("Este producto no tiene existencias.");
      return;
    }
    if (qty < 1) {
      setErr("La cantidad debe ser al menos 1.");
      return;
    }
    if (qty > stock) {
      setErr(`Solo hay ${stock} unidades disponibles.`);
      return;
    }
    if (!payment) {
      setErr("Selecciona el método de pago.");
      return;
    }
    setSaving(true);
    setErr(null);
    try {
      const res = await axios.post<SaleResult>(
        `${API_BASE_URL}/api/shop/inventory/${productId}/sale`,
        {
          quantity: qty,
          payment_method: payment,
          idempotency_key: idemKey,
          ...(staffOnly && myEmployeeId ? { employee_id: myEmployeeId } : {}),
        },
      );
      const name = res.data.product?.name ?? selected.name ?? "Producto";
      const total = res.data.sale?.total ?? previewTotal ?? 0;
      setOk(`Venta registrada — ${qty} × ${name} — ${moneyExact(total)}`);
      resetForm();
      await loadProducts();
      onSold?.();
    } catch (e: unknown) {
      const msg =
        axios.isAxiosError(e) &&
        e.response?.data &&
        typeof e.response.data === "object"
          ? (e.response.data as { error?: string }).error
          : null;
      setErr(msg ?? "No se pudo registrar la venta.");
      setIdemKey(newIdempotencyKey());
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bp-card" style={{ marginBottom: 18 }}>
      <div className="bp-card__header">
        <div>
          <h2 className="bp-card__title">Registrar venta de producto</h2>
          <p className="bp-card__subtitle">Producto, cantidad y listo.</p>
        </div>
      </div>
      <div className="bp-card__body">
        {ok ? (
          <div
            className="bp-alert"
            style={{
              marginBottom: 14,
              background: "var(--bp-success-soft)",
              color: "var(--bp-success)",
            }}
          >
            {ok}
          </div>
        ) : null}
        {err ? (
          <div className="bp-alert bp-alert--error" style={{ marginBottom: 14 }}>
            <IconAlert />
            <span>{err}</span>
          </div>
        ) : null}

        <div className="bp-quick-sale">
          <div className="bp-field">
            <label className="bp-label" htmlFor="qs-search">
              Producto
            </label>
            <input
              id="qs-search"
              className="bp-input"
              value={query}
              placeholder="Buscar… ej. pomada"
              onChange={(e) => {
                setQuery(e.target.value);
                setProductId("");
              }}
            />
            <select
              className="bp-select"
              style={{ marginTop: 8 }}
              value={productId}
              onChange={(e) => {
                const id = e.target.value;
                setProductId(id);
                setQty(1);
                const p = products.find((x) => x.id === id);
                if (p) setQuery(p.name ?? "");
                window.setTimeout(() => qtyRef.current?.focus(), 0);
              }}
            >
              <option value="">Selecciona un producto…</option>
              {filtered.map((p) => {
                const st = Number(p.stock ?? 0);
                const pr = p.price != null ? moneyExact(Number(p.price)) : "sin precio";
                const empty = st <= 0;
                return (
                  <option key={p.id} value={p.id} disabled={empty}>
                    {p.name}
                    {empty ? " — Agotado" : ` — ${st} disponibles — ${pr}`}
                  </option>
                );
              })}
            </select>
          </div>

          <div className="bp-field">
            <label className="bp-label" htmlFor="qs-qty">
              Cantidad
            </label>
            <div className="bp-qty-stepper">
              <button
                type="button"
                className="bp-btn bp-btn--secondary bp-btn--sm"
                disabled={!selected || qty <= 1 || saving}
                onClick={() => setQuantity(qty - 1)}
                aria-label="Menos"
              >
                −
              </button>
              <input
                id="qs-qty"
                ref={qtyRef}
                className="bp-input"
                type="number"
                min={1}
                max={selected ? Math.max(1, stock) : undefined}
                value={qty}
                disabled={!selected || saving}
                onChange={(e) => setQuantity(Number.parseInt(e.target.value, 10))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void submit();
                  }
                }}
              />
              <button
                type="button"
                className="bp-btn bp-btn--secondary bp-btn--sm"
                disabled={!selected || qty >= stock || saving}
                onClick={() => setQuantity(qty + 1)}
                aria-label="Más"
              >
                +
              </button>
            </div>
          </div>

          <PaymentMethodField
            id="qs-pay"
            value={payment}
            onChange={(v) => setPayment(v || "cash")}
          />

          <div className="bp-quick-sale__action">
            {previewTotal != null && selected && !outOfStock ? (
              <div className="bp-cell-muted" style={{ fontSize: 13 }}>
                Total {moneyExact(previewTotal)}
              </div>
            ) : (
              <span />
            )}
            <button
              type="button"
              className="bp-btn bp-btn--primary"
              disabled={saving || !selected || outOfStock}
              onClick={() => void submit()}
            >
              {saving ? "Registrando…" : "Registrar venta"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
