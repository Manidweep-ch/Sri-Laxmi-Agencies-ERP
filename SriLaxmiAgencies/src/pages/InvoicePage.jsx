import { useEffect, useState } from "react";
import MainLayout from "../layout/MainLayout";
import { getInvoiceSummaries, getInvoiceItems } from "../services/invoiceService";
import { usePageStyles } from "../hooks/usePageStyles";
import { useTheme } from "../context/ThemeContext";
import { getTheme } from "../theme";

const PAY_COLORS = {
  PAID: "#16a34a", PARTIALLY_PAID: "#f59e0b", OVERDUE: "#ef4444",
  PENDING: "#6b7280", UNPAID: "#6b7280"
};

export default function InvoicePage() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [itemsCache, setItemsCache] = useState({});
  const [itemsLoading, setItemsLoading] = useState(false);
  const ps = usePageStyles();
  const { dark } = useTheme();
  const t = getTheme(dark);

  const load = async () => {
    setLoading(true);
    try {
      const all = await getInvoiceSummaries();
      // Only show SO invoices
      setInvoices(all.filter(i => i.invoiceType === "SO" || !i.invoiceType));
      setError("");
    } catch { setError("Failed to load invoices"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleExpand = async (inv) => {
    if (expandedId === inv.id) { setExpandedId(null); return; }
    setExpandedId(inv.id);
    if (!itemsCache[inv.id]) {
      setItemsLoading(true);
      try {
        const items = await getInvoiceItems(inv.id);
        setItemsCache(c => ({ ...c, [inv.id]: items }));
      } catch {}
      finally { setItemsLoading(false); }
    }
  };

  const displayed = invoices.filter(i => {
    const q = search.toLowerCase();
    return i.invoiceNumber?.toLowerCase().includes(q) || i.customerName?.toLowerCase().includes(q);
  });

  const totalAmt  = displayed.reduce((s, i) => s + parseFloat(i.totalAmount || 0), 0);
  const totalPaid = displayed.reduce((s, i) => s + parseFloat(i.paidAmount || 0), 0);
  const totalDue  = displayed.reduce((s, i) => s + parseFloat(i.dueAmount || 0), 0);

  return (
    <MainLayout>
      <div className="erp-page">
        <div style={ps.pageHeader}>
          <div>
            <h2 style={ps.pageTitle}>Invoices</h2>
            <div style={{ fontSize: "12px", color: t.textMuted, marginTop: "2px" }}>
              {displayed.length} invoices &middot; click a row to see line items
            </div>
          </div>
          <input className="erp-input" style={ps.searchInput} placeholder="Search invoice #, customer..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {error && <div style={ps.alertError}>{error}</div>}
        {loading && <div style={ps.alertInfo}>Loading...</div>}

        {/* Summary cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginBottom: "20px" }}>
          {[
            { label: "Total Invoiced", value: totalAmt,  color: "#2563eb" },
            { label: "Total Received", value: totalPaid, color: "#16a34a" },
            { label: "Total Due",      value: totalDue,  color: "#ef4444" },
          ].map(c => (
            <div key={c.label} style={{ ...ps.card, borderLeft: `3px solid ${c.color}` }}>
              <div style={ps.cardLabel}>{c.label}</div>
              <div style={{ ...ps.cardValue, color: c.color }}>
                Rs.{c.value.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </div>
            </div>
          ))}
        </div>

        <div style={ps.tableWrap}>
          <table style={ps.table}>
            <colgroup>
              <col style={{ width: "32px" }} /><col style={{ width: "150px" }} /><col style={{ width: "100px" }} /><col style={{ width: "100px" }} /><col style={{ width: "180px" }} /><col style={{ width: "120px" }} /><col style={{ width: "120px" }} /><col style={{ width: "120px" }} /><col style={{ width: "120px" }} />
            </colgroup>
            <thead>
              <tr style={ps.thead}>
                <th style={ps.th} />
                <th style={ps.th}>Invoice #</th>
                <th style={ps.th}>Date</th>
                <th style={ps.th}>Due Date</th>
                <th style={ps.th}>Customer</th>
                <th style={ps.th}>Total (Rs.)</th>
                <th style={ps.th}>Paid (Rs.)</th>
                <th style={ps.th}>Due (Rs.)</th>
                <th style={ps.th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {displayed.length === 0 && !loading && (
                <tr><td colSpan={9} style={{ ...ps.td, textAlign: "center", color: t.textMuted, padding: "40px" }}>No invoices found</td></tr>
              )}
              {displayed.map(inv => {
                const isOpen = expandedId === inv.id;
                const items = itemsCache[inv.id] || [];
                return [
                  <tr key={inv.id} className="erp-tr"
                    style={{ ...ps.tr, background: isOpen ? t.surfaceAlt : t.surface, cursor: "pointer" }}
                    onClick={() => handleExpand(inv)}>
                    <td style={{ ...ps.td, textAlign: "center", color: t.textMuted, fontSize: "11px" }}>
                      {isOpen ? "▼" : "▶"}
                    </td>
                    <td style={{ ...ps.td, fontWeight: 700 }}>{inv.invoiceNumber}</td>
                    <td style={ps.tdSub}>{inv.invoiceDate || "-"}</td>
                    <td style={ps.tdSub}>{inv.dueDate || "-"}</td>
                    <td style={ps.td}>{inv.customerName || "-"}</td>
                    <td style={{ ...ps.td, fontWeight: 600 }}>
                      Rs.{parseFloat(inv.totalAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ ...ps.td, color: "#16a34a" }}>
                      Rs.{parseFloat(inv.paidAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ ...ps.td, color: parseFloat(inv.dueAmount || 0) > 0 ? "#ef4444" : "#16a34a", fontWeight: 600 }}>
                      Rs.{parseFloat(inv.dueAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td style={ps.td}>
                      <span style={{ padding: "3px 8px", borderRadius: "12px", fontSize: "11px", fontWeight: 600, background: (PAY_COLORS[inv.paymentStatus] || "#6b7280") + "22", color: PAY_COLORS[inv.paymentStatus] || "#6b7280" }}>
                        {inv.paymentStatus || "PENDING"}
                      </span>
                    </td>
                  </tr>,
                  isOpen && (
                    <tr key={`${inv.id}-items`}>
                      <td colSpan={9} style={{ padding: 0, background: t.surfaceAlt }}>
                        <div style={{ padding: "12px 24px 16px 48px" }}>
                          <div style={{ fontSize: "12px", fontWeight: 700, color: t.textMuted, marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                            Line Items
                          </div>
                          {itemsLoading && !itemsCache[inv.id] ? (
                            <div style={{ color: t.textMuted, fontSize: "13px" }}>Loading items...</div>
                          ) : items.length === 0 ? (
                            <div style={{ color: t.textMuted, fontSize: "13px" }}>No items found</div>
                          ) : (
                            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                              <thead>
                                <tr style={{ background: t.tableHead }}>
                                  {["Product", "Qty", "Unit Price", "Line Total", "Cost Price", "Margin"].map(h => (
                                    <th key={h} style={{ ...ps.th, fontSize: "11px", padding: "6px 10px" }}>{h}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {items.map(item => {
                                  const lineTotal = parseFloat(item.totalPrice || 0);
                                  const cost = parseFloat(item.costPrice || 0) * (item.quantity || 1);
                                  const margin = lineTotal - cost;
                                  return (
                                    <tr key={item.id} style={{ background: t.surface, borderBottom: `1px solid ${t.border}` }}>
                                      <td style={{ ...ps.td, padding: "6px 10px" }}>{item.product?.name || "-"}</td>
                                      <td style={{ ...ps.tdSub, padding: "6px 10px" }}>{item.quantity}</td>
                                      <td style={{ ...ps.td, padding: "6px 10px" }}>
                                        Rs.{parseFloat(item.unitPrice || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                      </td>
                                      <td style={{ ...ps.td, padding: "6px 10px", fontWeight: 600 }}>
                                        Rs.{lineTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                      </td>
                                      <td style={{ ...ps.tdSub, padding: "6px 10px", color: "#7c3aed" }}>
                                        {item.costPrice ? `Rs.${cost.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "-"}
                                      </td>
                                      <td style={{ ...ps.td, padding: "6px 10px", color: margin >= 0 ? "#16a34a" : "#ef4444", fontWeight: 600 }}>
                                        {item.costPrice ? `Rs.${margin.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "-"}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                ];
              })}
            </tbody>
          </table>
        </div>
      </div>
    </MainLayout>
  );
}
