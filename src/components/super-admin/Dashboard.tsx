import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import type { MenuItem } from "./Menu";
import {
  IconShop,
  IconUsers,
  IconSubscription,
  IconAnalytics,
  IconPlus,
  IconChevronRight,
  IconTrendUp,
} from "./icons";

const API_BASE_URL = "http://127.0.0.1:5000";

type BusinessRow = {
  id: string;
  name: string;
  is_active: boolean;
  public_slug?: string;
};

type ListResponse<T> = {
  items: T[];
  total: number;
};

interface DashboardProps {
  onNavigate: (item: MenuItem) => void;
  health: string;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate, health }) => {
  const [loading, setLoading] = useState(true);
  const [businessTotal, setBusinessTotal] = useState<number | null>(null);
  const [activeBusinesses, setActiveBusinesses] = useState<number | null>(null);
  const [plansTotal, setPlansTotal] = useState<number | null>(null);
  const [usersTotal, setUsersTotal] = useState<number | null>(null);
  const [recent, setRecent] = useState<BusinessRow[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [bizRes, planRes, usersRes] = await Promise.allSettled([
        axios.get<ListResponse<BusinessRow>>(`${API_BASE_URL}/api/business`, {
          params: { page: 1, per_page: 100 },
        }),
        axios.get<ListResponse<unknown>>(`${API_BASE_URL}/api/plan`, {
          params: { page: 1, per_page: 500 },
        }),
        axios.get(`${API_BASE_URL}/api/users`),
      ]);

      if (bizRes.status === "fulfilled") {
        const data = bizRes.value.data;
        const items = data.items || [];
        setBusinessTotal(data.total ?? items.length);
        setActiveBusinesses(items.filter((b) => b.is_active).length);
        setRecent(items.slice(0, 5));
      }
      if (planRes.status === "fulfilled") {
        const data = planRes.value.data;
        setPlansTotal(data.total ?? (data.items || []).length);
      }
      if (usersRes.status === "fulfilled") {
        const data = usersRes.value.data as { items?: unknown[] } | unknown[];
        const arr = Array.isArray(data)
          ? data
          : Array.isArray(data.items)
          ? data.items
          : [];
        setUsersTotal(arr.length);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const fmt = (n: number | null) => (n === null ? "—" : new Intl.NumberFormat("es-MX").format(n));
  const healthy = health.toLowerCase() === "ok";

  const kpis = useMemo(
    () => [
      {
        label: "Negocios totales",
        value: fmt(businessTotal),
        icon: <IconShop />,
        tone: "",
        delta: activeBusinesses !== null ? `${fmt(activeBusinesses)} activos` : null,
      },
      {
        label: "Usuarios",
        value: fmt(usersTotal),
        icon: <IconUsers />,
        tone: "sa-kpi__icon--teal",
        delta: "Admins y personal",
      },
      {
        label: "Planes activos",
        value: fmt(plansTotal),
        icon: <IconSubscription />,
        tone: "sa-kpi__icon--green",
        delta: "Catálogo de suscripciones",
      },
      {
        label: "Negocios activos",
        value: fmt(activeBusinesses),
        icon: <IconAnalytics />,
        tone: "sa-kpi__icon--amber",
        delta: "En operación",
      },
    ],
    [businessTotal, activeBusinesses, plansTotal, usersTotal],
  );

  return (
    <div>
      <div className="sa-kpi-grid">
        {kpis.map((k) => (
          <div className="sa-kpi" key={k.label}>
            <div className="sa-kpi__top">
              <span className="sa-kpi__label">{k.label}</span>
              <span className={`sa-kpi__icon ${k.tone}`}>{k.icon}</span>
            </div>
            {loading ? (
              <span className="sa-skeleton" style={{ width: "60%", height: 28 }} />
            ) : (
              <div className="sa-kpi__value">{k.value}</div>
            )}
            {k.delta ? (
              <div className="sa-kpi__delta sa-kpi__delta--up">
                <IconTrendUp style={{ width: 13, height: 13 }} />
                {k.delta}
              </div>
            ) : null}
          </div>
        ))}
      </div>

      <div className="sa-grid-2">
        <div className="sa-card">
          <div className="sa-card__header">
            <div>
              <h3 className="sa-card__title">Negocios recientes</h3>
              <p className="sa-card__subtitle">Últimas altas en la plataforma</p>
            </div>
            <button
              type="button"
              className="sa-btn sa-btn--ghost sa-btn--sm"
              onClick={() => onNavigate("shops")}
            >
              Ver todas
              <IconChevronRight />
            </button>
          </div>
          <div className="sa-card__body" style={{ paddingTop: 8, paddingBottom: 8 }}>
            {loading ? (
              <div style={{ display: "grid", gap: 16, padding: "8px 0" }}>
                {[0, 1, 2, 3].map((i) => (
                  <span key={i} className="sa-skeleton" style={{ width: `${80 - i * 8}%` }} />
                ))}
              </div>
            ) : recent.length === 0 ? (
              <div className="sa-empty" style={{ padding: "32px 0" }}>
                <div className="sa-empty__icon">
                  <IconShop />
                </div>
                <div className="sa-empty__title">Sin negocios aún</div>
                <div className="sa-empty__text">
                  Crea el primer negocio para comenzar a operar.
                </div>
              </div>
            ) : (
              <div className="sa-activity">
                {recent.map((b) => (
                  <div className="sa-activity__row" key={b.id}>
                    <div className="sa-activity__avatar">
                      {b.name?.charAt(0).toUpperCase() || "B"}
                    </div>
                    <div className="sa-activity__body">
                      <div className="sa-activity__title">{b.name}</div>
                      <div className="sa-activity__meta">/book/{b.public_slug || "—"}</div>
                    </div>
                    <span
                      className={`sa-badge ${
                        b.is_active ? "sa-badge--success" : "sa-badge--neutral"
                      }`}
                    >
                      <span className="sa-badge__dot" />
                      {b.is_active ? "Activo" : "Inactivo"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: "grid", gap: 16, alignContent: "start" }}>
          <div className="sa-card">
            <div className="sa-card__header">
              <h3 className="sa-card__title">Acciones rápidas</h3>
            </div>
            <div className="sa-card__body" style={{ paddingTop: 16 }}>
              <div className="sa-quick-actions">
                <button
                  type="button"
                  className="sa-quick-action"
                  onClick={() => onNavigate("shops")}
                >
                  <span className="sa-quick-action__icon">
                    <IconPlus />
                  </span>
                  Nuevo negocio
                  <span className="sa-quick-action__arrow">
                    <IconChevronRight />
                  </span>
                </button>
                <button
                  type="button"
                  className="sa-quick-action"
                  onClick={() => onNavigate("users")}
                >
                  <span className="sa-quick-action__icon">
                    <IconUsers />
                  </span>
                  Gestionar usuarios
                  <span className="sa-quick-action__arrow">
                    <IconChevronRight />
                  </span>
                </button>
                <button
                  type="button"
                  className="sa-quick-action"
                  onClick={() => onNavigate("subscriptions")}
                >
                  <span className="sa-quick-action__icon">
                    <IconSubscription />
                  </span>
                  Configurar planes
                  <span className="sa-quick-action__arrow">
                    <IconChevronRight />
                  </span>
                </button>
              </div>
            </div>
          </div>

          <div className="sa-card">
            <div className="sa-card__header">
              <h3 className="sa-card__title">Estado del sistema</h3>
            </div>
            <div className="sa-card__body">
              <div className="sa-health">
                <span
                  className={`sa-health__dot ${
                    healthy ? "sa-health__dot--ok" : health ? "sa-health__dot--down" : ""
                  }`}
                />
                <span>
                  API backend:{" "}
                  <strong style={{ color: "var(--sa-text)" }}>
                    {healthy ? "Operativa" : health || "Comprobando…"}
                  </strong>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
