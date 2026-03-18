import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { getTheme } from "../theme";

const sections = [
  {
    title: "Overview",
    links: [{ to: "/dashboard", label: "Dashboard", icon: "▦", page: "dashboard" }],
  },
  {
    title: "Catalogue",
    links: [
      { to: "/prices",    label: "Price List", icon: "🏷",  page: "prices" },
      { to: "/inventory", label: "Inventory",  icon: "📦",  page: "inventory" },
    ],
  },
  {
    title: "Procurement",
    links: [
      { to: "/suppliers", label: "Suppliers",       icon: "🏭", page: "suppliers" },
      { to: "/purchase",  label: "Purchase Orders", icon: "🛒", page: "purchase" },
      { to: "/grn",       label: "Goods Receipt",   icon: "📥", page: "grn" },
    ],
  },
  {
    title: "Sales",
    links: [
      { to: "/customers",    label: "Customers",    icon: "👥", page: "customers" },
      { to: "/sales-orders", label: "Sales Orders", icon: "📋", page: "sales-orders" },
      { to: "/invoices",     label: "Invoices",     icon: "🧾", page: "invoices" },
      { to: "/sales-returns", label: "Sales Returns", icon: "↩", page: "sales-returns" },
      { to: "/vehicles",        label: "Vehicles",         icon: "🚛", page: "vehicles" },
      { to: "/deliveries",      label: "Deliveries",       icon: "📦", page: "deliveries" },
      { to: "/driver-dashboard",label: "My Deliveries",    icon: "🧑‍✈️", page: "driver-dashboard" },
    ],
  },
  {
    title: "Finance",
    links: [
      { to: "/payments",   label: "Payments",       icon: "💳", page: "payments" },
      { to: "/wallet",     label: "Staff Wallets",   icon: "👛", page: "wallet" },
      { to: "/reports",    label: "Reports",         icon: "📊", page: "reports" },
      { to: "/follow-ups", label: "Follow-Up Tracker", icon: "📞", page: "follow-ups" },
    ],
  },
  {
    title: "Admin",
    links: [
      { to: "/team",    label: "Team",    icon: "🧑‍💼", page: "team" },
      { to: "/payroll", label: "Payroll", icon: "💰",   page: "payroll" },
    ],
  },
];

const ROLE_COLORS = {
  OWNER: "#f97316", ADMIN: "#ef4444", MANAGER: "#8b5cf6", SALES: "#2563eb",
  ACCOUNTS: "#16a34a", WAREHOUSE: "#f59e0b", DRIVER: "#6b7280",
};

export default function Sidebar() {
  const location = useLocation();
  const { dark } = useTheme();
  const t = getTheme(dark);
  const { user, logout, hasAccess } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside style={{
      width: collapsed ? "52px" : "220px",
      minWidth: collapsed ? "52px" : "220px",
      background: t.sidebar,
      height: "100vh", position: "sticky", top: 0,
      display: "flex", flexDirection: "column",
      borderRight: "1px solid rgba(0,0,0,0.3)",
      overflowY: "auto",
      transition: "width 0.2s ease, min-width 0.2s ease",
      overflowX: "hidden",
    }}>
      {/* Brand + toggle */}
      <div style={{ padding: collapsed ? "14px 8px" : "18px 16px 14px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: collapsed ? "center" : "space-between" }}>
        {!collapsed && (
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "linear-gradient(135deg, #1e6fbf, #0e4d8a)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", flexShrink: 0, overflow: "hidden", boxShadow: "0 2px 8px rgba(30,111,191,0.4)" }}>
              <img src="/lakshmi.png" alt="SLA" style={{ width: "100%", height: "100%", objectFit: "cover" }}
                onError={e => { e.target.style.display = "none"; e.target.parentElement.innerHTML = "<span style='color:white;font-size:13px;font-weight:800'>SL</span>"; }} />
            </div>
            <div>
              <div style={{ color: t.sidebarBrand, fontWeight: 800, fontSize: "13px", lineHeight: 1.2 }}>Sri Laxmi</div>
              <div style={{ color: t.sidebarText, fontSize: "10px", letterSpacing: "0.5px", textTransform: "uppercase" }}>Agencies ERP</div>
            </div>
          </div>
        )}
        {collapsed && (
          <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "linear-gradient(135deg, #1e6fbf, #0e4d8a)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
            <img src="/lakshmi.png" alt="SLA" style={{ width: "100%", height: "100%", objectFit: "cover" }}
              onError={e => { e.target.style.display = "none"; e.target.parentElement.innerHTML = "<span style='color:white;font-size:11px;font-weight:800'>SL</span>"; }} />
          </div>
        )}
        <button onClick={() => setCollapsed(c => !c)} style={{ background: "transparent", border: "none", cursor: "pointer", color: t.sidebarText, fontSize: "14px", padding: "4px", borderRadius: "4px", flexShrink: 0, marginLeft: collapsed ? 0 : "4px" }}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
          {collapsed ? "→" : "←"}
        </button>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "8px 0", overflowY: "auto", overflowX: "hidden" }}>
        {sections.map(section => {
          const visibleLinks = section.links.filter(link => hasAccess(link.page));
          if (visibleLinks.length === 0) return null;
          return (
            <div key={section.title} style={{ marginBottom: "4px" }}>
              {!collapsed && (
                <div style={{ padding: "8px 16px 4px", fontSize: "9px", fontWeight: 700, letterSpacing: "1.2px", textTransform: "uppercase", color: t.sidebarSection }}>
                  {section.title}
                </div>
              )}
              {collapsed && <div style={{ height: "8px" }} />}
              {visibleLinks.map(link => {
                const active = location.pathname === link.to;
                return (
                  <Link key={link.to} to={link.to} title={collapsed ? link.label : undefined} style={{
                    display: "flex", alignItems: "center", gap: collapsed ? 0 : "9px",
                    justifyContent: collapsed ? "center" : "flex-start",
                    padding: collapsed ? "9px 0" : "8px 14px 8px 16px",
                    marginBottom: "1px", textDecoration: "none", fontSize: "13px",
                    fontWeight: active ? 600 : 400,
                    background: active ? t.sidebarActive : "transparent",
                    color: active ? t.sidebarActiveText : t.sidebarText,
                    borderLeft: active ? "3px solid #3b9ede" : "3px solid transparent",
                    borderRadius: "0 6px 6px 0", marginRight: collapsed ? 0 : "8px",
                  }}>
                    <span style={{ fontSize: "15px", width: "18px", textAlign: "center", flexShrink: 0 }}>{link.icon}</span>
                    {!collapsed && <span>{link.label}</span>}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* User info + logout */}
      {user && !collapsed && (
        <div style={{ padding: "10px 14px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
            <div style={{ overflow: "hidden" }}>
              <div style={{ color: t.sidebarBrand, fontSize: "12px", fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {user.username}
              </div>
              <div style={{ fontSize: "10px", fontWeight: 700, color: ROLE_COLORS[user.role] || "#6b7280", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                {user.role}
              </div>
            </div>
            <button onClick={logout} title="Logout" style={{ background: "transparent", border: "none", cursor: "pointer", color: t.sidebarText, fontSize: "14px", padding: "4px", borderRadius: "4px", flexShrink: 0 }}>
              ⏻
            </button>
          </div>
        </div>
      )}
      {user && collapsed && (
        <div style={{ padding: "10px 0", borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "center" }}>
          <button onClick={logout} title="Logout" style={{ background: "transparent", border: "none", cursor: "pointer", color: t.sidebarText, fontSize: "14px", padding: "4px", borderRadius: "4px" }}>⏻</button>
        </div>
      )}

      {!collapsed && (
        <div style={{ padding: "6px 16px 10px", fontSize: "10px", color: t.sidebarText, textAlign: "center" }}>
          v1.0 · Sri Laxmi Agencies
        </div>
      )}
    </aside>
  );
}
