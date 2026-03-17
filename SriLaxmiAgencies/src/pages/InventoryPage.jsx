import { useEffect, useState, Fragment } from "react";
import MainLayout from "../layout/MainLayout";
import { getInventorySummary, getInventoryBatches } from "../services/stockService";
import { usePageStyles } from "../hooks/usePageStyles";
import { useTheme } from "../context/ThemeContext";
import { getTheme } from "../theme";

export default function InventoryPage() {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [expandedId, setExpandedId] = useState(null);
  const [batches, setBatches] = useState({});   // productId -> batch array
  const [batchLoading, setBatchLoading] = useState(null);
  const ps = usePageStyles();
  const { t } = ps;
  const { dark } = useTheme();
  const theme = getTheme(dark);

  const load = async () => {
    setLoading(true);
    try { setInventory(await getInventorySummary()); setError(""); }
    catch { setError("Failed to load inventory"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const toggleBatches = async (productId) => {
    if (expandedId === productId) { setExpandedId(null); return; }
    setExpandedId(productId);
    if (!batches[productId]) {
      setBatchLoading(productId);
      try {
        const data = await getInventoryBatches(productId);
        setBatches(prev => ({ ...prev, [productId]: data }));
      } catch { setBatches(prev => ({ ...prev, [productId]: [] })); }
      finally { setBatchLoading(null); }
    }
  };

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
              Stock levels across all products — click a row to see batch-wise cost breakdown
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
            <div key={i} className="erp-stat-card erp-card" style={{ ...ps.card, borderTop: `3px solid ${c.color}`, position: "relative", overflow: "hidden" }}>
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
                <th style={ps.th}></th>
                <th style={ps.th}>#</th>
                <th style={ps.th}>Product</th>
                <th style={ps.th}>Stock Level</th>
                <th style={ps.th}>Available Qty</th>
                <th style={ps.th}>Stock Value (at cost)</th>
                <th style={ps.th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && !loading && (
                <tr><td colSpan={7} style={{ ...ps.td, textAlign: "center", color: t.textMuted, padding: "40px" }}>
                  No inventory data found
                </td></tr>
              )}
              {filtered.map((item, idx) => {
                const isOut = item.quantity === 0;
                const isLow = item.quantity > 0 && item.quantity < 10;
                const statusColor = isOut ? t.danger : isLow ? t.warning : t.success;
                const statusLabel = isOut ? "Out of Stock" : isLow ? "Low Stock" : "In Stock";
                const barPct = Math.min((item.quantity / maxQty) * 100, 100);
                const isExpanded = expandedId === item.productId;
                const productBatches = batches[item.productId] || [];

                return (
                  <Fragment key={item.productId}>
                    <tr style={{ ...ps.tr, background: isExpanded ? theme.surfaceAlt : t.surface, cursor: "pointer", borderLeft: isExpanded ? `3px solid ${t.primary}` : "3px solid transparent" }}
                      onClick={() => toggleBatches(item.productId)}>
                      <td style={{ ...ps.td, width: "28px", textAlign: "center", color: t.textMuted, fontSize: "11px" }}>
                        {isExpanded ? "▲" : "▼"}
                      </td>
                      <td style={ps.tdSub}>{idx + 1}</td>
                      <td style={{ ...ps.td, fontWeight: 600 }}>{item.productName}</td>
                      <td style={{ ...ps.td, minWidth: "140px" }}>
                        <div style={{ height: "6px", background: t.surfaceAlt, borderRadius: "3px", overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${barPct}%`, background: `linear-gradient(90deg, ${statusColor}, ${statusColor}bb)`, borderRadius: "3px", transition: "width 0.6s ease" }} />
                        </div>
                      </td>
                      <td style={{ ...ps.td, fontWeight: 700, color: statusColor, fontSize: "15px" }}>{item.quantity}</td>
                      <td style={ps.td}>₹{parseFloat(item.totalValue || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                      <td style={ps.td}>
                        <span style={{ ...ps.badge, background: statusColor + "20", color: statusColor, border: `1px solid ${statusColor}40` }}>
                          {statusLabel}
                        </span>
                      </td>
                    </tr>

                    {/* Batch detail rows */}
                    {isExpanded && (
                      <tr>
                        <td colSpan={7} style={{ padding: "0 16px 12px", background: theme.surfaceAlt }}>
                          {batchLoading === item.productId ? (
                            <div style={{ padding: "12px", color: t.textMuted, fontSize: "13px" }}>Loading batches...</div>
                          ) : productBatches.length === 0 ? (
                            <div style={{ padding: "12px", color: t.textMuted, fontSize: "13px" }}>No active batches found.</div>
                          ) : (
                            <div style={{ padding: "10px 0" }}>
                              <div style={{ fontSize: "12px", fontWeight: 700, color: t.textSub, marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                                FIFO Batch Breakdown
                              </div>
                              <table style={{ ...ps.table, marginBottom: 0 }}>
                                <thead>
                                  <tr style={ps.thead}>
                                    <th style={ps.th}>Batch #</th>
                                    <th style={ps.th}>Received Date</th>
                                    <th style={ps.th}>Qty in Batch</th>
                                    <th style={ps.th}>Cost Price (₹)</th>
                                    <th style={ps.th}>Batch Value (₹)</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {productBatches.map((batch, bi) => {
                                    const batchValue = (batch.quantity || 0) * (batch.purchasePrice || 0);
                                    return (
                                      <tr key={batch.id} style={{ ...ps.tr, background: bi === 0 ? (dark ? "#1a2e1a" : "#f0fdf4") : t.surface }}>
                                        <td style={{ ...ps.td, color: t.textSub, fontSize: "12px" }}>
                                          {bi === 0 && <span style={{ fontSize: "10px", background: "#16a34a", color: "white", borderRadius: "3px", padding: "1px 5px", marginRight: "6px" }}>NEXT</span>}
                                          #{batch.id}
                                        </td>
                                        <td style={ps.td}>{batch.receivedDate}</td>
                                        <td style={{ ...ps.td, fontWeight: 600 }}>{batch.quantity}</td>
                                        <td style={{ ...ps.td, color: t.primary, fontWeight: 600 }}>₹{parseFloat(batch.purchasePrice || 0).toFixed(2)}</td>
                                        <td style={{ ...ps.td, fontWeight: 600 }}>₹{batchValue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                                      </tr>
                                    );
                                  })}
                                  {/* Batch total */}
                                  <tr style={{ background: theme.surfaceAlt }}>
                                    <td colSpan={2} style={{ ...ps.td, fontWeight: 700, textAlign: "right" }}>Total</td>
                                    <td style={{ ...ps.td, fontWeight: 700 }}>{productBatches.reduce((s, b) => s + (b.quantity || 0), 0)}</td>
                                    <td style={ps.td}></td>
                                    <td style={{ ...ps.td, fontWeight: 700, color: t.primary }}>
                                      ₹{productBatches.reduce((s, b) => s + (b.quantity || 0) * (b.purchasePrice || 0), 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </MainLayout>
  );
}


