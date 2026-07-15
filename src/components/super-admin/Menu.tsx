import React from "react";
import {
  IconDashboard,
  IconShop,
  IconUsers,
  IconCalendar,
  IconScissors,
  IconSubscription,
  IconPayments,
  IconAnalytics,
  IconSettings,
  IconLogout,
  IconChevronLeft,
} from "./icons";

export type MenuItem =
  | "dashboard"
  | "shops"
  | "users"
  | "appointments"
  | "services"
  | "subscriptions"
  | "payments"
  | "analytics"
  | "settings"
  | "logout";

interface MenuItemConfig {
  id: MenuItem;
  label: string;
  icon: React.FC<React.SVGProps<SVGSVGElement>>;
}

interface MenuGroup {
  label: string;
  items: MenuItemConfig[];
}

const MENU_GROUPS: MenuGroup[] = [
  {
    label: "General",
    items: [{ id: "dashboard", label: "Panel", icon: IconDashboard }],
  },
  {
    label: "Gestión",
    items: [
      { id: "shops", label: "Negocios", icon: IconShop },
      { id: "users", label: "Usuarios", icon: IconUsers },
      { id: "appointments", label: "Citas", icon: IconCalendar },
      { id: "services", label: "Servicios", icon: IconScissors },
    ],
  },
  {
    label: "Facturación",
    items: [
      { id: "subscriptions", label: "Suscripciones", icon: IconSubscription },
      { id: "payments", label: "Pagos", icon: IconPayments },
      { id: "analytics", label: "Analítica", icon: IconAnalytics },
    ],
  },
  {
    label: "Sistema",
    items: [{ id: "settings", label: "Configuración", icon: IconSettings }],
  },
];

interface MenuProps {
  activeItem: MenuItem;
  onChange: (item: MenuItem) => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const Menu: React.FC<MenuProps> = ({
  activeItem,
  onChange,
  collapsed = false,
  onToggleCollapse,
}) => {
  return (
    <aside className={`sa-sidebar${collapsed ? " sa-sidebar--collapsed" : ""}`}>
      <div className="sa-brand">
        <div className="sa-brand__logo">B</div>
        {!collapsed ? (
          <div className="sa-brand__text">
            <span className="sa-brand__name">Business Platform</span>
            <span className="sa-brand__sub">Super Admin</span>
          </div>
        ) : null}
      </div>

      <nav className="sa-nav">
        {MENU_GROUPS.map((group) => (
          <div className="sa-nav-group" key={group.label}>
            <div className="sa-nav-group__label">{group.label}</div>
            {group.items.map((item) => {
              const Icon = item.icon;
              const isActive = item.id === activeItem;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onChange(item.id)}
                  className={`sa-nav-item${isActive ? " sa-nav-item--active" : ""}`}
                  title={collapsed ? item.label : undefined}
                  aria-current={isActive ? "page" : undefined}
                >
                  <span className="sa-nav-item__icon">
                    <Icon />
                  </span>
                  <span className="sa-nav-item__label">{item.label}</span>
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="sa-sidebar__footer" style={{ display: "grid", gap: "8px" }}>
        <button
          type="button"
          onClick={() => onChange("logout")}
          className="sa-nav-item"
          title={collapsed ? "Cerrar sesión" : undefined}
        >
          <span className="sa-nav-item__icon">
            <IconLogout />
          </span>
          <span className="sa-nav-item__label">Cerrar sesión</span>
        </button>
        {onToggleCollapse ? (
          <button
            type="button"
            onClick={onToggleCollapse}
            className="sa-collapse-btn"
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
        ) : null}
      </div>
    </aside>
  );
};
