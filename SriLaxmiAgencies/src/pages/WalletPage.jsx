import { useEffect, useState } from "react";
import MainLayout from "../layout/MainLayout";
import { getAllWallets, getStaffWallet, getAdminWallet, recordStaffTransfer, recordAdminTransfer } from "../services/walletService";
import { verifyPayment } from "../services/paymentService";
import { usePageStyles } from "../hooks/usePageStyles";
import { useAuth } from "../context/AuthContext";

const fmt2 = v => `Rs.${parseFloat(v || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
const fmtDate = d => Array.isArray(d)
  ? `${d[0]}-${String(d[1]).padStart(2,"0")}-${String(d[2]).padStart(2,"0")}`
  : d || "-";

const VSTATUS_COLOR = {
  CONFIRMED: "#16a34a", VERIFIED: "#16a34a", DEPOSITED: "#16a34a",
  PENDING: "#f59e0b", NOT_RECEIVED: "#ef4444", BOUNCED: "#ef4444"
};

// ── Staff Wallet Detail ───────────────────────────────────────────────────────
function StaffWalletDetail({ staffId, onBack, ps }) {
  const { t } = ps;
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const [wallet, setWallet] = useState(null);
  const [amount, setAmount] = useState("");
  const [transferType, setTransferType] = useState("CASH_DEPOSIT");
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const load = async () => {
    try { setLoading(true); setWallet(await getStaffWallet(staffId)); }
    catch { setError("Failed to load wallet"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [staffId]);

  const handleTransfer = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { setError("Enter a valid amount"); return; }
    const balance = parseFloat(wallet?.walletBalance || 0);
    if (!isAdmin && Math.abs(amt - balance) > 0.01) { setError(`Non-admin users must transfer the full balance (${fmt2(balance)})`); return; }
    if (amt > balance) { setError(`Cannot transfer more than wallet balance (${fmt2(balance)})`); return; }
    try {
      setLoading(true); setError("");
      await recordStaffTransfer(staffId, { amount: amt, transferType, notes, transferDate: date });
      setAmount(""); setNotes("");
      await load();
    } catch (e) { setError(e.response?.data?.message || "Transfer failed"); }
    finally { setLoading(false); }
  };

  if (!wallet && loading) return <MainLayout><div style={{ padding: "32px", color: "#6b7280" }}>Loading...</div></MainLayout>;

  return (
    <MainLayout>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
        <button onClick={onBack} style={{ padding: "7px 14px", border: `1px solid ${t.border}`, borderRadius: "6px", background: t.surface, color: t.text, cursor: "pointer", fontSize: "13px" }}>← Back</button>
        <div>
          <h2 style={{ margin: 0, fontSize: "18px", color: t.text }}>{wallet?.staffName} — Staff Wallet</h2>
          <div style={{ fontSize: "12px", color: t.textSub, marginTop: "2px" }}>
            {wallet?.employeeId && <span style={{ color: "#2563eb", fontWeight: 600 }}>{wallet.employeeId} · </span>}
            {wallet?.designation}
          </div>
        </div>
      </div>

      {error && <div style={ps.alertError}>{error}</div>}

      {wallet && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "12px", marginBottom: "24px" }}>
          {[
            { label: "Total Received", value: wallet.totalReceived, color: "#2563eb" },
            { label: "Cash Received", value: wallet.totalCash, color: "#6b7280" },
            { label: "Online Received", value: wallet.totalOnline, color: "#8b5cf6" },
            { label: "Transferred to Company", value: wallet.totalTransferred, color: "#16a34a" },
            { label: "Wallet Balance", value: wallet.walletBalance, color: parseFloat(wallet.walletBalance) > 0 ? "#ef4444" : "#16a34a", big: true },
          ].map(c => (
            <div key={c.label} style={{ background: t.surface, border: `1px solid ${c.color}44`, borderRadius: "8px", padding: "14px" }}>
              <div style={{ fontSize: "11px", color: t.textSub, marginBottom: "4px" }}>{c.label}</div>
              <div style={{ fontSize: c.big ? "22px" : "18px", fontWeight: 700, color: c.color }}>{fmt2(c.value)}</div>
            </div>
          ))}
        </div>
      )}

      {parseFloat(wallet?.walletBalance || 0) > 0 && (
        <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "8px", padding: "20px", marginBottom: "24px" }}>
          <div style={{ fontWeight: 700, fontSize: "14px", color: t.text, marginBottom: "14px" }}>Transfer to Company Wallet</div>
          {!isAdmin && (
            <div style={{ fontSize: "12px", color: "#f59e0b", marginBottom: "10px" }}>
              You must transfer the full balance. Only ADMIN can do partial transfers.
            </div>
          )}
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "flex-end" }}>
            <div>
              <label style={ps.label}>Amount (Rs.) *</label>
              <input style={{ ...ps.input, width: "150px", marginBottom: 0 }} type="number" min="0"
                max={wallet?.walletBalance}
                value={isAdmin ? amount : (wallet?.walletBalance || "")}
                onChange={e => isAdmin && setAmount(e.target.value)}
                readOnly={!isAdmin} />
            </div>
            <div>
              <label style={ps.label}>Type</label>
              <select style={{ ...ps.input, width: "170px", marginBottom: 0 }} value={transferType} onChange={e => setTransferType(e.target.value)}>
                <option value="CASH_DEPOSIT">Cash Deposit</option>
                <option value="ONLINE_TRANSFER">Online Transfer</option>
              </select>
            </div>
            <div>
              <label style={ps.label}>Date</label>
              <input style={{ ...ps.input, width: "150px", marginBottom: 0 }} type="date" value={date} onChange={e => setDate(e.target.value)} />
            </div>
            <div style={{ flex: "2 1 180px" }}>
              <label style={ps.label}>Notes</label>
              <input style={{ ...ps.input, marginBottom: 0 }} placeholder="Optional..." value={notes} onChange={e => setNotes(e.target.value)} />
            </div>
            <button style={ps.btnSuccess} onClick={() => {
              if (!isAdmin) setAmount(String(wallet?.walletBalance || ""));
              handleTransfer();
            }} disabled={loading}>{loading ? "Saving..." : "Transfer"}</button>
          </div>
        </div>
      )}

      {wallet?.recentPayments?.length > 0 && (
        <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "8px", padding: "20px", marginBottom: "20px" }}>
          <div style={{ fontWeight: 700, fontSize: "14px", color: t.text, marginBottom: "12px" }}>Recent Payments Received</div>
          <table style={ps.table}>
            <thead><tr style={ps.thead}>
              <th style={ps.th}>Date</th><th style={ps.th}>Invoice</th><th style={ps.th}>Customer</th>
              <th style={ps.th}>Amount</th><th style={ps.th}>Method</th><th style={ps.th}>Channel</th>
            </tr></thead>
            <tbody>
              {wallet.recentPayments.map(p => (
                <tr key={p.id} style={ps.tr}>
                  <td style={ps.tdSub}>{fmtDate(p.paymentDate)}</td>
                  <td style={ps.td}>{p.invoiceNumber || "-"}</td>
                  <td style={ps.td}>{p.customerName || "-"}</td>
                  <td style={{ ...ps.td, color: "#2563eb", fontWeight: 600 }}>{fmt2(p.amount)}</td>
                  <td style={ps.tdSub}>{p.paymentMethod?.replace("_"," ")}</td>
                  <td style={ps.td}>
                    <span style={{ padding: "2px 8px", borderRadius: "10px", fontSize: "11px", fontWeight: 600,
                      background: p.paymentChannel === "CASH" ? "#fef3c7" : "#ede9fe",
                      color: p.paymentChannel === "CASH" ? "#92400e" : "#5b21b6" }}>
                      {p.paymentChannel || "-"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {wallet?.transfers?.length > 0 && (
        <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "8px", padding: "20px" }}>
          <div style={{ fontWeight: 700, fontSize: "14px", color: t.text, marginBottom: "12px" }}>Transfer History (to Company)</div>
          <table style={ps.table}>
            <thead><tr style={ps.thead}>
              <th style={ps.th}>Date</th><th style={ps.th}>Amount</th><th style={ps.th}>Type</th><th style={ps.th}>Notes</th><th style={ps.th}>Recorded By</th>
            </tr></thead>
            <tbody>
              {wallet.transfers.map(tr => (
                <tr key={tr.id} style={ps.tr}>
                  <td style={ps.tdSub}>{fmtDate(tr.transferDate)}</td>
                  <td style={{ ...ps.td, color: "#16a34a", fontWeight: 600 }}>{fmt2(tr.amount)}</td>
                  <td style={ps.tdSub}>{tr.transferType?.replace("_"," ")}</td>
                  <td style={ps.tdSub}>{tr.notes || "-"}</td>
                  <td style={ps.tdSub}>{tr.recordedBy || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </MainLayout>
  );
}

// ── Admin Wallet Detail ───────────────────────────────────────────────────────
function AdminWalletDetail({ userId, onBack, ps }) {
  const { t } = ps;
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const [wallet, setWallet] = useState(null);
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [verifyNotes, setVerifyNotes] = useState({});

  const load = async () => {
    try { setLoading(true); setWallet(await getAdminWallet(userId)); }
    catch { setError("Failed to load admin wallet"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [userId]);

  const handleTransfer = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { setError("Enter a valid amount"); return; }
    const balance = parseFloat(wallet?.walletBalance || 0);
    if (!isAdmin && Math.abs(amt - balance) > 0.01) { setError(`Non-admin users must transfer the full balance (${fmt2(balance)})`); return; }
    if (amt > balance) { setError(`Cannot transfer more than verified balance (${fmt2(balance)})`); return; }
    try {
      setLoading(true); setError("");
      await recordAdminTransfer(userId, { amount: amt, transferType: "ONLINE_TRANSFER", notes, transferDate: date });
      setAmount(""); setNotes("");
      await load();
    } catch (e) { setError(e.response?.data?.message || "Transfer failed"); }
    finally { setLoading(false); }
  };

  const handleVerify = async (id, status) => {
    try {
      await verifyPayment(id, status, verifyNotes[id] || "");
      await load();
    } catch { setError("Failed to update verification"); }
  };

  if (!wallet && loading) return <MainLayout><div style={{ padding: "32px", color: "#6b7280" }}>Loading...</div></MainLayout>;

  const pendingPayments = wallet?.payments?.filter(p => p.verificationStatus === "PENDING") || [];
  const verifiedPayments = wallet?.payments?.filter(p => p.verificationStatus !== "PENDING") || [];

  return (
    <MainLayout>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
        <button onClick={onBack} style={{ padding: "7px 14px", border: `1px solid ${t.border}`, borderRadius: "6px", background: t.surface, color: t.text, cursor: "pointer", fontSize: "13px" }}>← Back</button>
        <div>
          <h2 style={{ margin: 0, fontSize: "18px", color: t.text }}>{wallet?.username} — Admin Wallet</h2>
          <div style={{ fontSize: "12px", color: t.textSub, marginTop: "2px" }}>Online payments received in this admin's personal account</div>
        </div>
      </div>

      {error && <div style={ps.alertError}>{error}</div>}

      {wallet && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "12px", marginBottom: "24px" }}>
          {[
            { label: "Total Received", value: wallet.totalReceived, color: "#2563eb" },
            { label: "Verified", value: wallet.verified, color: "#16a34a" },
            { label: "Pending Verification", value: wallet.pending, color: "#f59e0b" },
            { label: "Not Received", value: wallet.notReceived, color: "#ef4444" },
            { label: "Transferred to Company", value: wallet.totalTransferred, color: "#8b5cf6" },
            { label: "Available Balance", value: wallet.walletBalance, color: parseFloat(wallet.walletBalance) > 0 ? "#2563eb" : "#16a34a", big: true },
          ].map(c => (
            <div key={c.label} style={{ background: t.surface, border: `1px solid ${c.color}44`, borderRadius: "8px", padding: "14px" }}>
              <div style={{ fontSize: "11px", color: t.textSub, marginBottom: "4px" }}>{c.label}</div>
              <div style={{ fontSize: c.big ? "22px" : "18px", fontWeight: 700, color: c.color }}>{fmt2(c.value)}</div>
            </div>
          ))}
        </div>
      )}

      {/* Pending verifications */}
      {pendingPayments.length > 0 && (
        <div style={{ background: t.surface, border: "1px solid #f59e0b44", borderRadius: "8px", padding: "20px", marginBottom: "20px" }}>
          <div style={{ fontWeight: 700, fontSize: "14px", color: "#92400e", marginBottom: "12px" }}>
            Pending Verification ({pendingPayments.length})
          </div>
          <div style={{ fontSize: "12px", color: t.textSub, marginBottom: "12px" }}>
            Check your bank statement and mark each payment as received or not received.
          </div>
          {pendingPayments.map(p => (
            <div key={p.id} style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center", padding: "12px", background: t.bg, borderRadius: "6px", marginBottom: "8px" }}>
              <div style={{ flex: "1 1 200px" }}>
                <div style={{ fontWeight: 700, color: "#2563eb" }}>{fmt2(p.amount)}</div>
                <div style={{ fontSize: "12px", color: t.textSub }}>{fmtDate(p.paymentDate)} · {p.paymentMethod?.replace("_"," ")}</div>
                <div style={{ fontSize: "12px", color: t.text }}>{p.invoiceNumber} · {p.customerName}</div>
              </div>
              <input style={{ ...ps.input, width: "180px", marginBottom: 0 }} placeholder="Notes..."
                value={verifyNotes[p.id] || ""} onChange={e => setVerifyNotes(n => ({ ...n, [p.id]: e.target.value }))} />
              <div style={{ display: "flex", gap: "8px" }}>
                <button style={{ ...ps.btnSuccess, padding: "6px 14px" }} onClick={() => handleVerify(p.id, "VERIFIED")}>✓ Received</button>
                <button style={{ ...ps.btnDanger, padding: "6px 14px" }} onClick={() => handleVerify(p.id, "NOT_RECEIVED")}>✗ Not Received</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Transfer to company */}
      {parseFloat(wallet?.walletBalance || 0) > 0 && (
        <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "8px", padding: "20px", marginBottom: "24px" }}>
          <div style={{ fontWeight: 700, fontSize: "14px", color: t.text, marginBottom: "14px" }}>Transfer Verified Amount to Company Wallet</div>
          {!isAdmin && (
            <div style={{ fontSize: "12px", color: "#f59e0b", marginBottom: "10px" }}>
              You must transfer the full verified balance. Only ADMIN can do partial transfers.
            </div>
          )}
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "flex-end" }}>
            <div>
              <label style={ps.label}>Amount (Rs.) *</label>
              <input style={{ ...ps.input, width: "150px", marginBottom: 0 }} type="number" min="0"
                max={wallet?.walletBalance}
                value={isAdmin ? amount : (wallet?.walletBalance || "")}
                onChange={e => isAdmin && setAmount(e.target.value)}
                readOnly={!isAdmin} />
            </div>
            <div>
              <label style={ps.label}>Date</label>
              <input style={{ ...ps.input, width: "150px", marginBottom: 0 }} type="date" value={date} onChange={e => setDate(e.target.value)} />
            </div>
            <div style={{ flex: "2 1 180px" }}>
              <label style={ps.label}>Notes</label>
              <input style={{ ...ps.input, marginBottom: 0 }} placeholder="Optional..." value={notes} onChange={e => setNotes(e.target.value)} />
            </div>
            <button style={ps.btnSuccess} onClick={() => {
              if (!isAdmin) setAmount(String(wallet?.walletBalance || ""));
              handleTransfer();
            }} disabled={loading}>{loading ? "Saving..." : "Transfer to Company"}</button>
          </div>
        </div>
      )}

      {/* Verified payments history */}
      {verifiedPayments.length > 0 && (
        <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "8px", padding: "20px", marginBottom: "20px" }}>
          <div style={{ fontWeight: 700, fontSize: "14px", color: t.text, marginBottom: "12px" }}>Payment History</div>
          <table style={ps.table}>
            <thead><tr style={ps.thead}>
              <th style={ps.th}>Date</th><th style={ps.th}>Invoice</th><th style={ps.th}>Customer</th>
              <th style={ps.th}>Amount</th><th style={ps.th}>Method</th><th style={ps.th}>Status</th><th style={ps.th}>Notes</th>
            </tr></thead>
            <tbody>
              {verifiedPayments.map(p => (
                <tr key={p.id} style={ps.tr}>
                  <td style={ps.tdSub}>{fmtDate(p.paymentDate)}</td>
                  <td style={ps.td}>{p.invoiceNumber || "-"}</td>
                  <td style={ps.td}>{p.customerName || "-"}</td>
                  <td style={{ ...ps.td, color: "#2563eb", fontWeight: 600 }}>{fmt2(p.amount)}</td>
                  <td style={ps.tdSub}>{p.paymentMethod?.replace("_"," ")}</td>
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

      {/* Transfer history */}
      {wallet?.transfers?.length > 0 && (
        <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "8px", padding: "20px" }}>
          <div style={{ fontWeight: 700, fontSize: "14px", color: t.text, marginBottom: "12px" }}>Transfer History (to Company)</div>
          <table style={ps.table}>
            <thead><tr style={ps.thead}>
              <th style={ps.th}>Date</th><th style={ps.th}>Amount</th><th style={ps.th}>Notes</th><th style={ps.th}>Recorded By</th>
            </tr></thead>
            <tbody>
              {wallet.transfers.map(tr => (
                <tr key={tr.id} style={ps.tr}>
                  <td style={ps.tdSub}>{fmtDate(tr.transferDate)}</td>
                  <td style={{ ...ps.td, color: "#16a34a", fontWeight: 600 }}>{fmt2(tr.amount)}</td>
                  <td style={ps.tdSub}>{tr.notes || "-"}</td>
                  <td style={ps.tdSub}>{tr.recordedBy || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </MainLayout>
  );
}

// ── Main WalletPage ───────────────────────────────────────────────────────────
function WalletPage() {
  const ps = usePageStyles();
  const { t } = ps;
  const [wallets, setWallets] = useState([]);
  const [selected, setSelected] = useState(null); // { type: "STAFF"|"ADMIN", id }
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    try { setLoading(true); setWallets(await getAllWallets()); }
    catch { setError("Failed to load wallets"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  if (selected?.type === "STAFF") {
    return <StaffWalletDetail staffId={selected.id} onBack={() => { setSelected(null); load(); }} ps={ps} />;
  }
  if (selected?.type === "ADMIN") {
    return <AdminWalletDetail userId={selected.id} onBack={() => { setSelected(null); load(); }} ps={ps} />;
  }

  const staffWallets = wallets.filter(w => w.walletType === "STAFF");
  const adminWallets = wallets.filter(w => w.walletType === "ADMIN");
  const totalStaffHolding = staffWallets.reduce((s, w) => s + parseFloat(w.walletBalance || 0), 0);
  const totalAdminHolding = adminWallets.reduce((s, w) => s + parseFloat(w.walletBalance || 0), 0);
  const totalReceived = wallets.reduce((s, w) => s + parseFloat(w.totalReceived || 0), 0);
  const totalTransferred = wallets.reduce((s, w) => s + parseFloat(w.totalTransferred || 0), 0);

  return (
    <MainLayout>
      <div style={ps.pageHeader}>
        <h2 style={{ margin: 0 }}>Wallets</h2>
      </div>

      {error && <div style={ps.alertError}>{error}</div>}
      {loading && <div style={ps.alertInfo}>Loading...</div>}

      {/* Summary */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "24px", flexWrap: "wrap" }}>
        {[
          { label: "Total Collected", value: totalReceived, color: "#2563eb" },
          { label: "Transferred to Company", value: totalTransferred, color: "#16a34a" },
          { label: "Held by Staff", value: totalStaffHolding, color: totalStaffHolding > 0 ? "#ef4444" : "#16a34a" },
          { label: "Held by Admins", value: totalAdminHolding, color: totalAdminHolding > 0 ? "#f59e0b" : "#16a34a" },
        ].map(c => (
          <div key={c.label} style={{ ...ps.card, borderColor: c.color, flex: 1, minWidth: "160px" }}>
            <div style={ps.cardLabel}>{c.label}</div>
            <div style={{ ...ps.cardValue, color: c.color }}>{fmt2(c.value)}</div>
          </div>
        ))}
      </div>

      {/* Staff Wallets */}
      {staffWallets.length > 0 && (
        <div style={{ marginBottom: "28px" }}>
          <div style={{ fontWeight: 700, fontSize: "14px", color: t.text, marginBottom: "12px" }}>Staff Wallets (Cash Collected)</div>
          <div style={ps.tableWrap}>
            <table style={ps.table}>
              <thead><tr style={ps.thead}>
                <th style={ps.th}>Emp ID</th><th style={ps.th}>Staff Name</th><th style={ps.th}>Designation</th>
                <th style={ps.th}>Total Received</th><th style={ps.th}>Transferred</th>
                <th style={ps.th}>Balance</th><th style={ps.th}>Action</th>
              </tr></thead>
              <tbody>
                {staffWallets.map(w => {
                  const balance = parseFloat(w.walletBalance || 0);
                  return (
                    <tr key={w.staffId} style={ps.tr}>
                      <td style={{ ...ps.td, color: "#2563eb", fontWeight: 600, fontSize: "12px" }}>{w.employeeId || "—"}</td>
                      <td style={{ ...ps.td, fontWeight: 600 }}>{w.staffName}</td>
                      <td style={ps.tdSub}>{w.designation || "-"}</td>
                      <td style={{ ...ps.td, color: "#2563eb" }}>{fmt2(w.totalReceived)}</td>
                      <td style={{ ...ps.td, color: "#16a34a" }}>{fmt2(w.totalTransferred)}</td>
                      <td style={{ ...ps.td, fontWeight: 700, color: balance > 0 ? "#ef4444" : "#16a34a" }}>{fmt2(balance)}</td>
                      <td style={ps.td}>
                        <button style={ps.btnSmPrimary} onClick={() => setSelected({ type: "STAFF", id: w.staffId })}>View / Transfer</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Admin Wallets */}
      {adminWallets.length > 0 && (
        <div>
          <div style={{ fontWeight: 700, fontSize: "14px", color: t.text, marginBottom: "12px" }}>Admin Wallets (Online Payments)</div>
          <div style={ps.tableWrap}>
            <table style={ps.table}>
              <thead><tr style={ps.thead}>
                <th style={ps.th}>Admin</th><th style={ps.th}>Role</th>
                <th style={ps.th}>Total Received</th><th style={ps.th}>Transferred</th>
                <th style={ps.th}>Available Balance</th><th style={ps.th}>Action</th>
              </tr></thead>
              <tbody>
                {adminWallets.map(w => {
                  const balance = parseFloat(w.walletBalance || 0);
                  return (
                    <tr key={w.userId} style={ps.tr}>
                      <td style={{ ...ps.td, fontWeight: 600 }}>{w.staffName}</td>
                      <td style={ps.tdSub}>{w.designation || "ADMIN"}</td>
                      <td style={{ ...ps.td, color: "#2563eb" }}>{fmt2(w.totalReceived)}</td>
                      <td style={{ ...ps.td, color: "#16a34a" }}>{fmt2(w.totalTransferred)}</td>
                      <td style={{ ...ps.td, fontWeight: 700, color: balance > 0 ? "#f59e0b" : "#16a34a" }}>{fmt2(balance)}</td>
                      <td style={ps.td}>
                        <button style={ps.btnSmPrimary} onClick={() => setSelected({ type: "ADMIN", id: w.userId })}>View / Transfer</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {wallets.length === 0 && !loading && (
        <div style={{ padding: "40px", textAlign: "center", color: "#9ca3af", background: t.surface, borderRadius: "8px", border: `1px solid ${t.border}` }}>
          No wallet activity yet. Record payments with "Received By" staff or admin to track wallets.
        </div>
      )}
    </MainLayout>
  );
}

export default WalletPage;
