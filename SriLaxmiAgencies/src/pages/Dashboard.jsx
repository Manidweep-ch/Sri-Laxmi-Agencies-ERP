import { useEffect, useState } from "react";
import MainLayout from "../layout/MainLayout";
import { getDashboardData, getWalletData } from "../services/dashboardService";
import { useTheme } from "../context/ThemeContext";
import { getTheme } from "../theme";

/* ── Mini ring chart (SVG) ── */
function Ring({ pct = 0, color, size = 56, stroke = 6 }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (Math.min(pct, 100) / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(128,128,128,0.15)" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color}
        strokeWidth={stroke} strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round" style={{ transition: "stroke-dasharray 1s ease" }} />
    </svg>
  );
}

/* ── Stat card ── */
function StatCard({ label, value, color, icon, sub }) {
  const { dark } = useTheme();
  const t = getTheme(dark);
  return (
    <div className="erp-stat-card" style={{
      background: t.surface, border: `1px solid ${t.border}`,
      borderRadius: "14px", padding: "18px 20px",
      boxShadow: t.shadow, borderTop: `3px solid ${color}`,
      position: "relative", overflow: "hidden",
    }}>
      <div style={{
        position: "absolute", bottom: "-18px", right: "-18px",
        width: "72px", height: "72px", borderRadius: "50%",
        background: `${color}12`,
      }} />
      <div style={{
        width: "36px", height: "36px", borderRadius: "10px",
        background: `${color}1a`, display: "flex", alignItems: "center",
        justifyContent: "center", fontSize: "16px", marginBottom: "10px",
      }}>{icon}</div>
      <div style={{ fontSize: "10px", color: t.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "4px" }}>{label}</div>
      <div style={{ fontSize: "22px", fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: "11px", color: t.textMuted, marginTop: "4px" }}>{sub}</div>}
    </div>
  );
}

/* ── Horizontal bar ── */
function HBar({ label, value, max, color, fmt, sub }) {
  const { dark } = useTheme();
  const t = getTheme(dark);
  const pct = Math.min((Math.abs(value) / Math.max(Math.abs(max), 1)) * 100, 100);
  return (
    <div style={{ marginBottom: "14px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "5px" }}>
        <div>
          <span style={{ fontSize: "12px", color: t.text, fontWeight: 600 }}>{label}</span>
          {sub && <span style={{ fontSize: "10px", color: t.textMuted, marginLeft: "6px" }}>{sub}</span>}
        </div>
        <span style={{ fontSize: "13px", fontWeight: 800, color }}>{fmt(value)}</span>
      </div>
      <div style={{ height: "7px", background: t.surfaceAlt, borderRadius: "4px", overflow: "hidden", border: `1px solid ${t.border}` }}>
        <div style={{
          height: "100%", width: `${pct}%`,
          background: `linear-gradient(90deg, ${color}cc, ${color})`,
          borderRadius: "4px", transition: "width 1s ease",
        }} />
      </div>
    </div>
  );
}

/* ── Finance summary card ── */
function FinCard({ label, value, sub, color, icon }) {
  const { dark } = useTheme();
  const t = getTheme(dark);
  return (
    <div style={{
      background: t.surface, border: `1px solid ${t.border}`,
      borderLeft: `4px solid ${color}`, borderRadius: "10px",
      padding: "13px 16px", display: "flex", alignItems: "center",
      gap: "12px", boxShadow: t.shadow,
    }}>
      <div style={{
        width: "38px", height: "38px", borderRadius: "10px",
        background: `${color}18`, display: "flex", alignItems: "center",
        justifyContent: "center", fontSize: "18px", flexShrink: 0,
      }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: "10px", color: t.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.6px" }}>{label}</div>
        <div style={{ fontSize: "15px", fontWeight: 800, color, lineHeight: 1.2, marginTop: "2px" }}>{value}</div>
        {sub && <div style={{ fontSize: "10px", color: t.textMuted, marginTop: "2px" }}>{sub}</div>}
      </div>
    </div>
  );
}

/* ── Activity row ── */
function ActivityRow({ icon, text, time, color }) {
  const { dark } = useTheme();
  const t = getTheme(dark);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 0", borderBottom: `1px solid ${t.border}` }}>
      <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: `${color}18`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", flexShrink: 0 }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: "12px", color: t.text, fontWeight: 500 }}>{text}</div>
        <div style={{ fontSize: "10px", color: t.textMuted }}>{time}</div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { dark } = useTheme();
  const t = getTheme(dark);

  useEffect(() => {
    setLoading(true);
    Promise.all([getDashboardData(), getWalletData()])
      .then(([d, w]) => { setData(d); setWallet(w); })
      .catch((err) => setError("Failed to load dashboard data. " + (err?.message || "")))
      .finally(() => setLoading(false));
  }, []);

  const fmtFull = (v) => {
    const n = parseFloat(v ?? 0);
    return "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };
  const fmtShort = (v) => {
    const n = parseFloat(v ?? 0);
    if (n >= 10000000) return "₹" + (n / 10000000).toFixed(2) + "Cr";
    if (n >= 100000) return "₹" + (n / 100000).toFixed(2) + "L";
    if (n >= 1000) return "₹" + (n / 1000).toFixed(1) + "K";
    return "₹" + n.toFixed(0);
  };
  const fmt = (v) => (v != null ? String(v) : "0");

  const walletBalance = parseFloat(wallet?.walletBalance ?? 0);
  const toReceive     = parseFloat(wallet?.totalToReceive ?? 0);
  const toPay         = parseFloat(wallet?.totalToPay ?? 0);
  const totalReceived = parseFloat(wallet?.totalReceived ?? 0);
  const totalPaid     = parseFloat(wallet?.totalPaid ?? 0);
  const maxFin        = Math.max(Math.abs(walletBalance), toReceive, toPay, totalReceived, totalPaid, 1);

  const paidInv    = parseInt(data?.paidInvoices ?? 0);
  const pendingInv = parseInt(data?.pendingInvoices ?? 0);
  const totalInv   = parseInt(data?.totalInvoices ?? 1);
  const paidPct    = Math.round((paidInv / Math.max(totalInv, 1)) * 100);

  const today = new Date().toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  const statCards = data ? [
    { label: "Customers",       value: fmt(data.totalCustomers),      color: t.primary,  icon: "👥", sub: "Active accounts" },
    { label: "Suppliers",       value: fmt(data.totalSuppliers),      color: t.purple,   icon: "🏭", sub: "Vendor partners" },
    { label: "Products",        value: fmt(data.totalProducts),       color: t.teal,     icon: "📦", sub: "In catalogue" },
    { label: "Sales Orders",    value: fmt(data.totalSalesOrders),    color: t.success,  icon: "📋", sub: "All time" },
    { label: "Purchase Orders", value: fmt(data.totalPurchaseOrders), color: t.orange,   icon: "🛒", sub: "All time" },
    { label: "Total Invoices",  value: fmt(data.totalInvoices),       color: t.warning,  icon: "🧾", sub: `${paidPct}% paid` },
    { label: "Paid Invoices",   value: fmt(data.paidInvoices),        color: t.success,  icon: "✅", sub: "Fully settled" },
    { label: "Pending",         value: fmt(data.pendingInvoices),     color: t.warning,  icon: "🕐", sub: "Awaiting payment" },
    { label: "Low Stock",       value: fmt(data.lowStockAlerts),      color: parseInt(data.lowStockAlerts) > 0 ? t.danger : t.success, icon: "⚠️", sub: "Items below 10 units" },
  ] : [];

  return (
    <MainLayout>
      <div className="erp-page">
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px", paddingBottom: "16px", borderBottom: `1px solid ${t.border}` }}>
          <div>
            <div style={{ fontSize: "22px", fontWeight: 800, color: t.text }}>Business Dashboard</div>
            <div style={{ fontSize: "12px", color: t.textMuted, marginTop: "2px" }}>Sri Laxmi Agencies — Pipes & Sanitary Distribution</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ padding: "6px 14px", borderRadius: "20px", background: t.surfaceAlt, border: `1px solid ${t.border}`, fontSize: "11px", color: t.textSub, fontWeight: 500 }}>
              📅 {today}
            </div>
          </div>
        </div>

        {error && (
          <div style={{ background: t.dangerBg, color: t.danger, border: `1px solid ${t.dangerBorder}`, padding: "10px 14px", borderRadius: "8px", marginBottom: "16px", fontSize: "13px" }}>
            ⚠️ {error}
          </div>
        )}
        {loading && (
          <div style={{ background: t.surfaceAlt, color: t.textSub, border: `1px solid ${t.border}`, padding: "12px 16px", borderRadius: "8px", marginBottom: "16px", fontSize: "13px", display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ display: "inline-block", width: "14px", height: "14px", border: `2px solid ${t.primary}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
            Loading dashboard data...
          </div>
        )}

        {data && (
          <>
            {/* Stat cards grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(175px, 1fr))", gap: "12px", marginBottom: "24px" }}>
              {statCards.map((card, i) => (
                <div key={card.label} style={{ animationDelay: `${i * 0.06}s` }}>
                  <StatCard {...card} />
                </div>
              ))}
            </div>

            {/* Main content: Financial + Invoice health */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: "16px", marginBottom: "16px" }}>

              {/* Financial Snapshot */}
              <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "14px", padding: "22px 24px", boxShadow: t.shadow }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: 700, color: t.text }}>Financial Snapshot</div>
                    <div style={{ fontSize: "11px", color: t.textMuted, marginTop: "2px" }}>Live money flow overview</div>
                  </div>
                  <div style={{ padding: "4px 10px", borderRadius: "20px", background: `${t.success}18`, border: `1px solid ${t.success}40`, fontSize: "10px", color: t.success, fontWeight: 700 }}>
                    LIVE
                  </div>
                </div>

                {/* Wallet balance hero */}
                <div style={{
                  background: walletBalance >= 0
                    ? `linear-gradient(135deg, ${t.success}18, ${t.success}08)`
                    : `linear-gradient(135deg, ${t.danger}18, ${t.danger}08)`,
                  border: `1px solid ${walletBalance >= 0 ? t.success + "40" : t.danger + "40"}`,
                  borderRadius: "12px", padding: "16px 20px", marginBottom: "20px",
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                }}>
                  <div>
                    <div style={{ fontSize: "10px", color: t.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.8px" }}>Company Wallet Balance</div>
                    <div style={{ fontSize: "28px", fontWeight: 900, color: walletBalance >= 0 ? t.success : t.danger, lineHeight: 1.1, marginTop: "4px" }}>
                      {fmtFull(walletBalance)}
                    </div>
                    <div style={{ fontSize: "11px", color: t.textMuted, marginTop: "4px" }}>Final balance after customer receipts and all payouts</div>
                  </div>
                  <Ring pct={Math.min(Math.abs(walletBalance) / Math.max(totalReceived, 1) * 100, 100)}
                    color={walletBalance >= 0 ? t.success : t.danger} size={64} stroke={7} />
                </div>

                {/* Bars */}
                <HBar label="Receivables Due" value={toReceive} max={maxFin} color={t.warning} fmt={fmtFull} sub="customers owe you" />
                <HBar label="Payables Due"    value={toPay}     max={maxFin} color={t.danger}  fmt={fmtFull} sub="you owe suppliers" />
                <HBar label="Total Collected" value={totalReceived} max={maxFin} color={t.primary} fmt={fmtFull} sub="from customers" />
                <HBar label="Total Paid Out"  value={totalPaid}    max={maxFin} color={t.purple}  fmt={fmtFull} sub="to suppliers" />
              </div>

              {/* Right column: Invoice health + quick stats */}
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {/* Invoice health ring */}
                <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "14px", padding: "20px", boxShadow: t.shadow }}>
                  <div style={{ fontSize: "12px", fontWeight: 700, color: t.text, marginBottom: "16px" }}>Invoice Health</div>
                  <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                    <div style={{ position: "relative", flexShrink: 0 }}>
                      <Ring pct={paidPct} color={t.success} size={80} stroke={8} />
                      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
                        <div style={{ fontSize: "16px", fontWeight: 900, color: t.success }}>{paidPct}%</div>
                        <div style={{ fontSize: "9px", color: t.textMuted }}>paid</div>
                      </div>
                    </div>
                    <div style={{ flex: 1 }}>
                      {[
                        { label: "Total",   value: fmt(data.totalInvoices),   color: t.primary },
                        { label: "Paid",    value: fmt(data.paidInvoices),    color: t.success },
                        { label: "Pending", value: fmt(data.pendingInvoices), color: t.warning },
                        { label: "Overdue", value: fmt(data.overdueInvoices ?? 0), color: t.danger },
                      ].map(row => (
                        <div key={row.label} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", fontSize: "12px" }}>
                          <span style={{ color: t.textMuted }}>{row.label}</span>
                          <span style={{ fontWeight: 700, color: row.color }}>{row.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Finance summary cards */}
                <FinCard label="To Collect" value={fmtShort(toReceive)} sub="from customers" color={t.warning} icon="⏳" />
                <FinCard label="To Pay"     value={fmtShort(toPay)}     sub="to suppliers"   color={t.danger}  icon="💸" />
                <FinCard label="Collected"  value={fmtShort(totalReceived)} sub="total received" color={t.primary} icon="✅" />
                <FinCard label="Paid Out"   value={fmtShort(totalPaid)}  sub="total paid"     color={t.purple}  icon="🏦" />
              </div>
            </div>

            {/* Bottom row: Revenue vs Payments bar + activity */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>

              {/* Revenue breakdown */}
              <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "14px", padding: "20px 22px", boxShadow: t.shadow }}>
                <div style={{ fontSize: "12px", fontWeight: 700, color: t.text, marginBottom: "16px" }}>Revenue vs Collections</div>
                {[
                  { label: "Total Revenue (Invoiced)", value: parseFloat(data.totalRevenue ?? 0), color: t.primary },
                  { label: "Total Collected",          value: totalReceived,                       color: t.success },
                  { label: "Outstanding",              value: toReceive,                           color: t.warning },
                  { label: "Supplier Payments",        value: totalPaid,                           color: t.purple },
                  { label: "Supplier Payables",        value: toPay,                               color: t.danger },
                ].map(row => {
                  const maxV = Math.max(parseFloat(data.totalRevenue ?? 0), totalReceived, toReceive, totalPaid, toPay, 1);
                  const pct = Math.min((row.value / maxV) * 100, 100);
                  return (
                    <div key={row.label} style={{ marginBottom: "12px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                        <span style={{ fontSize: "11px", color: t.textSub, fontWeight: 500 }}>{row.label}</span>
                        <span style={{ fontSize: "12px", fontWeight: 700, color: row.color }}>{fmtShort(row.value)}</span>
                      </div>
                      <div style={{ height: "6px", background: t.surfaceAlt, borderRadius: "3px", overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${pct}%`, background: row.color, borderRadius: "3px", transition: "width 1s ease" }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Business summary */}
              <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "14px", padding: "20px 22px", boxShadow: t.shadow }}>
                <div style={{ fontSize: "12px", fontWeight: 700, color: t.text, marginBottom: "16px" }}>Business Summary</div>
                <ActivityRow icon="📦" text={`${fmt(data.totalProducts)} products in catalogue`} time="Inventory" color={t.teal} />
                <ActivityRow icon="👥" text={`${fmt(data.totalCustomers)} active customers`} time="Customer base" color={t.primary} />
                <ActivityRow icon="🏭" text={`${fmt(data.totalSuppliers)} supplier partners`} time="Procurement" color={t.purple} />
                <ActivityRow icon="📋" text={`${fmt(data.totalSalesOrders)} sales orders placed`} time="Sales" color={t.success} />
                <ActivityRow icon="🛒" text={`${fmt(data.totalPurchaseOrders)} purchase orders`} time="Procurement" color={t.orange} />
                {parseInt(data.lowStockAlerts) > 0 && (
                  <ActivityRow icon="⚠️" text={`${fmt(data.lowStockAlerts)} items below minimum stock`} time="Needs attention" color={t.danger} />
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </MainLayout>
  );
}
