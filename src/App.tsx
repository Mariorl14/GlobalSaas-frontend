import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import axios from "axios";
import { Menu } from "./components/super-admin/Menu.tsx";
import type { MenuItem } from "./components/super-admin/Menu.tsx";
import { session } from "./auth/session";
import { isShopUser, isSuperAdmin } from "./auth/roles";
import {
  IconSearch,
  IconBell,
  IconLogout,
  IconCalendar,
  IconScissors,
  IconPayments,
  IconAnalytics,
  IconSettings,
} from "./components/super-admin/icons.tsx";
import "./components/super-admin/super-admin.css";
import { BookingErrorBoundary } from "./public-booking/BookingErrorBoundary.tsx";
import { RouteFallback } from "./RouteFallback.tsx";
import { API_BASE_URL } from "./config";

const AuthView = lazy(() =>
  import("./components/auth/AuthView.tsx").then((m) => ({ default: m.AuthView })),
);
const ShopLoginView = lazy(() =>
  import("./shop/ShopLoginView.tsx").then((m) => ({ default: m.ShopLoginView })),
);
const ShopLayout = lazy(() =>
  import("./shop/ShopLayout.tsx").then((m) => ({ default: m.ShopLayout })),
);
const DashboardPage = lazy(() =>
  import("./shop/pages/DashboardPage.tsx").then((m) => ({ default: m.DashboardPage })),
);
const CalendarPage = lazy(() =>
  import("./shop/pages/CalendarPage.tsx").then((m) => ({ default: m.CalendarPage })),
);
const AppointmentsPage = lazy(() =>
  import("./shop/pages/AppointmentsPage.tsx").then((m) => ({ default: m.AppointmentsPage })),
);
const CustomersPage = lazy(() =>
  import("./shop/pages/CustomersPage.tsx").then((m) => ({ default: m.CustomersPage })),
);
const ServicesPage = lazy(() =>
  import("./shop/pages/ServicesPage.tsx").then((m) => ({ default: m.ServicesPage })),
);
const InventoryPage = lazy(() =>
  import("./shop/pages/InventoryPage.tsx").then((m) => ({ default: m.InventoryPage })),
);
const SalesPage = lazy(() =>
  import("./shop/pages/SalesPage.tsx").then((m) => ({ default: m.SalesPage })),
);
const StaffPage = lazy(() =>
  import("./shop/pages/StaffPage.tsx").then((m) => ({ default: m.StaffPage })),
);
const SettingsPage = lazy(() =>
  import("./shop/pages/SettingsPage.tsx").then((m) => ({ default: m.SettingsPage })),
);
const PublicBarberBookingPage = lazy(() =>
  import("./public-booking/PublicBarberBookingPage.tsx").then((m) => ({
    default: m.PublicBarberBookingPage,
  })),
);
const RescheduleConfirmPage = lazy(() =>
  import("./public-booking/RescheduleConfirmPage.tsx").then((m) => ({
    default: m.RescheduleConfirmPage,
  })),
);
const Business = lazy(() =>
  import("./components/super-admin/Business.tsx").then((m) => ({ default: m.Business })),
);
const Plans = lazy(() =>
  import("./components/super-admin/Plans.tsx").then((m) => ({ default: m.Plans })),
);
const Users = lazy(() =>
  import("./components/super-admin/Users.tsx").then((m) => ({ default: m.Users })),
);
const Dashboard = lazy(() =>
  import("./components/super-admin/Dashboard.tsx").then((m) => ({ default: m.Dashboard })),
);

function Lazy({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<RouteFallback />}>{children}</Suspense>;
}

function PostLoginRedirect() {
  const u = session.getUser();
  if (isSuperAdmin(u)) return <Navigate to="/super-admin" replace />;
  if (isShopUser(u)) return <Navigate to="/shop/dashboard" replace />;
  return <Navigate to="/login" replace />;
}

type PageMeta = { title: string; subtitle: string };

const PAGE_META: Record<MenuItem, PageMeta> = {
  dashboard: {
    title: "Panel general",
    subtitle: "Resumen y métricas de todos los negocios en la plataforma.",
  },
  shops: {
    title: "Negocios",
    subtitle: "Administra todos los negocios registrados en la plataforma.",
  },
  users: {
    title: "Usuarios",
    subtitle: "Gestiona administradores y personal de cada negocio.",
  },
  appointments: {
    title: "Citas",
    subtitle: "Monitorea el volumen de reservas y gestiona incidencias.",
  },
  services: {
    title: "Servicios",
    subtitle: "Administra servicios predeterminados y plantillas globales.",
  },
  subscriptions: {
    title: "Suscripciones",
    subtitle: "Define los planes de suscripción disponibles para los negocios.",
  },
  payments: {
    title: "Pagos",
    subtitle: "Revisa cobros, facturas y el estado del proveedor de pagos.",
  },
  analytics: {
    title: "Analítica",
    subtitle: "Analiza crecimiento, retención y rendimiento por negocio.",
  },
  settings: {
    title: "Configuración",
    subtitle: "Controla preferencias globales, marca e integraciones.",
  },
  logout: {
    title: "Cerrar sesión",
    subtitle: "Redirigiendo a la pantalla de autenticación...",
  },
};

const SECTION_LABEL: Record<MenuItem, string> = {
  dashboard: "General",
  shops: "Gestión",
  users: "Gestión",
  appointments: "Gestión",
  services: "Gestión",
  subscriptions: "Facturación",
  payments: "Facturación",
  analytics: "Facturación",
  settings: "Sistema",
  logout: "Sistema",
};

function ComingSoon({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="sa-card">
      <div className="sa-empty">
        <div className="sa-empty__icon">{icon}</div>
        <div className="sa-empty__title">{title}</div>
        <div className="sa-empty__text">{text}</div>
        <span className="sa-badge sa-badge--primary" style={{ marginTop: 4 }}>
          Próximamente
        </span>
      </div>
    </div>
  );
}

function DashboardLayout({
  isAuthenticated,
  onLogout,
}: {
  isAuthenticated: boolean;
  onLogout: () => void;
}) {
  const navigate = useNavigate();
  const [message, setMessage] = useState("");
  const [activeItem, setActiveItem] = useState<MenuItem>("dashboard");
  const [collapsed, setCollapsed] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    const u = session.getUser();
    if (!isSuperAdmin(u)) return;
    if (activeItem === "logout") {
      onLogout();
      navigate("/login", { replace: true });
      return;
    }
    axios.get(`${API_BASE_URL}/api/health`).then((res) => {
      setMessage(res.data.status);
    });
  }, [activeItem, isAuthenticated, navigate, onLogout]);

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

  const renderContent = () => {
    switch (activeItem) {
      case "dashboard":
        return (
          <Lazy>
            <Dashboard onNavigate={setActiveItem} health={message} />
          </Lazy>
        );
      case "shops":
        return (
          <Lazy>
            <Business />
          </Lazy>
        );
      case "users":
        return (
          <Lazy>
            <Users />
          </Lazy>
        );
      case "subscriptions":
        return (
          <Lazy>
            <Plans />
          </Lazy>
        );
      case "appointments":
        return (
          <ComingSoon
            icon={<IconCalendar />}
            title="Citas de la plataforma"
            text="Monitorea el volumen de reservas y gestiona incidencias entre todos los negocios."
          />
        );
      case "services":
        return (
          <ComingSoon
            icon={<IconScissors />}
            title="Catálogo de servicios"
            text="Administra servicios predeterminados y plantillas globales."
          />
        );
      case "payments":
        return (
          <ComingSoon
            icon={<IconPayments />}
            title="Pagos"
            text="Revisa cobros, facturas y el estado del proveedor de pagos."
          />
        );
      case "analytics":
        return (
          <ComingSoon
            icon={<IconAnalytics />}
            title="Analítica"
            text="Analiza crecimiento, retención y rendimiento por negocio."
          />
        );
      case "settings":
        return (
          <ComingSoon
            icon={<IconSettings />}
            title="Configuración de la plataforma"
            text="Controla preferencias globales, marca e integraciones."
          />
        );
      case "logout":
        return (
          <ComingSoon
            icon={<IconLogout />}
            title="Cerrando sesión"
            text="Redirigiendo a la pantalla de autenticación..."
          />
        );
      default:
        return null;
    }
  };

  if (!isAuthenticated) return null;

  const u = session.getUser();
  if (!isSuperAdmin(u)) {
    return <Navigate to="/shop/dashboard" replace />;
  }

  const meta = PAGE_META[activeItem];
  const email = u?.email ?? "admin@barber.app";
  const initials = email.slice(0, 2).toUpperCase();

  return (
    <div className="sa-app">
      <div className="sa-shell">
        <Menu
          activeItem={activeItem}
          onChange={setActiveItem}
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed((c) => !c)}
        />

        <div className="sa-main">
          <header className="sa-topbar">
            <nav className="sa-breadcrumb">
              <span>{SECTION_LABEL[activeItem]}</span>
              <span className="sa-breadcrumb__sep">/</span>
              <span className="sa-breadcrumb__current">{meta.title}</span>
            </nav>

            <div className="sa-search">
              <IconSearch />
              <input type="text" placeholder="Buscar en la plataforma…" aria-label="Buscar" />
            </div>

            <div className="sa-topbar__spacer" />

            <div className="sa-topbar__actions">
              <button className="sa-icon-btn" type="button" aria-label="Notificaciones">
                <IconBell />
                <span className="sa-icon-btn__dot" />
              </button>

              <div className="sa-dropdown" ref={profileRef}>
                <button
                  type="button"
                  className="sa-profile"
                  onClick={() => setProfileOpen((o) => !o)}
                >
                  <span className="sa-profile__avatar">{initials}</span>
                  <span className="sa-profile__meta">
                    <span className="sa-profile__name">{email}</span>
                    <span className="sa-profile__role">Super Admin</span>
                  </span>
                </button>
                {profileOpen ? (
                  <div className="sa-menu">
                    <div className="sa-menu__header">
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{email}</div>
                      <div style={{ fontSize: 12, color: "var(--sa-text-tertiary)" }}>
                        Super Admin
                      </div>
                    </div>
                    <button
                      type="button"
                      className="sa-menu__item"
                      onClick={() => {
                        setProfileOpen(false);
                        setActiveItem("settings");
                      }}
                    >
                      <IconSettings />
                      Configuración
                    </button>
                    <button
                      type="button"
                      className="sa-menu__item sa-menu__item--danger"
                      onClick={() => {
                        setProfileOpen(false);
                        setActiveItem("logout");
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

          <main className="sa-content">
            <div className="sa-page__head">
              <div>
                <h1 className="sa-page__title">{meta.title}</h1>
                <p className="sa-page__subtitle">{meta.subtitle}</p>
              </div>
            </div>
            {renderContent()}
          </main>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(
    () => Boolean(session.getToken()),
  );

  useEffect(() => {
    const token = session.getToken();
    if (token) {
      axios.defaults.headers.common.Authorization = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common.Authorization;
    }
  }, [isAuthenticated]);

  const handleAuthSuccess = () => {
    const token = session.getToken();
    if (token) {
      axios.defaults.headers.common.Authorization = `Bearer ${token}`;
    }
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    session.clearAll();
    delete axios.defaults.headers.common.Authorization;
    setIsAuthenticated(false);
  };

  return (
    <Routes>
      <Route
        path="/"
        element={
          !isAuthenticated ? (
            <Navigate to="/login" replace />
          ) : (
            <PostLoginRedirect />
          )
        }
      />
      <Route
        path="/signup"
        element={
          isAuthenticated ? (
            <PostLoginRedirect />
          ) : (
            <Lazy>
              <AuthView mode="signup" onAuthSuccess={handleAuthSuccess} />
            </Lazy>
          )
        }
      />
      <Route
        path="/login"
        element={
          isAuthenticated ? (
            <PostLoginRedirect />
          ) : (
            <Lazy>
              <AuthView mode="signin" onAuthSuccess={handleAuthSuccess} />
            </Lazy>
          )
        }
      />
      <Route
        path="/shop/login"
        element={
          isAuthenticated && isShopUser(session.getUser()) ? (
            <Navigate to="/shop/dashboard" replace />
          ) : isAuthenticated && isSuperAdmin(session.getUser()) ? (
            <Navigate to="/super-admin" replace />
          ) : (
            <Lazy>
              <ShopLoginView onAuthSuccess={handleAuthSuccess} />
            </Lazy>
          )
        }
      />
      <Route
        path="/super-admin"
        element={
          isAuthenticated ? (
            <DashboardLayout
              isAuthenticated={isAuthenticated}
              onLogout={handleLogout}
            />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route
        path="/shop"
        element={
          isAuthenticated ? (
            <Lazy>
              <ShopLayout onLogout={handleLogout} />
            </Lazy>
          ) : (
            <Navigate to="/shop/login" replace />
          )
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route
          path="dashboard"
          element={
            <Lazy>
              <DashboardPage />
            </Lazy>
          }
        />
        <Route
          path="calendar"
          element={
            <Lazy>
              <CalendarPage />
            </Lazy>
          }
        />
        <Route
          path="appointments"
          element={
            <Lazy>
              <AppointmentsPage />
            </Lazy>
          }
        />
        <Route
          path="customers"
          element={
            <Lazy>
              <CustomersPage />
            </Lazy>
          }
        />
        <Route
          path="services"
          element={
            <Lazy>
              <ServicesPage />
            </Lazy>
          }
        />
        <Route
          path="inventory"
          element={
            <Lazy>
              <InventoryPage />
            </Lazy>
          }
        />
        <Route
          path="sales"
          element={
            <Lazy>
              <SalesPage />
            </Lazy>
          }
        />
        <Route
          path="staff"
          element={
            <Lazy>
              <StaffPage />
            </Lazy>
          }
        />
        <Route
          path="settings"
          element={
            <Lazy>
              <SettingsPage />
            </Lazy>
          }
        />
      </Route>
      <Route path="/dashboard" element={<Navigate to="/super-admin" replace />} />
      <Route
        path="/book/:businessSlug"
        element={
          <BookingErrorBoundary>
            <Lazy>
              <PublicBarberBookingPage />
            </Lazy>
          </BookingErrorBoundary>
        }
      />
      <Route
        path="/appointment/reschedule/confirm/:token"
        element={
          <Lazy>
            <RescheduleConfirmPage />
          </Lazy>
        }
      />
    </Routes>
  );
}

export default App;
