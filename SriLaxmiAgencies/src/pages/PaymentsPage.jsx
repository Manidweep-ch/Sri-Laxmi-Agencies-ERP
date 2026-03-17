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
const fmt2 = v => `Rs.${parseFloat(v || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

// ── SO Payment Full Page ──────────────────────────────────────────────────────
function SOPayPage({ inv, onBack, onDone, ps }) {
  const { t } = ps;
  const [payments, setPayments] = useState([]);
  const [creditNotes, setCreditNotes] = useState([]);
  const [outstanding, setOutstanding] = useState(null);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [method, setMethod] = useState("CASH");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const load = async () => {
    try {
      const [p, o, cn] = await Promise.all([getPaymentsByInvoice(inv.id), getOutstanding(inv.id), getCreditNotesByInvoice(inv.id)]);
      setPayments(p); setOutstanding(o); setCreditNotes(cn);
    } catch { setError("Failed to load payment data"); }
  };

  useEffect(() => { load(); }, [inv.id]);

  const cnTotal = creditNotes.reduce((s, cn) => s + parseFloat(cn.amount || 0), 0);
  const rawDue = parseFloat(outstanding?.outstandingAmount || 0);
  const effectiveDue = Math.max(0, rawDue - cnTotal);

  const handlePay = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { setError("Enter a valid amount"); return; }
    if (amt > effectiveDue) { setError(`Amount exceeds net due (${fmt2(effectiveDue)})`); return; }
    try {
      setLoading(true); setError("");
      await createPayment({ invoice: { id: inv.id }, amount: amt, paymentDate: date, paymentMethod: method });
      setAmount("");
      await load();
      onDone();
    } catch (e) { setError(e.response?.data?.message || "Failed to record payment"); }
    finally { setLoading(false); }
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
        <button onClick={onBack} style={{ padding: "7px 14px", border: `1px solid ${t.border}`, borderRadius: "6px", background: t.surface, color: t.text, cursor: "pointer", fontSize: "13px" }}>← Back</button>
        <div>
          <h2 style={{ margin: 0, fontSize: "18px", color: t.text }}>Record Payment — {inv.invoiceNumber}</h2>
          <div style={{ fontSize: "12px", color: t.textSub, marginTop: "2px" }}>Customer: {inv.customerName} · {inv.invoiceDate}</div>
        </div>
      </div>

      {error && <div style={ps.alertError}>{error}</div>}

      {outstanding && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "12px", marginBottom: "20px" }}>
          {[
            { label: "Invoice Total", value: fmt2(outstanding.totalAmount) },
            { label: "Received", value: fmt2(outstanding.paidAmount), color: "#16a34a" },
            ...(cnTotal > 0 ? [{ label: "Credit Notes", value: `-${fmt2(cnTotal)}`, color: "#f59e0b" }] : []),
            { label: "Net Due", value: fmt2(effectiveDue), color: effectiveDue > 0 ? "#ef4444" : "#16a34a", highlight: true },
          ].map(c => (
            <div key={c.label} style={{ background: c.highlight ? "#eff6ff" : t.surfaceAlt, border: `1px solid ${c.highlight ? "#bfdbfe" : t.border}`, borderRadius: "8px", padding: "14px" }}>
              <div style={{ fontSize: "11px", color: t.textSub, marginBottom: "4px" }}>{c.label}</div>
              <div style={{ fontSize: "20px", fontWeight: 700, color: c.color || (c.highlight ? "#2563eb" : t.text) }}>{c.value}</div>
            </div>
          ))}
        </div>
      )}

      {effectiveDue > 0 ? (
        <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "8px", padding: "20px", marginBottom: "20px" }}>
          <div style={{ fontWeight: 700, fontSize: "14px", color: t.text, marginBottom: "14px" }}>Record Payment Received</div>
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "flex-end" }}>
            <div>
              <label style={ps.label}>Amount (Rs.) *</label>
              <input style={{ ...ps.input, width: "150px", marginBottom: 0 }} type="number" min="0" max={effectiveDue}
                value={amount} onChange={e => setAmount(e.target.value)} />
            </div>
            <div>
              <label style={ps.label}>Date</label>
              <input style={{ ...ps.input, width: "150px", marginBottom: 0 }} type="date" value={date} onChange={e => setDate(e.target.value)} />
            </div>
            <div>
              <label style={ps.label}>Method</label>
              <select style={{ ...ps.input, width: "150px", marginBottom: 0 }} value={method} onChange={e => setMethod(e.target.value)}>
                {METHODS.map(m => <option key={m} value={m}>{m.replace("_", " ")}</option>)}
              </select>
            </div>
            <button style={ps.btnSuccess} onClick={handlePay} disabled={loading}>{loading ? "Saving..." : "Record Payment"}</button>
          </div>
        </div>
      ) : (
        <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "8px", padding: "14px 16px", marginBottom: "20px", color: "#16a34a", fontWeight: 600 }}>
          {cnTotal > 0 && rawDue > 0 ? `Balance of ${fmt2(rawDue)} fully covered by credit notes.` : "Invoice fully settled."}
        </div>
      )}

      {payments.length > 0 && (
        <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "8px", padding: "20px", marginBottom: "20px" }}>
          <div style={{ fontWeight: 700, fontSize: "14px", color: t.text, marginBottom: "12px" }}>Payment History</div>
          <table style={ps.table}>
            <thead><tr style={ps.thead}>
              <th style={ps.th}>#</th><th style={ps.th}>Date</th><th style={ps.th}>Amount</th><th style={ps.th}>Method</th>
            </tr></thead>
            <tbody>
              {payments.map((p, i) => (
                <tr key={p.id} style={ps.tr}>
                  <td style={ps.td}>{i + 1}</td>
                  <td style={ps.tdSub}>{p.paymentDate}</td>
                  <td style={{ ...ps.td, color: "#16a34a", fontWeight: 600 }}>{fmt2(p.amount)}</td>
                  <td style={ps.tdSub}>{p.paymentMethod?.replace("_", " ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {creditNotes.length > 0 && (
        <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "8px", padding: "20px" }}>
          <div style={{ fontWeight: 700, fontSize: "14px", color: t.text, marginBottom: "12px" }}>Credit Notes Applied</div>
          <table style={ps.table}>
            <thead><tr style={ps.thead}>
              <th style={ps.th}>CN #</th><th style={ps.th}>Date</th><th style={ps.th}>Amount</th><th style={ps.th}>Reason</th>
            </tr></thead>
            <tbody>
              {creditNotes.map(cn => (
                <tr key={cn.id} style={ps.tr}>
                  <td style={{ ...ps.td, fontWeight: 600 }}>{cn.creditNoteNumber}</td>
                  <td style={ps.tdSub}>{cn.date}</td>
                  <td style={{ ...ps.td, color: "#f59e0b", fontWeight: 600 }}>-{fmt2(cn.amount)}</td>
                  <td style={ps.tdSub}>{cn.reason || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── PO Payment Full Page ──────────────────────────────────────────────────────
function POPayPage({ po, onBack, onDone, ps }) {
  const { t } = ps;
  const [payments, setPayments] = useState([]);
  const [totalPaid, setTotalPaid] = useState(0);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [method, setMethod] = useState("CASH");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const load = async () => {
    try {
      const [pmts, paid] = await Promise.all([getSupplierPayments(po.id), getSupplierTotalPaid(po.id)]);
      setPayments(pmts); setTotalPaid(parseFloat(paid) || 0);
    } catch { setError("Failed to load payment data"); }
  };

  useEffect(() => { load(); }, [po.id]);

  const orderAmt = parseFloat(po.totalAmount || 0);
  const amtDue = Math.max(0, orderAmt - totalPaid);

  const handlePay = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { setError("Enter a valid amount"); return; }
    if (amt > amtDue) { setError(`Amount exceeds balance due (${fmt2(amtDue)})`); return; }
    try {
      setLoading(true); setError("");
      await recordSupplierPayment(po.id, { amount: amt, paymentDate: date, paymentMethod: method, notes });
      setAmount(""); setNotes("");
      await load();
      onDone();
    } catch (e) { setError(e.response?.data?.message || "Payment failed"); }
    finally { setLoading(false); }
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
        <button onClick={onBack} style={{ padding: "7px 14px", border: `1px solid ${t.border}`, borderRadius: "6px", background: t.surface, color: t.text, cursor: "pointer", fontSize: "13px" }}>← Back</button>
        <div>
          <h2 style={{ margin: 0, fontSize: "18px", color: t.text }}>Supplier Payment — {po.poNumber}</h2>
          <div style={{ fontSize: "12px", color: t.textSub, marginTop: "2px" }}>Supplier: {po.supplier?.name} · {po.orderDate}</div>
        </div>
      </div>

      {error && <div style={ps.alertError}>{error}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "12px", marginBottom: "20px" }}>
        {[
          { label: "PO Total", value: fmt2(orderAmt) },
          { label: "Total Paid", value: fmt2(totalPaid), color: "#16a34a" },
          { label: "Balance Due", value: fmt2(amtDue), color: amtDue > 0 ? "#ef4444" : "#16a34a", highlight: true },
        ].map(c => (
          <div key={c.label} style={{ background: c.highlight ? "#eff6ff" : t.surfaceAlt, border: `1px solid ${c.highlight ? "#bfdbfe" : t.border}`, borderRadius: "8px", padding: "14px" }}>
            <div style={{ fontSize: "11px", color: t.textSub, marginBottom: "4px" }}>{c.label}</div>
            <div style={{ fontSize: "20px", fontWeight: 700, color: c.color || (c.highlight ? "#2563eb" : t.text) }}>{c.value}</div>
          </div>
        ))}
      </div>

      {amtDue > 0 ? (
        <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "8px", padding: "20px", marginBottom: "20px" }}>
          <div style={{ fontWeight: 700, fontSize: "14px", color: t.text, marginBottom: "14px" }}>Pay Supplier</div>
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "flex-end" }}>
            <div>
              <label style={ps.label}>Amount (Rs.) *</label>
              <input style={{ ...ps.input, width: "150px", marginBottom: 0 }} type="number" min="0" max={amtDue}
                value={amount} onChange={e => setAmount(e.target.value)} />
            </div>
            <div>
              <label style={ps.label}>Date</label>
              <input style={{ ...ps.input, width: "150px", marginBottom: 0 }} type="date" value={date} onChange={e => setDate(e.target.value)} />
            </div>
            <div>
              <label style={ps.label}>Method</label>
              <select style={{ ...ps.input, width: "150px", marginBottom: 0 }} value={method} onChange={e => setMethod(e.target.value)}>
                {METHODS.map(m => <option key={m} value={m}>{m.replace("_", " ")}</option>)}
              </select>
            </div>
            <div style={{ flex: "2 1 180px" }}>
              <label style={ps.label}>Notes</label>
              <input style={{ ...ps.input, marginBottom: 0 }} placeholder="Optional..." value={notes} onChange={e => setNotes(e.target.value)} />
            </div>
            <button style={ps.btnDanger} onClick={handlePay} disabled={loading}>{loading ? "Saving..." : "Pay"}</button>
          </div>
        </div>
      ) : (
        <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "8px", padding: "14px 16px", marginBottom: "20px", color: "#16a34a", fontWeight: 600 }}>
          ✓ Fully paid
        </div>
      )}

      {payments.length > 0 && (
        <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "8px", padding: "20px" }}>
          <div style={{ fontWeight: 700, fontSize: "14px", color: t.text, marginBottom: "12px" }}>Payment History</div>
          <table style={ps.table}>
            <thead><tr style={ps.thead}>
              <th style={ps.th}>#</th><th style={ps.th}>Date</th><th style={ps.th}>Amount</th><th style={ps.th}>Method</th><th style={ps.th}>Notes</th>
            </tr></thead>
            <tbody>
              {payments.map((p, i) => (
                <tr key={p.id} style={ps.tr}>
                  <td style={ps.td}>{i + 1}</td>
                  <td style={ps.tdSub}>{p.paymentDate}</td>
                  <td style={{ ...ps.td, color: "#ef4444", fontWeight: 600 }}>{fmt2(p.amount)}</td>
                  <td style={ps.tdSub}>{p.paymentMethod?.replace("_", " ")}</td>
                  <td style={ps.tdSub}>{p.notes || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Main PaymentsPage ─────────────────────────────────────────────────────────
function PaymentsPage() {
  const ps = usePageStyles();
  const { t } = ps;

  const [view, setView] = useState("list"); // "list" | "so-pay" | "po-pay"
  const [selectedInv, setSelectedInv] = useState(null);
  const [selectedPO, setSelectedPO] = useState(null);

  const [invoices, setInvoices] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [salesReturns, setSalesReturns] = useState([]);
  const [returnRefundMap, setReturnRefundMap] = useState({});
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchReceive, setSearchReceive] = useState("");
  const [searchPay, setSearchPay] = useState("");
  const [searchRefund, setSearchRefund] = useState("");
  const [receiveFilter, setReceiveFilter] = useState("all");
  const [payFilter, setPayFilter] = useState("all");
  const [tab, setTab] = useState("receive");

  // Inline refund expand
  const [expandedRefundId, setExpandedRefundId] = useState(null);
  const [expandedRefundTxns, setExpandedRefundTxns] = useState({});
  const [inlineRefundForm, setInlineRefundForm] = useState({});
  const [refundFilter, setRefundFilter] = useState("all");

  const load = async () => {
    setLoading(true);
    try {
      const [inv, pos, w, rets] = await Promise.all([getInvoiceSummaries(), getPurchaseOrders(), getWalletData(), getSalesReturns()]);
      setInvoices(inv); setPurchaseOrders(pos); setWallet(w); setSalesReturns(rets);
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

  // ── Sub-page routing ──────────────────────────────────────────────────────
  if (view === "so-pay" && selectedInv) {
    return (
      <MainLayout>
        <SOPayPage inv={selectedInv} ps={ps} onBack={() => { setView("list"); setSelectedInv(null); }} onDone={load} />
      </MainLayout>
    );
  }
  if (view === "po-pay" && selectedPO) {
    return (
      <MainLayout>
        <POPayPage po={selectedPO} ps={ps} onBack={() => { setView("list"); setSelectedPO(null); }} onDone={load} />
      </MainLayout>
    );
  }

  const filteredReceive = invoices.filter(i => {
    const status = (i.paymentStatus || "PENDING").toUpperCase();
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

  const totalPendingRefunds = salesReturns.reduce((s, r) =>
    s + Math.max(0, parseFloat(r.totalAmount || 0) - (returnRefundMap[r.id] || 0)), 0);
  const totalToReceive = filteredReceive.reduce((s, i) => s + parseFloat(i.dueAmount || 0), 0);
  const totalToPay = filteredPay.reduce((s, p) =>
    s + Math.max(0, parseFloat(p.totalAmount || 0) - parseFloat(p.amountPaid || 0)), 0);

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

  return (
    <MainLayout>
      <div style={ps.pageHeader}>
        <h2 style={{ margin: 0 }}>Payments</h2>
      </div>

      {error && <div style={ps.alertError}>{error}</div>}
      {loading && <div style={ps.alertInfo}>Loading...</div>}

      {/* Wallet summary */}
      {wallet && (
        <div style={{ display: "flex", gap: "12px", marginBottom: "24px", flexWrap: "wrap" }}>
          {[
            { label: "Total Received", value: wallet.totalReceived, color: t.success },
            { label: "Total Paid (Suppliers)", value: wallet.totalPaid, color: t.danger },
            { label: "Wallet Balance", value: wallet.walletBalance, color: parseFloat(wallet.walletBalance) >= 0 ? t.success : t.danger, big: true },
            { label: "Still to Receive", value: wallet.totalToReceive, color: t.warning },
            { label: "Still to Pay", value: wallet.totalToPay, color: t.purple },
          ].map(c => (
            <div key={c.label} style={{ ...ps.card, borderColor: c.color, flex: 1, minWidth: "140px" }}>
              <div style={ps.cardLabel}>{c.label}</div>
              <div style={{ ...ps.cardValue, color: c.color, fontSize: c.big ? "22px" : undefined }}>{fmt2(c.value)}</div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: "4px", marginBottom: "16px", borderBottom: `2px solid ${t.border}` }}>
        <button onClick={() => setTab("receive")} style={ps.tabBtn(tab === "receive", t.success)}>📥 Receive (Customers)</button>
        <button onClick={() => setTab("pay")} style={ps.tabBtn(tab === "pay", t.danger)}>📤 Pay (Suppliers)</button>
        <button onClick={() => setTab("refunds")} style={ps.tabBtn(tab === "refunds", t.purple)}>
          💸 Refunds
          {totalPendingRefunds > 0 && (
            <span style={{ marginLeft: "6px", background: t.danger, color: "white", borderRadius: "10px", padding: "1px 7px", fontSize: "11px" }}>
              {filteredRefunds.length}
            </span>
          )}
        </button>
      </div>

      {/* TO RECEIVE */}
      {tab === "receive" && (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "8px" }}>
            <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
              <div style={{ fontWeight: 600, color: t.success }}>Total Due: {fmt2(totalToReceive)}</div>
              {[["all","All"],["pending","Pending"],["partial","Partial"],["paid","Paid"]].map(([f, label]) => (
                <button key={f} onClick={() => setReceiveFilter(f)} style={ps.filterPill(receiveFilter === f, t.success)}>{label}</button>
              ))}
            </div>
            <input style={{ ...ps.input, width: "220px", marginBottom: 0 }} placeholder="Search invoice, customer..."
              value={searchReceive} onChange={e => setSearchReceive(e.target.value)} />
          </div>
          <div style={ps.tableWrap}>
            <table style={ps.table}>
              <thead><tr style={ps.thead}>
                <th style={ps.th}>Invoice #</th><th style={ps.th}>Date</th><th style={ps.th}>Customer</th>
                <th style={ps.th}>Total</th><th style={ps.th}>Received</th><th style={ps.th}>Due</th>
                <th style={ps.th}>Status</th><th style={ps.th}>Action</th>
              </tr></thead>
              <tbody>
                {filteredReceive.length === 0 && !loading && (
                  <tr><td colSpan={8} style={{ ...ps.td, textAlign: "center", color: "#9ca3af", padding: "32px" }}>No invoices found</td></tr>
                )}
                {filteredReceive.map(inv => (
                  <tr key={inv.id} style={ps.tr}>
                    <td style={{ ...ps.td, fontWeight: 600 }}>{inv.invoiceNumber}</td>
                    <td style={ps.tdSub}>{inv.invoiceDate}</td>
                    <td style={ps.td}>{inv.customerName || "-"}</td>
                    <td style={ps.td}>{fmt2(inv.totalAmount)}</td>
                    <td style={{ ...ps.td, color: "#16a34a" }}>{fmt2(inv.paidAmount)}</td>
                    <td style={{ ...ps.td, color: parseFloat(inv.dueAmount || 0) > 0 ? "#dc2626" : "#16a34a", fontWeight: 600 }}>{fmt2(inv.dueAmount)}</td>
                    <td style={ps.td}>
                      <span style={{ padding: "3px 8px", borderRadius: "12px", fontSize: "11px", fontWeight: 600, background: (PAY_COLORS[inv.paymentStatus] || "#6b7280") + "22", color: PAY_COLORS[inv.paymentStatus] || "#6b7280" }}>
                        {inv.paymentStatus || "PENDING"}
                      </span>
                    </td>
                    <td style={ps.td}>
                      <button style={ps.btnSmSuccess} onClick={() => { setSelectedInv(inv); setView("so-pay"); }}>
                        {parseFloat(inv.dueAmount || 0) > 0 ? "Record Payment" : "View"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* TO PAY */}
      {tab === "pay" && (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "8px" }}>
            <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
              <div style={{ fontWeight: 600, color: t.danger }}>Total Due: {fmt2(totalToPay)}</div>
              {[["all","All"],["pending","Pending"],["partial","Partial"],["paid","Paid"]].map(([f, label]) => (
                <button key={f} onClick={() => setPayFilter(f)} style={ps.filterPill(payFilter === f, t.danger)}>{label}</button>
              ))}
            </div>
            <input style={{ ...ps.input, width: "220px", marginBottom: 0 }} placeholder="Search PO#, supplier..."
              value={searchPay} onChange={e => setSearchPay(e.target.value)} />
          </div>
          <div style={ps.tableWrap}>
            <table style={ps.table}>
              <thead><tr style={ps.thead}>
                <th style={ps.th}>PO #</th><th style={ps.th}>Date</th><th style={ps.th}>Supplier</th>
                <th style={ps.th}>Order Amt</th><th style={ps.th}>Paid</th><th style={ps.th}>Due</th>
                <th style={ps.th}>Status</th><th style={ps.th}>Action</th>
              </tr></thead>
              <tbody>
                {filteredPay.length === 0 && !loading && (
                  <tr><td colSpan={8} style={{ ...ps.td, textAlign: "center", color: "#9ca3af", padding: "32px" }}>No purchase orders found</td></tr>
                )}
                {filteredPay.map(po => {
                  const paid = parseFloat(po.amountPaid || 0);
                  const due = Math.max(0, parseFloat(po.totalAmount || 0) - paid);
                  return (
                    <tr key={po.id} style={ps.tr}>
                      <td style={{ ...ps.td, fontWeight: 600 }}>{po.poNumber}</td>
                      <td style={ps.tdSub}>{po.orderDate}</td>
                      <td style={ps.td}>{po.supplier?.name || "-"}</td>
                      <td style={ps.td}>{fmt2(po.totalAmount)}</td>
                      <td style={{ ...ps.td, color: "#16a34a" }}>{fmt2(paid)}</td>
                      <td style={{ ...ps.td, color: due > 0 ? "#dc2626" : "#16a34a", fontWeight: 600 }}>{fmt2(due)}</td>
                      <td style={ps.td}>
                        <span style={{ padding: "3px 8px", borderRadius: "12px", fontSize: "11px", fontWeight: 600, background: (due === 0 ? "#16a34a" : "#f59e0b") + "22", color: due === 0 ? "#16a34a" : "#f59e0b" }}>
                          {due === 0 ? "PAID" : "PENDING"}
                        </span>
                      </td>
                      <td style={ps.td}>
                        <button style={ps.btnSmDanger} onClick={() => { setSelectedPO(po); setView("po-pay"); }}>
                          {due > 0 ? "Pay" : "View"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* REFUNDS */}
      {tab === "refunds" && (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "8px" }}>
            <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
              <div style={{ fontWeight: 600, color: t.purple }}>Total Pending: {fmt2(totalPendingRefunds)}</div>
              {["all","pending","partial","completed"].map(f => (
                <button key={f} onClick={() => setRefundFilter(f)} style={ps.filterPill(refundFilter === f, t.purple)}>
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
            <input style={{ ...ps.input, width: "220px", marginBottom: 0 }} placeholder="Search return#, invoice, customer..."
              value={searchRefund} onChange={e => setSearchRefund(e.target.value)} />
          </div>
          <div style={ps.tableWrap}>
            <table style={ps.table}>
              <thead><tr style={ps.thead}>
                <th style={ps.th}></th>
                <th style={ps.th}>Return #</th><th style={ps.th}>Date</th><th style={ps.th}>Invoice</th>
                <th style={ps.th}>Customer</th><th style={ps.th}>Return Total</th>
                <th style={ps.th}>Refunded</th><th style={ps.th}>Pending</th><th style={ps.th}>Status</th>
              </tr></thead>
              <tbody>
                {filteredRefunds.length === 0 && !loading && (
                  <tr><td colSpan={9} style={{ ...ps.td, textAlign: "center", color: "#9ca3af", padding: "32px" }}>No records found</td></tr>
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
                      <tr style={{ ...ps.tr, cursor: "pointer", background: isExp ? t.purpleBg : t.surface, borderLeft: isExp ? `3px solid ${t.purple}` : "3px solid transparent" }}
                        onClick={() => toggleExpandRefund(r)}>
                        <td style={{ ...ps.td, width: "32px", textAlign: "center", color: "#6b7280", fontSize: "12px" }}>{isExp ? "▲" : "▼"}</td>
                        <td style={{ ...ps.td, fontWeight: 600 }}>{r.returnNumber}</td>
                        <td style={ps.tdSub}>{fmtDate(r.returnDate)}</td>
                        <td style={ps.td}>{r.invoice?.invoiceNumber || "-"}</td>
                        <td style={ps.td}>{r.invoice?.customer?.name || "-"}</td>
                        <td style={ps.td}>{fmt2(total)}</td>
                        <td style={{ ...ps.td, color: "#16a34a" }}>{fmt2(refunded)}</td>
                        <td style={{ ...ps.td, color: pending > 0 ? "#ef4444" : "#16a34a", fontWeight: 600 }}>{fmt2(pending)}</td>
                        <td style={ps.td}>
                          <span style={{ padding: "3px 8px", borderRadius: "12px", fontSize: "11px", fontWeight: 600, background: statusColor + "22", color: statusColor }}>{status}</span>
                        </td>
                      </tr>
                      {isExp && (
                        <tr>
                          <td colSpan={9} style={{ padding: 0, background: t.purpleBg, borderBottom: `3px solid ${t.purple}` }}>
                            <div style={{ padding: "16px 24px" }}>
                              <div style={{ display: "flex", gap: "12px", marginBottom: "16px" }}>
                                <div style={ps.card}><div style={ps.cardLabel}>Return Total</div><div style={ps.cardValue}>{fmt2(total)}</div></div>
                                <div style={{ ...ps.card, borderColor: "#16a34a" }}><div style={ps.cardLabel}>Refunded</div><div style={{ ...ps.cardValue, color: "#16a34a" }}>{fmt2(refunded)}</div></div>
                                <div style={{ ...ps.card, borderColor: pending > 0 ? "#ef4444" : "#16a34a" }}><div style={ps.cardLabel}>Pending</div><div style={{ ...ps.cardValue, color: pending > 0 ? "#ef4444" : "#16a34a" }}>{fmt2(pending)}</div></div>
                              </div>
                              {pending > 0 && (
                                <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "8px", padding: "14px", marginBottom: "14px" }}>
                                  <div style={{ fontWeight: 600, fontSize: "13px", marginBottom: "10px", color: t.text }}>Pay Refund to Customer</div>
                                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "flex-end" }}>
                                    <div style={{ flex: "1 1 100px" }}>
                                      <label style={ps.label}>Amount (Rs.)</label>
                                      <input style={{ ...ps.input, marginBottom: 0 }} type="number" max={pending}
                                        value={inlineRefundForm[r.id]?.amount || ""}
                                        onChange={e => setInlineRefundForm(prev => ({ ...prev, [r.id]: { ...prev[r.id], amount: e.target.value } }))} />
                                    </div>
                                    <div style={{ flex: "1 1 130px" }}>
                                      <label style={ps.label}>Date</label>
                                      <input style={{ ...ps.input, marginBottom: 0 }} type="date"
                                        value={inlineRefundForm[r.id]?.date || new Date().toISOString().split("T")[0]}
                                        onChange={e => setInlineRefundForm(prev => ({ ...prev, [r.id]: { ...prev[r.id], date: e.target.value } }))} />
                                    </div>
                                    <div style={{ flex: "1 1 120px" }}>
                                      <label style={ps.label}>Method</label>
                                      <select style={{ ...ps.input, marginBottom: 0 }} value={inlineRefundForm[r.id]?.method || "CASH"}
                                        onChange={e => setInlineRefundForm(prev => ({ ...prev, [r.id]: { ...prev[r.id], method: e.target.value } }))}>
                                        {METHODS.map(m => <option key={m} value={m}>{m.replace("_"," ")}</option>)}
                                      </select>
                                    </div>
                                    <div style={{ flex: "2 1 150px" }}>
                                      <label style={ps.label}>Notes</label>
                                      <input style={{ ...ps.input, marginBottom: 0 }} placeholder="optional"
                                        value={inlineRefundForm[r.id]?.notes || ""}
                                        onChange={e => setInlineRefundForm(prev => ({ ...prev, [r.id]: { ...prev[r.id], notes: e.target.value } }))} />
                                    </div>
                                    <button style={{ ...ps.btnSuccess, background: t.purple }} onClick={() => handleInlineRefund(r)} disabled={loading}>Pay Refund</button>
                                  </div>
                                </div>
                              )}
                              {pending === 0 && (
                                <div style={{ background: t.successBg, border: `1px solid ${t.successBorder}`, borderRadius: "6px", padding: "10px 14px", marginBottom: "12px", fontSize: "13px", color: t.success }}>
                                  Full refund of {fmt2(total)} paid to customer.
                                </div>
                              )}
                              <div style={{ fontWeight: 600, marginBottom: "8px", fontSize: "13px", color: t.text }}>Refund Transactions</div>
                              <table style={ps.table}>
                                <thead><tr style={ps.thead}>
                                  <th style={ps.th}>#</th><th style={ps.th}>Date</th><th style={ps.th}>Amount</th><th style={ps.th}>Method</th><th style={ps.th}>Notes</th>
                                </tr></thead>
                                <tbody>
                                  {(expandedRefundTxns[r.id] || []).length === 0 && (
                                    <tr><td colSpan={5} style={{ ...ps.td, textAlign: "center", color: "#9ca3af" }}>No refund transactions yet</td></tr>
                                  )}
                                  {(expandedRefundTxns[r.id] || []).map((rf, i) => {
                                    const fmtD = (d) => Array.isArray(d) ? `${d[0]}-${String(d[1]).padStart(2,"0")}-${String(d[2]).padStart(2,"0")}` : d || "-";
                                    return (
                                      <tr key={rf.id} style={ps.tr}>
                                        <td style={ps.td}>{i + 1}</td>
                                        <td style={ps.tdSub}>{fmtD(rf.refundDate)}</td>
                                        <td style={{ ...ps.td, color: "#7c3aed", fontWeight: 600 }}>{fmt2(rf.amount)}</td>
                                        <td style={ps.tdSub}>{rf.paymentMethod?.replace("_"," ")}</td>
                                        <td style={ps.tdSub}>{rf.notes || "-"}</td>
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
          </div>
        </>
      )}
    </MainLayout>
  );
}

export default PaymentsPage;
