import { useEffect, useState } from "react";
import MainLayout from "../layout/MainLayout";
import {
  getStaff, createStaff, updateStaff, setStaffActive,
  paySalary, getSalaryHistory, getSalarySummary,
  deleteStaff, getAdminStaff, getStaffById
} from "../services/staffService";
import { createUser, updateUser, deleteUser, getRoles } from "../services/userService";
import { usePageStyles } from "../hooks/usePageStyles";
import { useTheme } from "../context/ThemeContext";
import { getTheme } from "../theme";
import { useAuth } from "../context/AuthContext";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const PAY_METHODS = ["CASH","UPI","BANK_TRANSFER","CHEQUE","NEFT","RTGS"];
const fmt = v => `Rs.${parseFloat(v || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

const ROLE_COLORS = {
  OWNER: "#f97316", ADMIN: "#ef4444", MANAGER: "#8b5cf6", SALES: "#2563eb",
  ACCOUNTS: "#16a34a", WAREHOUSE: "#f59e0b", DRIVER: "#6b7280",
};

const BLANK = {
  name: "", phone: "", email: "", designation: "", joinDate: "", monthlySalary: "",
  hasLogin: false, username: "", password: "", roleName: "",
};

// ── Member Detail (salary drill-down) ────────────────────────────────────────
function MemberDetail({ staffId, isAdminRole, onBack, onRefresh, ps }) {
  const { dark } = useTheme();
  const t = getTheme(dark);
  const { user: me } = useAuth();
  const isAccountsOnly = me?.role === "ACCOUNTS";
  const canPaySalary = !isAdminRole;

  const [staff, setStaff] = useState(null);
  const [summary, setSummary] = useState(null);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const now = new Date();
  const [payForm, setPayForm] = useState({
    month: now.getMonth() + 1, year: now.getFullYear(),
    amount: "", paymentDate: now.toISOString().split("T")[0],
    paymentMethod: "CASH", notes: ""
  });
  const [payError, setPayError] = useState("");
  const [paying, setPaying] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [s, sum, hist] = await Promise.all([
        getStaffById(staffId),
        getSalarySummary(staffId),
        getSalaryHistory(staffId),
      ]);
      setStaff(s); setSummary(sum); setHistory(hist);
    } catch { setError("Failed to load details"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [staffId]);

  useEffect(() => {
    if (summary?.monthlySalary && !payForm.amount)
      setPayForm(f => ({ ...f, amount: String(summary.monthlySalary) }));
  }, [summary]);

  const handlePay = async () => {
    if (!payForm.amount || parseFloat(payForm.amount) <= 0) { setPayError("Enter a valid amount"); return; }
    try {
      setPaying(true); setPayError("");
      await paySalary(staffId, {
        month: parseInt(payForm.month), year: parseInt(payForm.year),
        amount: parseFloat(payForm.amount), paymentDate: payForm.paymentDate,
        paymentMethod: payForm.paymentMethod, notes: payForm.notes
      });
      setPayForm(f => ({ ...f, amount: String(summary?.monthlySalary || ""), notes: "" }));
      await load(); onRefresh();
    } catch (e) { setPayError(e.response?.data?.message || "Failed to record payment"); }
    finally { setPaying(false); }
  };

  if (loading && !staff) return <div style={{ padding: "40px", color: "#9ca3af" }}>Loading...</div>;
  if (!staff) return null;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
        <button onClick={onBack} style={{ padding: "7px 14px", border: `1px solid ${t.border}`, borderRadius: "6px", background: t.surface, color: t.text, cursor: "pointer", fontSize: "13px" }}>← Back</button>
        <div>
          <h2 style={{ margin: 0, fontSize: "18px", color: t.text }}>{staff.name}</h2>
          <div style={{ fontSize: "12px", color: t.textSub, marginTop: "2px" }}>
            {staff.employeeId && <span style={{ color: "#2563eb", fontWeight: 600 }}>{staff.employeeId} · </span>}
            {staff.designation || "—"}
            {staff.joinDate && ` · Joined ${staff.joinDate}`}
            {staff.user && <span> · <span style={{ color: "#2563eb" }}>@{staff.user.username}</span></span>}
          </div>
        </div>
        <span style={{ marginLeft: "auto", padding: "3px 10px", borderRadius: "12px", fontSize: "11px", fontWeight: 700, background: staff.active ? "#dcfce7" : "#fee2e2", color: staff.active ? "#16a34a" : "#ef4444" }}>
          {staff.active ? "Active" : "Inactive"}
        </span>
      </div>

      {error && <div style={ps.alertError}>{error}</div>}

      {summary && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "12px", marginBottom: "20px" }}>
          {[
            { label: "Monthly Salary", value: fmt(summary.monthlySalary), color: t.text },
            { label: "Paid This Year", value: fmt(summary.paidThisYear), color: "#16a34a" },
            { label: "Outstanding (YTD)", value: fmt(summary.outstandingThisYear), color: parseFloat(summary.outstandingThisYear) > 0 ? "#ef4444" : "#16a34a" },
            { label: "Months Paid", value: `${summary.monthsPaidThisYear} / ${summary.monthsOwedThisYear ?? new Date().getMonth() + 1}`, color: "#2563eb" },
          ].map(c => (
            <div key={c.label} style={{ background: t.surfaceAlt, border: `1px solid ${t.border}`, borderRadius: "8px", padding: "14px" }}>
              <div style={{ fontSize: "11px", color: t.textSub, marginBottom: "4px" }}>{c.label}</div>
              <div style={{ fontSize: "20px", fontWeight: 700, color: c.color }}>{c.value}</div>
            </div>
          ))}
        </div>
      )}

      {canPaySalary && (
        <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "8px", padding: "20px", marginBottom: "20px" }}>
          <div style={{ fontWeight: 700, fontSize: "14px", color: t.text, marginBottom: "14px" }}>Record Salary Payment</div>
          {payError && <div style={ps.alertError}>{payError}</div>}
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "flex-end" }}>
            <div>
              <label style={ps.label}>Month</label>
              <select style={{ ...ps.input, width: "110px", marginBottom: 0 }} value={payForm.month} onChange={e => setPayForm(f => ({ ...f, month: e.target.value }))}>
                {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
              </select>
            </div>
            <div>
              <label style={ps.label}>Year</label>
              <input style={{ ...ps.input, width: "90px", marginBottom: 0 }} type="number" value={payForm.year} onChange={e => setPayForm(f => ({ ...f, year: e.target.value }))} />
            </div>
            <div>
              <label style={ps.label}>Amount (Rs.) *</label>
              <input style={{ ...ps.input, width: "140px", marginBottom: 0 }} type="number" min="0" value={payForm.amount} onChange={e => setPayForm(f => ({ ...f, amount: e.target.value }))} />
            </div>
            <div>
              <label style={ps.label}>Date</label>
              <input style={{ ...ps.input, width: "150px", marginBottom: 0 }} type="date" value={payForm.paymentDate} onChange={e => setPayForm(f => ({ ...f, paymentDate: e.target.value }))} />
            </div>
            <div>
              <label style={ps.label}>Method</label>
              <select style={{ ...ps.input, width: "140px", marginBottom: 0 }} value={payForm.paymentMethod} onChange={e => setPayForm(f => ({ ...f, paymentMethod: e.target.value }))}>
                {PAY_METHODS.map(m => <option key={m} value={m}>{m.replace(/_/g, " ")}</option>)}
              </select>
            </div>
            <div style={{ flex: "2 1 180px" }}>
              <label style={ps.label}>Notes</label>
              <input style={{ ...ps.input, marginBottom: 0 }} placeholder="Optional..." value={payForm.notes} onChange={e => setPayForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
            <button style={ps.btnSuccess} onClick={handlePay} disabled={paying}>{paying ? "Saving..." : "Pay Salary"}</button>
          </div>
        </div>
      )}

      {isAdminRole && isAccountsOnly && (
        <div style={{ ...ps.alertWarning, marginBottom: "20px" }}>Salary payments are not available for Admin / Owner accounts.</div>
      )}

      <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "8px", padding: "20px" }}>
        <div style={{ fontWeight: 700, fontSize: "14px", color: t.text, marginBottom: "12px" }}>Salary History</div>
        {history.length === 0 ? (
          <div style={{ color: t.textSub, fontSize: "13px", padding: "20px 0", textAlign: "center" }}>No salary payments recorded yet</div>
        ) : (
          <table style={ps.table}>
            <thead><tr style={ps.thead}>
              <th style={ps.th}>Month</th><th style={ps.th}>Year</th><th style={ps.th}>Amount</th>
              <th style={ps.th}>Date</th><th style={ps.th}>Method</th><th style={ps.th}>Notes</th>
            </tr></thead>
            <tbody>
              {history.map(p => (
                <tr key={p.id} style={ps.tr}>
                  <td style={{ ...ps.td, fontWeight: 600 }}>{MONTHS[p.month - 1]}</td>
                  <td style={ps.tdSub}>{p.year}</td>
                  <td style={{ ...ps.td, color: "#16a34a", fontWeight: 600 }}>{fmt(p.amount)}</td>
                  <td style={ps.tdSub}>{p.paymentDate}</td>
                  <td style={ps.tdSub}>{p.paymentMethod?.replace(/_/g, " ")}</td>
                  <td style={ps.tdSub}>{p.notes || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ── Main TeamPage ─────────────────────────────────────────────────────────────
export default function TeamPage() {
  const ps = usePageStyles();
  const { t } = ps;
  const { user: me } = useAuth();

  const isAdminOrOwner = me?.role === "ADMIN" || me?.role === "OWNER";
  const isAccountsOnly = me?.role === "ACCOUNTS";

  const [staff, setStaff] = useState([]);
  const [adminStaff, setAdminStaff] = useState([]);
  const [roles, setRoles] = useState([]);
  const [ownerExists, setOwnerExists] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("team");
  const [selectedId, setSelectedId] = useState(null);
  const [selectedIsAdmin, setSelectedIsAdmin] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editStaff, setEditStaff] = useState(null);
  const [editUser, setEditUser] = useState(null);
  const [form, setForm] = useState(BLANK);

  const load = async () => {
    setLoading(true);
    try {
      const [s, r] = await Promise.all([
        getStaff().catch(() => []),
        getRoles().catch(() => []),
      ]);
      setStaff(s);
      setRoles(r);
      if (isAdminOrOwner) {
        const admins = await getAdminStaff().catch(() => []);
        setAdminStaff(admins);
        setOwnerExists(admins.some(a => a.user?.role?.name === "OWNER"));
      }
    } catch { setError("Failed to load team"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setForm(BLANK); setEditStaff(null); setEditUser(null);
    setShowForm(true); setError("");
  };

  const openEdit = (s) => {
    setForm({
      name: s.name || "", phone: s.phone || "", email: s.email || "",
      designation: s.designation || "", joinDate: s.joinDate || "",
      monthlySalary: s.monthlySalary || "",
      hasLogin: !!s.user,
      username: s.user?.username || "", password: "",
      roleName: s.user?.role?.name || "",
    });
    setEditStaff(s);
    setEditUser(s.user || null);
    setShowForm(true); setError("");
  };

  const handleSave = async () => {
    if (!form.name.trim()) { setError("Name is required"); return; }
    if (form.hasLogin && !form.roleName) { setError("Select a role for the login account"); return; }
    if (form.hasLogin && !editUser && !form.username.trim()) { setError("Username is required"); return; }
    if (form.hasLogin && !editUser && !form.password.trim()) { setError("Password is required for new login"); return; }
    try {
      setLoading(true); setError("");
      const isAdminRole = ["ADMIN", "OWNER"].includes(form.roleName);
      const staffPayload = {
        name: form.name, phone: form.phone, email: form.email,
        designation: form.designation,
        joinDate: (!isAdminRole && form.joinDate) ? form.joinDate : null,
        monthlySalary: (!isAdminRole && form.monthlySalary) ? parseFloat(form.monthlySalary) : null,
      };
      let savedStaff;
      if (editStaff) savedStaff = await updateStaff(editStaff.id, staffPayload);
      else savedStaff = await createStaff(staffPayload);

      if (form.hasLogin) {
        const userPayload = { username: form.username, role: { name: form.roleName }, staffId: savedStaff.id };
        if (form.password.trim()) userPayload.password = form.password;
        if (editUser) await updateUser(editUser.id, userPayload);
        else await createUser({ ...userPayload, password: form.password });
      } else if (!form.hasLogin && editUser) {
        if (window.confirm("Remove login access for this member?")) await deleteUser(editUser.id);
      }
      setShowForm(false);
      await load();
    } catch (e) { setError(e.response?.data?.message || "Failed to save"); }
    finally { setLoading(false); }
  };

  const handleToggleActive = async (s, e) => {
    e.stopPropagation();
    try { await setStaffActive(s.id, !s.active); await load(); }
    catch { setError("Failed to update status"); }
  };

  const handleDelete = async (s, e) => {
    e.stopPropagation();
    if (!window.confirm(`Delete "${s.name}"?\n\nThis also removes their login account.\nWallet balance must be Rs.0.`)) return;
    try { setError(""); await deleteStaff(s.id); await load(); }
    catch (err) { setError(err.response?.data?.message || "Failed to delete"); }
  };

  const filtered = staff.filter(s => {
    const q = search.toLowerCase();
    return !q || s.name?.toLowerCase().includes(q) || s.designation?.toLowerCase().includes(q) || s.phone?.includes(q) || s.user?.username?.toLowerCase().includes(q);
  });

  const filteredAdmins = adminStaff.filter(s => {
    const q = search.toLowerCase();
    return !q || s.name?.toLowerCase().includes(q) || s.user?.username?.toLowerCase().includes(q);
  });

  const isFormAdminRole = ["ADMIN", "OWNER"].includes(form.roleName);

  // Drill-down to salary detail
  if (selectedId) {
    return (
      <MainLayout>
        <MemberDetail
          staffId={selectedId}
          isAdminRole={selectedIsAdmin}
          ps={ps}
          onBack={() => { setSelectedId(null); setSelectedIsAdmin(false); }}
          onRefresh={load}
        />
      </MainLayout>
    );
  }

  const MemberRow = ({ s, isAdmin = false }) => {
    const isOwner = s.user?.role?.name === "OWNER";
    return (
      <tr style={{ ...ps.tr, cursor: "pointer" }} onClick={() => { setSelectedId(s.id); setSelectedIsAdmin(isAdmin); }}>
        {!isAdmin && <td style={{ ...ps.tdSub, fontWeight: 600, color: "#2563eb" }}>{s.employeeId || "—"}</td>}
        <td style={{ ...ps.td, fontWeight: 600 }}>{s.name}</td>
        <td style={ps.tdSub}>{s.designation || "—"}</td>
        <td style={ps.tdSub}>{s.phone || "—"}</td>
        {!isAdmin && <td style={ps.tdSub}>{s.joinDate || "—"}</td>}
        {!isAdmin && <td style={{ ...ps.td, fontWeight: 600 }}>{s.monthlySalary ? fmt(s.monthlySalary) : "—"}</td>}
        <td style={ps.td}>
          {s.user ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
              <span style={{ fontWeight: 600, color: "#2563eb", fontSize: "12px" }}>@{s.user.username}</span>
              <span style={{ padding: "2px 7px", borderRadius: "10px", fontSize: "10px", fontWeight: 700, background: (ROLE_COLORS[s.user.role?.name] || "#6b7280") + "22", color: ROLE_COLORS[s.user.role?.name] || "#6b7280", textTransform: "uppercase", display: "inline-block" }}>
                {s.user.role?.name}
              </span>
            </div>
          ) : <span style={{ color: "#9ca3af", fontSize: "12px" }}>No login</span>}
        </td>
        <td style={ps.td}>
          {isOwner ? (
            <span style={{ padding: "3px 10px", borderRadius: "12px", fontSize: "11px", fontWeight: 600, background: "#fff7ed", color: "#f97316" }}>Owner</span>
          ) : (
            <span style={{ padding: "3px 10px", borderRadius: "12px", fontSize: "11px", fontWeight: 600, background: s.active ? "#dcfce7" : "#fee2e2", color: s.active ? "#16a34a" : "#ef4444" }}>
              {s.active ? "Active" : "Inactive"}
            </span>
          )}
        </td>
        {!isAccountsOnly && (
          <td style={ps.td} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", gap: "6px" }}>
              <button style={ps.btnSmPrimary} onClick={ev => { ev.stopPropagation(); openEdit(s); }}>Edit</button>
              {!isOwner && (
                <button style={s.active ? ps.btnSmDanger : ps.btnSmSuccess} onClick={ev => handleToggleActive(s, ev)}>
                  {s.active ? "Deactivate" : "Activate"}
                </button>
              )}
              {!isAdmin && (
                <button style={ps.btnSmDanger} onClick={ev => handleDelete(s, ev)} title="Delete">🗑</button>
              )}
            </div>
          </td>
        )}
      </tr>
    );
  };

  return (
    <MainLayout>
      <div style={ps.pageHeader}>
        <h2 style={{ margin: 0 }}>Team</h2>
        {!isAccountsOnly && <button style={ps.btnPrimary} onClick={openCreate}>+ Add Member</button>}
      </div>

      {error && <div style={ps.alertError}>{error}</div>}
      {loading && <div style={ps.alertInfo}>Loading...</div>}

      {/* Add / Edit modal */}
      {showForm && (
        <div style={ps.overlay} onClick={() => setShowForm(false)}>
          <div style={{ ...ps.modal, width: "580px", maxHeight: "90vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <div style={{ fontSize: "16px", fontWeight: 700, color: t.text }}>{editStaff ? `Edit — ${editStaff.name}` : "Add Team Member"}</div>
              <button onClick={() => setShowForm(false)} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: t.textSub }}>✕</button>
            </div>
            {error && <div style={ps.alertError}>{error}</div>}

            <div style={{ fontSize: "11px", fontWeight: 700, color: t.textSub, textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "10px" }}>Personal Details</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
              <div style={{ gridColumn: "1/-1" }}>
                <label style={ps.label}>Full Name *</label>
                <input style={ps.input} placeholder="e.g. Ravi Kumar" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label style={ps.label}>Phone</label>
                <input style={ps.input} placeholder="Mobile number" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
              <div>
                <label style={ps.label}>Email</label>
                <input style={ps.input} placeholder="Email address" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div>
                <label style={ps.label}>Designation</label>
                <input style={ps.input} placeholder="e.g. Sales Executive, Driver" value={form.designation} onChange={e => setForm(f => ({ ...f, designation: e.target.value }))} />
              </div>
              {!isFormAdminRole && (
                <>
                  <div>
                    <label style={ps.label}>Join Date</label>
                    <input style={ps.input} type="date" value={form.joinDate} onChange={e => setForm(f => ({ ...f, joinDate: e.target.value }))} />
                  </div>
                  <div>
                    <label style={ps.label}>Monthly Salary (Rs.)</label>
                    <input style={ps.input} type="number" placeholder="0.00" value={form.monthlySalary} onChange={e => setForm(f => ({ ...f, monthlySalary: e.target.value }))} />
                  </div>
                </>
              )}
            </div>

            <div style={{ borderTop: `1px solid ${t.border}`, paddingTop: "14px", marginBottom: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
                <div style={{ fontSize: "11px", fontWeight: 700, color: t.textSub, textTransform: "uppercase", letterSpacing: "0.8px" }}>Login Access</div>
                <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "13px", color: t.text }}>
                  <input type="checkbox" checked={form.hasLogin} onChange={e => setForm(f => ({ ...f, hasLogin: e.target.checked }))} />
                  Give this member a login account
                </label>
              </div>
              {form.hasLogin && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={ps.label}>Username *</label>
                    <input style={ps.input} placeholder="e.g. ravi.sales" value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} disabled={!!editUser} />
                  </div>
                  <div>
                    <label style={ps.label}>{editUser ? "New Password (blank = keep)" : "Password *"}</label>
                    <input style={ps.input} type="password" placeholder={editUser ? "Leave blank to keep" : "Set password"} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
                  </div>
                  <div style={{ gridColumn: "1/-1" }}>
                    <label style={ps.label}>Role *</label>
                    <select style={ps.input} value={form.roleName} onChange={e => setForm(f => ({ ...f, roleName: e.target.value }))}>
                      <option value="">Select role...</option>
                      {roles
                        .filter(r => {
                          if (r.name === "OWNER") {
                            const editingCurrentOwner = editUser?.role?.name === "OWNER";
                            return !ownerExists || editingCurrentOwner;
                          }
                          return true;
                        })
                        .map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
                    </select>
                    {ownerExists && editUser?.role?.name !== "OWNER" && (
                      <div style={{ fontSize: "11px", color: "#f59e0b", marginTop: "4px" }}>Owner account already exists — only one Owner is allowed</div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "8px" }}>
              <button style={ps.btnGhost} onClick={() => setShowForm(false)}>Cancel</button>
              <button style={ps.btnSuccess} onClick={handleSave} disabled={loading}>{loading ? "Saving..." : editStaff ? "Update" : "Add Member"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Search + tabs */}
      <div style={{ display: "flex", gap: "12px", alignItems: "center", marginBottom: "16px", flexWrap: "wrap" }}>
        <input style={{ ...ps.input, width: "260px", marginBottom: 0 }} placeholder="Search name, designation, username..." value={search} onChange={e => setSearch(e.target.value)} />
        {isAdminOrOwner && (
          <div style={{ display: "flex", gap: "8px" }}>
            <button style={ps.filterPill(tab === "team", "#2563eb")} onClick={() => setTab("team")}>Team ({staff.length})</button>
            <button style={ps.filterPill(tab === "admins", "#ef4444")} onClick={() => setTab("admins")}>Admins / Owners ({adminStaff.length})</button>
          </div>
        )}
      </div>

      {/* Team tab */}
      {tab === "team" && (
        <div style={ps.tableWrap}>
          <table style={ps.table}>
            <thead>
              <tr style={ps.thead}>
                <th style={ps.th}>Emp ID</th>
                <th style={ps.th}>Name</th>
                <th style={ps.th}>Designation</th>
                <th style={ps.th}>Phone</th>
                <th style={ps.th}>Join Date</th>
                <th style={ps.th}>Salary</th>
                <th style={ps.th}>Login / Role</th>
                <th style={ps.th}>Status</th>
                {!isAccountsOnly && <th style={ps.th}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && !loading && (
                <tr><td colSpan={9} style={{ ...ps.td, textAlign: "center", color: "#9ca3af", padding: "32px" }}>No team members found</td></tr>
              )}
              {filtered.map(s => <MemberRow key={s.id} s={s} />)}
            </tbody>
          </table>
        </div>
      )}

      {/* Admins tab */}
      {tab === "admins" && isAdminOrOwner && (
        <div>
          <div style={{ fontSize: "12px", color: "#9ca3af", marginBottom: "10px" }}>Admin and Owner accounts — no join date or salary. Cannot be deleted from here.</div>
          <div style={ps.tableWrap}>
            <table style={ps.table}>
              <thead>
                <tr style={ps.thead}>
                  <th style={ps.th}>Name</th>
                  <th style={ps.th}>Designation</th>
                  <th style={ps.th}>Phone</th>
                  <th style={ps.th}>Login / Role</th>
                  <th style={ps.th}>Status</th>
                  {!isAccountsOnly && <th style={ps.th}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filteredAdmins.length === 0 && !loading && (
                  <tr><td colSpan={isAccountsOnly ? 5 : 6} style={{ ...ps.td, textAlign: "center", color: "#9ca3af", padding: "32px" }}>No admin members found</td></tr>
                )}
                {filteredAdmins.map(s => <MemberRow key={s.id} s={s} isAdmin={true} />)}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
