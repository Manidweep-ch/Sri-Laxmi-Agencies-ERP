import { useEffect, useState, useRef } from "react";
import MainLayout from "../layout/MainLayout";
import {
  getPaymentsByInvoice, createPayment, getOutstanding, getAllPayments,
  verifyPayment, updateChequeStatus, getPendingVerifications, getPendingCheques,
  getAllSupplierPayments, getAllSalaryPayments
} from "../services/paymentService";
import { getInvoiceSummaries } from "../services/invoiceService";
import { getWalletData } from "../services/dashboardService";
import { getPurchaseOrders, getSupplierPayments, recordSupplierPayment, getSupplierTotalPaid } from "../services/purchaseService";
import { getSalesReturns, getRefundsByReturn, getTotalRefunded, recordRefund } from "../services/salesReturnService";
import { getStaff } from "../services/staffService";
import { getUsers } from "../services/userService";
import { usePageStyles } from "../hooks/usePageStyles";
import { useTheme } from "../context/ThemeContext";
import { getTheme } from "../theme";
import { useAuth } from "../context/AuthContext";

const fmt2 = v => `Rs.${parseFloat(v || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
const fmtDate = d => Array.isArray(d)
  ? `${d[0]}-${String(d[1]).padStart(2,"0")}-${String(d[2]).padStart(2,"0")}`
  : d || "-";

const PAY_COLORS = { PAID: "#16a34a", PARTIALLY_PAID: "#f59e0b", OVERDUE: "#ef4444", UNPAID: "#6b7280", PENDING: "#6b7280" };
const METHODS = ["CASH", "UPI", "BANK_TRANSFER", "CHEQUE", "NEFT", "RTGS"];
const ONLINE_METHODS = ["UPI", "BANK_TRANSFER", "NEFT", "RTGS"];
const VSTATUS_COLOR = {
  CONFIRMED: "#16a34a", VERIFIED: "#16a34a", DEPOSITED: "#16a34a",
  PENDING: "#f59e0b", NOT_RECEIVED: "#ef4444", BOUNCED: "#ef4444"
};


// ── Searchable staff dropdown ─────────────────────────────────────────────────
function StaffDropdown({ staffList, value, onChange, placeholder = "Search staff..." }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef();
  const { dark } = useTheme();
  const t = getTheme(dark);
  const selected = staffList.find(s => s.id === value);
  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const filtered = staffList.filter(s => s.active !== false && (!query ||
    s.name?.toLowerCase().includes(query.toLowerCase()) ||
    s.employeeId?.toLowerCase().includes(query.toLowerCase()) ||
    s.designation?.toLowerCase().includes(query.toLowerCase())));
  const displayText = selected
    ? `${selected.employeeId ? selected.employeeId + " · " : ""}${selected.name} (${selected.designation || "Staff"})`
    : "";
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <input style={{ width: "240px", padding: "7px 10px", border: `1px solid ${t.inputBorder}`, borderRadius: "6px", fontSize: "13px", background: t.inputBg, color: t.text, boxSizing: "border-box" }}
        placeholder={placeholder}
        value={open ? query : (selected ? displayText : "")}
        onFocus={() => { setOpen(true); setQuery(""); }}
        onChange={e => { setQuery(e.target.value); onChange(null); setOpen(true); }} />
      {selected && !open && (
        <button onClick={() => { onChange(null); setQuery(""); }}
          style={{ position: "absolute", right: "6px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: "14px" }}>✕</button>
      )}
      {open && (
        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: t.surface, border: `1px solid ${t.border}`, borderRadius: "6px", zIndex: 200, maxHeight: "200px", overflowY: "auto", boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}>
          {filtered.length === 0 && <div style={{ padding: "10px 12px", fontSize: "13px", color: "#9ca3af" }}>No staff found</div>}
          {filtered.map(s => (
            <div key={s.id} style={{ padding: "8px 12px", cursor: "pointer", fontSize: "13px", color: t.text, borderBottom: `1px solid ${t.border}`, display: "flex", gap: "8px" }}
              onMouseDown={() => { onChange(s.id); setOpen(false); setQuery(""); }}>
              <span style={{ fontSize: "11px", color: "#2563eb", fontWeight: 600, minWidth: "60px" }}>{s.employeeId || "—"}</span>
              <span style={{ fontWeight: 600 }}>{s.name}</span>
              <span style={{ fontSize: "11px", color: t.textSub }}>({s.designation || "Staff"})</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── User (admin) dropdown ─────────────────────────────────────────────────────
function UserDropdown({ userList, value, onChange }) {
  const { dark } = useTheme();
  const t = getTheme(dark);
  return (
    <select style={{ width: "240px", padding: "7px 10px", border: `1px solid ${t.inputBorder}`, borderRadius: "6px", fontSize: "13px", background: t.inputBg, color: t.text }}
      value={value || ""} onChange={e => onChange(e.target.value ? parseInt(e.target.value) : null)}>
      <option value="">— Select admin account —</option>
      {userList.map(u => <option key={u.id} value={u.id}>{u.username} ({u.role?.name || u.role})</option>)}
    </select>
  );
}


// ── SO Payment Page ───────────────────────────────────────────────────────────
function SOPayPage({ ps }) {
  const { t } = ps;
  const [invoices, setInvoices] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [adminUsers, setAdminUsers] = useState([]);
  const [selInv, setSelInv] = useState(null);
  const [outstanding, setOutstanding] = useState(null);
  const [payments, setPayments] = useState([]);
  const [form, setForm] = useState({ amount: "", paymentMethod: "CASH", paymentDate: new Date().toISOString().split("T")[0], notes: "", chequeDepositDate: "" });
  const [cashWhere, setCashWhere] = useState("shop");
  const [onlineWhere, setOnlineWhere] = useState("company");
  const [receivedByStaffId, setReceivedByStaffId] = useState(null);
  const [receivedByUserId, setReceivedByUserId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    getInvoiceSummaries().then(setInvoices).catch(() => {});
    getStaff().then(setStaffList).catch(() => {});
    getUsers().then(us => setAdminUsers(us.filter(u => (u.role?.name || u.role) === "ADMIN"))).catch(() => {});
  }, []);

  const selectInvoice = async (inv) => {
    setSelInv(inv); setError(""); setSuccess("");
    try {
      const [out, pays] = await Promise.all([
        getOutstanding(inv.id),
        getPaymentsByInvoice(inv.id),
      ]);
      setOutstanding(out); setPayments(pays);
      setForm(f => ({ ...f, amount: out.outstandingAmount > 0 ? String(parseFloat(out.outstandingAmount).toFixed(2)) : "" }));
    } catch { setError("Failed to load invoice details"); }
  };

  const isCash = form.paymentMethod === "CASH";
  const isOnline = ONLINE_METHODS.includes(form.paymentMethod);
  const isCheque = form.paymentMethod === "CHEQUE";

  const handleSave = async () => {
    if (!selInv) { setError("Select an invoice"); return; }
    const amt = parseFloat(form.amount);
    if (!amt || amt <= 0) { setError("Enter a valid amount"); return; }
    if (isCheque && !form.chequeDepositDate) { setError("Enter cheque deposit date"); return; }
    if (isCash && cashWhere === "staff" && !receivedByStaffId) { setError("Select the staff who received cash"); return; }
    if (isOnline && onlineWhere === "admin" && !receivedByUserId) { setError("Select the admin account that received the payment"); return; }

    const payload = {
      amount: amt,
      paymentMethod: form.paymentMethod,
      paymentDate: form.paymentDate,
      notes: form.notes || null,
      chequeDepositDate: isCheque ? form.chequeDepositDate : null,
      invoice: { id: selInv.id },
      receivedBy: (isCash && cashWhere === "staff" && receivedByStaffId) ? { id: receivedByStaffId } : null,
      receivedByUser: (isOnline && onlineWhere === "admin" && receivedByUserId) ? { id: receivedByUserId } : null,
    };

    try {
      setSaving(true); setError(""); setSuccess("");
      await createPayment(payload);
      setSuccess("Payment recorded successfully");
      await selectInvoice(selInv);
      setForm(f => ({ ...f, notes: "", chequeDepositDate: "" }));
      setReceivedByStaffId(null); setReceivedByUserId(null);
      setCashWhere("shop"); setOnlineWhere("company");
    } catch (e) { setError(e.response?.data?.message || e.response?.data || "Failed to save payment"); }
    finally { setSaving(false); }
  };

  const unpaidInvoices = invoices.filter(i => i.paymentStatus !== "PAID");

  return (
    <div>
      <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "8px", padding: "20px", marginBottom: "20px" }}>
        <div style={{ fontWeight: 700, fontSize: "14px", color: t.text, marginBottom: "12px" }}>Select Invoice</div>
        <select style={{ ...ps.input, width: "360px", marginBottom: 0 }}
          value={selInv?.id || ""} onChange={e => {
            const inv = invoices.find(i => i.id === parseInt(e.target.value));
            if (inv) selectInvoice(inv); else { setSelInv(null); setOutstanding(null); setPayments([]); }
          }}>
          <option value="">— Select invoice —</option>
          {unpaidInvoices.map(i => (
            <option key={i.id} value={i.id}>
              {i.invoiceNumber} — {i.customerName} — {fmt2(i.totalAmount)} [{i.paymentStatus}]
            </option>
          ))}
        </select>
      </div>

      {selInv && outstanding && (
        <>
          <div style={{ display: "flex", gap: "12px", marginBottom: "20px", flexWrap: "wrap" }}>
            {[
              { label: "Invoice Total", value: outstanding.totalAmount, color: "#2563eb" },
              { label: "Paid", value: outstanding.paidAmount, color: "#16a34a" },
              { label: "Outstanding", value: outstanding.outstandingAmount, color: parseFloat(outstanding.outstandingAmount) > 0 ? "#ef4444" : "#16a34a", big: true },
            ].map(c => (
              <div key={c.label} style={{ background: t.surface, border: `1px solid ${c.color}44`, borderRadius: "8px", padding: "14px", flex: 1, minWidth: "130px" }}>
                <div style={{ fontSize: "11px", color: t.textSub, marginBottom: "4px" }}>{c.label}</div>
                <div style={{ fontSize: c.big ? "20px" : "16px", fontWeight: 700, color: c.color }}>{fmt2(c.value)}</div>
              </div>
            ))}
          </div>

          {parseFloat(outstanding.outstandingAmount) > 0 ? (
            <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "8px", padding: "20px", marginBottom: "20px" }}>
              <div style={{ fontWeight: 700, fontSize: "14px", color: t.text, marginBottom: "16px" }}>Record Payment</div>
              {error && <div style={ps.alertError}>{error}</div>}
              {success && <div style={ps.alertSuccess}>{success}</div>}

              <div style={{ display: "flex", gap: "14px", flexWrap: "wrap", alignItems: "flex-start" }}>
                <div>
                  <label style={ps.label}>Amount (Rs.) *</label>
                  <input style={{ ...ps.input, width: "150px", marginBottom: 0 }} type="number" min="0"
                    max={outstanding.outstandingAmount} value={form.amount}
                    onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
                </div>
                <div>
                  <label style={ps.label}>Payment Method *</label>
                  <select style={{ ...ps.input, width: "170px", marginBottom: 0 }} value={form.paymentMethod}
                    onChange={e => { setForm(f => ({ ...f, paymentMethod: e.target.value })); setCashWhere("shop"); setOnlineWhere("company"); setReceivedByStaffId(null); setReceivedByUserId(null); }}>
                    {METHODS.map(m => <option key={m} value={m}>{m.replace("_"," ")}</option>)}
                  </select>
                </div>
                <div>
                  <label style={ps.label}>Payment Date *</label>
                  <input style={{ ...ps.input, width: "160px", marginBottom: 0 }} type="date" value={form.paymentDate}
                    onChange={e => setForm(f => ({ ...f, paymentDate: e.target.value }))} />
                </div>
              </div>

              {isCash && (
                <div style={{ marginTop: "16px", padding: "14px", background: t.bg, borderRadius: "8px", border: `1px solid ${t.border}` }}>
                  <div style={{ fontSize: "13px", fontWeight: 600, color: t.text, marginBottom: "10px" }}>Where was the cash received?</div>
                  <div style={{ display: "flex", gap: "20px", flexWrap: "wrap", alignItems: "center" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", color: t.text, cursor: "pointer" }}>
                      <input type="radio" name="cashWhere" value="shop" checked={cashWhere === "shop"} onChange={() => { setCashWhere("shop"); setReceivedByStaffId(null); }} />
                      At shop / company (direct to company wallet)
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", color: t.text, cursor: "pointer" }}>
                      <input type="radio" name="cashWhere" value="staff" checked={cashWhere === "staff"} onChange={() => setCashWhere("staff")} />
                      Given to a staff member
                    </label>
                  </div>
                  {cashWhere === "staff" && (
                    <div style={{ marginTop: "10px" }}>
                      <label style={ps.label}>Staff who received cash *</label>
                      <StaffDropdown staffList={staffList} value={receivedByStaffId} onChange={setReceivedByStaffId} />
                    </div>
                  )}
                </div>
              )}

              {isOnline && (
                <div style={{ marginTop: "16px", padding: "14px", background: t.bg, borderRadius: "8px", border: `1px solid ${t.border}` }}>
                  <div style={{ fontSize: "13px", fontWeight: 600, color: t.text, marginBottom: "10px" }}>Which account received the payment?</div>
                  <div style={{ display: "flex", gap: "20px", flexWrap: "wrap", alignItems: "center" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", color: t.text, cursor: "pointer" }}>
                      <input type="radio" name="onlineWhere" value="company" checked={onlineWhere === "company"} onChange={() => { setOnlineWhere("company"); setReceivedByUserId(null); }} />
                      Company account (direct to company wallet)
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", color: t.text, cursor: "pointer" }}>
                      <input type="radio" name="onlineWhere" value="admin" checked={onlineWhere === "admin"} onChange={() => setOnlineWhere("admin")} />
                      Admin's personal account (needs verification)
                    </label>
                  </div>
                  {onlineWhere === "admin" && (
                    <div style={{ marginTop: "10px" }}>
                      <label style={ps.label}>Admin account *</label>
                      <UserDropdown userList={adminUsers} value={receivedByUserId} onChange={setReceivedByUserId} />
                      <div style={{ fontSize: "11px", color: "#f59e0b", marginTop: "4px" }}>
                        The selected admin will need to verify this payment in their dashboard.
                      </div>
                    </div>
                  )}
                </div>
              )}

              {isCheque && (
                <div style={{ marginTop: "16px", padding: "14px", background: "#fef3c744", borderRadius: "8px", border: "1px solid #f59e0b44" }}>
                  <div style={{ fontSize: "13px", fontWeight: 600, color: t.text, marginBottom: "10px" }}>Cheque Details</div>
                  <label style={ps.label}>Cheque Deposit Date *</label>
                  <input style={{ ...ps.input, width: "180px", marginBottom: 0 }} type="date" value={form.chequeDepositDate}
                    onChange={e => setForm(f => ({ ...f, chequeDepositDate: e.target.value }))} />
                  <div style={{ fontSize: "11px", color: "#92400e", marginTop: "4px" }}>
                    Accounts will be reminded on this date to confirm deposit or bounce.
                  </div>
                </div>
              )}

              <div style={{ marginTop: "14px" }}>
                <label style={ps.label}>Notes</label>
                <input style={{ ...ps.input, width: "100%", maxWidth: "400px", marginBottom: 0 }} placeholder="Optional notes..."
                  value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
              <div style={{ marginTop: "16px" }}>
                <button style={ps.btnSuccess} onClick={handleSave} disabled={saving}>
                  {saving ? "Saving..." : "Record Payment"}
                </button>
              </div>
            </div>
          ) : (
            <div style={{ ...ps.alertSuccess, marginBottom: "20px" }}>This invoice is fully paid.</div>
          )}

          {payments.length > 0 && (
            <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "8px", padding: "20px" }}>
              <div style={{ fontWeight: 700, fontSize: "14px", color: t.text, marginBottom: "12px" }}>Payment History</div>
              <table style={ps.table}>
                <thead><tr style={ps.thead}>
                  <th style={ps.th}>Date</th><th style={ps.th}>Amount</th><th style={ps.th}>Method</th>
                  <th style={ps.th}>Received By</th><th style={ps.th}>Destination</th><th style={ps.th}>Status</th><th style={ps.th}>Notes</th>
                </tr></thead>
                <tbody>
                  {payments.map(p => (
                    <tr key={p.id} style={ps.tr}>
                      <td style={ps.tdSub}>{fmtDate(p.paymentDate)}</td>
                      <td style={{ ...ps.td, color: "#2563eb", fontWeight: 600 }}>{fmt2(p.amount)}</td>
                      <td style={ps.tdSub}>{p.paymentMethod?.replace("_"," ")}</td>
                      <td style={ps.td}>
                        {p.receivedBy ? `${p.receivedBy.name} (Staff)` : p.receivedByUser ? `${p.receivedByUser.username} (Admin)` : "Company Direct"}
                      </td>
                      <td style={ps.tdSub}>{p.destination?.replace("_"," ")}</td>
                      <td style={ps.td}>
                        <span style={{ padding: "2px 8px", borderRadius: "10px", fontSize: "11px", fontWeight: 600,
                          background: (VSTATUS_COLOR[p.verificationStatus] || "#6b7280") + "22",
                          color: VSTATUS_COLOR[p.verificationStatus] || "#6b7280" }}>
                          {p.verificationStatus}
                        </span>
                      </td>
                      <td style={ps.tdSub}>{p.notes || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}


// ── PO Payment Page ───────────────────────────────────────────────────────────
function POPayPage({ ps }) {
  const { t } = ps;
  const [orders, setOrders] = useState([]);
  const [selPO, setSelPO] = useState(null);
  const [poPayments, setPoPayments] = useState([]);
  const [totalPaid, setTotalPaid] = useState(0);
  const [form, setForm] = useState({ amount: "", paymentMethod: "BANK_TRANSFER", paymentDate: new Date().toISOString().split("T")[0], notes: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => { getPurchaseOrders().then(setOrders).catch(() => {}); }, []);

  const selectPO = async (po) => {
    setSelPO(po); setError(""); setSuccess("");
    try {
      const [pays, paid] = await Promise.all([
        getSupplierPayments(po.id),
        getSupplierTotalPaid(po.id)
      ]);
      setPoPayments(pays); setTotalPaid(paid);
      const receivedVal = parseFloat(po.receivedValue || po.totalAmount || 0);
      const outstanding = Math.max(0, receivedVal - parseFloat(paid || 0));
      setForm(f => ({ ...f, amount: outstanding > 0 ? String(outstanding.toFixed(2)) : "" }));
    } catch { setError("Failed to load PO details"); }
  };

  const handleSave = async () => {
    if (!selPO) { setError("Select a purchase order"); return; }
    const amt = parseFloat(form.amount);
    if (!amt || amt <= 0) { setError("Enter a valid amount"); return; }
    try {
      setSaving(true); setError(""); setSuccess("");
      await recordSupplierPayment({ purchaseOrderId: selPO.id, amount: amt, paymentMethod: form.paymentMethod, paymentDate: form.paymentDate, notes: form.notes });
      setSuccess("Supplier payment recorded");
      await selectPO(selPO);
      setForm(f => ({ ...f, notes: "" }));
    } catch (e) { setError(e.response?.data?.message || e.response?.data || "Failed to save"); }
    finally { setSaving(false); }
  };

  const receivedValue = parseFloat(selPO?.receivedValue || selPO?.totalAmount || 0);
  const outstanding = Math.max(0, receivedValue - parseFloat(totalPaid || 0));

  return (
    <div>
      <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "8px", padding: "20px", marginBottom: "20px" }}>
        <div style={{ fontWeight: 700, fontSize: "14px", color: t.text, marginBottom: "12px" }}>Select Purchase Order</div>
        <select style={{ ...ps.input, width: "360px", marginBottom: 0 }}
          value={selPO?.id || ""} onChange={e => {
            const po = orders.find(o => o.id === parseInt(e.target.value));
            if (po) selectPO(po); else { setSelPO(null); setPoPayments([]); setTotalPaid(0); }
          }}>
          <option value="">— Select PO —</option>
          {orders.filter(o => o.status !== "DRAFT").map(o => (
            <option key={o.id} value={o.id}>
              {o.poNumber} — {o.supplier?.name || o.supplierName} — {fmt2(o.totalAmount)} [{o.status}]
            </option>
          ))}
        </select>
      </div>

      {selPO && (
        <>
          <div style={{ display: "flex", gap: "12px", marginBottom: "20px", flexWrap: "wrap" }}>
            {[
              { label: "PO Total", value: selPO.totalAmount, color: "#2563eb" },
              { label: "Received Value", value: receivedValue, color: "#8b5cf6" },
              { label: "Total Paid", value: totalPaid, color: "#16a34a" },
              { label: "Outstanding", value: outstanding, color: outstanding > 0 ? "#ef4444" : "#16a34a", big: true },
            ].map(c => (
              <div key={c.label} style={{ background: t.surface, border: `1px solid ${c.color}44`, borderRadius: "8px", padding: "14px", flex: 1, minWidth: "130px" }}>
                <div style={{ fontSize: "11px", color: t.textSub, marginBottom: "4px" }}>{c.label}</div>
                <div style={{ fontSize: c.big ? "20px" : "16px", fontWeight: 700, color: c.color }}>{fmt2(c.value)}</div>
              </div>
            ))}
          </div>

          {outstanding > 0 ? (
            <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "8px", padding: "20px", marginBottom: "20px" }}>
              <div style={{ fontWeight: 700, fontSize: "14px", color: t.text, marginBottom: "16px" }}>Record Supplier Payment</div>
              {error && <div style={ps.alertError}>{error}</div>}
              {success && <div style={ps.alertSuccess}>{success}</div>}
              <div style={{ display: "flex", gap: "14px", flexWrap: "wrap", alignItems: "flex-end" }}>
                <div>
                  <label style={ps.label}>Amount (Rs.) *</label>
                  <input style={{ ...ps.input, width: "150px", marginBottom: 0 }} type="number" min="0" max={outstanding}
                    value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
                </div>
                <div>
                  <label style={ps.label}>Method</label>
                  <select style={{ ...ps.input, width: "170px", marginBottom: 0 }} value={form.paymentMethod}
                    onChange={e => setForm(f => ({ ...f, paymentMethod: e.target.value }))}>
                    {["CASH","UPI","BANK_TRANSFER","CHEQUE","NEFT","RTGS"].map(m => <option key={m} value={m}>{m.replace("_"," ")}</option>)}
                  </select>
                </div>
                <div>
                  <label style={ps.label}>Date</label>
                  <input style={{ ...ps.input, width: "160px", marginBottom: 0 }} type="date" value={form.paymentDate}
                    onChange={e => setForm(f => ({ ...f, paymentDate: e.target.value }))} />
                </div>
                <div style={{ flex: "2 1 180px" }}>
                  <label style={ps.label}>Notes</label>
                  <input style={{ ...ps.input, marginBottom: 0 }} placeholder="Optional..." value={form.notes}
                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
                </div>
                <button style={ps.btnSuccess} onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Pay Supplier"}</button>
              </div>
            </div>
          ) : (
            <div style={{ ...ps.alertSuccess, marginBottom: "20px" }}>Supplier fully paid for received goods.</div>
          )}

          {poPayments.length > 0 && (
            <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "8px", padding: "20px" }}>
              <div style={{ fontWeight: 700, fontSize: "14px", color: t.text, marginBottom: "12px" }}>Payment History</div>
              <table style={ps.table}>
                <thead><tr style={ps.thead}>
                  <th style={ps.th}>Date</th><th style={ps.th}>Amount</th><th style={ps.th}>Method</th><th style={ps.th}>Notes</th>
                </tr></thead>
                <tbody>
                  {poPayments.map((p, i) => (
                    <tr key={i} style={ps.tr}>
                      <td style={ps.tdSub}>{fmtDate(p.paymentDate)}</td>
                      <td style={{ ...ps.td, color: "#2563eb", fontWeight: 600 }}>{fmt2(p.amount)}</td>
                      <td style={ps.tdSub}>{p.paymentMethod?.replace("_"," ")}</td>
                      <td style={ps.tdSub}>{p.notes || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}


// ── Refunds Tab ───────────────────────────────────────────────────────────────
function RefundsTab({ ps }) {
  const { t } = ps;
  const [returns, setReturns] = useState([]);
  const [selReturn, setSelReturn] = useState(null);
  const [refunds, setRefunds] = useState([]);
  const [totalRefunded, setTotalRefunded] = useState(0);
  const [form, setForm] = useState({ amount: "", refundMethod: "CASH", refundDate: new Date().toISOString().split("T")[0], notes: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => { getSalesReturns().then(setReturns).catch(() => {}); }, []);

  const selectReturn = async (ret) => {
    setSelReturn(ret); setError(""); setSuccess("");
    try {
      const [refs, total] = await Promise.all([getRefundsByReturn(ret.id), getTotalRefunded(ret.id)]);
      setRefunds(refs); setTotalRefunded(total);
      const outstanding = Math.max(0, parseFloat(ret.refundAmount || 0) - parseFloat(total || 0));
      setForm(f => ({ ...f, amount: outstanding > 0 ? String(outstanding.toFixed(2)) : "" }));
    } catch { setError("Failed to load return details"); }
  };

  const handleSave = async () => {
    if (!selReturn) { setError("Select a return"); return; }
    const amt = parseFloat(form.amount);
    if (!amt || amt <= 0) { setError("Enter a valid amount"); return; }
    try {
      setSaving(true); setError(""); setSuccess("");
      await recordRefund({ salesReturnId: selReturn.id, amount: amt, refundMethod: form.refundMethod, refundDate: form.refundDate, notes: form.notes });
      setSuccess("Refund recorded");
      await selectReturn(selReturn);
      setForm(f => ({ ...f, notes: "" }));
    } catch (e) { setError(e.response?.data?.message || "Failed to save"); }
    finally { setSaving(false); }
  };

  const outstanding = selReturn ? Math.max(0, parseFloat(selReturn.refundAmount || 0) - parseFloat(totalRefunded || 0)) : 0;

  return (
    <div>
      <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "8px", padding: "20px", marginBottom: "20px" }}>
        <div style={{ fontWeight: 700, fontSize: "14px", color: t.text, marginBottom: "12px" }}>Select Sales Return</div>
        <select style={{ ...ps.input, width: "360px", marginBottom: 0 }}
          value={selReturn?.id || ""} onChange={e => {
            const ret = returns.find(r => r.id === parseInt(e.target.value));
            if (ret) selectReturn(ret); else { setSelReturn(null); setRefunds([]); setTotalRefunded(0); }
          }}>
          <option value="">— Select return —</option>
          {returns.map(r => (
            <option key={r.id} value={r.id}>
              {r.returnNumber || `RET-${r.id}`} — {r.customerName || r.customer?.name} — {fmt2(r.refundAmount)}
            </option>
          ))}
        </select>
      </div>

      {selReturn && (
        <>
          <div style={{ display: "flex", gap: "12px", marginBottom: "20px", flexWrap: "wrap" }}>
            {[
              { label: "Return Amount", value: selReturn.refundAmount, color: "#2563eb" },
              { label: "Refunded", value: totalRefunded, color: "#16a34a" },
              { label: "Pending Refund", value: outstanding, color: outstanding > 0 ? "#ef4444" : "#16a34a", big: true },
            ].map(c => (
              <div key={c.label} style={{ background: t.surface, border: `1px solid ${c.color}44`, borderRadius: "8px", padding: "14px", flex: 1, minWidth: "130px" }}>
                <div style={{ fontSize: "11px", color: t.textSub, marginBottom: "4px" }}>{c.label}</div>
                <div style={{ fontSize: c.big ? "20px" : "16px", fontWeight: 700, color: c.color }}>{fmt2(c.value)}</div>
              </div>
            ))}
          </div>

          {outstanding > 0 ? (
            <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "8px", padding: "20px", marginBottom: "20px" }}>
              <div style={{ fontWeight: 700, fontSize: "14px", color: t.text, marginBottom: "16px" }}>Record Refund</div>
              {error && <div style={ps.alertError}>{error}</div>}
              {success && <div style={ps.alertSuccess}>{success}</div>}
              <div style={{ display: "flex", gap: "14px", flexWrap: "wrap", alignItems: "flex-end" }}>
                <div>
                  <label style={ps.label}>Amount (Rs.) *</label>
                  <input style={{ ...ps.input, width: "150px", marginBottom: 0 }} type="number" min="0" max={outstanding}
                    value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
                </div>
                <div>
                  <label style={ps.label}>Method</label>
                  <select style={{ ...ps.input, width: "170px", marginBottom: 0 }} value={form.refundMethod}
                    onChange={e => setForm(f => ({ ...f, refundMethod: e.target.value }))}>
                    {["CASH","UPI","BANK_TRANSFER","CHEQUE","NEFT","RTGS"].map(m => <option key={m} value={m}>{m.replace("_"," ")}</option>)}
                  </select>
                </div>
                <div>
                  <label style={ps.label}>Date</label>
                  <input style={{ ...ps.input, width: "160px", marginBottom: 0 }} type="date" value={form.refundDate}
                    onChange={e => setForm(f => ({ ...f, refundDate: e.target.value }))} />
                </div>
                <div style={{ flex: "2 1 180px" }}>
                  <label style={ps.label}>Notes</label>
                  <input style={{ ...ps.input, marginBottom: 0 }} placeholder="Optional..." value={form.notes}
                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
                </div>
                <button style={ps.btnSuccess} onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Record Refund"}</button>
              </div>
            </div>
          ) : (
            <div style={{ ...ps.alertSuccess, marginBottom: "20px" }}>Fully refunded.</div>
          )}

          {refunds.length > 0 && (
            <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "8px", padding: "20px" }}>
              <div style={{ fontWeight: 700, fontSize: "14px", color: t.text, marginBottom: "12px" }}>Refund History</div>
              <table style={ps.table}>
                <thead><tr style={ps.thead}>
                  <th style={ps.th}>Date</th><th style={ps.th}>Amount</th><th style={ps.th}>Method</th><th style={ps.th}>Notes</th>
                </tr></thead>
                <tbody>
                  {refunds.map((r, i) => (
                    <tr key={i} style={ps.tr}>
                      <td style={ps.tdSub}>{fmtDate(r.refundDate)}</td>
                      <td style={{ ...ps.td, color: "#2563eb", fontWeight: 600 }}>{fmt2(r.amount)}</td>
                      <td style={ps.tdSub}>{r.refundMethod?.replace("_"," ")}</td>
                      <td style={ps.tdSub}>{r.notes || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}


// ── Verify Tab (admin sees payments sent to their account) ────────────────────
function VerifyTab({ ps }) {
  const { t } = ps;
  const { user } = useAuth();
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notes, setNotes] = useState({});

  const load = async () => {
    if (!user?.userId) return;
    try {
      setLoading(true);
      setPending(await getPendingVerifications(user.userId));
    } catch { setError("Failed to load pending verifications"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [user?.userId]);

  const handleVerify = async (id, status) => {
    try {
      await verifyPayment(id, status, notes[id] || "");
      await load();
    } catch { setError("Failed to update"); }
  };

  if (!user?.userId) return <div style={{ padding: "20px", color: t.textSub }}>Not logged in.</div>;

  return (
    <div>
      <div style={{ marginBottom: "16px", fontSize: "13px", color: t.textSub }}>
        Payments sent to your account that need verification. Check your bank statement and mark each as received or not received.
      </div>
      {error && <div style={ps.alertError}>{error}</div>}
      {loading && <div style={ps.alertInfo}>Loading...</div>}
      {!loading && pending.length === 0 && (
        <div style={{ padding: "32px", textAlign: "center", color: "#9ca3af", background: t.surface, borderRadius: "8px", border: `1px solid ${t.border}` }}>
          No pending verifications for your account.
        </div>
      )}
      {pending.map(p => (
        <div key={p.id} style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "8px", padding: "16px", marginBottom: "12px", display: "flex", gap: "16px", flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ flex: "1 1 200px" }}>
            <div style={{ fontWeight: 700, fontSize: "15px", color: "#2563eb" }}>{fmt2(p.amount)}</div>
            <div style={{ fontSize: "12px", color: t.textSub, marginTop: "2px" }}>
              {fmtDate(p.paymentDate)} · {p.paymentMethod?.replace("_"," ")} · {p.invoice?.invoiceNumber || "-"}
            </div>
            {p.invoice?.customerName && <div style={{ fontSize: "12px", color: t.text, marginTop: "2px" }}>Customer: {p.invoice.customerName}</div>}
          </div>
          <div style={{ flex: "2 1 200px" }}>
            <input style={{ ...ps.input, marginBottom: 0, width: "100%" }} placeholder="Notes (optional)..."
              value={notes[p.id] || ""} onChange={e => setNotes(n => ({ ...n, [p.id]: e.target.value }))} />
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button style={{ ...ps.btnSuccess, padding: "7px 16px" }} onClick={() => handleVerify(p.id, "VERIFIED")}>
              ✓ Received
            </button>
            <button style={{ ...ps.btnDanger, padding: "7px 16px" }} onClick={() => handleVerify(p.id, "NOT_RECEIVED")}>
              ✗ Not Received
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Cheques Tab (ACCOUNTS confirms deposit/bounce) ────────────────────────────
function ChequesTab({ ps }) {
  const { t } = ps;
  const [cheques, setCheques] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notes, setNotes] = useState({});

  const load = async () => {
    try {
      setLoading(true);
      setCheques(await getPendingCheques());
    } catch { setError("Failed to load cheques"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleStatus = async (id, status) => {
    try {
      await updateChequeStatus(id, status, notes[id] || "");
      await load();
    } catch { setError("Failed to update cheque status"); }
  };

  const today = new Date().toISOString().split("T")[0];

  return (
    <div>
      <div style={{ marginBottom: "16px", fontSize: "13px", color: t.textSub }}>
        Pending cheques — confirm deposit or mark as bounced on the deposit date.
      </div>
      {error && <div style={ps.alertError}>{error}</div>}
      {loading && <div style={ps.alertInfo}>Loading...</div>}
      {!loading && cheques.length === 0 && (
        <div style={{ padding: "32px", textAlign: "center", color: "#9ca3af", background: t.surface, borderRadius: "8px", border: `1px solid ${t.border}` }}>
          No pending cheques.
        </div>
      )}
      {cheques.map(p => {
        const depositDate = fmtDate(p.chequeDepositDate);
        const isOverdue = p.chequeDepositDate && depositDate <= today;
        return (
          <div key={p.id} style={{ background: t.surface, border: `1px solid ${isOverdue ? "#ef4444" : t.border}`, borderRadius: "8px", padding: "16px", marginBottom: "12px", display: "flex", gap: "16px", flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ flex: "1 1 200px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontWeight: 700, fontSize: "15px", color: "#2563eb" }}>{fmt2(p.amount)}</span>
                {isOverdue && <span style={{ fontSize: "11px", background: "#fef2f2", color: "#ef4444", padding: "2px 8px", borderRadius: "10px", fontWeight: 600 }}>DUE</span>}
              </div>
              <div style={{ fontSize: "12px", color: t.textSub, marginTop: "2px" }}>
                Received: {fmtDate(p.paymentDate)} · Deposit by: {depositDate}
              </div>
              <div style={{ fontSize: "12px", color: t.text, marginTop: "2px" }}>
                {p.invoice?.invoiceNumber || "-"} · {p.invoice?.customerName || "-"}
              </div>
            </div>
            <div style={{ flex: "2 1 200px" }}>
              <input style={{ ...ps.input, marginBottom: 0, width: "100%" }} placeholder="Notes (optional)..."
                value={notes[p.id] || ""} onChange={e => setNotes(n => ({ ...n, [p.id]: e.target.value }))} />
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button style={{ ...ps.btnSuccess, padding: "7px 16px" }} onClick={() => handleStatus(p.id, "DEPOSITED")}>
                ✓ Deposited
              </button>
              <button style={{ ...ps.btnDanger, padding: "7px 16px" }} onClick={() => handleStatus(p.id, "BOUNCED")}>
                ✗ Bounced
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}




// ── History Tab (Accounts) ───────────────────────────────────────────────────
function HistoryTab({ ps }) {
  const { t } = ps;
  const [subTab, setSubTab] = useState("customers");
  const [customerPayments, setCustomerPayments] = useState([]);
  const [supplierPayments, setSupplierPayments] = useState([]);
  const [salaryPayments, setSalaryPayments] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [filterMethod, setFilterMethod] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getAllPayments().catch(() => []),
      getAllSupplierPayments().catch(() => []),
      getAllSalaryPayments().catch(() => []),
    ]).then(([cp, sp, sal]) => {
      setCustomerPayments(Array.isArray(cp) ? cp : []);
      setSupplierPayments(Array.isArray(sp) ? sp : []);
      setSalaryPayments(Array.isArray(sal) ? sal : []);
    }).finally(() => setLoading(false));
  }, []);

  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const subTabs = [
    { key: "customers", label: "Customer Receipts" },
    { key: "suppliers", label: "Supplier Payments" },
    { key: "salary", label: "Staff Salaries" },
  ];

  const resetFilters = () => { setSearch(""); setFilterMethod(""); setFilterStatus(""); setFilterFrom(""); setFilterTo(""); };

  const inDateRange = (dateVal) => {
    const ds = Array.isArray(dateVal)
      ? `${dateVal[0]}-${String(dateVal[1]).padStart(2,"0")}-${String(dateVal[2]).padStart(2,"0")}`
      : (dateVal || "");
    if (filterFrom && ds < filterFrom) return false;
    if (filterTo && ds > filterTo) return false;
    return true;
  };

  const q = search.toLowerCase();

  const filteredCustomer = customerPayments.filter(p => {
    if (!inDateRange(p.paymentDate)) return false;
    if (filterMethod && p.paymentMethod !== filterMethod) return false;
    if (filterStatus) {
      const vs = p.verificationStatus || "";
      if (filterStatus === "CONFIRMED" && !["CONFIRMED","VERIFIED","DEPOSITED"].includes(vs)) return false;
      if (filterStatus === "PENDING" && vs !== "PENDING") return false;
      if (filterStatus === "NOT_RECEIVED" && !["NOT_RECEIVED","BOUNCED"].includes(vs)) return false;
    }
    if (q && !(
      (p.invoice?.invoiceNumber || "").toLowerCase().includes(q) ||
      (p.invoice?.customerName || "").toLowerCase().includes(q) ||
      (p.receivedBy?.name || "").toLowerCase().includes(q) ||
      (p.receivedByUser?.username || "").toLowerCase().includes(q) ||
      (p.paymentMethod || "").toLowerCase().includes(q)
    )) return false;
    return true;
  });

  const filteredSupplier = supplierPayments.filter(p => {
    if (!inDateRange(p.paymentDate)) return false;
    if (filterMethod && p.paymentMethod !== filterMethod) return false;
    if (q && !(
      (p.supplierName || "").toLowerCase().includes(q) ||
      (p.poNumber || "").toLowerCase().includes(q) ||
      (p.paymentMethod || "").toLowerCase().includes(q)
    )) return false;
    return true;
  });

  const filteredSalary = salaryPayments.filter(p => {
    if (!inDateRange(p.paymentDate)) return false;
    if (filterMethod && p.paymentMethod !== filterMethod) return false;
    if (q && !(
      (p.staffName || "").toLowerCase().includes(q) ||
      (p.employeeId || "").toLowerCase().includes(q) ||
      (p.designation || "").toLowerCase().includes(q)
    )) return false;
    return true;
  });

  const totalCustomer = filteredCustomer.reduce((s, p) => s + parseFloat(p.amount || 0), 0);
  const totalSupplier = filteredSupplier.reduce((s, p) => s + parseFloat(p.amount || 0), 0);
  const totalSalary = filteredSalary.reduce((s, p) => s + parseFloat(p.amount || 0), 0);

  const inputSm = { padding: "6px 10px", border: `1px solid ${t.inputBorder}`, borderRadius: "6px", fontSize: "12px", background: t.inputBg, color: t.text };

  return (
    <div>
      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginBottom: "20px" }}>
        {[
          { label: "Customer Receipts", value: totalCustomer, color: "#16a34a", count: filteredCustomer.length },
          { label: "Supplier Payments", value: totalSupplier, color: "#ef4444", count: filteredSupplier.length },
          { label: "Salary Paid", value: totalSalary, color: "#8b5cf6", count: filteredSalary.length },
        ].map(c => (
          <div key={c.label} style={{ background: t.surface, border: `1px solid ${c.color}44`, borderRadius: "8px", padding: "14px" }}>
            <div style={{ fontSize: "11px", color: t.textSub, marginBottom: "4px" }}>{c.label}</div>
            <div style={{ fontSize: "18px", fontWeight: 700, color: c.color }}>{fmt2(c.value)}</div>
            <div style={{ fontSize: "11px", color: t.textSub, marginTop: "2px" }}>{c.count} transactions</div>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "8px", padding: "14px 16px", marginBottom: "16px" }}>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "flex-end" }}>
          <div>
            <div style={{ fontSize: "11px", color: t.textSub, marginBottom: "4px" }}>Search</div>
            <input style={{ ...inputSm, width: "200px" }} placeholder="Name, invoice, PO..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div>
            <div style={{ fontSize: "11px", color: t.textSub, marginBottom: "4px" }}>From</div>
            <input style={{ ...inputSm, width: "140px" }} type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)} />
          </div>
          <div>
            <div style={{ fontSize: "11px", color: t.textSub, marginBottom: "4px" }}>To</div>
            <input style={{ ...inputSm, width: "140px" }} type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)} />
          </div>
          <div>
            <div style={{ fontSize: "11px", color: t.textSub, marginBottom: "4px" }}>Method</div>
            <select style={{ ...inputSm, width: "140px" }} value={filterMethod} onChange={e => setFilterMethod(e.target.value)}>
              <option value="">All Methods</option>
              {["CASH","UPI","BANK_TRANSFER","CHEQUE","NEFT","RTGS"].map(m => <option key={m} value={m}>{m.replace("_"," ")}</option>)}
            </select>
          </div>
          {subTab === "customers" && (
            <div>
              <div style={{ fontSize: "11px", color: t.textSub, marginBottom: "4px" }}>Status</div>
              <select style={{ ...inputSm, width: "150px" }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                <option value="">All Statuses</option>
                <option value="CONFIRMED">Confirmed / Cleared</option>
                <option value="PENDING">Pending Verification</option>
                <option value="NOT_RECEIVED">Not Received / Bounced</option>
              </select>
            </div>
          )}
          <button onClick={resetFilters} style={{ ...inputSm, background: "none", cursor: "pointer", color: "#6b7280", border: `1px solid ${t.border}`, borderRadius: "6px" }}>
            Clear
          </button>
        </div>
      </div>

      {/* Sub-tabs */}
      <div style={{ display: "flex", gap: "4px", marginBottom: "16px", borderBottom: `1px solid ${t.border}` }}>
        {subTabs.map(st => (
          <button key={st.key} onClick={() => { setSubTab(st.key); setFilterStatus(""); }}
            style={{ padding: "8px 18px", border: "none", background: "none", cursor: "pointer", fontSize: "13px",
              fontWeight: subTab === st.key ? 700 : 400,
              color: subTab === st.key ? "#2563eb" : t.textSub,
              borderBottom: subTab === st.key ? "2px solid #2563eb" : "2px solid transparent",
              marginBottom: "-1px" }}>
            {st.label}
          </button>
        ))}
      </div>

      {loading && <div style={ps.alertInfo}>Loading...</div>}

      {/* Customer Receipts */}
      {subTab === "customers" && (
        <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "8px", overflow: "hidden" }}>
          <table style={ps.table}>
            <thead><tr style={ps.thead}>
              <th style={ps.th}>Date</th><th style={ps.th}>Invoice</th><th style={ps.th}>Customer</th>
              <th style={ps.th}>Amount</th><th style={ps.th}>Method</th><th style={ps.th}>Received By</th>
              <th style={ps.th}>Destination</th><th style={ps.th}>Status</th><th style={ps.th}>Notes</th>
            </tr></thead>
            <tbody>
              {filteredCustomer.length === 0 && <tr><td colSpan={9} style={{ ...ps.td, textAlign: "center", color: "#9ca3af", padding: "32px" }}>No records match filters</td></tr>}
              {filteredCustomer.map(p => (
                <tr key={p.id} style={ps.tr}>
                  <td style={ps.tdSub}>{fmtDate(p.paymentDate)}</td>
                  <td style={{ ...ps.td, color: "#2563eb", fontWeight: 600, fontSize: "12px" }}>{p.invoice?.invoiceNumber || "-"}</td>
                  <td style={{ ...ps.td, fontWeight: 600 }}>{p.invoice?.customerName || "-"}</td>
                  <td style={{ ...ps.td, color: "#16a34a", fontWeight: 700 }}>{fmt2(p.amount)}</td>
                  <td style={ps.tdSub}>{p.paymentMethod?.replace("_"," ")}</td>
                  <td style={ps.td}>
                    {p.receivedBy
                      ? <span style={{ color: "#2563eb" }}>{p.receivedBy.name} <span style={{ fontSize: "10px", color: t.textSub }}>(Staff)</span></span>
                      : p.receivedByUser
                      ? <span style={{ color: "#8b5cf6" }}>{p.receivedByUser.username} <span style={{ fontSize: "10px", color: t.textSub }}>(Admin)</span></span>
                      : <span style={{ color: "#16a34a", fontSize: "12px" }}>Company Direct</span>}
                  </td>
                  <td style={ps.tdSub}>{p.destination?.replace("_"," ") || "-"}</td>
                  <td style={ps.td}>
                    <span style={{ padding: "2px 7px", borderRadius: "10px", fontSize: "10px", fontWeight: 600,
                      background: (VSTATUS_COLOR[p.verificationStatus] || "#6b7280") + "22",
                      color: VSTATUS_COLOR[p.verificationStatus] || "#6b7280" }}>
                      {p.verificationStatus || "-"}
                    </span>
                  </td>
                  <td style={ps.tdSub}>{p.notes || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ padding: "10px 16px", borderTop: `1px solid ${t.border}`, fontSize: "12px", color: t.textSub, display: "flex", justifyContent: "space-between" }}>
            <span>{filteredCustomer.length} records</span>
            <span style={{ fontWeight: 700, color: "#16a34a" }}>Total: {fmt2(totalCustomer)}</span>
          </div>
        </div>
      )}

      {/* Supplier Payments */}
      {subTab === "suppliers" && (
        <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "8px", overflow: "hidden" }}>
          <table style={ps.table}>
            <thead><tr style={ps.thead}>
              <th style={ps.th}>Date</th><th style={ps.th}>PO Number</th><th style={ps.th}>Supplier</th>
              <th style={ps.th}>Amount</th><th style={ps.th}>Method</th><th style={ps.th}>Notes</th>
            </tr></thead>
            <tbody>
              {filteredSupplier.length === 0 && <tr><td colSpan={6} style={{ ...ps.td, textAlign: "center", color: "#9ca3af", padding: "32px" }}>No records match filters</td></tr>}
              {filteredSupplier.map(p => (
                <tr key={p.id} style={ps.tr}>
                  <td style={ps.tdSub}>{fmtDate(p.paymentDate)}</td>
                  <td style={{ ...ps.td, color: "#2563eb", fontWeight: 600, fontSize: "12px" }}>{p.poNumber || "-"}</td>
                  <td style={{ ...ps.td, fontWeight: 600 }}>{p.supplierName || "-"}</td>
                  <td style={{ ...ps.td, color: "#ef4444", fontWeight: 700 }}>{fmt2(p.amount)}</td>
                  <td style={ps.tdSub}>{p.paymentMethod?.replace("_"," ")}</td>
                  <td style={ps.tdSub}>{p.notes || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ padding: "10px 16px", borderTop: `1px solid ${t.border}`, fontSize: "12px", color: t.textSub, display: "flex", justifyContent: "space-between" }}>
            <span>{filteredSupplier.length} records</span>
            <span style={{ fontWeight: 700, color: "#ef4444" }}>Total: {fmt2(totalSupplier)}</span>
          </div>
        </div>
      )}

      {/* Staff Salaries */}
      {subTab === "salary" && (
        <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "8px", overflow: "hidden" }}>
          <table style={ps.table}>
            <thead><tr style={ps.thead}>
              <th style={ps.th}>Period</th><th style={ps.th}>Emp ID</th><th style={ps.th}>Staff Name</th>
              <th style={ps.th}>Designation</th><th style={ps.th}>Amount</th><th style={ps.th}>Method</th>
              <th style={ps.th}>Payment Date</th><th style={ps.th}>Notes</th>
            </tr></thead>
            <tbody>
              {filteredSalary.length === 0 && <tr><td colSpan={8} style={{ ...ps.td, textAlign: "center", color: "#9ca3af", padding: "32px" }}>No records match filters</td></tr>}
              {filteredSalary.map(p => (
                <tr key={p.id} style={ps.tr}>
                  <td style={{ ...ps.td, fontWeight: 600, color: "#8b5cf6" }}>{MONTHS[(p.month || 1) - 1]} {p.year}</td>
                  <td style={{ ...ps.td, fontSize: "11px", color: "#2563eb", fontWeight: 600 }}>{p.employeeId || "-"}</td>
                  <td style={{ ...ps.td, fontWeight: 600 }}>{p.staffName || "-"}</td>
                  <td style={ps.tdSub}>{p.designation || "-"}</td>
                  <td style={{ ...ps.td, color: "#8b5cf6", fontWeight: 700 }}>{fmt2(p.amount)}</td>
                  <td style={ps.tdSub}>{p.paymentMethod?.replace("_"," ")}</td>
                  <td style={ps.tdSub}>{fmtDate(p.paymentDate)}</td>
                  <td style={ps.tdSub}>{p.notes || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ padding: "10px 16px", borderTop: `1px solid ${t.border}`, fontSize: "12px", color: t.textSub, display: "flex", justifyContent: "space-between" }}>
            <span>{filteredSalary.length} records</span>
            <span style={{ fontWeight: 700, color: "#8b5cf6" }}>Total: {fmt2(totalSalary)}</span>
          </div>
        </div>
      )}
    </div>
  );
}


function PaymentsDashboard({ ps }) {
  const { t } = ps;
  const [allPayments, setAllPayments] = useState([]);
  const [overdueCheques, setOverdueCheques] = useState([]);
  const [walletData, setWalletData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getAllPayments().catch(() => []),
      getPendingCheques().catch(() => []),
      getWalletData().catch(() => null),
    ]).then(([pays, cheques, wallet]) => {
      setAllPayments(pays);
      setWalletData(wallet);
      setOverdueCheques(cheques.filter(c => {
        const d = c.chequeDepositDate;
        const ds = Array.isArray(d) ? `${d[0]}-${String(d[1]).padStart(2,"0")}-${String(d[2]).padStart(2,"0")}` : d;
        return ds && ds <= new Date().toISOString().split("T")[0];
      }));
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return null;

  const total = allPayments.reduce((s, p) => s + parseFloat(p.amount || 0), 0);
  const confirmed = allPayments.filter(p => ["CONFIRMED","VERIFIED","DEPOSITED"].includes(p.verificationStatus))
    .reduce((s, p) => s + parseFloat(p.amount || 0), 0);
  const pending = allPayments.filter(p => p.verificationStatus === "PENDING")
    .reduce((s, p) => s + parseFloat(p.amount || 0), 0);
  const unassigned = allPayments.filter(p => !p.receivedBy && !p.receivedByUser && p.destination !== "COMPANY_DIRECT")
    .reduce((s, p) => s + parseFloat(p.amount || 0), 0);
  const companyDirect = allPayments.filter(p => p.destination === "COMPANY_DIRECT" && ["CONFIRMED","DEPOSITED"].includes(p.verificationStatus))
    .reduce((s, p) => s + parseFloat(p.amount || 0), 0);
  const staffHeld = allPayments.filter(p => p.destination === "STAFF_WALLET")
    .reduce((s, p) => s + parseFloat(p.amount || 0), 0);
  const adminHeld = allPayments.filter(p => p.destination === "ADMIN_WALLET" && p.verificationStatus === "VERIFIED")
    .reduce((s, p) => s + parseFloat(p.amount || 0), 0);
  const companyWalletBalance = parseFloat(walletData?.walletBalance ?? 0);

  return (
    <div style={{ marginBottom: "24px" }}>
      {/* Overdue cheque warning */}
      {overdueCheques.length > 0 && (
        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", padding: "12px 16px", marginBottom: "16px", display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "18px" }}>⚠️</span>
          <div>
            <div style={{ fontWeight: 700, color: "#dc2626", fontSize: "13px" }}>
              {overdueCheques.length} cheque{overdueCheques.length > 1 ? "s" : ""} due for deposit confirmation
            </div>
            <div style={{ fontSize: "12px", color: "#ef4444" }}>
              {overdueCheques.map(c => `${c.invoice?.invoiceNumber || "—"} (${fmt2(c.amount)})`).join(" · ")}
            </div>
          </div>
        </div>
      )}

      {/* Unassigned warning */}
      {unassigned > 0 && (
        <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "8px", padding: "12px 16px", marginBottom: "16px", display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "18px" }}>⚠️</span>
          <div>
            <div style={{ fontWeight: 700, color: "#92400e", fontSize: "13px" }}>Unassigned payments: {fmt2(unassigned)}</div>
            <div style={{ fontSize: "12px", color: "#b45309" }}>These payments have no staff or admin assigned — check and update them.</div>
          </div>
        </div>
      )}

      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "12px" }}>
        {[
          { label: "Company Wallet Balance", value: companyWalletBalance, color: companyWalletBalance >= 0 ? "#16a34a" : "#ef4444" },
          { label: "Total Collected", value: total, color: "#2563eb" },
          { label: "Confirmed / Cleared", value: confirmed, color: "#16a34a" },
          { label: "Pending Verification", value: pending, color: "#f59e0b" },
          { label: "Direct to Company", value: companyDirect, color: "#16a34a" },
          { label: "Held by Staff", value: staffHeld, color: staffHeld > 0 ? "#ef4444" : "#16a34a" },
          { label: "Held by Admins", value: adminHeld, color: adminHeld > 0 ? "#f59e0b" : "#16a34a" },
        ].map(c => (
          <div key={c.label} style={{ background: t.surface, border: `1px solid ${c.color}44`, borderRadius: "8px", padding: "14px" }}>
            <div style={{ fontSize: "11px", color: t.textSub, marginBottom: "4px" }}>{c.label}</div>
            <div style={{ fontSize: "17px", fontWeight: 700, color: c.color }}>{fmt2(c.value)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main PaymentsPage ─────────────────────────────────────────────────────────
function PaymentsPage() {
  const ps = usePageStyles();
  const { t } = ps;
  const { user, hasAccess } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const isAccounts = user?.role === "ACCOUNTS";

  const tabs = [
    { key: "receive", label: "Receive Payment", show: hasAccess("payments") },
    { key: "pay", label: "Pay Supplier", show: hasAccess("purchase") || hasAccess("payments") },
    { key: "refunds", label: "Refunds", show: hasAccess("sales-returns") || hasAccess("payments") },
    { key: "verify", label: "Verify Online", show: isAdmin },
    { key: "cheques", label: "Cheques", show: isAdmin || isAccounts },
    { key: "history", label: "History", show: hasAccess("payments") },
  ].filter(tab => tab.show);

  const [activeTab, setActiveTab] = useState(tabs[0]?.key || "receive");

  return (
    <MainLayout>
      <div style={ps.pageHeader}>
        <h2 style={{ margin: 0 }}>Payments</h2>
      </div>

      <PaymentsDashboard ps={ps} />

      {/* Tabs */}
      <div style={{ display: "flex", gap: "4px", marginBottom: "24px", borderBottom: `2px solid ${t.border}` }}>
        {tabs.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            style={{ padding: "10px 20px", border: "none", background: "none", cursor: "pointer", fontSize: "14px", fontWeight: activeTab === tab.key ? 700 : 400,
              color: activeTab === tab.key ? "#2563eb" : t.textSub,
              borderBottom: activeTab === tab.key ? "2px solid #2563eb" : "2px solid transparent",
              marginBottom: "-2px", borderRadius: "0" }}>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "receive" && <SOPayPage ps={ps} />}
      {activeTab === "pay" && <POPayPage ps={ps} />}
      {activeTab === "refunds" && <RefundsTab ps={ps} />}
      {activeTab === "verify" && <VerifyTab ps={ps} />}
      {activeTab === "cheques" && <ChequesTab ps={ps} />}
      {activeTab === "history" && <HistoryTab ps={ps} />}
    </MainLayout>
  );
}

export default PaymentsPage;
