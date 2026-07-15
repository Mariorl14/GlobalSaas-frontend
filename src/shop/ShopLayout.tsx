import { useEffect, useRef, useState } from "react";
import { NavLink, Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import { session } from "../auth/session";
import { isShopUser, isSuperAdmin } from "../auth/roles";
import { API_BASE_URL } from "../config";
import { mediaUrl } from "../mediaUrl";
import { syncAppointmentIds } from "./appointmentAlerts";
import {
  IconDashboard,
  IconCalendar,
  IconUsers,
  IconScissors,
  IconPackage,
  IconTeam,
  IconSettings,
  IconSearch,
  IconBell,
  IconLogout,
  IconChevronLeft,
  IconPlus,
  IconDollar,
  IconActivity,
} from "./icons";
import { unlockShopAudio } from "./sound";
import "./shop.css";

type BizBrief = {
  name: string;
  logo_url: string | null;
};

const NAV_GROUPS: {
  label: string;
  items: { to: string; label: string; icon: React.FC<React.SVGProps<SVGSVGElement>> }[];
}[] = [
  {
    label: "Principal",
    items: [
      { to: "/shop/dashboard", label: "Insights", icon: IconDashboard },
      { to: "/shop/calendar", label: "Calendario", icon: IconActivity },
    ],
  },
  {
    label: "Operación",
    items: [
      { to: "/shop/appointments", label: "Citas", icon: IconCalendar },
      { to: "/shop/customers", label: "Clientes", icon: IconUsers },
      { to: "/shop/services", label: "Servicios", icon: IconScissors },
      { to: "/shop/inventory", label: "Inventario", icon: IconPackage },
      { to: "/shop/sales", label: "Ventas", icon: IconDollar },
    ],
  },
  {
    label: "Negocio",
    items: [
      { to: "/shop/staff", label: "Equipo", icon: IconTeam },
      { to: "/shop/settings", label: "Ajustes", icon: IconSettings },
    ],
  },
];

const PAGE_TITLES: Record<string, string> = {
  "/shop/dashboard": "Insights",
  "/shop/calendar": "Calendario",
  "/shop/appointments": "Citas",
  "/shop/customers": "Clientes",
  "/shop/services": "Servicios",
  "/shop/inventory": "Inventario",
  "/shop/sales": "Ventas",
  "/shop/staff": "Equipo",
  "/shop/settings": "Ajustes",
};

function todayLabel(): string {
  return new Date().toLocaleDateString("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function ShopLayout({ onLogout }: { onLogout: () => void }) {
  const navigate = useNavigate();
  const location = useLocation();
  const user = session.getUser();
  const token = session.getToken();

  const [collapsed, setCollapsed] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [biz, setBiz] = useState<BizBrief | null>(null);
  const profileRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!token) return;
    const refreshBiz = () => {
      void axios
        .get<{ business: BizBrief }>(`${API_BASE_URL}/api/shop/me`)
        .then((res) => setBiz(res.data.business))
        .catch(() => setBiz(null));
    };
    refreshBiz();
    window.addEventListener("bp-business-updated", refreshBiz);
    return () => window.removeEventListener("bp-business-updated", refreshBiz);
  }, [token]);

  // Unlock audio after first interaction (browser autoplay policy).
  useEffect(() => {
    const unlock = () => unlockShopAudio();
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  // Soft chime when a new cita appears (e.g. reserva pública) while the portal is open.
  useEffect(() => {
    if (!token) return;

    let cancelled = false;

    const poll = async () => {
      try {
        const from = new Date();
        from.setDate(from.getDate() - 1);
        from.setHours(0, 0, 0, 0);
        const to = new Date();
        to.setDate(to.getDate() + 14);
        to.setHours(23, 59, 59, 999);
        const res = await axios.get<{ items: { id: string }[] }>(
          `${API_BASE_URL}/api/shop/appointments`,
          {
            params: {
              from: from.toISOString(),
              to: to.toISOString(),
            },
          },
        );
        if (cancelled) return;
        syncAppointmentIds((res.data.items || []).map((a) => a.id));
      } catch {
        /* ignore transient poll errors */
      }
    };

    void poll();
    const timer = window.setInterval(() => void poll(), 20000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [token]);

  useEffect(() => {
    if (!profileOpen) return;
    const onClick = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [profileOpen]);

  if (!token || !user) {
    return <Navigate to="/shop/login" replace />;
  }
  if (isSuperAdmin(user)) {
    return (
      <div className="bp-app" style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 48 }}>
        <div className="bp-card" style={{ padding: 32, textAlign: "center", maxWidth: 420 }}>
          <p style={{ margin: "0 0 16px", color: "var(--bp-text-secondary)" }}>
            Esta área es solo para cuentas de tienda.
          </p>
          <button type="button" className="bp-btn bp-btn--primary" onClick={() => navigate("/super-admin")}>
            Ir al panel plataforma
          </button>
        </div>
      </div>
    );
  }
  if (!isShopUser(user)) {
    return <Navigate to="/shop/login" replace />;
  }

  const display = user.email?.split("@")[0] ?? "Usuario";
  const roleLabel = user.role === "admin" ? "Administrador" : "Staff";
  const initials = (biz?.name || display).slice(0, 2).toUpperCase();
  const pageTitle = PAGE_TITLES[location.pathname] ?? "Panel";
  const shopName = biz?.name || "Tu barbería";

  const handleLogout = () => {
    onLogout();
    navigate("/shop/login", { replace: true });
  };

  return (
    <div className="bp-app">
      <div className="bp-shell">
        <aside className={`bp-sidebar${collapsed ? " bp-sidebar--collapsed" : ""}`}>
          <div className="bp-brand">
            <div className="bp-brand__avatar">
              {mediaUrl(biz?.logo_url) ? (
                <img src={mediaUrl(biz?.logo_url) ?? ""} alt="" />
              ) : (
                initials.charAt(0)
              )}
            </div>
            {!collapsed ? (
              <div className="bp-brand__text">
                <span className="bp-brand__name">{shopName}</span>
                <span className="bp-brand__sub">Portal del negocio</span>
              </div>
            ) : null}
          </div>

          <nav className="bp-nav">
            {NAV_GROUPS.map((group) => (
              <div className="bp-nav-group" key={group.label}>
                <div className="bp-nav-group__label">{group.label}</div>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      title={collapsed ? item.label : undefined}
                      className={({ isActive }) =>
                        `bp-nav-item${isActive ? " bp-nav-item--active" : ""}`
                      }
                    >
                      <span className="bp-nav-item__icon">
                        <Icon />
                      </span>
                      <span>{item.label}</span>
                    </NavLink>
                  );
                })}
              </div>
            ))}
          </nav>

          <div className="bp-sidebar__footer">
            {!collapsed ? (
              <div className="bp-upgrade">
                <p className="bp-upgrade__title">Barber Suite</p>
                <p className="bp-upgrade__text">
                  Gestiona citas, clientes y tu equipo desde un solo lugar.
                </p>
              </div>
            ) : null}
            <button
              type="button"
              className="bp-collapse-btn"
              onClick={() => setCollapsed((c) => !c)}
              title={collapsed ? "Expandir" : "Colapsar"}
            >
              <IconChevronLeft
                style={{
                  transform: collapsed ? "rotate(180deg)" : "none",
                  transition: "transform 0.2s ease",
                }}
              />
              {!collapsed ? <span>Colapsar</span> : null}
            </button>
          </div>
        </aside>

        <div className="bp-main">
          <header className="bp-topbar">
            <nav className="bp-breadcrumb">
              <span>{shopName}</span>
              <span className="bp-breadcrumb__sep">/</span>
              <span className="bp-breadcrumb__current">{pageTitle}</span>
            </nav>

            <div className="bp-search">
              <IconSearch />
              <input type="text" placeholder="Buscar en tu negocio…" aria-label="Buscar" />
            </div>

            <div className="bp-topbar__spacer" />
            <span className="bp-date">{todayLabel()}</span>

            <div className="bp-topbar__actions">
              <button
                type="button"
                className="bp-btn bp-btn--primary bp-btn--sm"
                onClick={() => navigate("/shop/appointments")}
              >
                <IconPlus />
                Nueva cita
              </button>
              <button type="button" className="bp-icon-btn" aria-label="Notificaciones">
                <IconBell />
                <span className="bp-icon-btn__dot" />
              </button>

              <div className="bp-dropdown" ref={profileRef}>
                <button
                  type="button"
                  className="bp-profile"
                  onClick={() => setProfileOpen((o) => !o)}
                >
                  <span className="bp-profile__avatar">{display.slice(0, 2).toUpperCase()}</span>
                  <span className="bp-profile__meta">
                    <span className="bp-profile__name">{display}</span>
                    <span className="bp-profile__role">{roleLabel}</span>
                  </span>
                </button>
                {profileOpen ? (
                  <div className="bp-menu">
                    <div className="bp-menu__header">
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{user.email}</div>
                      <div style={{ fontSize: 12, color: "var(--bp-text-tertiary)" }}>{roleLabel}</div>
                    </div>
                    <button
                      type="button"
                      className="bp-menu__item"
                      onClick={() => {
                        setProfileOpen(false);
                        navigate("/shop/settings");
                      }}
                    >
                      <IconSettings />
                      Ajustes
                    </button>
                    <button
                      type="button"
                      className="bp-menu__item bp-menu__item--danger"
                      onClick={() => {
                        setProfileOpen(false);
                        handleLogout();
                      }}
                    >
                      <IconLogout />
                      Cerrar sesión
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </header>

          <main className="bp-content">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
