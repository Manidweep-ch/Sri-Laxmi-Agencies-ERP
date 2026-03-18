import { useEffect, useState, Fragment } from "react";
import MainLayout from "../layout/MainLayout";
import { getGRNAuditList } from "../services/grnService";
import { usePageStyles } from "../hooks/usePageStyles";
import { useTheme } from "../context/ThemeContext";
import { getTheme } from "../theme";

export default function GRNPage() {
  const ps = usePageStyles();
  const { dark } = useTheme();
  const t = getTheme(dark);

  const [grns, setGrns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [expandedId, setExpandedId] = useState(null);

  const load = async () => {
    setLoading(true);
    try { setGrns(await getGRNAuditList()); setError(""); }
    catch { setError("Failed to load GRN data"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const filtered = grns.filter(g => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      g.supplierName?.toLowerCase().includes(q) ||
      g.poNumber?.toLowerCase().includes(q) ||
      g.invoiceNumber?.toLowerCase().includes(q);
    const matchFrom = !fromDate || (g.receiptDate && g.receiptDate >= fromDate);
    const matchTo   = !toDate   || (g.receiptDate && g.receiptDate <= toDate);
    return matchSearch && matchFrom && matchTo;
  });

  const totalValue = filtered.reduce((s, g) => s + (g.totalValue || 0), 0);
  const totalQty   = filtered.reduce((s, g) => s + (g.totalQty || 0), 0);

  return (
    <MainLayout>
      <div className="erp-page">
        {/* Header */}
        <div style={ps.pageHeader}>
          <div>
            <h2 style={ps.pageTitle}>Goods Receipt — Audit Log</h2>
            <div style={{ fontSize: "12px", color: t.textMuted, marginTop: "2px" }}>
              Read-only view of all received goods across all purchase orders
            </div>
          </div>
          <button className="erp-btn" style={ps.btnGhost} onClick={load}>↻ Refresh</button>
        </div>

        {error && <div style={ps.alertError}>⚠ {error}</div>}
        {loading && <div style={ps.alertInfo}>Loading...</div>}

        {/* Filters */}
        <div style={{ display: "flex", gap: "10px", marginBottom: "16px", flexWrap: "wrap", alignItems: "center" }}>
          <input className="erp-input" style={{ ...ps.searchInput, minWidth: "220px" }}
            placeholder="Search supplier, PO number, invoice..."
            value={search} onChange={e => setSearch(e.target.value)} />
          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
            <label style={{ fontSize: "12px", color: t.textMuted }}>From</label>
            <input className="erp-input" style={{ ...ps.input, width: "140px", marginBottom: 0 }}
              type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} />
          </div>
          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
            <label style={{ fontSize: "12px", color: t.textMuted }}>To</label>
            <input className="erp-input" style={{ ...ps.input, width: "140px", marginBottom: 0 }}
              type="date" value={toDate} onChange={e => setToDate(e.target.value)} />
          </div>
          {(fromDate || toDate || search) && (
            <button style={ps.btnGhost} onClick={() => { setSearch(""); setFromDate(""); setToDate(""); }}>
              Clear
            </button>
          )}
        </div>

        {/* Summary cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "12px", marginBottom: "20px" }}>
          {[
            { label: "Total GRNs",    value: filtered.length,                                    icon: "📥", color: t.primary },
            { label: "Total Qty",     value: totalQty.toLocaleString("en-IN"),                   icon: "📦", color: "#7c3aed" },
            { label: "Total Value",   value: "₹" + (totalValue / 1000).toFixed(1) + "K",         icon: "💰", color: t.success },
          ].map(c => (
            <div key={c.label} style={{ ...ps.card, borderTop: `3px solid ${c.color}`, position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: "-8px", right: "-8px", fontSize: "36px", opacity: 0.08 }}>{c.icon}</div>
              <div style={{ fontSize: "20px", marginBottom: "6px" }}>{c.icon}</div>
              <div style={ps.cardLabel}>{c.label}</div>
              <div style={{ ...ps.cardValue, color: c.color, fontSize: "20px" }}>{c.value}</div>
            </div>
          ))}
        </div>

        {/* Table */}
        <div style={ps.tableWrap}>
          <table style={ps.table}>
            <thead>
              <tr style={ps.thead}>
                <th style={ps.th}></th>
                <th style={ps.th}>#</th>
                <th style={ps.th}>Receipt Date</th>
                <th style={ps.th}>PO Number</th>
                <th style={ps.th}>Supplier</th>
                <th style={ps.th}>Invoice No.</th>
                <th style={ps.th}>Total Qty</th>
                <th style={ps.th}>Total Value (₹)</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && !loading && (
                <tr><td colSpan={8} style={{ ...ps.td, textAlign: "center", color: t.textMuted, padding: "40px" }}>
                  No GRN records found
                </td></tr>
              )}
              {filtered.map((grn, idx) => {
                const isExpanded = expandedId === grn.id;
                return (
                  <Fragment key={grn.id}>
                    <tr style={{ ...ps.tr, cursor: "pointer", background: isExpanded ? t.surfaceAlt : t.surface, borderLeft: isExpanded ? `3px solid ${t.primary}` : "3px solid transparent" }}
                      onClick={() => setExpandedId(isExpanded ? null : grn.id)}>
                      <td style={{ ...ps.td, width: "28px", textAlign: "center", color: t.textMuted, fontSize: "11px" }}>
                        {isExpanded ? "▲" : "▼"}
                      </td>
                      <td style={ps.tdSub}>{idx + 1}</td>
                      <td style={ps.td}>{grn.receiptDate || "—"}</td>
                      <td style={{ ...ps.td, fontWeight: 600, color: "#2563eb" }}>{grn.poNumber || "—"}</td>
                      <td style={{ ...ps.td, fontWeight: 600 }}>{grn.supplierName}</td>
                      <td style={ps.tdSub}>{grn.invoiceNumber || "—"}</td>
                      <td style={ps.td}>{grn.totalQty}</td>
                      <td style={{ ...ps.td, fontWeight: 700 }}>₹{(grn.totalValue || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                    </tr>

                    {isExpanded && (
                      <tr>
                        <td colSpan={8} style={{ padding: "0 16px 12px", background: t.surfaceAlt }}>
                          <div style={{ padding: "10px 0" }}>
                            <div style={{ fontSize: "12px", fontWeight: 700, color: t.textSub, marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                              Items Received
                            </div>
                            <table style={{ ...ps.table, marginBottom: 0 }}>
                              <thead>
                                <tr style={ps.thead}>
                                  <th style={ps.th}>Product</th>
                                  <th style={ps.th}>Qty Received</th>
                                  <th style={ps.th}>Purchase Price (₹)</th>
                                  <th style={ps.th}>Line Value (₹)</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(grn.items || []).length === 0 && (
                                  <tr><td colSpan={4} style={{ ...ps.td, color: t.textMuted }}>No items</td></tr>
                                )}
                                {(grn.items || []).map((item, ii) => (
                                  <tr key={ii} style={ps.tr}>
                                    <td style={{ ...ps.td, fontWeight: 600 }}>{item.productName}</td>
                                    <td style={ps.td}>{item.quantity}</td>
                                    <td style={ps.td}>₹{(item.purchasePrice || 0).toFixed(2)}</td>
                                    <td style={{ ...ps.td, fontWeight: 600, color: t.success }}>
                                      ₹{(item.lineValue || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                    </td>
                                  </tr>
                                ))}
                                {/* Row total */}
                                <tr style={{ background: t.surface }}>
                                  <td colSpan={2} style={{ ...ps.td, fontWeight: 700, textAlign: "right" }}>Total</td>
                                  <td style={ps.td}></td>
                                  <td style={{ ...ps.td, fontWeight: 700, color: t.primary }}>
                                    ₹{(grn.totalValue || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
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
