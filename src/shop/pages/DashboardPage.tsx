import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { API_BASE_URL } from "../../config";
import { session } from "../../auth/session";
import { isShopAdmin } from "../../auth/roles";
import {
  IconCalendar,
  IconUsers,
  IconPackage,
  IconTrending,
  IconPlus,
  IconChevronRight,
  IconAlert,
  IconSparkles,
  IconDollar,
  IconActivity,
  IconArrowUp,
  IconArrowDown,
  IconHeart,
  IconLightbulb,
  IconTarget,
  IconScissors,
  IconTeam,
} from "../icons";

type RangeKey =
  | "today"
  | "yesterday"
  | "week"
  | "month"
  | "last_month"
  | "year"
  | "custom";

type InsightsPayload = {
  period: { range: string; from: string; to: string };
  meta: { currency_note: string; unavailable: string[]; generated_at: string };
  snapshot: {
    revenue: number;
    revenue_delta_pct: number | null;
    appointments: number;
    appointments_delta_pct: number | null;
    customers_served: number;
    customers_served_delta_pct: number | null;
    products_sold: number | null;
    products_sold_delta_pct: number | null;
    average_ticket: number;
    average_ticket_delta_pct: number | null;
    occupancy_rate: number | null;
    occupancy_delta_pct: number | null;
  };
  series: Array<{
    date: string;
    label: string;
    revenue: number;
    appointments: number;
    average_ticket: number;
  }>;
  revenue_breakdown: Array<{
    key: string;
    label: string;
    amount: number;
    pct: number;
    available: boolean;
    note?: string;
  }>;
  top_services: Array<{
    service_type_id: string;
    name: string;
    bookings: number;
    revenue: number;
    avg_duration: number;
    trend_pct: number | null;
  }>;
  staff_performance: Array<{
    employee_id: string;
    display_name: string;
    revenue: number;
    appointments_completed: number;
    appointments_total: number;
    average_ticket: number;
    average_review: number | null;
    occupancy: number | null;
    completion_rate: number | null;
    rank: number;
  }>;
  customers: {
    total: number;
    new: number;
    returning: number;
    retention_pct: number | null;
    avg_visit_frequency: number;
    inactive_30: number;
    inactive_60: number;
    inactive_90: number;
    highest_spending: { client_id: string; name: string; amount: number } | null;
    most_loyal: { client_id: string; name: string; visits: number } | null;
    average_customer_value: number;
  };
  inventory: {
    inventory_cost: number;
    potential_revenue: number;
    projected_gross_profit: number;
    products_remaining: number;
    sku_count: number;
    products_sold: number | null;
    product_revenue?: number;
    product_gross_profit?: number;
    avg_product_sale_value?: number;
    sell_through_rate?: number | null;
    best_selling_product?: { id: string; name: string; units: number; revenue: number } | null;
    slowest_selling_product?: { id: string; name: string; units: number; revenue: number } | null;
    projected_product_revenue_month?: number;
    low_stock: Array<{ id: string; name: string; stock: number; min_stock: number }>;
    out_of_stock: Array<{ id: string; name: string; stock: number; min_stock: number }>;
    note: string;
  };
  projections: {
    today: number;
    week: number;
    month: number;
    year: number;
    is_estimate: boolean;
    note: string;
  };
  goals: {
    monthly_revenue: number;
    monthly_appointments: number;
    monthly_product_sales: number;
    monthly_new_customers: number;
  };
  goals_progress: Record<
    string,
    { target: number; current: number; pct: number; available?: boolean }
  >;
  health: {
    score: number;
    label: string;
    observations: Array<{ tone: string; text: string }>;
  };
  insights: string[];
  upcoming_appointments: Array<{
    id: string;
    client_name: string;
    start_time: string | null;
    status: string;
    service_name?: string;
  }>;
  empty: boolean;
};

const RANGES: { key: RangeKey; label: string }[] = [
  { key: "today", label: "Hoy" },
  { key: "yesterday", label: "Ayer" },
  { key: "week", label: "Esta semana" },
  { key: "month", label: "Este mes" },
  { key: "last_month", label: "Mes pasado" },
  { key: "year", label: "Año" },
  { key: "custom", label: "Personalizado" },
];

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Buenos días";
  if (h < 19) return "Buenas tardes";
  return "Buenas noches";
}

function money(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(n);
}

function moneyExact(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
  }).format(n);
}

function pct(n: number | null | undefined): string {
  if (n == null) return "—";
  return `${n}%`;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function Delta({ value }: { value: number | null | undefined }) {
  if (value == null) {
    return <div className="bp-kpi__delta bp-kpi__delta--flat">Sin periodo previo</div>;
  }
  const up = value > 0;
  const flat = value === 0;
  const cls = flat ? "bp-kpi__delta--flat" : up ? "bp-kpi__delta--up" : "bp-kpi__delta--down";
  return (
    <div className={`bp-kpi__delta ${cls}`}>
      {flat ? null : up ? <IconArrowUp style={{ width: 12, height: 12 }} /> : <IconArrowDown style={{ width: 12, height: 12 }} />}
      {up ? "+" : ""}
      {value}% vs periodo anterior
    </div>
  );
}

function Sparkline({
  series,
  metric,
}: {
  series: InsightsPayload["series"];
  metric: "revenue" | "appointments" | "average_ticket";
}) {
  const values = series.map((s) => s[metric]);
  const max = Math.max(1, ...values);
  const w = 640;
  const h = 220;
  const pad = 16;
  if (values.length === 0 || values.every((v) => v === 0)) {
    return (
      <div className="bp-chart__empty">
        <IconActivity />
        <div>
          <strong style={{ color: "var(--bp-text)" }}>Aún no hay datos en este periodo</strong>
          <div>Completa citas para ver ingresos, volumen y ticket promedio aquí.</div>
        </div>
      </div>
    );
  }

  const points = values.map((v, i) => {
    const x = pad + (i / Math.max(1, values.length - 1)) * (w - pad * 2);
    const y = h - pad - (v / max) * (h - pad * 2);
    return `${x},${y}`;
  });
  const area = `M ${pad},${h - pad} L ${points.join(" L ")} L ${w - pad},${h - pad} Z`;
  const line = `M ${points.join(" L ")}`;

  return (
    <svg className="bp-chart" viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Gráfico de rendimiento">
      <defs>
        <linearGradient id="bpChartFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#047857" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#047857" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map((g) => (
        <line
          key={g}
          x1={pad}
          x2={w - pad}
          y1={pad + (h - pad * 2) * g}
          y2={pad + (h - pad * 2) * g}
          stroke="#ececec"
          strokeWidth="1"
        />
      ))}
      <path d={area} fill="url(#bpChartFill)" />
      <path d={line} fill="none" stroke="#047857" strokeWidth="2.5" strokeLinejoin="round" />
      {values.map((v, i) => {
        const x = pad + (i / Math.max(1, values.length - 1)) * (w - pad * 2);
        const y = h - pad - (v / max) * (h - pad * 2);
        return <circle key={series[i].date} cx={x} cy={y} r="3.5" fill="#fff" stroke="#047857" strokeWidth="2" />;
      })}
      {series.map((s, i) => {
        if (series.length > 14 && i % Math.ceil(series.length / 7) !== 0) return null;
        const x = pad + (i / Math.max(1, values.length - 1)) * (w - pad * 2);
        return (
          <text key={`l-${s.date}`} x={x} y={h - 2} textAnchor="middle" fontSize="10" fill="#9ca3af">
            {s.label}
          </text>
        );
      })}
    </svg>
  );
}

export function DashboardPage() {
  const [data, setData] = useState<InsightsPayload | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [range, setRange] = useState<RangeKey>("today");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [chartMetric, setChartMetric] = useState<"revenue" | "appointments" | "average_ticket">(
    "revenue",
  );
  const [goalsOpen, setGoalsOpen] = useState(false);
  const [goalForm, setGoalForm] = useState({
    monthly_revenue: 50000,
    monthly_appointments: 200,
    monthly_product_sales: 0,
    monthly_new_customers: 30,
  });
  const [savingGoals, setSavingGoals] = useState(false);

  const admin = isShopAdmin(session.getUser());
  const name =
    session.getUser()?.email?.split("@")[0]?.replace(/[._]/g, " ") ?? "equipo";

  const load = useCallback(async () => {
    setErr(null);
    try {
      const params: Record<string, string> = { range };
      if (range === "custom" && customFrom && customTo) {
        params.from = customFrom;
        params.to = customTo;
      }
      const res = await axios.get<InsightsPayload>(`${API_BASE_URL}/api/shop/insights`, {
        params,
        timeout: 25000,
      });
      setData(res.data);
      if (res.data.goals) setGoalForm(res.data.goals);
    } catch {
      setErr("No se pudieron cargar los insights del negocio.");
    }
  }, [range, customFrom, customTo]);

  useEffect(() => {
    if (range === "custom" && (!customFrom || !customTo)) return;
    void load();
  }, [load, range, customFrom, customTo]);

  const saveGoals = async () => {
    if (!admin) return;
    setSavingGoals(true);
    try {
      await axios.put(`${API_BASE_URL}/api/shop/insights/goals`, goalForm);
      setGoalsOpen(false);
      await load();
    } catch {
      setErr("No se pudieron guardar las metas.");
    } finally {
      setSavingGoals(false);
    }
  };

  const chartLabel = useMemo(() => {
    if (chartMetric === "revenue") return "Ingresos";
    if (chartMetric === "appointments") return "Citas";
    return "Ticket promedio";
  }, [chartMetric]);

  if (err && !data) {
    return (
      <div className="bp-alert bp-alert--error">
        <IconAlert />
        <span>
          {err}{" "}
          <button type="button" className="bp-btn bp-btn--ghost bp-btn--sm" onClick={() => void load()}>
            Reintentar
          </button>
        </span>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bp-insights">
        <div className="bp-kpi-grid bp-kpi-grid--6">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div className="bp-kpi" key={i}>
              <span className="bp-skeleton" style={{ width: "40%", height: 12 }} />
              <span className="bp-skeleton" style={{ width: "55%", height: 28, marginTop: 14 }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const s = data.snapshot;

  return (
    <div className="bp-insights">
      <div className="bp-page__head">
        <div>
          <h1 className="bp-greeting">
            {greeting()}, <span style={{ textTransform: "capitalize" }}>{name}</span>
          </h1>
          <p className="bp-page__subtitle">
            Así va tu negocio ahora. Ingresos, ritmo, equipo e inventario — en un solo vistazo.
          </p>
        </div>
        <div className="bp-page__actions">
          <Link to="/shop/appointments" className="bp-btn bp-btn--primary">
            <IconPlus />
            Nueva cita
          </Link>
          <Link to="/shop/customers" className="bp-btn bp-btn--secondary">
            <IconUsers />
            Cliente
          </Link>
        </div>
      </div>

      <div className="bp-range-bar" role="tablist" aria-label="Periodo">
        {RANGES.map((r) => (
          <button
            key={r.key}
            type="button"
            role="tab"
            className={`bp-range-bar__btn ${range === r.key ? "is-active" : ""}`}
            onClick={() => setRange(r.key)}
          >
            {r.label}
          </button>
        ))}
        {range === "custom" ? (
          <div className="bp-range-bar__custom">
            <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
            <span className="bp-cell-muted">→</span>
            <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
          </div>
        ) : null}
      </div>

      {data.empty ? (
        <div className="bp-card">
          <div className="bp-empty" style={{ padding: "40px 20px" }}>
            <div className="bp-empty__icon">
              <IconSparkles />
            </div>
            <div className="bp-empty__title">Tu centro de inteligencia está listo</div>
            <div className="bp-empty__text">
              Agenda la primera cita y completa servicios. Aquí verás ingresos, proyecciones, clientes
              e inventario con la claridad de un panel premium.
            </div>
            <Link to="/shop/appointments" className="bp-btn bp-btn--primary" style={{ marginTop: 16 }}>
              <IconPlus />
              Crear primera cita
            </Link>
          </div>
        </div>
      ) : null}

      {/* Snapshot */}
      <section>
        <div className="bp-kpi-grid bp-kpi-grid--6">
          <div className="bp-kpi">
            <div className="bp-kpi__top">
              <span className="bp-kpi__label">Ingresos</span>
              <span className="bp-kpi__icon">
                <IconDollar />
              </span>
            </div>
            <div className="bp-kpi__value">{money(s.revenue)}</div>
            <Delta value={s.revenue_delta_pct} />
          </div>
          <div className="bp-kpi">
            <div className="bp-kpi__top">
              <span className="bp-kpi__label">Citas</span>
              <span className="bp-kpi__icon bp-kpi__icon--teal">
                <IconCalendar />
              </span>
            </div>
            <div className="bp-kpi__value">{s.appointments}</div>
            <Delta value={s.appointments_delta_pct} />
          </div>
          <div className="bp-kpi">
            <div className="bp-kpi__top">
              <span className="bp-kpi__label">Clientes atendidos</span>
              <span className="bp-kpi__icon bp-kpi__icon--violet">
                <IconUsers />
              </span>
            </div>
            <div className="bp-kpi__value">{s.customers_served}</div>
            <Delta value={s.customers_served_delta_pct} />
          </div>
          <div className="bp-kpi">
            <div className="bp-kpi__top">
              <span className="bp-kpi__label">Productos vendidos</span>
              <span className="bp-kpi__icon bp-kpi__icon--amber">
                <IconPackage />
              </span>
            </div>
            <div className="bp-kpi__value">{s.products_sold ?? 0}</div>
            <Delta value={s.products_sold_delta_pct} />
          </div>
          <div className="bp-kpi">
            <div className="bp-kpi__top">
              <span className="bp-kpi__label">Ticket promedio</span>
              <span className="bp-kpi__icon">
                <IconTrending />
              </span>
            </div>
            <div className="bp-kpi__value">{money(s.average_ticket)}</div>
            <Delta value={s.average_ticket_delta_pct} />
          </div>
          <div className="bp-kpi">
            <div className="bp-kpi__top">
              <span className="bp-kpi__label">Ocupación</span>
              <span className="bp-kpi__icon bp-kpi__icon--teal">
                <IconActivity />
              </span>
            </div>
            <div className="bp-kpi__value">{pct(s.occupancy_rate)}</div>
            <Delta value={s.occupancy_delta_pct} />
          </div>
        </div>
        <p className="bp-meta-note">{data.meta.currency_note}</p>
      </section>

      <div className="bp-grid-2">
        {/* Revenue chart */}
        <div className="bp-card">
          <div className="bp-card__header">
            <div>
              <h3 className="bp-card__title">Rendimiento</h3>
              <p className="bp-card__subtitle">{chartLabel} en el periodo seleccionado</p>
            </div>
            <div className="bp-chart-tabs">
              {(
                [
                  ["revenue", "Ingresos"],
                  ["appointments", "Citas"],
                  ["average_ticket", "Ticket"],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  className={chartMetric === key ? "is-active" : ""}
                  onClick={() => setChartMetric(key)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="bp-card__body">
            <Sparkline series={data.series} metric={chartMetric} />
          </div>
        </div>

        {/* Breakdown + quick actions */}
        <div style={{ display: "grid", gap: 16, alignContent: "start" }}>
          <div className="bp-card">
            <div className="bp-card__header">
              <div>
                <h3 className="bp-card__title">Desglose de ingresos</h3>
                <p className="bp-card__subtitle">Cómo se compone el dinero del periodo</p>
              </div>
            </div>
            <div className="bp-card__body">
              <div className="bp-breakdown">
                {data.revenue_breakdown.map((row) => (
                  <div className="bp-breakdown__row" key={row.key}>
                    <div className="bp-breakdown__meta">
                      <span>
                        {row.label}
                        {!row.available ? (
                          <span className="bp-breakdown__muted"> · próximamente</span>
                        ) : null}
                      </span>
                      <strong>{row.available ? moneyExact(row.amount) : "—"}</strong>
                    </div>
                    <div className="bp-stock-bar">
                      <div
                        className="bp-stock-bar__fill"
                        style={{ width: `${row.available ? Math.min(100, row.pct) : 0}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bp-card">
            <div className="bp-card__header">
              <h3 className="bp-card__title">Acciones rápidas</h3>
            </div>
            <div className="bp-card__body" style={{ paddingTop: 14 }}>
              <div className="bp-quick-actions">
                <Link to="/shop/appointments" className="bp-quick-action">
                  <span className="bp-quick-action__icon">
                    <IconPlus />
                  </span>
                  Nueva cita
                  <span className="bp-quick-action__arrow">
                    <IconChevronRight />
                  </span>
                </Link>
                <Link to="/shop/customers" className="bp-quick-action">
                  <span className="bp-quick-action__icon">
                    <IconUsers />
                  </span>
                  Agregar cliente
                  <span className="bp-quick-action__arrow">
                    <IconChevronRight />
                  </span>
                </Link>
                <Link to="/shop/inventory" className="bp-quick-action">
                  <span className="bp-quick-action__icon">
                    <IconPackage />
                  </span>
                  Inventario
                  <span className="bp-quick-action__arrow">
                    <IconChevronRight />
                  </span>
                </Link>
                <Link to="/shop/services" className="bp-quick-action">
                  <span className="bp-quick-action__icon">
                    <IconScissors />
                  </span>
                  Servicios
                  <span className="bp-quick-action__arrow">
                    <IconChevronRight />
                  </span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Top services */}
      <section className="bp-card">
        <div className="bp-card__header">
          <div>
            <h3 className="bp-section-title">Servicios top</h3>
            <p className="bp-section-sub">Lo que más se agenda y lo que más dinero genera</p>
          </div>
          <Link to="/shop/services" className="bp-btn bp-btn--ghost bp-btn--sm">
            Ver servicios
            <IconChevronRight />
          </Link>
        </div>
        <div className="bp-card__body">
          {data.top_services.length === 0 ? (
            <div className="bp-empty" style={{ padding: "24px 0" }}>
              <div className="bp-empty__title">Sin servicios en este periodo</div>
              <div className="bp-empty__text">Cuando completes citas, aparecerán ranking y tendencias.</div>
            </div>
          ) : (
            <div className="bp-svc-grid">
              {data.top_services.map((svc) => (
                <div className="bp-svc-card" key={svc.service_type_id}>
                  <p className="bp-svc-card__name">{svc.name}</p>
                  <div className="bp-svc-card__rev">{money(svc.revenue)}</div>
                  <div className="bp-svc-card__meta">
                    <span>{svc.bookings} reservas</span>
                    <span>·</span>
                    <span>{svc.avg_duration} min</span>
                    {svc.trend_pct != null ? (
                      <>
                        <span>·</span>
                        <span style={{ color: svc.trend_pct >= 0 ? "var(--bp-success)" : "var(--bp-danger)" }}>
                          {svc.trend_pct >= 0 ? "+" : ""}
                          {svc.trend_pct}%
                        </span>
                      </>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Staff */}
      <section className="bp-card">
        <div className="bp-card__header">
          <div>
            <h3 className="bp-section-title">Rendimiento del equipo</h3>
            <p className="bp-section-sub">Quién mueve la agenda — y el ingreso</p>
          </div>
          <Link to="/shop/staff" className="bp-btn bp-btn--ghost bp-btn--sm">
            <IconTeam />
            Equipo
          </Link>
        </div>
        <div className="bp-card__body">
          <div className="bp-staff-grid">
            {data.staff_performance.map((st) => (
              <div className="bp-staff-card" key={st.employee_id}>
                <div className="bp-staff-card__head">
                  <div className="bp-avatar">{initials(st.display_name)}</div>
                  <div>
                    <p className="bp-staff-card__name">{st.display_name}</p>
                    <div className="bp-staff-card__meta">
                      {st.completion_rate != null ? `${st.completion_rate}% completadas` : "Sin citas"}
                    </div>
                  </div>
                  <span className="bp-rank">#{st.rank}</span>
                </div>
                <div className="bp-staff-stats">
                  <div>
                    <span>Ingresos</span>
                    <strong>{money(st.revenue)}</strong>
                  </div>
                  <div>
                    <span>Citas OK</span>
                    <strong>{st.appointments_completed}</strong>
                  </div>
                  <div>
                    <span>Ticket</span>
                    <strong>{money(st.average_ticket)}</strong>
                  </div>
                  <div>
                    <span>Ocupación</span>
                    <strong>{pct(st.occupancy)}</strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Customers + health */}
      <div className="bp-grid-2">
        <section className="bp-card">
          <div className="bp-card__header">
            <div>
              <h3 className="bp-section-title">Clientes</h3>
              <p className="bp-section-sub">Crecimiento, lealtad y riesgo de abandono</p>
            </div>
          </div>
          <div className="bp-card__body">
            <div className="bp-insight-grid">
              <div className="bp-metric-tile">
                <div className="bp-metric-tile__label">Nuevos</div>
                <div className="bp-metric-tile__value">{data.customers.new}</div>
              </div>
              <div className="bp-metric-tile">
                <div className="bp-metric-tile__label">Recurrentes</div>
                <div className="bp-metric-tile__value">{data.customers.returning}</div>
              </div>
              <div className="bp-metric-tile">
                <div className="bp-metric-tile__label">Retención</div>
                <div className="bp-metric-tile__value">{pct(data.customers.retention_pct)}</div>
              </div>
              <div className="bp-metric-tile">
                <div className="bp-metric-tile__label">Frecuencia media</div>
                <div className="bp-metric-tile__value">{data.customers.avg_visit_frequency}</div>
                <div className="bp-metric-tile__hint">visitas / cliente</div>
              </div>
              <div className="bp-metric-tile">
                <div className="bp-metric-tile__label">Inactivos 30d</div>
                <div className="bp-metric-tile__value">{data.customers.inactive_30}</div>
              </div>
              <div className="bp-metric-tile">
                <div className="bp-metric-tile__label">Inactivos 60d</div>
                <div className="bp-metric-tile__value">{data.customers.inactive_60}</div>
              </div>
              <div className="bp-metric-tile">
                <div className="bp-metric-tile__label">Inactivos 90d</div>
                <div className="bp-metric-tile__value">{data.customers.inactive_90}</div>
              </div>
              <div className="bp-metric-tile">
                <div className="bp-metric-tile__label">Valor medio</div>
                <div className="bp-metric-tile__value">{money(data.customers.average_customer_value)}</div>
              </div>
            </div>
            <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
              {data.customers.highest_spending ? (
                <div className="bp-obs__item">
                  <span className="bp-obs__dot bp-obs__dot--positive" />
                  Mayor gasto: <strong style={{ marginLeft: 4 }}>{data.customers.highest_spending.name}</strong>
                  <span className="bp-cell-muted" style={{ marginLeft: "auto" }}>
                    {moneyExact(data.customers.highest_spending.amount)}
                  </span>
                </div>
              ) : null}
              {data.customers.most_loyal ? (
                <div className="bp-obs__item">
                  <span className="bp-obs__dot bp-obs__dot--info" />
                  Más leal: <strong style={{ marginLeft: 4 }}>{data.customers.most_loyal.name}</strong>
                  <span className="bp-cell-muted" style={{ marginLeft: "auto" }}>
                    {data.customers.most_loyal.visits} visitas
                  </span>
                </div>
              ) : null}
            </div>
          </div>
        </section>

        <section className="bp-card">
          <div className="bp-card__header">
            <div>
              <h3 className="bp-section-title">Salud del negocio</h3>
              <p className="bp-section-sub">Una lectura rápida de cómo vas</p>
            </div>
            <span className="bp-badge bp-badge--primary">
              <IconHeart style={{ width: 12, height: 12 }} />
              {data.health.label}
            </span>
          </div>
          <div className="bp-card__body">
            <div className="bp-health">
              <div className="bp-health__score">
                <strong>{data.health.score}</strong>
                <span>de 100</span>
              </div>
              <div className="bp-obs">
                {data.health.observations.map((o) => (
                  <div className="bp-obs__item" key={o.text}>
                    <span className={`bp-obs__dot bp-obs__dot--${o.tone}`} />
                    {o.text}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Inventory */}
      <section className="bp-card">
        <div className="bp-card__header">
          <div>
            <h3 className="bp-section-title">Inventario · valor en anaquel</h3>
            <p className="bp-section-sub">Cuánto dinero tienes parado — y cuánto puedes recuperar</p>
          </div>
          <Link to="/shop/inventory" className="bp-btn bp-btn--ghost bp-btn--sm">
            Revisar stock
            <IconChevronRight />
          </Link>
        </div>
        <div className="bp-card__body">
          <div className="bp-inv-hero">
            <div className="bp-inv-hero__card">
              <span>Costo de inventario</span>
              <strong>{money(data.inventory.inventory_cost)}</strong>
            </div>
            <div className="bp-inv-hero__card">
              <span>Ingreso potencial</span>
              <strong>{money(data.inventory.potential_revenue)}</strong>
            </div>
            <div className="bp-inv-hero__card bp-inv-hero__card--accent">
              <span>Margen bruto proyectado</span>
              <strong>{money(data.inventory.projected_gross_profit)}</strong>
            </div>
          </div>
          <div className="bp-insight-grid" style={{ marginTop: 14 }}>
            <div className="bp-metric-tile">
              <div className="bp-metric-tile__label">Unidades en stock</div>
              <div className="bp-metric-tile__value">{data.inventory.products_remaining}</div>
            </div>
            <div className="bp-metric-tile">
              <div className="bp-metric-tile__label">Vendidas (periodo)</div>
              <div className="bp-metric-tile__value">{data.inventory.products_sold ?? 0}</div>
            </div>
            <div className="bp-metric-tile">
              <div className="bp-metric-tile__label">Ingreso productos</div>
              <div className="bp-metric-tile__value">{money(data.inventory.product_revenue ?? 0)}</div>
            </div>
            <div className="bp-metric-tile">
              <div className="bp-metric-tile__label">Margen productos</div>
              <div className="bp-metric-tile__value">{money(data.inventory.product_gross_profit ?? 0)}</div>
            </div>
            <div className="bp-metric-tile">
              <div className="bp-metric-tile__label">Stock bajo</div>
              <div className="bp-metric-tile__value">{data.inventory.low_stock.length}</div>
            </div>
            <div className="bp-metric-tile">
              <div className="bp-metric-tile__label">Agotados</div>
              <div className="bp-metric-tile__value">{data.inventory.out_of_stock.length}</div>
            </div>
          </div>
          {data.inventory.best_selling_product ? (
            <div className="bp-obs__item" style={{ marginTop: 14 }}>
              <span className="bp-obs__dot bp-obs__dot--positive" />
              Más vendido: <strong style={{ marginLeft: 4 }}>{data.inventory.best_selling_product.name}</strong>
              <span className="bp-cell-muted" style={{ marginLeft: "auto" }}>
                {data.inventory.best_selling_product.units} uds ·{" "}
                {moneyExact(data.inventory.best_selling_product.revenue)}
              </span>
            </div>
          ) : null}
          {(data.inventory.low_stock.length > 0 || data.inventory.out_of_stock.length > 0) && (
            <div style={{ display: "grid", gap: 8, marginTop: 14 }}>
              {data.inventory.out_of_stock.slice(0, 4).map((p) => (
                <div className="bp-obs__item" key={p.id}>
                  <span className="bp-obs__dot bp-obs__dot--danger" />
                  Sin stock: {p.name}
                </div>
              ))}
              {data.inventory.low_stock.slice(0, 4).map((p) => (
                <div className="bp-obs__item" key={p.id}>
                  <span className="bp-obs__dot bp-obs__dot--warning" />
                  Bajo: {p.name} ({p.stock}/{p.min_stock})
                </div>
              ))}
            </div>
          )}
          <p className="bp-meta-note">{data.inventory.note}</p>
        </div>
      </section>

      {/* Projections + goals */}
      <div className="bp-grid-2">
        <section className="bp-card">
          <div className="bp-card__header">
            <div>
              <h3 className="bp-section-title">Proyecciones</h3>
              <p className="bp-section-sub">Estimaciones · no son facturación cerrada</p>
            </div>
            <span className="bp-badge bp-badge--warning">Estimado</span>
          </div>
          <div className="bp-card__body">
            <div className="bp-insight-grid">
              <div className="bp-metric-tile">
                <div className="bp-metric-tile__label">Hoy</div>
                <div className="bp-metric-tile__value">{money(data.projections.today)}</div>
              </div>
              <div className="bp-metric-tile">
                <div className="bp-metric-tile__label">Esta semana</div>
                <div className="bp-metric-tile__value">{money(data.projections.week)}</div>
              </div>
              <div className="bp-metric-tile">
                <div className="bp-metric-tile__label">Este mes</div>
                <div className="bp-metric-tile__value">{money(data.projections.month)}</div>
              </div>
              <div className="bp-metric-tile">
                <div className="bp-metric-tile__label">Este año</div>
                <div className="bp-metric-tile__value">{money(data.projections.year)}</div>
              </div>
            </div>
            <p className="bp-meta-note">{data.projections.note}</p>
          </div>
        </section>

        <section className="bp-card">
          <div className="bp-card__header">
            <div>
              <h3 className="bp-section-title">Metas del mes</h3>
              <p className="bp-section-sub">Objetivos que motivan al equipo</p>
            </div>
            {admin ? (
              <button type="button" className="bp-btn bp-btn--secondary bp-btn--sm" onClick={() => setGoalsOpen(true)}>
                <IconTarget />
                Editar
              </button>
            ) : null}
          </div>
          <div className="bp-card__body">
            {(
              [
                ["monthly_revenue", "Ingresos", true],
                ["monthly_appointments", "Citas", false],
                ["monthly_new_customers", "Clientes nuevos", false],
                ["monthly_product_sales", "Ventas de producto", true],
              ] as const
            ).map(([key, label, isMoney]) => {
              const g = data.goals_progress[key];
              if (!g) return null;
              const done = g.pct >= 100;
              const width = Math.min(100, Math.max(0, g.pct));
              return (
                <div className="bp-goal" key={key}>
                  <div className="bp-goal__head">
                    <span>{label}</span>
                    <span className="bp-cell-muted">
                      {isMoney ? money(g.current) : g.current}
                      {" / "}
                      {isMoney ? money(g.target) : g.target}
                      {g.available === false ? " · pronto" : ""}
                    </span>
                  </div>
                  <div className="bp-goal__bar">
                    <div
                      className={`bp-goal__fill ${done ? "bp-goal__fill--done" : ""}`}
                      style={{ width: `${width}%` }}
                    />
                  </div>
                  {done ? <div className="bp-goal__celebrate">Meta alcanzada 🎉</div> : null}
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* Insights + upcoming + AI ready */}
      <div className="bp-grid-2">
        <section className="bp-card">
          <div className="bp-card__header">
            <div>
              <h3 className="bp-section-title">Insights automáticos</h3>
              <p className="bp-section-sub">Señales que valen la pena leer esta mañana</p>
            </div>
            <span className="bp-badge bp-badge--primary">
              <IconLightbulb style={{ width: 12, height: 12 }} />
              Auto
            </span>
          </div>
          <div className="bp-card__body">
            <ul className="bp-insight-list" style={{ margin: 0, padding: 0 }}>
              {data.insights.map((t) => (
                <li key={t}>
                  <IconSparkles style={{ width: 16, height: 16 }} />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
            <div className="bp-ai-strip" style={{ marginTop: 16 }}>
              <IconSparkles style={{ width: 18, height: 18, color: "var(--bp-primary)", flexShrink: 0 }} />
              <div>
                <strong>Listo para IA.</strong> Pronto podrás preguntar: “¿Por qué bajaron los
                ingresos?”, “¿Qué debo reordenar?” o “¿Quién es el barbero más rentable?” — sin
                cambiar esta experiencia.
              </div>
            </div>
          </div>
        </section>

        <section className="bp-card">
          <div className="bp-card__header">
            <div>
              <h3 className="bp-section-title">Próximas citas</h3>
              <p className="bp-section-sub">Lo que viene en tu agenda</p>
            </div>
            <Link to="/shop/appointments" className="bp-btn bp-btn--ghost bp-btn--sm">
              Agenda
              <IconChevronRight />
            </Link>
          </div>
          <div className="bp-card__body" style={{ paddingTop: 8 }}>
            {data.upcoming_appointments.length === 0 ? (
              <div className="bp-empty" style={{ padding: "20px 0" }}>
                <div className="bp-empty__title">Agenda libre</div>
                <div className="bp-empty__text">No hay citas próximas. Es buen momento para llenar huecos.</div>
              </div>
            ) : (
              <div className="bp-appt-list">
                {data.upcoming_appointments.map((a) => (
                  <div className="bp-appt-card" key={a.id}>
                    <div className="bp-appt-card__rail bp-appt-card__rail--scheduled" />
                    <div>
                      <div className="bp-appt-card__time">
                        {a.start_time
                          ? new Date(a.start_time).toLocaleString("es-MX", {
                              weekday: "short",
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "—"}
                      </div>
                      <div className="bp-appt-card__client">{a.client_name}</div>
                      {a.service_name ? (
                        <div className="bp-cell-muted" style={{ fontSize: 12, marginTop: 2 }}>
                          {a.service_name}
                        </div>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      {goalsOpen ? (
        <div className="bp-panel__overlay" onClick={() => setGoalsOpen(false)}>
          <div
            className="bp-panel"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="Editar metas"
          >
            <div className="bp-panel__header">
              <div>
                <h2 className="bp-panel__title">Metas mensuales</h2>
                <p className="bp-panel__subtitle">Define lo que quieres lograr este mes</p>
              </div>
              <button type="button" className="bp-icon-btn" onClick={() => setGoalsOpen(false)}>
                ×
              </button>
            </div>
            <div className="bp-panel__body">
              <div className="bp-field">
                <label className="bp-label">Ingresos mensuales</label>
                <input
                  className="bp-input"
                  type="number"
                  min={0}
                  value={goalForm.monthly_revenue}
                  onChange={(e) =>
                    setGoalForm((f) => ({ ...f, monthly_revenue: Number(e.target.value) || 0 }))
                  }
                />
              </div>
              <div className="bp-field">
                <label className="bp-label">Citas mensuales</label>
                <input
                  className="bp-input"
                  type="number"
                  min={0}
                  value={goalForm.monthly_appointments}
                  onChange={(e) =>
                    setGoalForm((f) => ({
                      ...f,
                      monthly_appointments: Number(e.target.value) || 0,
                    }))
                  }
                />
              </div>
              <div className="bp-field">
                <label className="bp-label">Clientes nuevos</label>
                <input
                  className="bp-input"
                  type="number"
                  min={0}
                  value={goalForm.monthly_new_customers}
                  onChange={(e) =>
                    setGoalForm((f) => ({
                      ...f,
                      monthly_new_customers: Number(e.target.value) || 0,
                    }))
                  }
                />
              </div>
              <div className="bp-field">
                <label className="bp-label">Ventas de producto (cuando exista POS)</label>
                <input
                  className="bp-input"
                  type="number"
                  min={0}
                  value={goalForm.monthly_product_sales}
                  onChange={(e) =>
                    setGoalForm((f) => ({
                      ...f,
                      monthly_product_sales: Number(e.target.value) || 0,
                    }))
                  }
                />
              </div>
            </div>
            <div className="bp-panel__footer">
              <button type="button" className="bp-btn bp-btn--secondary" onClick={() => setGoalsOpen(false)}>
                Cancelar
              </button>
              <button
                type="button"
                className="bp-btn bp-btn--primary"
                disabled={savingGoals}
                onClick={() => void saveGoals()}
              >
                {savingGoals ? "Guardando…" : "Guardar metas"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
