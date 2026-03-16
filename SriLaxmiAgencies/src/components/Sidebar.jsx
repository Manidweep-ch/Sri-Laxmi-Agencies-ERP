import { Link, useLocation } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import { getTheme } from "../theme";

const sections = [
  {
    title: "Overview",
    links: [{ to: "/dashboard", label: "Dashboard", icon: "▦" }],
  },
  {
    title: "Catalogue",
    links: [
      { to: "/prices",    label: "Price List", icon: "🏷" },
      { to: "/inventory", label: "Inventory",  icon: "📦" },
    ],
  },
  {
    title: "Procurement",
    links: [
      { to: "/suppliers", label: "Suppliers",       icon: "🏭" },
      { to: "/purchase",  label: "Purchase Orders", icon: "🛒" },
      { to: "/grn",       label: "Goods Receipt",   icon: "📥" },
    ],
  },
  {
    title: "Sales",
    links: [
      { to: "/customers",    label: "Customers",    icon: "👥" },
      { to: "/sales-orders", label: "Sales Orders", icon: "📋" },
      { to: "/invoices",     label: "Invoices",     icon: "🧾" },
    ],
  },
  {
    title: "Finance",
    links: [
      { to: "/payments",      label: "Payments",      icon: "💳" },
      { to: "/credit-notes",  label: "Credit Notes",  icon: "📝" },
      { to: "/sales-returns", label: "Sales Returns", icon: "↩" },
    ],
  },
  {
    title: "Analytics",
    links: [{ to: "/reports", label: "Reports", icon: "📊" }],
  },
];

export default function Sidebar() {
  const location = useLocation();
  const { dark } = useTheme();
  const t = getTheme(dark);

  return (
    <aside style={{
      width: "220px", minWidth: "220px",
      background: t.sidebar,
      height: "100vh", position: "sticky", top: 0,
      display: "flex", flexDirection: "column",
      borderRight: "1px solid rgba(0,0,0,0.3)",
      overflowY: "auto",
    }}>
      {/* Brand */}
      <div style={{ padding: "18px 16px 14px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{
            width: "36px", height: "36px", borderRadius: "10px",
            background: "linear-gradient(135deg, #1e6fbf, #0e4d8a)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "16px", flexShrink: 0, overflow: "hidden",
            boxShadow: "0 2px 8px rgba(30,111,191,0.4)",
          }}>
            <img src="/lakshmi.png" alt="SLA"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
              onError={e => { e.target.style.display = "none"; e.target.parentElement.innerHTML = "<span style='color:white;font-size:13px;font-weight:800'>SL</span>"; }} />
          </div>
          <div>
            <div style={{ color: t.sidebarBrand, fontWeight: 800, fontSize: "13px", lineHeight: 1.2 }}>Sri Laxmi</div>
            <div style={{ color: t.sidebarText, fontSize: "10px", letterSpacing: "0.5px", textTransform: "uppercase" }}>Agencies ERP</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "8px 0", overflowY: "auto" }}>
        {sections.map(section => (
          <div key={section.title} style={{ marginBottom: "4px" }}>
            <div style={{
              padding: "8px 16px 4px",
              fontSize: "9px", fontWeight: 700, letterSpacing: "1.2px",
              textTransform: "uppercase", color: t.sidebarSection,
            }}>
              {section.title}
            </div>
            {section.links.map(link => {
              const active = location.pathname === link.to;
              return (
                <Link key={link.to} to={link.to} className="erp-nav-link" style={{
                  display: "flex", alignItems: "center", gap: "9px",
                  padding: "8px 14px 8px 16px", marginBottom: "1px",
                  textDecoration: "none", fontSize: "13px",
                  fontWeight: active ? 600 : 400,
                  background: active ? t.sidebarActive : "transparent",
                  color: active ? t.sidebarActiveText : t.sidebarText,
                  borderLeft: active ? "3px solid #3b9ede" : "3px solid transparent",
                  borderRadius: "0 6px 6px 0", marginRight: "8px",
                }}>
                  <span style={{ fontSize: "13px", width: "16px", textAlign: "center", flexShrink: 0 }}>{link.icon}</span>
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div style={{ padding: "10px 16px", borderTop: "1px solid rgba(255,255,255,0.06)", fontSize: "10px", color: t.sidebarText, textAlign: "center" }}>
        v1.0 · Sri Laxmi Agencies
      </div>
    </aside>
  );
}
