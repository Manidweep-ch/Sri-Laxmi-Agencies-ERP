import { useLocation } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import { getTheme } from "../theme";

const PAGE_TITLES = {
  "/dashboard":    { label: "Dashboard",       icon: "▦" },
  "/prices":       { label: "Price List",       icon: "🏷" },
  "/inventory":    { label: "Inventory",        icon: "📦" },
  "/suppliers":    { label: "Suppliers",        icon: "🏭" },
  "/purchase":     { label: "Purchase Orders",  icon: "🛒" },
  "/grn":          { label: "Goods Receipt",    icon: "📥" },
  "/customers":    { label: "Customers",        icon: "👥" },
  "/sales-orders": { label: "Sales Orders",     icon: "📋" },
  "/invoices":     { label: "Invoices",         icon: "🧾" },
  "/payments":     { label: "Payments",         icon: "💳" },
  "/credit-notes": { label: "Credit Notes",     icon: "📝" },
  "/sales-returns":{ label: "Sales Returns",    icon: "↩" },
  "/reports":      { label: "Reports",          icon: "📊" },
};

export default function Navbar() {
  const { dark, toggle } = useTheme();
  const t = getTheme(dark);
  const location = useLocation();
  const page = PAGE_TITLES[location.pathname] || { label: "ERP", icon: "▦" };
  const user = localStorage.getItem("username") || "Admin";

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    window.location = "/";
  };

  return (
    <header style={{
      height: "56px",
      background: t.navbarBg,
      borderBottom: `1px solid ${t.navbarBorder}`,
      display: "flex", alignItems: "center",
      justifyContent: "space-between",
      padding: "0 24px", position: "sticky", top: 0, zIndex: 50,
      boxShadow: t.shadow,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <span style={{ fontSize: "16px" }}>{page.icon}</span>
        <span style={{ fontWeight: 700, fontSize: "16px", color: t.text }}>{page.label}</span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <button onClick={toggle} title={dark ? "Light mode" : "Dark mode"} style={{
          width: "34px", height: "34px", borderRadius: "8px",
          border: `1px solid ${t.border}`, background: t.surfaceAlt,
          cursor: "pointer", fontSize: "15px", display: "flex",
          alignItems: "center", justifyContent: "center", color: t.text,
        }}>
          {dark ? "☀️" : "🌙"}
        </button>

        <div style={{
          display: "flex", alignItems: "center", gap: "8px",
          padding: "5px 12px 5px 6px", borderRadius: "20px",
          border: `1px solid ${t.border}`, background: t.surfaceAlt,
        }}>
          <div style={{
            width: "26px", height: "26px", borderRadius: "50%",
            background: "linear-gradient(135deg, #1e6fbf, #0e4d8a)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "11px", color: "white", fontWeight: 800,
          }}>
            {user.charAt(0).toUpperCase()}
          </div>
          <span style={{ fontSize: "13px", fontWeight: 600, color: t.text }}>{user}</span>
        </div>

        <button onClick={logout} style={{
          padding: "7px 14px", borderRadius: "7px", fontSize: "13px",
          border: `1px solid ${t.dangerBorder}`, background: t.dangerBg,
          color: t.danger, cursor: "pointer", fontWeight: 500,
        }}>
          Sign out
        </button>
      </div>
    </header>
  );
}
