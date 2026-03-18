import { useState, useEffect, useCallback } from "react";
import MainLayout from "../layout/MainLayout";
import { usePageStyles } from "../hooks/usePageStyles";
import { getAllFollowUps, getFollowUpById, addNote, resolveFollowUp, updateAssignment } from "../services/followUpService";
import { getStaff } from "../services/staffService";

const fmt = (v) => `Rs.${parseFloat(v || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

const STATUS_COLORS = {
  OPEN:      { bg: "#dbeafe", color: "#1d4ed8" },
  RESOLVED:  { bg: "#dcfce7", color: "#15803d" },
  DUE_TODAY: { bg: "#fef9c3", color: "#a16207" },
  OVERDUE:   { bg: "#fee2e2", color: "#b91c1c" },
};

const CONTACT_TYPES = ["CALL", "VISIT", "WHATSAPP", "OTHER"];
const OUTCOMES = ["PROMISED_TO_PAY", "NO_ANSWER", "PARTIAL_PAID", "ESCALATE", "OTHER"];

function getDisplayStatus(fu) {
  if (fu.status === "RESOLVED") return "RESOLVED";
  if (!fu.nextFollowUpDate) return "OPEN";
  const today = new Date().toISOString().split("T")[0];
  if (fu.nextFollowUpDate < today) return "OVERDUE";
  if (fu.nextFollowUpDate === today) return "DUE_TODAY";
  return "OPEN";
}

// ── Modals ────────────────────────────────────────────────────────────────────

function Modal({ title, onClose, children, ps }) {
  const { t } = ps;
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000,
      display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(2px)" }}>
      <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "14px",
        padding: "28px", width: "480px", maxWidth: "95vw", maxHeight: "90vh", overflowY: "auto",
        boxShadow: "0 20px 60px rgba(0,0,0,0.25)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <div style={{ fontSize: "16px", fontWeight: 800, color: t.text }}>{title}</div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer",
            color: t.textSub, fontSize: "20px", lineHeight: 1, padding: "0 4px" }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── Add Note Modal ────────────────────────────────────────────────────────────

function AddNoteModal({ followUpId, onClose, onSaved, ps }) {
  const { t } = ps;
  const [form, setForm] = useState({ contactType: "CALL", noteText: "", outcome: "PROMISED_TO_PAY", nextFollowUpDate: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    if (!form.noteText.trim()) { setError("Note text is required"); return; }
    setSaving(true);
    try {
      await addNote(followUpId, { ...form, nextFollowUpDate: form.nextFollowUpDate || null });
      onSaved();
    } catch { setError("Failed to save note"); }
    finally { setSaving(false); }
  };

  const sel = { padding: "9px 12px", border: `1px solid ${t.inputBorder}`, borderRadius: "8px", fontSize: "13px", background: t.inputBg, color: t.text, width: "100%" };

  return (
    <Modal title="Log Follow-Up Note" onClose={onClose} ps={ps}>
      {error && <div style={ps.alertError}>{error}</div>}
      <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        <div>
          <label style={ps.label}>Contact Type</label>
          <select style={sel} value={form.contactType} onChange={e => setForm(p => ({ ...p, contactType: e.target.value }))}>
            {CONTACT_TYPES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label style={ps.label}>Note *</label>
          <textarea value={form.noteText} onChange={e => setForm(p => ({ ...p, noteText: e.target.value }))}
            placeholder="What happened? What did the customer say?"
            rows={4} style={{ ...ps.input, resize: "vertical" }} />
        </div>
        <div>
          <label style={ps.label}>Outcome</label>
          <select style={sel} value={form.outcome} onChange={e => setForm(p => ({ ...p, outcome: e.target.value }))}>
            {OUTCOMES.map(o => <option key={o} value={o}>{o.replace(/_/g, " ")}</option>)}
          </select>
        </div>
        <div>
          <label style={ps.label}>Next Follow-Up Date (optional)</label>
          <input type="date" value={form.nextFollowUpDate}
            onChange={e => setForm(p => ({ ...p, nextFollowUpDate: e.target.value }))}
            style={ps.input} />
        </div>
        <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
          <button onClick={handleSave} disabled={saving || !form.noteText.trim()}
            style={{ ...ps.btnPrimary, flex: 1, opacity: !form.noteText.trim() ? 0.5 : 1 }}>
            {saving ? "Saving..." : "Save Note"}
          </button>
          <button onClick={onClose} style={{ ...ps.btnGhost, flex: 1 }}>Cancel</button>
        </div>
      </div>
    </Modal>
  );
}

// ── Resolve Modal ─────────────────────────────────────────────────────────────

function ResolveModal({ followUpId, onClose, onSaved, ps }) {
  const { t } = ps;
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleResolve = async () => {
    setSaving(true);
    try {
      await resolveFollowUp(followUpId, note || null);
      onSaved();
    } catch { setError("Failed to resolve"); }
    finally { setSaving(false); }
  };

  return (
    <Modal title="Resolve Follow-Up" onClose={onClose} ps={ps}>
      {error && <div style={ps.alertError}>{error}</div>}
      <div style={{ ...ps.alertInfo, marginBottom: "16px" }}>
        Marking this follow-up as resolved means the collection issue is closed. This cannot be undone.
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        <div>
          <label style={ps.label}>Closing Note (optional)</label>
          <textarea value={note} onChange={e => setNote(e.target.value)}
            placeholder="e.g. Customer paid in full, cheque received..."
            rows={3} style={{ ...ps.input, resize: "vertical" }} />
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button onClick={handleResolve} disabled={saving} style={{ ...ps.btnSuccess, flex: 1 }}>
            {saving ? "Resolving..." : "✓ Confirm Resolve"}
          </button>
          <button onClick={onClose} style={{ ...ps.btnGhost, flex: 1 }}>Cancel</button>
        </div>
      </div>
    </Modal>
  );
}

// ── Edit Assignment Modal ─────────────────────────────────────────────────────

function EditAssignModal({ followUp, staff, onClose, onSaved, ps }) {
  const { t } = ps;
  const [staffId, setStaffId] = useState(followUp.assignedToId || "");
  const [nextDate, setNextDate] = useState(followUp.nextFollowUpDate || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateAssignment(followUp.id, { staffId: staffId || null, nextFollowUpDate: nextDate || null });
      onSaved();
    } catch { setError("Failed to update assignment"); }
    finally { setSaving(false); }
  };

  const sel = { padding: "9px 12px", border: `1px solid ${t.inputBorder}`, borderRadius: "8px", fontSize: "13px", background: t.inputBg, color: t.text, width: "100%" };

  return (
    <Modal title="Edit Assignment" onClose={onClose} ps={ps}>
      {error && <div style={ps.alertError}>{error}</div>}
      <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        <div>
          <label style={ps.label}>Assign To</label>
          <select style={sel} value={staffId} onChange={e => setStaffId(e.target.value)}>
            <option value="">Unassigned</option>
            {staff.map(s => <option key={s.id} value={s.id}>{s.name} — {s.designation || "Staff"}</option>)}
          </select>
        </div>
        <div>
          <label style={ps.label}>Next Follow-Up Date</label>
          <input type="date" value={nextDate} onChange={e => setNextDate(e.target.value)} style={ps.input} />
        </div>
        <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
          <button onClick={handleSave} disabled={saving} style={{ ...ps.btnPrimary, flex: 1 }}>
            {saving ? "Saving..." : "Save"}
          </button>
          <button onClick={onClose} style={{ ...ps.btnGhost, flex: 1 }}>Cancel</button>
        </div>
      </div>
    </Modal>
  );
}

// ── Follow-Up Detail Page ─────────────────────────────────────────────────────

function FollowUpDetail({ followUpId, staff, onBack, ps }) {
  const { t } = ps;
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setDetail(await getFollowUpById(followUpId)); }
    finally { setLoading(false); }
  }, [followUpId]);

  useEffect(() => { load(); }, [load]);

  if (loading) return (
    <MainLayout>
      <div style={ps.alertInfo}>Loading...</div>
    </MainLayout>
  );

  if (!detail) return null;

  const ds = getDisplayStatus(detail);
  const sc = STATUS_COLORS[ds];

  return (
    <MainLayout>
      {/* Header with back button */}
      <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "24px", paddingBottom: "16px", borderBottom: `1px solid ${t.border}` }}>
        <button onClick={onBack} style={{ ...ps.btnGhost, display: "flex", alignItems: "center", gap: "6px" }}>
          ← Back
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "18px", fontWeight: 800, color: t.text }}>{detail.invoiceNumber}</span>
            <span style={{ padding: "3px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: 700, background: sc.bg, color: sc.color }}>
              {ds.replace("_", " ")}
            </span>
          </div>
          <div style={{ fontSize: "13px", color: t.textSub, marginTop: "2px" }}>
            {detail.customerName} {detail.customerPhone ? `· ${detail.customerPhone}` : ""}
          </div>
        </div>
        {detail.status === "OPEN" && (
          <div style={{ display: "flex", gap: "8px" }}>
            <button onClick={() => setShowEditModal(true)} style={ps.btnGhost}>Edit Assignment</button>
            <button onClick={() => setShowNoteModal(true)} style={ps.btnPrimary}>+ Add Note</button>
            <button onClick={() => setShowResolveModal(true)} style={ps.btnSuccess}>✓ Resolve</button>
          </div>
        )}
      </div>

      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "12px", marginBottom: "24px" }}>
        {[
          { label: "Invoice Total", value: fmt(detail.totalAmount), color: "#2563eb" },
          { label: "Due Date", value: detail.dueDate || "—", color: "#ef4444" },
          { label: "Assigned To", value: detail.assignedToName || "Unassigned", color: "#7c3aed" },
          { label: "Next Follow-Up", value: detail.nextFollowUpDate || "Not set", color: ds === "OVERDUE" ? "#ef4444" : ds === "DUE_TODAY" ? "#d97706" : "#16a34a" },
        ].map(c => (
          <div key={c.label} style={{ ...ps.card, borderLeft: `4px solid ${c.color}` }}>
            <div style={ps.cardLabel}>{c.label}</div>
            <div style={{ fontSize: "15px", fontWeight: 700, color: c.color }}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* Resolved banner */}
      {detail.status === "RESOLVED" && (
        <div style={{ ...ps.alertSuccess, marginBottom: "20px", fontSize: "13px" }}>
          ✓ Resolved on {detail.resolvedAt?.split("T")[0]}
          {detail.closingNote && <span style={{ marginLeft: "12px", fontStyle: "italic" }}>"{detail.closingNote}"</span>}
        </div>
      )}

      {/* Notes timeline */}
      <div style={{ ...ps.card, padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: `1px solid ${t.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: "14px", fontWeight: 700, color: t.text }}>
            Activity Log <span style={{ fontSize: "12px", color: t.textSub, fontWeight: 400 }}>({(detail.notes || []).length} notes)</span>
          </div>
        </div>

        {(detail.notes || []).length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", color: t.textSub, fontSize: "13px" }}>
            No notes yet. Add the first note after contacting the customer.
          </div>
        ) : (
          <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "12px" }}>
            {(detail.notes || []).map((n, i) => {
              const outcomeColors = {
                PROMISED_TO_PAY: "#16a34a", NO_ANSWER: "#6b7280",
                PARTIAL_PAID: "#2563eb", ESCALATE: "#ef4444", OTHER: "#d97706"
              };
              const oc = outcomeColors[n.outcome] || "#6b7280";
              return (
                <div key={n.id} style={{ display: "flex", gap: "14px" }}>
                  {/* Timeline line */}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                    <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "#dbeafe",
                      display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", flexShrink: 0 }}>
                      {n.contactType === "CALL" ? "📞" : n.contactType === "VISIT" ? "🚶" : n.contactType === "WHATSAPP" ? "💬" : "📝"}
                    </div>
                    {i < (detail.notes || []).length - 1 && (
                      <div style={{ width: "2px", flex: 1, background: t.border, marginTop: "4px", minHeight: "20px" }} />
                    )}
                  </div>
                  {/* Note card */}
                  <div style={{ flex: 1, ...ps.card, padding: "14px 16px", marginBottom: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                        <span style={{ fontSize: "12px", fontWeight: 700, color: "#1d4ed8", background: "#dbeafe", padding: "2px 8px", borderRadius: "4px" }}>
                          {n.contactType}
                        </span>
                        <span style={{ fontSize: "12px", fontWeight: 700, color: oc, background: oc + "18", padding: "2px 8px", borderRadius: "4px" }}>
                          {n.outcome?.replace(/_/g, " ")}
                        </span>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: "11px", color: t.textSub }}>{n.createdAt?.split("T")[0]}</div>
                        {n.createdByName && <div style={{ fontSize: "11px", color: t.textSub }}>by {n.createdByName}</div>}
                      </div>
                    </div>
                    <div style={{ fontSize: "13px", color: t.text, lineHeight: 1.5 }}>{n.noteText}</div>
                    {n.nextFollowUpDate && (
                      <div style={{ marginTop: "8px", fontSize: "12px", color: "#d97706", fontWeight: 600 }}>
                        📅 Next follow-up: {n.nextFollowUpDate}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modals */}
      {showNoteModal && (
        <AddNoteModal followUpId={detail.id} onClose={() => setShowNoteModal(false)}
          onSaved={() => { setShowNoteModal(false); load(); }} ps={ps} />
      )}
      {showResolveModal && (
        <ResolveModal followUpId={detail.id} onClose={() => setShowResolveModal(false)}
          onSaved={() => { setShowResolveModal(false); load(); }} ps={ps} />
      )}
      {showEditModal && (
        <EditAssignModal followUp={detail} staff={staff} onClose={() => setShowEditModal(false)}
          onSaved={() => { setShowEditModal(false); load(); }} ps={ps} />
      )}
    </MainLayout>
  );
}

// ── Follow-Up List Page ───────────────────────────────────────────────────────

export default function FollowUpPage() {
  const ps = usePageStyles();
  const { t } = ps;

  const [followUps, setFollowUps] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterStaff, setFilterStaff] = useState("");
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState(null); // drill-down

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [fus, st] = await Promise.all([getAllFollowUps(), getStaff()]);
      setFollowUps(fus);
      setStaff(st);
    } catch { setError("Failed to load follow-ups"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Drill-down to detail page
  if (openId) {
    return <FollowUpDetail followUpId={openId} staff={staff}
      onBack={() => { setOpenId(null); load(); }} ps={ps} />;
  }

  const filtered = followUps.filter(fu => {
    const ds = getDisplayStatus(fu);
    if (filterStatus && ds !== filterStatus) return false;
    if (filterStaff && String(fu.assignedToId) !== String(filterStaff)) return false;
    const q = search.toLowerCase();
    if (q && !(fu.invoiceNumber || "").toLowerCase().includes(q) &&
             !(fu.customerName || "").toLowerCase().includes(q) &&
             !(fu.assignedToName || "").toLowerCase().includes(q)) return false;
    return true;
  });

  return (
    <MainLayout>
      {/* Page header */}
      <div style={ps.pageHeader}>
        <div>
          <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 800, color: t.text }}>Follow-Up Tracker</h2>
          <div style={{ fontSize: "13px", color: t.textSub, marginTop: "2px" }}>
            Manage collection follow-ups on overdue invoices
          </div>
        </div>
      </div>

      {error && <div style={ps.alertError}>{error}</div>}

      {/* Status summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "24px" }}>
        {["OPEN", "DUE_TODAY", "OVERDUE", "RESOLVED"].map(s => {
          const count = followUps.filter(fu => getDisplayStatus(fu) === s).length;
          const sc = STATUS_COLORS[s];
          const isActive = filterStatus === s;
          return (
            <div key={s} onClick={() => setFilterStatus(isActive ? "" : s)}
              style={{ ...ps.card, borderLeft: `4px solid ${sc.color}`, cursor: "pointer",
                background: isActive ? sc.bg : t.surface,
                boxShadow: isActive ? `0 0 0 2px ${sc.color}44` : undefined,
                transition: "all 0.15s", userSelect: "none" }}>
              <div style={ps.cardLabel}>{s.replace("_", " ")}</div>
              <div style={{ fontSize: "28px", fontWeight: 800, color: sc.color }}>{count}</div>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "16px", flexWrap: "wrap", alignItems: "center" }}>
        <input style={ps.searchInput} placeholder="Search invoice, customer, staff..."
          value={search} onChange={e => setSearch(e.target.value)} />
        <select style={{ padding: "9px 12px", border: `1px solid ${t.inputBorder}`, borderRadius: "8px",
          fontSize: "13px", background: t.inputBg, color: t.text }}
          value={filterStaff} onChange={e => setFilterStaff(e.target.value)}>
          <option value="">All Staff</option>
          {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        {(search || filterStaff || filterStatus) && (
          <button style={ps.btnGhost} onClick={() => { setSearch(""); setFilterStaff(""); setFilterStatus(""); }}>
            Clear filters
          </button>
        )}
        <span style={{ fontSize: "12px", color: t.textSub, marginLeft: "auto" }}>
          {filtered.length} follow-up{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Table */}
      <div style={{ ...ps.card, padding: 0, overflow: "hidden" }}>
        {loading ? (
          <div style={{ ...ps.alertInfo, margin: "16px" }}>Loading...</div>
        ) : (
          <table style={ps.table}>
            <thead>
              <tr style={ps.thead}>
                <th style={ps.th}>Invoice</th>
                <th style={ps.th}>Customer</th>
                <th style={ps.th}>Phone</th>
                <th style={ps.th}>Outstanding</th>
                <th style={ps.th}>Assigned To</th>
                <th style={ps.th}>Next Follow-Up</th>
                <th style={ps.th}>Notes</th>
                <th style={ps.th}>Status</th>
                <th style={ps.th}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} style={{ ...ps.td, textAlign: "center", color: t.textSub, padding: "48px" }}>
                    No follow-ups found
                  </td>
                </tr>
              )}
              {filtered.map(fu => {
                const ds = getDisplayStatus(fu);
                const sc = STATUS_COLORS[ds];
                return (
                  <tr key={fu.id} style={{ ...ps.tr, cursor: "pointer" }}
                    onClick={() => setOpenId(fu.id)}
                    onMouseEnter={e => e.currentTarget.style.background = t.tableHead}
                    onMouseLeave={e => e.currentTarget.style.background = ""}>
                    <td style={{ ...ps.td, fontWeight: 700, color: "#2563eb" }}>{fu.invoiceNumber}</td>
                    <td style={{ ...ps.td, fontWeight: 600 }}>{fu.customerName || "—"}</td>
                    <td style={ps.tdSub}>{fu.customerPhone || "—"}</td>
                    <td style={{ ...ps.td, fontWeight: 700, color: "#ef4444" }}>{fmt(fu.totalAmount)}</td>
                    <td style={ps.td}>{fu.assignedToName || <span style={{ color: t.textSub, fontStyle: "italic" }}>Unassigned</span>}</td>
                    <td style={{ ...ps.tdSub, color: ds === "OVERDUE" ? "#ef4444" : ds === "DUE_TODAY" ? "#d97706" : t.textSub, fontWeight: ds !== "OPEN" && ds !== "RESOLVED" ? 700 : 400 }}>
                      {fu.nextFollowUpDate || "—"}
                    </td>
                    <td style={ps.tdSub}>{fu.noteCount ?? "—"}</td>
                    <td style={ps.td}>
                      <span style={{ padding: "3px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: 700,
                        background: sc.bg, color: sc.color }}>
                        {ds.replace("_", " ")}
                      </span>
                    </td>
                    <td style={ps.td}>
                      <button onClick={e => { e.stopPropagation(); setOpenId(fu.id); }}
                        style={ps.btnSmPrimary}>
                        View →
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </MainLayout>
  );
}
