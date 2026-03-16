import { useEffect, useState } from "react";
import MainLayout from "../layout/MainLayout";
import { getInventorySummary } from "../services/stockService";
import { usePageStyles } from "../hooks/usePageStyles";

export default function InventoryPage() {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const ps = usePageStyles();
  const { t } = ps;

  const load = async () => {
    setLoading(true);
    try { setInventory(await getInventorySummary()); setError(""); }
    catch { setError("Failed to load inventory"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const filtered = inventory.filter(i => {
    const q = i.productName?.toLowerCase().includes(search.toLowerCase());
    if (!q) return false;
    if (filter === "out") return i.quantity === 0;
    if (filter === "low") return i.quantity > 0 && i.quantity < 10;
    if (filter === "ok") return i.quantity >= 10;
    return true;
  });

  const totalValue = inventory.reduce((s, i) => s + parseFloat(i.totalValue || 0), 0);
  const lowCount = inventory.filter(i => i.quantity > 0 && i.quantity < 10).length;
  const outCount = inventory.filter(i => i.quantity === 0).length;
  const inStockCount = inventory.filter(i => i.quantity >= 10).length;
  const maxQty = Math.max(...inventory.map(i => i.quantity || 0), 1);

  const stats = [
    { label: "Total Products", value: inventory.length, color: t.primary, icon: "📦" },
    { label: "In Stock",       value: inStockCount,     color: t.success,  icon: "✅" },
    { label: "Low Stock",      value: lowCount,         color: t.warning,  icon: "⚠️" },
    { label: "Out of Stock",   value: outCount,         color: t.danger,   icon: "❌" },
    { label: "Total Value",    value: "Rs." + (totalValue / 1000).toFixed(1) + "K", color: t.teal, icon: "💎" },
  ];

  return (
    <MainLayout>
      <div className="erp-page">
        <div style={ps.pageHeader}>
          <div>
            <h2 style={ps.pageTitle}>Inventory</h2>
            <div style={{ fontSize: "12px", color: t.textMuted, marginTop: "2px" }}>
              Stock levels across all products
            </div>
          </div>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <input className="erp-input" style={ps.searchInput} placeholder="Search product..." value={search} onChange={e => setSearch(e.target.value)} />
            <button className="erp-btn" style={ps.btnGhost} onClick={load}>↻ Refresh</button>
          </div>
        </div>

        {error && <div style={ps.alertError}>⚠ {error}</div>}
        {loading && <div style={ps.alertInfo}>Loading inventory...</div>}

        {/* Stat cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "14px", marginBottom: "20px" }}>
          {stats.map((c, i) => (
            <div key={i} className="erp-stat-card erp-card" style={{
              ...ps.card,
              borderTop: `3px solid ${c.color}`,
              position: "relative", overflow: "hidden",
            }}>
              <div style={{ position: "absolute", top: "-8px", right: "-8px", fontSize: "36px", opacity: 0.08 }}>{c.icon}</div>
              <div style={{ fontSize: "20px", marginBottom: "6px" }}>{c.icon}</div>
              <div style={ps.cardLabel}>{c.label}</div>
              <div style={{ ...ps.cardValue, color: c.color, fontSize: "20px" }}>{c.value}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }}>
          {[["all","All Products"],["ok","In Stock"],["low","Low Stock"],["out","Out of Stock"]].map(([f, label]) => (
            <button key={f} className="erp-btn" onClick={() => setFilter(f)} style={ps.filterPill(filter === f, t.primary)}>{label}</button>
          ))}
          <span style={{ marginLeft: "auto", fontSize: "12px", color: t.textMuted, alignSelf: "center" }}>
            {filtered.length} of {inventory.length} products
          </span>
        </div>

        <div className="erp-table-wrap" style={ps.tableWrap}>
          <table style={ps.table}>
            <thead>
              <tr style={ps.thead}>
                <th style={ps.th}>#</th>
                <th style={ps.th}>Product</th>
                <th style={ps.th}>Stock Level</th>
                <th style={ps.th}>Available Qty</th>
                <th style={ps.th}>Stock Value</th>
                <th style={ps.th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && !loading && (
                <tr><td colSpan={6} style={{ ...ps.td, textAlign: "center", color: t.textMuted, padding: "40px" }}>
                  No inventory data found
                </td></tr>
              )}
              {filtered.map((item, idx) => {
                const isOut = item.quantity === 0;
                const isLow = item.quantity > 0 && item.quantity < 10;
                const statusColor = isOut ? t.danger : isLow ? t.warning : t.success;
                const statusLabel = isOut ? "Out of Stock" : isLow ? "Low Stock" : "In Stock";
                const barPct = Math.min((item.quantity / maxQty) * 100, 100);
                return (
                  <tr key={idx} className="erp-tr" style={{ ...ps.tr, background: t.surface }}>
                    <td style={ps.tdSub}>{idx + 1}</td>
                    <td style={{ ...ps.td, fontWeight: 600 }}>{item.productName}</td>
                    <td style={{ ...ps.td, minWidth: "140px" }}>
                      <div style={{ height: "6px", background: t.surfaceAlt, borderRadius: "3px", overflow: "hidden" }}>
                        <div style={{
                          height: "100%", width: `${barPct}%`,
                          background: `linear-gradient(90deg, ${statusColor}, ${statusColor}bb)`,
                          borderRadius: "3px", transition: "width 0.6s ease",
                        }} />
                      </div>
                    </td>
                    <td style={{ ...ps.td, fontWeight: 700, color: statusColor, fontSize: "15px" }}>{item.quantity}</td>
                    <td style={ps.td}>Rs.{parseFloat(item.totalValue || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                    <td style={ps.td}>
                      <span className={isOut ? "erp-badge-danger" : ""} style={{ ...ps.badge, background: statusColor + "20", color: statusColor, border: `1px solid ${statusColor}40` }}>
                        {statusLabel}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </MainLayout>
  );
}
