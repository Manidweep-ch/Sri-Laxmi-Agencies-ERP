import { useEffect, useState } from "react";
import MainLayout from "../layout/MainLayout";
import { getInvoiceSummaries, generateInvoiceFromSalesOrder } from "../services/invoiceService";
import { getSalesOrders } from "../services/salesService";
import { usePageStyles } from "../hooks/usePageStyles";

export default function InvoicePage() {
  const [invoices, setInvoices] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedSO, setSelectedSO] = useState("");
  const [tab, setTab] = useState("all");
  const ps = usePageStyles();
  const { t } = ps;

  const confirmableOrders = orders.filter(o => o.status === "SHIPPED");

  const displayInvoices = invoices.filter(i => {
    const q = i.invoiceNumber?.toLowerCase().includes(search.toLowerCase()) ||
      i.customerName?.toLowerCase().includes(search.toLowerCase());
    if (!q) return false;
    if (tab === "so") return i.invoiceType === "SO" || !i.invoiceType;
    if (tab === "po") return i.invoiceType === "PO";
    return true;
  });

  const load = async () => {
    setLoading(true);
    try {
      const [inv, ord] = await Promise.all([getInvoiceSummaries(), getSalesOrders()]);
      setInvoices(inv); setOrders(ord); setError("");
    } catch { setError("Failed to load data"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleGenerate = async () => {
    if (!selectedSO) { setError("Select a confirmed sales order"); return; }
    try {
      setLoading(true); setError("");
      await generateInvoiceFromSalesOrder(selectedSO);
      setSelectedSO(""); load();
    } catch (e) { setError(e.response?.data?.message || "Failed to generate invoice"); }
    finally { setLoading(false); }
  };

  const totalAmt = displayInvoices.reduce((s, i) => s + parseFloat(i.totalAmount || 0), 0);
  const totalPaid = displayInvoices.reduce((s, i) => s + parseFloat(i.paidAmount || 0), 0);
  const totalDue = displayInvoices.reduce((s, i) => s + parseFloat(i.dueAmount || 0), 0);

  const PAY_COLORS = {
    PAID: t.success, PARTIALLY_PAID: t.warning, OVERDUE: t.danger,
    PENDING: t.textMuted, UNPAID: t.textMuted,
  };

  const inp = { ...ps.input, marginBottom: 0 };

  return (
    <MainLayout>
      <div style={ps.pageHeader}>
        <h2 style={ps.pageTitle}>Invoices</h2>
        <input style={ps.searchInput} placeholder="Search invoice, customer..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {error && <div style={ps.alertError}>{error}</div>}
      {loading && <div style={ps.alertInfo}>Loading...</div>}

      {/* Generate */}
      <div style={ps.formBox}>
        <div style={{ fontSize: "13px", fontWeight: 700, color: t.text, marginBottom: "10px" }}>Generate Invoice from Sales Order</div>
        <div style={{ display: "flex", gap: "10px", alignItems: "flex-end" }}>
          <div style={{ flex: 1 }}>
            <select style={inp} value={selectedSO} onChange={e => setSelectedSO(e.target.value)}>
              <option value="">Select a shipped SO...</option>
              {confirmableOrders.map(o => (
                <option key={o.id} value={o.id}>{o.orderNumber} — {o.customer?.name} — ₹{parseFloat(o.totalAmount || 0).toFixed(2)}</option>
              ))}
            </select>
            {confirmableOrders.length === 0 && <div style={{ fontSize: "12px", color: t.textMuted, marginTop: "4px" }}>No shipped orders. Mark goods as sent in Sales Orders first.</div>}
          </div>
          <button style={ps.btnSuccess} onClick={handleGenerate} disabled={loading || !selectedSO}>Generate Invoice</button>
        </div>
      </div>

      {/* Summary */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginBottom: "20px" }}>
        {[
          { label: "Total Invoiced", value: `₹${totalAmt.toFixed(2)}`, color: t.primary },
          { label: "Total Received", value: `₹${totalPaid.toFixed(2)}`, color: t.success },
          { label: "Total Due", value: `₹${totalDue.toFixed(2)}`, color: t.danger },
        ].map((c, i) => (
          <div key={i} style={{ ...ps.card, borderLeft: `3px solid ${c.color}` }}>
            <div style={ps.cardLabel}>{c.label}</div>
            <div style={{ ...ps.cardValue, color: c.color }}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "4px", marginBottom: "16px", borderBottom: `2px solid ${t.border}` }}>
        {[["all","All Invoices"],["so","Sales (SO)"],["po","Purchase (PO)"]].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} style={ps.tabBtn(tab === key, t.tableHead)}>{label}</button>
        ))}
      </div>

      <div style={ps.tableWrap}>
        <table style={ps.table}>
          <thead>
            <tr style={ps.thead}>
              <th style={ps.th}>Invoice #</th><th style={ps.th}>Type</th><th style={ps.th}>Date</th>
              <th style={ps.th}>Due Date</th><th style={ps.th}>Customer</th>
              <th style={ps.th}>Total</th><th style={ps.th}>Paid</th><th style={ps.th}>Due</th>
              <th style={ps.th}>Status</th>
            </tr>
          </thead>
          <tbody>
            {displayInvoices.length === 0 && !loading && (
              <tr><td colSpan={9} style={{ ...ps.td, textAlign: "center", color: t.textMuted, padding: "32px" }}>No invoices found</td></tr>
            )}
            {displayInvoices.map(inv => (
              <tr key={inv.id} style={{ ...ps.tr, background: t.surface }}>
                <td style={{ ...ps.td, fontWeight: 700 }}>{inv.invoiceNumber}</td>
                <td style={ps.td}>
                  <span style={{ ...ps.badge, background: inv.invoiceType === "PO" ? t.purple : t.primary, color: "white" }}>
                    {inv.invoiceType || "SO"}
                  </span>
                </td>
                <td style={ps.tdSub}>{inv.invoiceDate}</td>
                <td style={ps.tdSub}>{inv.dueDate || "-"}</td>
                <td style={ps.td}>{inv.customerName || "-"}</td>
                <td style={{ ...ps.td, fontWeight: 600 }}>₹{parseFloat(inv.totalAmount || 0).toFixed(2)}</td>
                <td style={{ ...ps.td, color: t.success }}>₹{parseFloat(inv.paidAmount || 0).toFixed(2)}</td>
                <td style={{ ...ps.td, color: parseFloat(inv.dueAmount || 0) > 0 ? t.danger : t.success, fontWeight: 600 }}>
                  ₹{parseFloat(inv.dueAmount || 0).toFixed(2)}
                </td>
                <td style={ps.td}>
                  <span style={{ ...ps.badge, background: PAY_COLORS[inv.paymentStatus] || t.textMuted, color: "white" }}>
                    {inv.paymentStatus || "PENDING"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </MainLayout>
  );
}
