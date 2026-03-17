import { useEffect, useState } from "react";
import MainLayout from "../layout/MainLayout";
import api from "../api/axiosConfig";
import { usePageStyles } from "../hooks/usePageStyles";
import { useTheme } from "../context/ThemeContext";
import { getTheme } from "../theme";

function BarChart({ data, colorFn, height = 140, labelKey = "label", valueKey = "value" }) {
  const { dark } = useTheme();
  const t = getTheme(dark);
  const max = Math.max(...data.map(d => d[valueKey]), 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: "8px", height: `${height + 40}px`, padding: "0 4px" }}>
      {data.map((d, i) => {
        const pct = Math.max((d[valueKey] / max) * height, 2);
        const color = colorFn ? colorFn(i, d) : t.chart1;
        return (
          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
            <span style={{ fontSize: "10px", fontWeight: 700, color: t.text }}>{d[valueKey]}</span>
            <div style={{
              width: "100%", height: `${pct}px`,
              background: `linear-gradient(180deg, ${color} 0%, ${color}88 100%)`,
              borderRadius: "4px 4px 0 0",
              boxShadow: `0 -2px 8px ${color}44`,
            }} />
            <span style={{ fontSize: "9px", color: t.textMuted, textAlign: "center", maxWidth: "60px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {d[labelKey]}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function HBar({ label, value, max, color, fmt }) {
  const { dark } = useTheme();
  const t = getTheme(dark);
  const pct = Math.max((value / Math.max(max, 1)) * 100, 1);
  return (
    <div style={{ marginBottom: "10px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
        <span style={{ fontSize: "12px", color: t.text, fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: "12px", fontWeight: 700, color }}>{fmt ? fmt(value) : value}</span>
      </div>
      <div style={{ height: "8px", background: t.surfaceAlt, borderRadius: "4px", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: `linear-gradient(90deg, ${color}, ${color}bb)`, borderRadius: "4px" }} />
      </div>
    </div>
  );
}

function RingStat({ value, max, color, label, sub }) {
  const { dark } = useTheme();
  const t = getTheme(dark);
  const pct = Math.min((value / Math.max(max, 1)) * 100, 100);
  const r = 36, circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
      <div style={{ position: "relative", width: "90px", height: "90px" }}>
        <svg width="90" height="90" style={{ transform: "rotate(-90deg)" }}>
          <circle cx="45" cy="45" r={r} fill="none" stroke={t.border} strokeWidth="7" />
          <circle cx="45" cy="45" r={r} fill="none" stroke={color} strokeWidth="7"
            strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: "16px", fontWeight: 800, color, lineHeight: 1 }}>{value}</span>
          <span style={{ fontSize: "9px", color: t.textMuted }}>{Math.round(pct)}%</span>
        </div>
      </div>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "12px", fontWeight: 600, color: t.text }}>{label}</div>
        {sub && <div style={{ fontSize: "10px", color: t.textMuted }}>{sub}</div>}
      </div>
    </div>
  );
}

function StatCard({ label, value, color, icon, sub }) {
  const { dark } = useTheme();
  const t = getTheme(dark);
  return (
    <div style={{
      background: t.surface, border: `1px solid ${t.border}`, borderRadius: "12px",
      padding: "16px 18px", borderLeft: `4px solid ${color}`,
      boxShadow: `0 2px 12px ${color}18`, position: "relative", overflow: "hidden",
    }}>
      <div style={{ position: "absolute", top: "-10px", right: "-10px", width: "60px", height: "60px", borderRadius: "50%", background: `${color}12` }} />
      <div style={{ fontSize: "20px", marginBottom: "6px" }}>{icon}</div>
      <div style={{ fontSize: "11px", color: t.textMuted, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "4px" }}>{label}</div>
      <div style={{ fontSize: "22px", fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: "11px", color: t.textSub, marginTop: "4px" }}>{sub}</div>}
    </div>
  );
}

const SC = {
  DRAFT: "#6b7280", PENDING: "#f59e0b", CONFIRMED: "#2563eb",
  SHIPPED: "#7c3aed", INVOICED: "#16a34a", CANCELLED: "#ef4444",
  FULLY_RECEIVED: "#16a34a", PARTIALLY_RECEIVED: "#f59e0b", ORDERED: "#2563eb",
};

export default function ReportsPage() {
  const [tab, setTab] = useState("financial");
  const [financial, setFinancial] = useState(null);
  const [inventory, setInventory] = useState(null);
  const [sales, setSales] = useState(null);
  const [purchase, setPurchase] = useState(null);
  const [profitMargin, setProfitMargin] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const ps = usePageStyles();
  const { dark } = useTheme();
  const t = getTheme(dark);

  const loadAll = async () => {
    setLoading(true); setError("");
    try {
      const params = startDate && endDate ? `?startDate=${startDate}&endDate=${endDate}` : "";
      const [f, inv, s, p, pm] = await Promise.all([
        api.get("/reports/financial").then(r => r.data),
        api.get("/reports/inventory").then(r => r.data),
        api.get(`/reports/sales${params}`).then(r => r.data),
        api.get(`/reports/purchase${params}`).then(r => r.data),
        api.get("/reports/profit-margin").then(r => r.data),
      ]);
      setFinancial(f); setInventory(inv); setSales(s); setPurchase(p); setProfitMargin(pm);
    } catch { setError("Failed to load reports"); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadAll(); }, []);

  const fmt = v => `Rs.${parseFloat(v || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
  const fmtShort = v => {
    const n = parseFloat(v || 0);
    if (n >= 100000) return `Rs.${(n / 100000).toFixed(1)}L`;
    if (n >= 1000) return `Rs.${(n / 1000).toFixed(1)}K`;
    return `Rs.${n.toFixed(0)}`;
  };

  const tabStyle = (key) => ({
    padding: "9px 20px", border: "none", cursor: "pointer", fontSize: "13px", fontWeight: 600,
    background: tab === key ? (dark ? "#1e1608" : "#1a0a00") : "transparent",
    color: tab === key ? "#ffd700" : t.textSub,
    borderRadius: "8px 8px 0 0",
    borderBottom: tab === key ? "2px solid #d4a96a" : "2px solid transparent",
    transition: "all 0.2s",
  });

  return (
    <MainLayout>
      <div style={ps.pageHeader}>
        <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 700, color: t.text }}>📊 Reports & Analytics</h2>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <input style={{ ...ps.input, marginBottom: 0, width: "150px" }} type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
          <span style={{ color: t.textMuted, fontSize: "13px" }}>to</span>
          <input style={{ ...ps.input, marginBottom: 0, width: "150px" }} type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
          <button style={ps.btnPrimary} onClick={loadAll}>Apply</button>
        </div>
      </div>

      {error && <div style={ps.alertError}>{error}</div>}
      {loading && <div style={ps.alertInfo}>Loading reports...</div>}

      <div style={{ display: "flex", gap: "2px", marginBottom: "24px", borderBottom: `2px solid ${t.border}` }}>
        {[["financial","💰 Financial"],["sales","📈 Sales"],["purchase","🛒 Purchase"],["inventory","📦 Inventory"],["profit","📊 Profit Margin"]].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} style={tabStyle(key)}>{label}</button>
        ))}
      </div>


      {/* FINANCIAL */}
      {tab === "financial" && financial && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "14px", marginBottom: "28px" }}>
            <StatCard label="Total Revenue" value={fmtShort(financial.totalRevenue)} color={t.success} icon="💰" sub={fmt(financial.totalRevenue)} />
            <StatCard label="Total Collected" value={fmtShort(financial.totalPayments)} color={t.primary} icon="✅" sub={fmt(financial.totalPayments)} />
            <StatCard label="Outstanding" value={fmtShort(financial.outstandingAmount)} color={t.danger} icon="⏳" sub={fmt(financial.outstandingAmount)} />
            <StatCard label="Total Invoices" value={financial.totalInvoices} color={t.textSub} icon="🧾" />
            <StatCard label="Paid Invoices" value={financial.paidInvoices} color={t.success} icon="✔️" />
            <StatCard label="Pending Invoices" value={financial.pendingInvoices} color={t.warning} icon="🕐" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "12px", padding: "20px" }}>
              <div style={{ fontSize: "13px", fontWeight: 700, color: t.text, marginBottom: "16px" }}>💹 Revenue Breakdown</div>
              {[
                { label: "Revenue", value: parseFloat(financial.totalRevenue || 0), color: t.success },
                { label: "Collected", value: parseFloat(financial.totalPayments || 0), color: t.primary },
                { label: "Outstanding", value: parseFloat(financial.outstandingAmount || 0), color: t.danger },
              ].map(item => (
                <HBar key={item.label} label={item.label} value={item.value}
                  max={parseFloat(financial.totalRevenue || 1)} color={item.color} fmt={fmtShort} />
              ))}
            </div>
            <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "12px", padding: "20px" }}>
              <div style={{ fontSize: "13px", fontWeight: 700, color: t.text, marginBottom: "16px" }}>🧾 Invoice Status Rings</div>
              <div style={{ display: "flex", justifyContent: "space-around", paddingTop: "8px" }}>
                <RingStat value={financial.paidInvoices || 0} max={financial.totalInvoices || 1} color={t.success} label="Paid" sub="invoices" />
                <RingStat value={financial.pendingInvoices || 0} max={financial.totalInvoices || 1} color={t.warning} label="Pending" sub="invoices" />
                <RingStat
                  value={Math.max(0, (financial.totalInvoices || 0) - (financial.paidInvoices || 0) - (financial.pendingInvoices || 0))}
                  max={financial.totalInvoices || 1} color={t.danger} label="Other" sub="invoices" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SALES */}
      {tab === "sales" && sales && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "14px", marginBottom: "28px" }}>
            <StatCard label="Sales Orders" value={sales.totalSalesOrders} color={t.primary} icon="📋" />
            <StatCard label="Total Invoices" value={sales.totalInvoices} color={t.purple} icon="🧾" />
            <StatCard label="Revenue" value={fmtShort(sales.totalRevenue)} color={t.success} icon="💰" sub={fmt(sales.totalRevenue)} />
          </div>
          {sales.statusBreakdown && Object.keys(sales.statusBreakdown).length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "12px", padding: "20px" }}>
                <div style={{ fontSize: "13px", fontWeight: 700, color: t.text, marginBottom: "16px" }}>📊 Orders by Status</div>
                <BarChart
                  data={Object.entries(sales.statusBreakdown).map(([k, v]) => ({ label: k, value: v }))}
                  colorFn={(i, d) => SC[d.label] || t.chart1}
                  height={120}
                />
              </div>
              <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "12px", padding: "20px" }}>
                <div style={{ fontSize: "13px", fontWeight: 700, color: t.text, marginBottom: "16px" }}>📈 Status Distribution</div>
                {Object.entries(sales.statusBreakdown).map(([status, count]) => (
                  <HBar key={status} label={status} value={count}
                    max={Math.max(...Object.values(sales.statusBreakdown))}
                    color={SC[status] || t.chart1} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* PURCHASE */}
      {tab === "purchase" && purchase && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "14px", marginBottom: "28px" }}>
            <StatCard label="Purchase Orders" value={purchase.totalPurchaseOrders} color={t.primary} icon="🛒" />
            <StatCard label="Total PO Value" value={fmtShort(purchase.totalPOValue)} color={t.warning} icon="💰" sub={fmt(purchase.totalPOValue)} />
            <StatCard label="Total Paid" value={fmtShort(purchase.totalPaid)} color={t.success} icon="✅" sub={fmt(purchase.totalPaid)} />
            <StatCard label="Outstanding" value={fmtShort(purchase.totalOutstanding)} color={t.danger} icon="⏳" sub={fmt(purchase.totalOutstanding)} />
          </div>
          {purchase.totalPOValue > 0 && (
            <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "12px", padding: "20px", marginBottom: "16px" }}>
              <div style={{ fontSize: "13px", fontWeight: 700, color: t.text, marginBottom: "16px" }}>💳 Payment Progress</div>
              {[
                { label: "Total PO Value", value: parseFloat(purchase.totalPOValue || 0), color: t.warning },
                { label: "Paid to Suppliers", value: parseFloat(purchase.totalPaid || 0), color: t.success },
                { label: "Outstanding", value: parseFloat(purchase.totalOutstanding || 0), color: t.danger },
              ].map(item => (
                <HBar key={item.label} label={item.label} value={item.value}
                  max={parseFloat(purchase.totalPOValue || 1)} color={item.color} fmt={fmtShort} />
              ))}
            </div>
          )}
          {purchase.statusBreakdown && Object.keys(purchase.statusBreakdown).length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "12px", padding: "20px" }}>
                <div style={{ fontSize: "13px", fontWeight: 700, color: t.text, marginBottom: "16px" }}>📊 PO Status Chart</div>
                <BarChart
                  data={Object.entries(purchase.statusBreakdown).map(([k, v]) => ({ label: k, value: v }))}
                  colorFn={(i, d) => SC[d.label] || t.chart1}
                  height={120}
                />
              </div>
              <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "12px", padding: "20px" }}>
                <div style={{ fontSize: "13px", fontWeight: 700, color: t.text, marginBottom: "16px" }}>📋 PO Breakdown</div>
                {Object.entries(purchase.statusBreakdown).map(([status, count]) => (
                  <HBar key={status} label={status} value={count}
                    max={Math.max(...Object.values(purchase.statusBreakdown))}
                    color={SC[status] || t.chart1} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* INVENTORY */}
      {tab === "inventory" && inventory && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "14px", marginBottom: "28px" }}>
            <StatCard label="Total Products" value={inventory.totalProducts} color={t.primary} icon="📦" />
            <StatCard label="In Stock" value={inventory.productsInStock} color={t.success} icon="✅" />
            <StatCard label="Low Stock" value={inventory.lowStockItems} color={t.warning} icon="⚠️" sub="< 10 units" />
            <StatCard label="Out of Stock" value={inventory.outOfStockItems} color={t.danger} icon="❌" />
            <StatCard label="Inventory Value" value={fmtShort(inventory.totalInventoryValue)} color={t.primary} icon="💎" sub={fmt(inventory.totalInventoryValue)} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "20px" }}>
            <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "12px", padding: "20px" }}>
              <div style={{ fontSize: "13px", fontWeight: 700, color: t.text, marginBottom: "16px" }}>🏥 Stock Health Rings</div>
              <div style={{ display: "flex", justifyContent: "space-around" }}>
                <RingStat value={inventory.productsInStock || 0} max={inventory.totalProducts || 1} color={t.success} label="In Stock" />
                <RingStat value={inventory.lowStockItems || 0} max={inventory.totalProducts || 1} color={t.warning} label="Low Stock" />
                <RingStat value={inventory.outOfStockItems || 0} max={inventory.totalProducts || 1} color={t.danger} label="Out of Stock" />
              </div>
            </div>
            <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "12px", padding: "20px" }}>
              <div style={{ fontSize: "13px", fontWeight: 700, color: t.text, marginBottom: "16px" }}>📊 Stock Distribution</div>
              <HBar label="In Stock" value={inventory.productsInStock || 0} max={inventory.totalProducts || 1} color={t.success} />
              <HBar label="Low Stock" value={inventory.lowStockItems || 0} max={inventory.totalProducts || 1} color={t.warning} />
              <HBar label="Out of Stock" value={inventory.outOfStockItems || 0} max={inventory.totalProducts || 1} color={t.danger} />
            </div>
          </div>
          {inventory.lowStockDetails?.length > 0 && (
            <div style={{ background: t.surface, border: `1px solid ${t.warningBorder}`, borderRadius: "12px", padding: "20px" }}>
              <div style={{ fontSize: "13px", fontWeight: 700, color: t.warning, marginBottom: "14px" }}>⚠️ Low Stock Items — Reorder Needed</div>
              <table style={ps.table}>
                <thead><tr style={ps.thead}>
                  <th style={ps.th}>Product</th>
                  <th style={ps.th}>Qty</th>
                  <th style={ps.th}>Stock Bar</th>
                  <th style={ps.th}>Value</th>
                </tr></thead>
                <tbody>
                  {inventory.lowStockDetails.map(item => (
                    <tr key={item.productId} style={ps.tr}>
                      <td style={ps.td}>{item.productName}</td>
                      <td style={{ ...ps.td, color: item.quantity <= 0 ? t.danger : t.warning, fontWeight: 700 }}>
                        {item.quantity <= 0 ? "OUT" : item.quantity}
                      </td>
                      <td style={{ ...ps.td, minWidth: "120px" }}>
                        <div style={{ height: "6px", background: t.surfaceAlt, borderRadius: "3px", overflow: "hidden" }}>
                          <div style={{
                            height: "100%",
                            width: `${Math.min((item.quantity / 10) * 100, 100)}%`,
                            background: item.quantity <= 0 ? t.danger : item.quantity <= 5 ? t.danger : t.warning,
                            borderRadius: "3px",
                          }} />
                        </div>
                      </td>
                      <td style={ps.td}>{fmt(item.totalValue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
      {/* PROFIT MARGIN */}
      {tab === "profit" && (
        <div>
          {profitMargin.length === 0 ? (
            <div style={{ ...ps.alertInfo, textAlign: "center" }}>
              No profit data yet — profit margin is calculated from FIFO invoices. Generate invoices to see data here.
            </div>
          ) : (
            <>
              {/* Summary cards */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "14px", marginBottom: "28px" }}>
                <StatCard
                  label="Total Revenue"
                  value={fmtShort(profitMargin.reduce((s, r) => s + parseFloat(r.totalRevenue || 0), 0))}
                  color={t.success} icon="💰"
                  sub={fmt(profitMargin.reduce((s, r) => s + parseFloat(r.totalRevenue || 0), 0))}
                />
                <StatCard
                  label="Total COGS"
                  value={fmtShort(profitMargin.reduce((s, r) => s + parseFloat(r.totalCOGS || 0), 0))}
                  color={t.warning} icon="🏭"
                  sub={fmt(profitMargin.reduce((s, r) => s + parseFloat(r.totalCOGS || 0), 0))}
                />
                <StatCard
                  label="Gross Profit"
                  value={fmtShort(profitMargin.reduce((s, r) => s + parseFloat(r.grossProfit || 0), 0))}
                  color={t.primary} icon="📈"
                  sub={fmt(profitMargin.reduce((s, r) => s + parseFloat(r.grossProfit || 0), 0))}
                />
                <StatCard
                  label="Avg Margin"
                  value={(() => {
                    const totalRev = profitMargin.reduce((s, r) => s + parseFloat(r.totalRevenue || 0), 0);
                    const totalProfit = profitMargin.reduce((s, r) => s + parseFloat(r.grossProfit || 0), 0);
                    return totalRev > 0 ? `${((totalProfit / totalRev) * 100).toFixed(1)}%` : "0%";
                  })()}
                  color={t.teal} icon="🎯"
                />
              </div>

              {/* Per-product table */}
              <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "12px", padding: "20px" }}>
                <div style={{ fontSize: "13px", fontWeight: 700, color: t.text, marginBottom: "16px" }}>
                  📦 Profit Margin by Product (FIFO COGS)
                </div>
                <table style={ps.table}>
                  <thead>
                    <tr style={ps.thead}>
                      <th style={ps.th}>Product</th>
                      <th style={ps.th}>Qty Sold</th>
                      <th style={ps.th}>Revenue</th>
                      <th style={ps.th}>COGS</th>
                      <th style={ps.th}>Gross Profit</th>
                      <th style={ps.th}>Margin %</th>
                      <th style={ps.th}>Margin Bar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...profitMargin].sort((a, b) => parseFloat(b.marginPct || 0) - parseFloat(a.marginPct || 0)).map(row => {
                      const margin = parseFloat(row.marginPct || 0);
                      const marginColor = margin >= 20 ? t.success : margin >= 10 ? t.warning : t.danger;
                      return (
                        <tr key={row.productId} style={ps.tr}>
                          <td style={{ ...ps.td, fontWeight: 600 }}>{row.productName}</td>
                          <td style={ps.td}>{row.totalQtySold}</td>
                          <td style={{ ...ps.td, color: t.success, fontWeight: 600 }}>{fmt(row.totalRevenue)}</td>
                          <td style={{ ...ps.td, color: t.warning }}>{fmt(row.totalCOGS)}</td>
                          <td style={{ ...ps.td, color: t.primary, fontWeight: 600 }}>{fmt(row.grossProfit)}</td>
                          <td style={{ ...ps.td, fontWeight: 700, color: marginColor }}>{margin.toFixed(1)}%</td>
                          <td style={{ ...ps.td, minWidth: "120px" }}>
                            <div style={{ height: "8px", background: t.surfaceAlt, borderRadius: "4px", overflow: "hidden" }}>
                              <div style={{ height: "100%", width: `${Math.min(margin, 100)}%`, background: `linear-gradient(90deg, ${marginColor}, ${marginColor}bb)`, borderRadius: "4px" }} />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </MainLayout>
  );
}
