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
  const [view, setView] = useState("list"); // "list" | "detail"
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  
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

  const handleViewDetail = (inv) => {
    setSelectedInvoice(inv);
    setView("detail");
  };

  const goBack = () => {
    setView("list");
    setSelectedInvoice(null);
    load();
  };

  if (view === "detail" && selectedInvoice) {
    return <MainLayout><InvoiceDetailView inv={selectedInvoice} onBack={goBack} /></MainLayout>;
  }

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
              {displayed.length} invoices
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
              <col style={{ width: "150px" }} /><col style={{ width: "100px" }} /><col style={{ width: "100px" }} /><col style={{ width: "180px" }} /><col style={{ width: "120px" }} /><col style={{ width: "120px" }} /><col style={{ width: "120px" }} /><col style={{ width: "120px" }} />
            </colgroup>
            <thead>
              <tr style={ps.thead}>
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
                <tr><td colSpan={8} style={{ ...ps.td, textAlign: "center", color: t.textMuted, padding: "40px" }}>No invoices found</td></tr>
              )}
              {displayed.map(inv => (
                <tr key={inv.id} className="erp-tr"
                  style={{ ...ps.tr, background: t.surface, cursor: "pointer" }}
                  onClick={() => handleViewDetail(inv)}>
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </MainLayout>
  );
}

// ── Invoice Detail View (Full Page) ──────────────────────────────────────────
function InvoiceDetailView({ inv, onBack }) {
  const ps = usePageStyles();
  const { dark } = useTheme();
  const t = getTheme(dark);
  const s = { label: ps.label, table: ps.table, thead: ps.thead, th: ps.th, tr: ps.tr, td: ps.td, totalRow: ps.totalRow };

  const [items, setItems] = useState([]);
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getInvoiceById(inv.id), getInvoiceItems(inv.id)])
      .then(([fullInv, its]) => { setInvoice(fullInv); setItems(its); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [inv.id]);

  const subTotal = items.reduce((acc, i) => acc + (parseFloat(i.unitPrice) || 0) * (i.quantity || 0), 0);
  const totalTax = items.reduce((acc, i) => acc + (parseFloat(i.unitPrice) || 0) * (i.quantity || 0) * ((i.product?.gst || 0) / 100), 0);
  const grandTotal = invoice?.totalAmount ?? (subTotal + totalTax);

  const PSTATUS_COLOR = { PAID: "#16a34a", PARTIALLY_PAID: "#f59e0b", OVERDUE: "#ef4444", PENDING: "#6b7280" };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
        <button onClick={onBack} style={{ padding: "7px 14px", border: `1px solid ${t.border}`, borderRadius: "6px", background: t.surface, color: t.text, cursor: "pointer", fontSize: "13px" }}>
          ← Back
        </button>
        <div>
          <h2 style={{ margin: 0, fontSize: "18px", color: t.text }}>Invoice — {inv.invoiceNumber}</h2>
          <div style={{ fontSize: "12px", color: t.textSub, marginTop: "2px" }}>Customer: {inv.customerName}</div>
        </div>
      </div>

      {loading ? (
        <div style={ps.alertInfo}>Loading invoice...</div>
      ) : (
        <>
          {/* Header info cards */}
          <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "8px", padding: "16px", marginBottom: "16px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "12px" }}>
              {[
                { label: "Invoice No", value: inv.invoiceNumber },
                { label: "Invoice Date", value: invoice?.invoiceDate || "—" },
                { label: "Due Date", value: invoice?.dueDate || "—" },
                { label: "Payment Status", value: inv.paymentStatus, color: PSTATUS_COLOR[inv.paymentStatus] },
              ].map(card => (
                <div key={card.label} style={{ background: t.surfaceAlt, border: `1px solid ${t.border}`, borderRadius: "8px", padding: "12px" }}>
                  <div style={{ fontSize: "11px", color: t.textSub, marginBottom: "4px", textTransform: "uppercase", fontWeight: 600, letterSpacing: "0.5px" }}>{card.label}</div>
                  <div style={{ fontSize: "14px", fontWeight: 700, color: card.color || t.text }}>{card.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Items table */}
          <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "8px", padding: "16px", marginBottom: "16px" }}>
            <div style={{ fontWeight: 700, fontSize: "13px", color: t.text, marginBottom: "12px" }}>Line Items</div>
            <table style={s.table}>
              <thead><tr style={s.thead}>
                <th style={s.th}>Product</th>
                <th style={s.th}>HSN</th>
                <th style={s.th}>GST %</th>
                <th style={s.th}>Price (Rs.)</th>
                <th style={s.th}>Disc %</th>
                <th style={s.th}>Qty</th>
                <th style={s.th}>Tax (Rs.)</th>
                <th style={s.th}>Total (Rs.)</th>
              </tr></thead>
              <tbody>
                {items.length === 0 && <tr><td colSpan={8} style={{ ...s.td, textAlign: "center", color: t.textMuted }}>No items</td></tr>}
                {items.map(item => {
                  const price = parseFloat(item.unitPrice) || 0;
                  const disc = parseFloat(item.discount) || 0;
                  const qty = item.quantity || 0;
                  const gst = item.product?.gst || 0;
                  const tax = price * qty * gst / 100;
                  return (
                    <tr key={item.id} style={s.tr}>
                      <td style={{ ...s.td, fontWeight: 600 }}>{item.product?.name}{item.product?.size ? ` - ${item.product.size}` : ""}</td>
                      <td style={{ ...s.td, color: t.textSub, fontSize: "12px" }}>{item.product?.hsnCode || "—"}</td>
                      <td style={s.td}>{gst}%</td>
                      <td style={s.td}>Rs.{price.toFixed(2)}</td>
                      <td style={s.td}>{disc}%</td>
                      <td style={s.td}>{qty}</td>
                      <td style={s.td}>Rs.{tax.toFixed(2)}</td>
                      <td style={{ ...s.td, fontWeight: 600 }}>Rs.{(price * qty + tax).toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "12px" }}>
              <div style={{ background: t.surfaceAlt, border: `1px solid ${t.border}`, borderRadius: "8px", padding: "12px 20px", minWidth: "260px" }}>
                <div style={s.totalRow}><span>Sub Total</span><span>Rs.{subTotal.toFixed(2)}</span></div>
                <div style={s.totalRow}><span>Total GST</span><span>Rs.{totalTax.toFixed(2)}</span></div>
                <div style={{ ...s.totalRow, fontWeight: 700, fontSize: "16px", borderTop: `1px solid ${t.border}`, paddingTop: "8px", marginTop: "4px" }}>
                  <span>Final Price</span><span>Rs.{parseFloat(grandTotal).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

import { getInvoiceById } from "../services/invoiceService";
