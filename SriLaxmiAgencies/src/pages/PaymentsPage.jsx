import { useEffect, useState, Fragment } from "react";
import MainLayout from "../layout/MainLayout";
import { getPaymentsByInvoice, createPayment, getOutstanding } from "../services/paymentService";
import { getInvoiceSummaries } from "../services/invoiceService";
import { getPurchaseOrders, getSupplierPayments, recordSupplierPayment, getSupplierTotalPaid } from "../services/purchaseService";
import { getWalletData } from "../services/dashboardService";
import { getCreditNotesByInvoice } from "../services/creditNoteService";
import { getSalesReturns, getRefundsByReturn, getTotalRefunded, recordRefund } from "../services/salesReturnService";
import { usePageStyles } from "../hooks/usePageStyles";

const PAY_COLORS = { PAID: "#16a34a", PARTIALLY_PAID: "#f59e0b", OVERDUE: "#ef4444", UNPAID: "#6b7280", PENDING: "#6b7280" };
const METHODS = ["CASH", "UPI", "BANK_TRANSFER", "CHEQUE", "NEFT", "RTGS"];

function PaymentsPage() {
  const ps = usePageStyles();
  const { t } = ps;
  const s = {
    header: ps.pageHeader, error: ps.alertError, info: ps.alertInfo,
    label: ps.label, input: ps.input,
    table: ps.table, thead: ps.thead, th: ps.th, tr: ps.tr, td: ps.td,
    btnGreen: ps.btnSuccess, btnRed: ps.btnDanger, btnGray: ps.btnGhost,
    btnSmGreen: ps.btnSmSuccess, btnSmRed: ps.btnSmDanger,
    badge: ps.badge, card: ps.card, cardLabel: ps.cardLabel, cardValue: ps.cardValue,
    overlay: ps.overlay, modal: ps.modal,
  };

  const [invoices, setInvoices] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [salesReturns, setSalesReturns] = useState([]); // for refunds tab
  const [returnRefundMap, setReturnRefundMap] = useState({}); // { [returnId]: totalRefunded }
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchReceive, setSearchReceive] = useState("");
  const [searchPay, setSearchPay] = useState("");
  const [searchRefund, setSearchRefund] = useState("");
  const [receiveFilter, setReceiveFilter] = useState("all");
  const [payFilter, setPayFilter] = useState("all");
  const [tab, setTab] = useState("receive"); // receive | pay | refunds

  // Refund modal state
  const [viewReturn, setViewReturn] = useState(null);
  const [returnRefunds, setReturnRefunds] = useState([]);
  const [returnTotalRefunded, setReturnTotalRefunded] = useState(0);
  const [refundAmount, setRefundAmount] = useState("");
  const [refundDate, setRefundDate] = useState(new Date().toISOString().split("T")[0]);
  const [refundMethod, setRefundMethod] = useState("CASH");
  const [refundNotes, setRefundNotes] = useState("");

  // Refund filter
  const [refundFilter, setRefundFilter] = useState("all");
  // Inline expandable refund rows
  const [expandedRefundId, setExpandedRefundId] = useState(null);
  const [expandedRefundTxns, setExpandedRefundTxns] = useState({}); // { [returnId]: [txns] }
  const [inlineRefundForm, setInlineRefundForm] = useState({}); // { [returnId]: { amount, date, method, notes } }

  // SO payment modal
  const [viewInvoice, setViewInvoice] = useState(null);
  const [soPayments, setSoPayments] = useState([]);
  const [soCreditNotes, setSoCreditNotes] = useState([]);
  const [soOutstanding, setSoOutstanding] = useState(null);
  const [soAmount, setSoAmount] = useState("");
  const [soDate, setSoDate] = useState(new Date().toISOString().split("T")[0]);
  const [soMethod, setSoMethod] = useState("CASH");

  // PO payment modal
  const [viewPO, setViewPO] = useState(null);
  const [poPayments, setPoPayments] = useState([]);
  const [poTotalPaid, setPoTotalPaid] = useState(0);
  const [poAmount, setPoAmount] = useState("");
  const [poDate, setPoDate] = useState(new Date().toISOString().split("T")[0]);
  const [poMethod, setPoMethod] = useState("CASH");
  const [poNotes, setPoNotes] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const [inv, pos, w, rets] = await Promise.all([getInvoiceSummaries(), getPurchaseOrders(), getWalletData(), getSalesReturns()]);
      setInvoices(inv); setPurchaseOrders(pos); setWallet(w);
      setSalesReturns(rets);
      // fetch total refunded for each return
      const map = {};
      await Promise.all(rets.map(async r => {
        try { map[r.id] = parseFloat(await getTotalRefunded(r.id)) || 0; }
        catch { map[r.id] = 0; }
      }));
      setReturnRefundMap(map);
      setError("");
    } catch { setError("Failed to load data"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const filteredReceive = invoices.filter(i => {
    const status = (i.paymentStatus || "PENDING").toUpperCase();
    // map to filter keys: paid, partial, pending
    const filterStatus = status === "PAID" ? "paid" : status === "PARTIALLY_PAID" ? "partial" : "pending";
    if (receiveFilter !== "all" && filterStatus !== receiveFilter) return false;
    const q = searchReceive.toLowerCase();
    return !q || i.invoiceNumber?.toLowerCase().includes(q) || i.customerName?.toLowerCase().includes(q);
  });

  const filteredPay = purchaseOrders.filter(p => {
    const paid = parseFloat(p.amountPaid || 0);
    const due = Math.max(0, parseFloat(p.totalAmount || 0) - paid);
    const filterStatus = paid === 0 ? "pending" : due === 0 ? "paid" : "partial";
    if (payFilter !== "all" && filterStatus !== payFilter) return false;
    const q = searchPay.toLowerCase();
    return !q || p.poNumber?.toLowerCase().includes(q) || p.supplier?.name?.toLowerCase().includes(q);
  });

  const filteredRefunds = salesReturns.filter(r => {
    const total = parseFloat(r.totalAmount || 0);
    const refunded = returnRefundMap[r.id] || 0;
    const pending = Math.max(0, total - refunded);
    const status = refunded === 0 ? "pending" : pending === 0 ? "completed" : "partial";
    if (refundFilter !== "all" && status !== refundFilter) return false;
    const q = searchRefund.toLowerCase();
    return !q || r.returnNumber?.toLowerCase().includes(q) ||
      r.invoice?.invoiceNumber?.toLowerCase().includes(q) ||
      r.invoice?.customer?.name?.toLowerCase().includes(q);
  });

  const totalPendingRefunds = salesReturns.reduce((s, r) => {
    const pending = parseFloat(r.totalAmount || 0) - (returnRefundMap[r.id] || 0);
    return s + Math.max(0, pending);
  }, 0);

  // SO payment modal
  const handleViewSO = async (inv) => {
    setViewInvoice(inv); setSoAmount(""); setSoMethod("CASH"); setSoDate(new Date().toISOString().split("T")[0]);
    try {
      const [p, o, cn] = await Promise.all([getPaymentsByInvoice(inv.id), getOutstanding(inv.id), getCreditNotesByInvoice(inv.id)]);
      setSoPayments(p); setSoOutstanding(o); setSoCreditNotes(cn);
    } catch { setSoPayments([]); setSoOutstanding(null); setSoCreditNotes([]); }
  };

  const handleSoPay = async () => {
    if (!soAmount || parseFloat(soAmount) <= 0) { setError("Enter a valid amount"); return; }
    try {
      setLoading(true); setError("");
      await createPayment({ invoice: { id: viewInvoice.id }, amount: parseFloat(soAmount), paymentDate: soDate, paymentMethod: soMethod });
      setSoAmount("");
      const [p, o, inv] = await Promise.all([getPaymentsByInvoice(viewInvoice.id), getOutstanding(viewInvoice.id), getInvoiceSummaries()]);
      setSoPayments(p); setSoOutstanding(o); setInvoices(inv);      const updated = inv.find(i => i.id === viewInvoice.id);
      if (updated) setViewInvoice(updated);
      const w = await getWalletData(); setWallet(w);
    } catch (e) { setError(e.response?.data?.message || "Failed to record payment"); }
    finally { setLoading(false); }
  };

  // PO payment modal
  const handleViewPO = async (po) => {
    setViewPO(po); setPoAmount(""); setPoMethod("CASH"); setPoDate(new Date().toISOString().split("T")[0]); setPoNotes("");
    try {
      const [pmts, paid] = await Promise.all([getSupplierPayments(po.id), getSupplierTotalPaid(po.id)]);
      setPoPayments(pmts); setPoTotalPaid(parseFloat(paid) || 0);
    } catch { setPoPayments([]); setPoTotalPaid(0); }
  };

  const handlePoPay = async () => {
    if (!poAmount || parseFloat(poAmount) <= 0) { setError("Enter a valid amount"); return; }
    try {
      setLoading(true); setError("");
      await recordSupplierPayment(viewPO.id, { amount: parseFloat(poAmount), paymentDate: poDate, paymentMethod: poMethod, notes: poNotes });
      setPoAmount(""); setPoNotes("");
      const [pmts, paid, pos, w] = await Promise.all([getSupplierPayments(viewPO.id), getSupplierTotalPaid(viewPO.id), getPurchaseOrders(), getWalletData()]);
      setPoPayments(pmts); setPoTotalPaid(parseFloat(paid) || 0); setPurchaseOrders(pos); setWallet(w);
      const updated = pos.find(p => p.id === viewPO.id);
      if (updated) setViewPO(updated);
    } catch (e) { setError(e.response?.data?.message || "Failed to record payment"); }
    finally { setLoading(false); }
  };

  // Refund inline expand
  const toggleExpandRefund = async (r) => {
    if (expandedRefundId === r.id) { setExpandedRefundId(null); return; }
    setExpandedRefundId(r.id);
    if (!expandedRefundTxns[r.id]) {
      try {
        const txns = await getRefundsByReturn(r.id);
        setExpandedRefundTxns(prev => ({ ...prev, [r.id]: txns }));
      } catch { setExpandedRefundTxns(prev => ({ ...prev, [r.id]: [] })); }
    }
  };

  const handleInlineRefund = async (r) => {
    const form = inlineRefundForm[r.id] || {};
    if (!form.amount || parseFloat(form.amount) <= 0) { setError("Enter a valid amount"); return; }
    try {
      setLoading(true); setError("");
      await recordRefund(r.id, {
        amount: parseFloat(form.amount),
        refundDate: form.date || new Date().toISOString().split("T")[0],
        paymentMethod: form.method || "CASH",
        notes: form.notes || ""
      });
      setInlineRefundForm(prev => ({ ...prev, [r.id]: {} }));
      const [txns, total, w] = await Promise.all([getRefundsByReturn(r.id), getTotalRefunded(r.id), getWalletData()]);
      setExpandedRefundTxns(prev => ({ ...prev, [r.id]: txns }));
      setReturnRefundMap(prev => ({ ...prev, [r.id]: parseFloat(total) || 0 }));
      setWallet(w);
    } catch (e) { setError(e.response?.data?.message || "Failed to record refund"); }
    finally { setLoading(false); }
  };

  // Refund modal (kept for handlePayRefund used elsewhere — now unused, safe to keep)
  const handleViewReturn = async (r) => {
    setViewReturn(r); setRefundAmount(""); setRefundMethod("CASH");
    setRefundDate(new Date().toISOString().split("T")[0]); setRefundNotes("");
    try {
      const [rfds, total] = await Promise.all([getRefundsByReturn(r.id), getTotalRefunded(r.id)]);
      setReturnRefunds(rfds); setReturnTotalRefunded(parseFloat(total) || 0);
    } catch { setReturnRefunds([]); setReturnTotalRefunded(0); }
  };

  const handlePayRefund = async () => {
    if (!refundAmount || parseFloat(refundAmount) <= 0) { setError("Enter a valid amount"); return; }
    try {
      setLoading(true); setError("");
      await recordRefund(viewReturn.id, { amount: parseFloat(refundAmount), refundDate: refundDate, paymentMethod: refundMethod, notes: refundNotes });
      setRefundAmount(""); setRefundNotes("");
      const [rfds, total, w] = await Promise.all([getRefundsByReturn(viewReturn.id), getTotalRefunded(viewReturn.id), getWalletData()]);
      const newTotal = parseFloat(total) || 0;
      setReturnRefunds(rfds);
      setReturnTotalRefunded(newTotal);
      setWallet(w);
      setReturnRefundMap(prev => ({ ...prev, [viewReturn.id]: newTotal }));
      const returnTotal = parseFloat(viewReturn.totalAmount || 0);
      if (newTotal >= returnTotal) setViewReturn(null);
    } catch (e) { setError(e.response?.data?.message || "Failed to record refund"); }
    finally { setLoading(false); }
  };

  const totalToReceive = filteredReceive.reduce((s, i) => s + parseFloat(i.dueAmount || 0), 0);
  const totalToPay = filteredPay.reduce((s, p) => {
    const paid = parseFloat(p.amountPaid || 0);
    const due = parseFloat(p.totalAmount || 0) - paid;
    return s + Math.max(0, due);
  }, 0);

  return (
    <MainLayout>
      <div style={ps.pageHeader}>
        <h2 style={{ margin: 0 }}>Payments</h2>
      </div>

      {error && <div style={s.error}>{error}</div>}
      {loading && <div style={s.info}>Loading...</div>}

      {/* Wallet */}
      {wallet && (
        <div style={{ display: "flex", gap: "12px", marginBottom: "24px" }}>
          <div style={{ ...s.card, borderColor: "#16a34a", flex: 1 }}>
            <div style={s.cardLabel}>Total Received (from customers)</div>
            <div style={{ ...s.cardValue, color: t.success }}>₹{parseFloat(wallet.totalReceived || 0).toFixed(2)}</div>
          </div>
          <div style={{ ...s.card, borderColor: t.danger, flex: 1 }}>
            <div style={s.cardLabel}>Total Paid (to suppliers)</div>
            <div style={{ ...s.cardValue, color: t.danger }}>₹{parseFloat(wallet.totalPaid || 0).toFixed(2)}</div>
          </div>
          <div style={{ ...s.card, borderColor: wallet.walletBalance >= 0 ? t.success : t.danger, flex: 1, background: t.successBg }}>
            <div style={s.cardLabel}>💰 Wallet Balance</div>
            <div style={{ ...s.cardValue, color: wallet.walletBalance >= 0 ? t.success : t.danger, fontSize: "22px" }}>
              ₹{parseFloat(wallet.walletBalance || 0).toFixed(2)}
            </div>
          </div>
          <div style={{ ...s.card, borderColor: t.warning, flex: 1 }}>
            <div style={s.cardLabel}>Still to Receive</div>
            <div style={{ ...s.cardValue, color: t.warning }}>₹{parseFloat(wallet.totalToReceive || 0).toFixed(2)}</div>
          </div>
          <div style={{ ...s.card, borderColor: t.purple, flex: 1 }}>
            <div style={s.cardLabel}>Still to Pay</div>
            <div style={{ ...s.cardValue, color: t.purple }}>₹{parseFloat(wallet.totalToPay || 0).toFixed(2)}</div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: "4px", marginBottom: "16px", borderBottom: `2px solid ${t.border}` }}>
        <button onClick={() => setTab("receive")}
          style={ps.tabBtn(tab === "receive", t.success)}>
          📥 Amt to Receive (Customers)
        </button>
        <button onClick={() => setTab("pay")}
          style={ps.tabBtn(tab === "pay", t.danger)}>
          📤 Amt to Pay (Suppliers)
        </button>
        <button onClick={() => setTab("refunds")}
          style={ps.tabBtn(tab === "refunds", t.purple)}>
          💸 Refunds to Pay (Customers)
          {totalPendingRefunds > 0 && (
            <span style={{ marginLeft: "6px", background: t.danger, color: "white", borderRadius: "10px", padding: "1px 7px", fontSize: "11px" }}>
              {filteredRefunds.length}
            </span>
          )}
        </button>
      </div>

      {/* TO RECEIVE TABLE */}
      {tab === "receive" && (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "8px" }}>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <div style={{ fontWeight: 600, color: t.success }}>Total Due: ₹{totalToReceive.toFixed(2)}</div>
              {[["all","All"],["pending","Pending"],["partial","Partial"],["paid","Paid"]].map(([f, label]) => (
                <button key={f} onClick={() => setReceiveFilter(f)}
                  style={ps.filterPill(receiveFilter === f, t.success)}>{label}</button>
              ))}
            </div>
            <input style={{ ...s.input, width: "220px" }} placeholder="Search invoice, customer..."
              value={searchReceive} onChange={e => setSearchReceive(e.target.value)} />
          </div>
          <table style={s.table}>
            <thead><tr style={s.thead}>
              <th style={s.th}>Invoice #</th><th style={s.th}>Date</th><th style={s.th}>Customer</th>
              <th style={s.th}>Total</th><th style={s.th}>Received</th><th style={s.th}>Due</th>
              <th style={s.th}>Status</th><th style={s.th}>Action</th>
            </tr></thead>
            <tbody>
              {filteredReceive.length === 0 && !loading && (
                <tr><td colSpan={8} style={{ ...s.td, textAlign: "center", color: "#9ca3af" }}>No invoices found</td></tr>
              )}
              {filteredReceive.map(inv => (
                <tr key={inv.id} style={s.tr}>
                  <td style={{ ...s.td, fontWeight: 600 }}>{inv.invoiceNumber}</td>
                  <td style={s.td}>{inv.invoiceDate}</td>
                  <td style={s.td}>{inv.customerName || "-"}</td>
                  <td style={s.td}>₹{parseFloat(inv.totalAmount || 0).toFixed(2)}</td>
                  <td style={{ ...s.td, color: "#16a34a" }}>₹{parseFloat(inv.paidAmount || 0).toFixed(2)}</td>
                  <td style={{ ...s.td, color: parseFloat(inv.dueAmount || 0) > 0 ? "#dc2626" : "#16a34a", fontWeight: 600 }}>
                    ₹{parseFloat(inv.dueAmount || 0).toFixed(2)}
                  </td>
                  <td style={s.td}><span style={{ ...s.badge, background: PAY_COLORS[inv.paymentStatus] || "#6b7280" }}>{inv.paymentStatus || "PENDING"}</span></td>
                  <td style={s.td}><button style={s.btnSmGreen} onClick={() => handleViewSO(inv)}>Record</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {/* TO PAY TABLE */}
      {tab === "pay" && (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "8px" }}>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <div style={{ fontWeight: 600, color: t.danger }}>Total Due: ₹{totalToPay.toFixed(2)}</div>
              {[["all","All"],["pending","Pending"],["partial","Partial"],["paid","Paid"]].map(([f, label]) => (
                <button key={f} onClick={() => setPayFilter(f)}
                  style={ps.filterPill(payFilter === f, t.danger)}>{label}</button>
              ))}
            </div>
            <input style={{ ...s.input, width: "220px" }} placeholder="Search PO#, supplier..."
              value={searchPay} onChange={e => setSearchPay(e.target.value)} />
          </div>
          <table style={s.table}>
            <thead><tr style={s.thead}>
              <th style={s.th}>PO #</th><th style={s.th}>Date</th><th style={s.th}>Supplier</th>
              <th style={s.th}>Order Amt</th><th style={s.th}>Paid</th><th style={s.th}>Due</th>
              <th style={s.th}>Status</th><th style={s.th}>Action</th>
            </tr></thead>
            <tbody>
              {filteredPay.length === 0 && !loading && (
                <tr><td colSpan={8} style={{ ...s.td, textAlign: "center", color: "#9ca3af" }}>No purchase orders found</td></tr>
              )}
              {filteredPay.map(po => {
                const paid = parseFloat(po.amountPaid || 0);
                const due = Math.max(0, parseFloat(po.totalAmount || 0) - paid);
                return (
                  <tr key={po.id} style={s.tr}>
                    <td style={{ ...s.td, fontWeight: 600 }}>{po.poNumber}</td>
                    <td style={s.td}>{po.orderDate}</td>
                    <td style={s.td}>{po.supplier?.name || "-"}</td>
                    <td style={s.td}>₹{parseFloat(po.totalAmount || 0).toFixed(2)}</td>
                    <td style={{ ...s.td, color: "#16a34a" }}>₹{paid.toFixed(2)}</td>
                    <td style={{ ...s.td, color: due > 0 ? "#dc2626" : "#16a34a", fontWeight: 600 }}>₹{due.toFixed(2)}</td>
                    <td style={s.td}><span style={{ ...s.badge, background: due === 0 ? "#16a34a" : "#f59e0b" }}>{due === 0 ? "PAID" : "PENDING"}</span></td>
                    <td style={s.td}><button style={s.btnSmRed} onClick={() => handleViewPO(po)}>Pay</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </>
      )}

      {/* REFUNDS TO PAY TABLE */}
      {tab === "refunds" && (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "8px" }}>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <div style={{ fontWeight: 600, color: t.purple }}>Total Pending: ₹{totalPendingRefunds.toFixed(2)}</div>
              {["all","pending","partial","completed"].map(f => (
                <button key={f} onClick={() => setRefundFilter(f)}
                  style={ps.filterPill(refundFilter === f, t.purple)}>
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
            <input style={{ ...s.input, width: "220px" }} placeholder="Search return#, invoice, customer..."
              value={searchRefund} onChange={e => setSearchRefund(e.target.value)} />
          </div>
          <table style={s.table}>
            <thead><tr style={s.thead}>
              <th style={s.th}></th>
              <th style={s.th}>Return #</th><th style={s.th}>Date</th><th style={s.th}>Invoice</th>
              <th style={s.th}>Customer</th><th style={s.th}>Return Total</th>
              <th style={s.th}>Refunded</th><th style={s.th}>Pending</th><th style={s.th}>Status</th>
            </tr></thead>
            <tbody>
              {filteredRefunds.length === 0 && !loading && (
                <tr><td colSpan={9} style={{ ...s.td, textAlign: "center", color: "#9ca3af" }}>No records found</td></tr>
              )}
              {filteredRefunds.map(r => {
                const total = parseFloat(r.totalAmount || 0);
                const refunded = returnRefundMap[r.id] || 0;
                const pending = Math.max(0, total - refunded);
                const status = refunded === 0 ? "PENDING" : pending === 0 ? "COMPLETED" : "PARTIAL";
                const statusColor = { PENDING: "#ef4444", PARTIAL: "#f59e0b", COMPLETED: "#16a34a" }[status];
                const isExp = expandedRefundId === r.id;
                const fmtDate = (d) => Array.isArray(d) ? `${d[0]}-${String(d[1]).padStart(2,"0")}-${String(d[2]).padStart(2,"0")}` : d || "-";
                return (
                  <Fragment key={r.id}>
                    <tr style={{ ...s.tr, cursor: "pointer", background: isExp ? t.purpleBg : t.surface, borderLeft: isExp ? `3px solid ${t.purple}` : "3px solid transparent" }}
                      onClick={() => toggleExpandRefund(r)}>
                      <td style={{ ...s.td, width: "32px", textAlign: "center", color: "#6b7280", fontSize: "12px" }}>{isExp ? "▲" : "▼"}</td>
                      <td style={{ ...s.td, fontWeight: 600 }}>{r.returnNumber}</td>
                      <td style={s.td}>{fmtDate(r.returnDate)}</td>
                      <td style={s.td}>{r.invoice?.invoiceNumber || "-"}</td>
                      <td style={s.td}>{r.invoice?.customer?.name || "-"}</td>
                      <td style={s.td}>₹{total.toFixed(2)}</td>
                      <td style={{ ...s.td, color: "#16a34a" }}>₹{refunded.toFixed(2)}</td>
                      <td style={{ ...s.td, color: pending > 0 ? "#ef4444" : "#16a34a", fontWeight: 600 }}>₹{pending.toFixed(2)}</td>
                      <td style={s.td}><span style={{ ...s.badge, background: statusColor }}>{status}</span></td>
                    </tr>
                    {isExp && (
                      <tr>
                        <td colSpan={9} style={{ padding: 0, background: t.purpleBg, borderBottom: `3px solid ${t.purple}` }}>
                          <div style={{ padding: "16px 24px" }}>
                            {/* summary */}
                            <div style={{ display: "flex", gap: "12px", marginBottom: "16px" }}>
                              <div style={s.card}><div style={s.cardLabel}>Return Total</div><div style={s.cardValue}>₹{total.toFixed(2)}</div></div>
                              <div style={{ ...s.card, borderColor: "#16a34a" }}><div style={s.cardLabel}>Refunded</div><div style={{ ...s.cardValue, color: "#16a34a" }}>₹{refunded.toFixed(2)}</div></div>
                              <div style={{ ...s.card, borderColor: pending > 0 ? "#ef4444" : "#16a34a" }}><div style={s.cardLabel}>Pending</div><div style={{ ...s.cardValue, color: pending > 0 ? "#ef4444" : "#16a34a" }}>₹{pending.toFixed(2)}</div></div>
                            </div>
                            {/* record refund form */}
                            {pending > 0 && (
                              <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "8px", padding: "14px", marginBottom: "14px" }}>
                                <div style={{ fontWeight: 600, fontSize: "13px", marginBottom: "10px", color: t.text }}>Pay Refund to Customer</div>
                                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "flex-end" }}>
                                  <div style={{ flex: "1 1 100px" }}><label style={s.label}>Amount (₹)</label>
                                    <input style={s.input} type="number" max={pending}
                                      value={inlineRefundForm[r.id]?.amount || ""}
                                      onChange={e => setInlineRefundForm(prev => ({ ...prev, [r.id]: { ...prev[r.id], amount: e.target.value } }))} />
                                  </div>
                                  <div style={{ flex: "1 1 130px" }}><label style={s.label}>Date</label>
                                    <input style={s.input} type="date"
                                      value={inlineRefundForm[r.id]?.date || new Date().toISOString().split("T")[0]}
                                      onChange={e => setInlineRefundForm(prev => ({ ...prev, [r.id]: { ...prev[r.id], date: e.target.value } }))} />
                                  </div>
                                  <div style={{ flex: "1 1 120px" }}><label style={s.label}>Method</label>
                                    <select style={s.input}
                                      value={inlineRefundForm[r.id]?.method || "CASH"}
                                      onChange={e => setInlineRefundForm(prev => ({ ...prev, [r.id]: { ...prev[r.id], method: e.target.value } }))}>
                                      {METHODS.map(m => <option key={m} value={m}>{m.replace("_"," ")}</option>)}
                                    </select>
                                  </div>
                                  <div style={{ flex: "2 1 150px" }}><label style={s.label}>Notes</label>
                                    <input style={s.input} placeholder="optional"
                                      value={inlineRefundForm[r.id]?.notes || ""}
                                      onChange={e => setInlineRefundForm(prev => ({ ...prev, [r.id]: { ...prev[r.id], notes: e.target.value } }))} />
                                  </div>
                                  <button style={{ ...ps.btnSuccess, background: t.purple }} onClick={() => handleInlineRefund(r)} disabled={loading}>Pay Refund</button>
                                </div>
                              </div>
                            )}
                            {pending === 0 && (
                              <div style={{ background: t.successBg, border: `1px solid ${t.successBorder}`, borderRadius: "6px", padding: "10px 14px", marginBottom: "12px", fontSize: "13px", color: t.success }}>
                                ✓ Full refund of ₹{total.toFixed(2)} paid to customer.
                              </div>
                            )}
                            {/* refund history */}
                            <div style={{ fontWeight: 600, marginBottom: "8px", fontSize: "13px", color: t.text }}>Refund Transactions</div>
                            <table style={s.table}>
                              <thead><tr style={s.thead}><th style={s.th}>#</th><th style={s.th}>Date</th><th style={s.th}>Amount</th><th style={s.th}>Method</th><th style={s.th}>Notes</th></tr></thead>
                              <tbody>
                                {(expandedRefundTxns[r.id] || []).length === 0 && (
                                  <tr><td colSpan={5} style={{ ...s.td, textAlign: "center", color: "#9ca3af" }}>No refund transactions yet</td></tr>
                                )}
                                {(expandedRefundTxns[r.id] || []).map((rf, i) => {
                                  const fmtD = (d) => Array.isArray(d) ? `${d[0]}-${String(d[1]).padStart(2,"0")}-${String(d[2]).padStart(2,"0")}` : d || "-";
                                  return (
                                    <tr key={rf.id} style={s.tr}>
                                      <td style={s.td}>{i + 1}</td>
                                      <td style={s.td}>{fmtD(rf.refundDate)}</td>
                                      <td style={{ ...s.td, color: "#7c3aed", fontWeight: 600 }}>₹{parseFloat(rf.amount).toFixed(2)}</td>
                                      <td style={s.td}>{rf.paymentMethod?.replace("_"," ")}</td>
                                      <td style={s.td}>{rf.notes || "-"}</td>
                                    </tr>
                                  );
                                })}
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
        </>
      )}

      {/* SO Payment Modal */}
      {viewInvoice && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
              <h3 style={{ margin: 0 }}>{viewInvoice.invoiceNumber}</h3>
              <button style={s.btnGray} onClick={() => setViewInvoice(null)}>Close</button>
            </div>
            <p style={{ margin: "0 0 16px", color: t.textSub, fontSize: "13px" }}>
              Customer: {viewInvoice.customerName} | Date: {viewInvoice.invoiceDate}
            </p>
            {soOutstanding && (
              <div style={{ display: "flex", gap: "12px", marginBottom: "20px" }}>
                <div style={s.card}><div style={s.cardLabel}>Total</div><div style={s.cardValue}>₹{parseFloat(soOutstanding.totalAmount || 0).toFixed(2)}</div></div>
                <div style={{ ...s.card, borderColor: "#16a34a" }}><div style={s.cardLabel}>Received</div><div style={{ ...s.cardValue, color: "#16a34a" }}>₹{parseFloat(soOutstanding.paidAmount || 0).toFixed(2)}</div></div>
                <div style={{ ...s.card, borderColor: "#ef4444" }}><div style={s.cardLabel}>Due</div><div style={{ ...s.cardValue, color: "#ef4444" }}>₹{parseFloat(soOutstanding.outstandingAmount || 0).toFixed(2)}</div></div>
              </div>
            )}
            {soOutstanding?.outstandingAmount > 0 && (
              <div style={{ background: t.surfaceAlt, border: `1px solid ${t.border}`, borderRadius: "8px", padding: "16px", marginBottom: "16px" }}>
                <div style={{ fontWeight: 600, marginBottom: "10px", fontSize: "14px", color: t.text }}>Record Payment Received</div>
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "flex-end" }}>
                  <div style={{ flex: "1 1 110px" }}><label style={s.label}>Amount (₹)</label><input style={s.input} type="number" value={soAmount} onChange={e => setSoAmount(e.target.value)} /></div>
                  <div style={{ flex: "1 1 140px" }}><label style={s.label}>Date</label><input style={s.input} type="date" value={soDate} onChange={e => setSoDate(e.target.value)} /></div>
                  <div style={{ flex: "1 1 130px" }}><label style={s.label}>Method</label>
                    <select style={s.input} value={soMethod} onChange={e => setSoMethod(e.target.value)}>
                      {METHODS.map(m => <option key={m} value={m}>{m.replace("_", " ")}</option>)}
                    </select>
                  </div>
                  <button style={s.btnGreen} onClick={handleSoPay} disabled={loading}>Record</button>
                </div>
              </div>
            )}
            <div style={{ fontWeight: 600, marginBottom: "8px", fontSize: "14px" }}>Payment History</div>
            <table style={s.table}>
              <thead><tr style={s.thead}><th style={s.th}>#</th><th style={s.th}>Date</th><th style={s.th}>Amount</th><th style={s.th}>Method</th></tr></thead>
              <tbody>
                {soPayments.length === 0 && <tr><td colSpan={4} style={{ ...s.td, textAlign: "center", color: "#9ca3af" }}>No payments yet</td></tr>}
                {soPayments.map((p, i) => (
                  <tr key={p.id} style={s.tr}>
                    <td style={s.td}>{i + 1}</td><td style={s.td}>{p.paymentDate}</td>
                    <td style={{ ...s.td, color: "#16a34a", fontWeight: 600 }}>₹{parseFloat(p.amount).toFixed(2)}</td>
                    <td style={s.td}>{p.paymentMethod?.replace("_", " ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {soCreditNotes.length > 0 && (
              <>
                <div style={{ fontWeight: 600, margin: "16px 0 8px", fontSize: "14px" }}>Credit Notes Applied</div>
                <table style={s.table}>
                  <thead><tr style={s.thead}><th style={s.th}>CN #</th><th style={s.th}>Date</th><th style={s.th}>Amount</th><th style={s.th}>Reason</th></tr></thead>
                  <tbody>
                    {soCreditNotes.map(cn => (
                      <tr key={cn.id} style={s.tr}>
                        <td style={{ ...s.td, fontWeight: 600 }}>{cn.creditNoteNumber}</td>
                        <td style={s.td}>{cn.date}</td>
                        <td style={{ ...s.td, color: "#f59e0b", fontWeight: 600 }}>₹{parseFloat(cn.amount).toFixed(2)}</td>
                        <td style={s.td}>{cn.reason || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </div>
        </div>
      )}

      {/* PO Payment Modal */}
      {viewPO && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
              <h3 style={{ margin: 0 }}>{viewPO.poNumber}</h3>
              <button style={s.btnGray} onClick={() => setViewPO(null)}>Close</button>
            </div>
            <p style={{ margin: "0 0 16px", color: t.textSub, fontSize: "13px" }}>
              Supplier: {viewPO.supplier?.name} | Date: {viewPO.orderDate}
            </p>
            {(() => {
              const orderAmt = parseFloat(viewPO.totalAmount || 0);
              const amtDue = orderAmt - poTotalPaid;
              return (
                <>
                  <div style={{ display: "flex", gap: "12px", marginBottom: "20px" }}>
                    <div style={s.card}><div style={s.cardLabel}>Order Amount</div><div style={s.cardValue}>₹{orderAmt.toFixed(2)}</div></div>
                    <div style={{ ...s.card, borderColor: "#16a34a" }}><div style={s.cardLabel}>Paid</div><div style={{ ...s.cardValue, color: "#16a34a" }}>₹{poTotalPaid.toFixed(2)}</div></div>
                    <div style={{ ...s.card, borderColor: amtDue > 0 ? "#ef4444" : "#16a34a" }}><div style={s.cardLabel}>Due</div><div style={{ ...s.cardValue, color: amtDue > 0 ? "#ef4444" : "#16a34a" }}>₹{Math.max(0, amtDue).toFixed(2)}</div></div>
                  </div>
                  {amtDue > 0 && (
                    <div style={{ background: t.surfaceAlt, border: `1px solid ${t.border}`, borderRadius: "8px", padding: "16px", marginBottom: "16px" }}>
                      <div style={{ fontWeight: 600, marginBottom: "10px", fontSize: "14px", color: t.text }}>Pay Supplier</div>
                      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "flex-end" }}>
                        <div style={{ flex: "1 1 110px" }}><label style={s.label}>Amount (₹)</label><input style={s.input} type="number" value={poAmount} onChange={e => setPoAmount(e.target.value)} /></div>
                        <div style={{ flex: "1 1 140px" }}><label style={s.label}>Date</label><input style={s.input} type="date" value={poDate} onChange={e => setPoDate(e.target.value)} /></div>
                        <div style={{ flex: "1 1 130px" }}><label style={s.label}>Method</label>
                          <select style={s.input} value={poMethod} onChange={e => setPoMethod(e.target.value)}>
                            {METHODS.map(m => <option key={m} value={m}>{m.replace("_", " ")}</option>)}
                          </select>
                        </div>
                        <div style={{ flex: "2 1 160px" }}><label style={s.label}>Notes</label><input style={s.input} placeholder="optional" value={poNotes} onChange={e => setPoNotes(e.target.value)} /></div>
                        <button style={s.btnRed} onClick={handlePoPay} disabled={loading}>Pay</button>
                      </div>
                    </div>
                  )}
                  <div style={{ fontWeight: 600, marginBottom: "8px", fontSize: "14px" }}>Payment History</div>
                  <table style={s.table}>
                    <thead><tr style={s.thead}><th style={s.th}>#</th><th style={s.th}>Date</th><th style={s.th}>Amount</th><th style={s.th}>Method</th><th style={s.th}>Notes</th></tr></thead>
                    <tbody>
                      {poPayments.length === 0 && <tr><td colSpan={5} style={{ ...s.td, textAlign: "center", color: "#9ca3af" }}>No payments yet</td></tr>}
                      {poPayments.map((p, i) => (
                        <tr key={p.id} style={s.tr}>
                          <td style={s.td}>{i + 1}</td><td style={s.td}>{p.paymentDate}</td>
                          <td style={{ ...s.td, color: "#ef4444", fontWeight: 600 }}>₹{parseFloat(p.amount).toFixed(2)}</td>
                          <td style={s.td}>{p.paymentMethod?.replace("_", " ")}</td>
                          <td style={s.td}>{p.notes || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </MainLayout>
  );
}

export default PaymentsPage;
