import { useEffect, useState } from "react";
import MainLayout from "../layout/MainLayout";
import { getSuppliers, createSupplier, updateSupplier, deleteSupplier, getSupplierSummary } from "../services/supplierService";
import { usePageStyles } from "../hooks/usePageStyles";
import { useTheme } from "../context/ThemeContext";
import { getTheme } from "../theme";

const emptyForm = { name: "", phone: "", address: "", gstNumber: "" };

const STATUS_COLORS = {
  DRAFT: "#6b7280", APPROVED: "#2563eb",
  PARTIALLY_RECEIVED: "#f59e0b", FULLY_RECEIVED: "#16a34a", CANCELLED: "#ef4444"
};
const STATUS_LABELS = {
  DRAFT: "Draft", APPROVED: "Approved",
  PARTIALLY_RECEIVED: "Partial", FULLY_RECEIVED: "Fully Received", CANCELLED: "Cancelled"
};

// ── Supplier Detail / Summary view ───────────────────────────────────────────
function SupplierDetailPage({ supplierId, onBack }) {
  const ps = usePageStyles();
  const { dark } = useTheme();
  const t = getTheme(dark);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("pos"); // "pos" | "payments"

  useEffect(() => { load(); }, [supplierId]);

  const load = async () => {
    setLoading(true);
    try { setData(await getSupplierSummary(supplierId)); setError(""); }
    catch { setError("Failed to load supplier summary"); }
    finally { setLoading(false); }
  };

  if (loading) return (
    <MainLayout>
      <div style={{ padding: "40px", textAlign: "center", color: t.textMuted }}>Loading...</div>
    </MainLayout>
  );

  const sup = data?.supplier;
  const pos = data?.purchaseOrders || [];
  const payments = data?.payments || [];

  const cards = [
    { label: "Total Ordered",  value: data?.grandTotalOrdered,  color: "#2563eb", icon: "🛒" },
    { label: "Total Received", value: data?.grandTotalReceived, color: "#7c3aed", icon: "📥" },
    { label: "Total Paid",     value: data?.grandTotalPaid,     color: "#16a34a", icon: "💳" },
    { label: "Balance Due",    value: data?.grandBalance,       color: "#ef4444", icon: "⚠️" },
  ];

  return (
    <MainLayout>
      <div className="erp-page">
        {/* Back + header */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
          <button onClick={onBack} style={{ padding: "7px 14px", border: `1px solid ${t.border}`, borderRadius: "6px", background: t.surface, color: t.text, cursor: "pointer", fontSize: "13px" }}>
            ← Back
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: t.primaryLight, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", fontWeight: 700, color: t.primary }}>
              {sup?.name?.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: "18px", color: t.text }}>{sup?.name}</h2>
              <div style={{ fontSize: "12px", color: t.textMuted, marginTop: "2px" }}>
                {sup?.phone && `📞 ${sup.phone}`}
                {sup?.gstNumber && `  ·  GST: ${sup.gstNumber}`}
                {sup?.address && `  ·  📍 ${sup.address}`}
              </div>
            </div>
          </div>
        </div>

        {error && <div style={ps.alertError}>⚠ {error}</div>}

        {/* Grand total cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "12px", marginBottom: "24px" }}>
          {cards.map(c => (
            <div key={c.label} style={{ ...ps.card, borderTop: `3px solid ${c.color}`, position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: "-8px", right: "-8px", fontSize: "36px", opacity: 0.08 }}>{c.icon}</div>
              <div style={{ fontSize: "20px", marginBottom: "6px" }}>{c.icon}</div>
              <div style={ps.cardLabel}>{c.label}</div>
              <div style={{ ...ps.cardValue, color: c.color, fontSize: "18px" }}>
                ₹{parseFloat(c.value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: "4px", marginBottom: "16px", borderBottom: `1px solid ${t.border}` }}>
          {[["pos", `Purchase Orders (${pos.length})`], ["payments", `Payments (${payments.length})`]].map(([key, label]) => (
            <button key={key} onClick={() => setActiveTab(key)} style={{
              padding: "8px 16px", border: "none", background: "transparent", cursor: "pointer",
              fontSize: "13px", fontWeight: activeTab === key ? 700 : 400,
              color: activeTab === key ? t.primary : t.textMuted,
              borderBottom: activeTab === key ? `2px solid ${t.primary}` : "2px solid transparent",
              marginBottom: "-1px"
            }}>{label}</button>
          ))}
        </div>

        {/* PO tab */}
        {activeTab === "pos" && (
          <div style={ps.tableWrap}>
            <table style={ps.table}>
              <thead>
                <tr style={ps.thead}>
                  <th style={ps.th}>PO Number</th>
                  <th style={ps.th}>Date</th>
                  <th style={ps.th}>Status</th>
                  <th style={ps.th}>PO Total (₹)</th>
                  <th style={ps.th}>Received Value (₹)</th>
                  <th style={ps.th}>Total Paid (₹)</th>
                  <th style={ps.th}>Balance Due (₹)</th>
                </tr>
              </thead>
              <tbody>
                {pos.length === 0 && (
                  <tr><td colSpan={7} style={{ ...ps.td, textAlign: "center", color: t.textMuted, padding: "32px" }}>No purchase orders</td></tr>
                )}
                {pos.map(po => (
                  <tr key={po.id} style={{ ...ps.tr, background: t.surface }}>
                    <td style={{ ...ps.td, fontWeight: 600, color: "#2563eb" }}>{po.poNumber}</td>
                    <td style={ps.tdSub}>{po.orderDate || "—"}</td>
                    <td style={ps.td}>
                      <span style={{ padding: "3px 8px", borderRadius: "12px", fontSize: "11px", fontWeight: 600, background: (STATUS_COLORS[po.status] || "#6b7280") + "22", color: STATUS_COLORS[po.status] || "#6b7280" }}>
                        {STATUS_LABELS[po.status] || po.status}
                      </span>
                    </td>
                    <td style={ps.td}>₹{parseFloat(po.poTotal || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                    <td style={ps.td}>₹{parseFloat(po.receivedValue || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                    <td style={{ ...ps.td, color: "#16a34a", fontWeight: 600 }}>₹{parseFloat(po.totalPaid || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                    <td style={{ ...ps.td, color: parseFloat(po.balance) > 0 ? "#ef4444" : "#16a34a", fontWeight: 700 }}>
                      ₹{parseFloat(po.balance || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
              {/* Grand total row */}
              {pos.length > 0 && (
                <tfoot>
                  <tr style={{ background: t.surfaceAlt, fontWeight: 700 }}>
                    <td colSpan={3} style={{ ...ps.td, textAlign: "right", color: t.textMuted }}>Grand Total</td>
                    <td style={{ ...ps.td, fontWeight: 700 }}>₹{parseFloat(data?.grandTotalOrdered || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                    <td style={{ ...ps.td, fontWeight: 700 }}>₹{parseFloat(data?.grandTotalReceived || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                    <td style={{ ...ps.td, fontWeight: 700, color: "#16a34a" }}>₹{parseFloat(data?.grandTotalPaid || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                    <td style={{ ...ps.td, fontWeight: 700, color: parseFloat(data?.grandBalance) > 0 ? "#ef4444" : "#16a34a" }}>₹{parseFloat(data?.grandBalance || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}

        {/* Payments tab */}
        {activeTab === "payments" && (
          <div style={ps.tableWrap}>
            <table style={ps.table}>
              <thead>
                <tr style={ps.thead}>
                  <th style={ps.th}>Date</th>
                  <th style={ps.th}>PO Number</th>
                  <th style={ps.th}>Amount (₹)</th>
                  <th style={ps.th}>Method</th>
                  <th style={ps.th}>Notes</th>
                </tr>
              </thead>
              <tbody>
                {payments.length === 0 && (
                  <tr><td colSpan={5} style={{ ...ps.td, textAlign: "center", color: t.textMuted, padding: "32px" }}>No payments recorded</td></tr>
                )}
                {payments.map(p => (
                  <tr key={p.id} style={{ ...ps.tr, background: t.surface }}>
                    <td style={ps.tdSub}>{p.paymentDate || "—"}</td>
                    <td style={{ ...ps.td, color: "#2563eb", fontWeight: 600 }}>{p.purchaseOrder?.poNumber || "—"}</td>
                    <td style={{ ...ps.td, fontWeight: 700, color: "#16a34a" }}>₹{parseFloat(p.amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                    <td style={ps.tdSub}>{p.paymentMethod || "—"}</td>
                    <td style={ps.tdSub}>{p.notes || "—"}</td>
                  </tr>
                ))}
              </tbody>
              {payments.length > 0 && (
                <tfoot>
                  <tr style={{ background: t.surfaceAlt }}>
                    <td colSpan={2} style={{ ...ps.td, textAlign: "right", color: t.textMuted, fontWeight: 700 }}>Total Paid</td>
                    <td style={{ ...ps.td, fontWeight: 700, color: "#16a34a" }}>
                      ₹{parseFloat(data?.grandTotalPaid || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </div>
    </MainLayout>
  );
}

// ── Main Suppliers List ───────────────────────────────────────────────────────
export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [selectedSupplierId, setSelectedSupplierId] = useState(null);
  const ps = usePageStyles();
  const { dark } = useTheme();
  const t = getTheme(dark);

  const filtered = suppliers.filter(s =>
    s.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.phone?.toLowerCase().includes(search.toLowerCase()) ||
    s.gstNumber?.toLowerCase().includes(search.toLowerCase())
  );

  const load = async () => {
    setLoading(true);
    try { setSuppliers(await getSuppliers()); setError(""); }
    catch { setError("Failed to load suppliers"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  // If a supplier is selected, show detail page
  if (selectedSupplierId) {
    return <SupplierDetailPage supplierId={selectedSupplierId} onBack={() => setSelectedSupplierId(null)} />;
  }

  const handleSave = async () => {
    if (!form.name.trim()) { setError("Supplier name is required"); return; }
    try {
      setLoading(true); setError("");
      if (editId) await updateSupplier(editId, form);
      else await createSupplier({ ...form, active: true });
      setForm(emptyForm); setShowForm(false); setEditId(null); load();
    } catch { setError("Failed to save supplier"); }
    finally { setLoading(false); }
  };

  const handleEdit = (s) => {
    setEditId(s.id);
    setForm({ name: s.name, phone: s.phone || "", address: s.address || "", gstNumber: s.gstNumber || "" });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Deactivate this supplier?")) return;
    try { await deleteSupplier(id); load(); }
    catch { setError("Failed to delete supplier"); }
  };

  return (
    <MainLayout>
      <div className="erp-page">
        <div style={ps.pageHeader}>
          <div>
            <h2 style={ps.pageTitle}>Suppliers</h2>
            <div style={{ fontSize: "12px", color: t.textMuted, marginTop: "2px" }}>
              {suppliers.length} registered suppliers · click a row to view full history
            </div>
          </div>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <input className="erp-input" style={ps.searchInput} placeholder="Search name, phone, GST..." value={search} onChange={e => setSearch(e.target.value)} />
            <button className="erp-btn" style={ps.btnSuccess} onClick={() => { setShowForm(true); setForm(emptyForm); setEditId(null); }}>
              + Add Supplier
            </button>
          </div>
        </div>

        {error && <div style={ps.alertError}>⚠ {error}</div>}
        {loading && <div style={ps.alertInfo}>Loading...</div>}

        {showForm && (
          <div className="erp-form-box" style={ps.formBox}>
            <div style={{ fontSize: "15px", fontWeight: 700, color: t.text, marginBottom: "18px", display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ width: "4px", height: "18px", background: t.primary, borderRadius: "2px", display: "inline-block" }} />
              {editId ? "Edit Supplier" : "Add New Supplier"}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "18px" }}>
              <div>
                <label style={ps.label}>Supplier Name *</label>
                <input className="erp-input" style={{ ...ps.input, marginBottom: 0 }} placeholder="e.g. Ashirvad Pipes Ltd" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label style={ps.label}>Phone</label>
                <input className="erp-input" style={{ ...ps.input, marginBottom: 0 }} placeholder="e.g. 9876543210" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
              <div>
                <label style={ps.label}>GST Number</label>
                <input className="erp-input" style={{ ...ps.input, marginBottom: 0 }} placeholder="e.g. 29ABCDE1234F1Z5" value={form.gstNumber} onChange={e => setForm(f => ({ ...f, gstNumber: e.target.value }))} />
              </div>
              <div>
                <label style={ps.label}>Address</label>
                <input className="erp-input" style={{ ...ps.input, marginBottom: 0 }} placeholder="Full address" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
              </div>
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
              <button className="erp-btn" style={ps.btnPrimary} onClick={handleSave} disabled={loading}>{editId ? "Update Supplier" : "Save Supplier"}</button>
              <button className="erp-btn" style={ps.btnGhost} onClick={() => { setShowForm(false); setEditId(null); }}>Cancel</button>
            </div>
          </div>
        )}

        <div className="erp-table-wrap" style={ps.tableWrap}>
          <table style={ps.table}>
            <thead>
              <tr style={ps.thead}>
                <th style={ps.th}>#</th>
                <th style={ps.th}>Supplier Name</th>
                <th style={ps.th}>Phone</th>
                <th style={ps.th}>GST Number</th>
                <th style={ps.th}>Address</th>
                <th style={ps.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && !loading && (
                <tr><td colSpan={6} style={{ ...ps.td, textAlign: "center", color: t.textMuted, padding: "40px" }}>No suppliers found</td></tr>
              )}
              {filtered.map((sup, i) => (
                <tr key={sup.id} className="erp-tr"
                  style={{ ...ps.tr, background: t.surface, cursor: "pointer" }}
                  onClick={() => setSelectedSupplierId(sup.id)}>
                  <td style={ps.tdSub}>{i + 1}</td>
                  <td style={ps.td}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: t.primaryLight, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", fontWeight: 700, color: t.primary, flexShrink: 0 }}>
                        {sup.name.charAt(0).toUpperCase()}
                      </div>
                      <span style={{ fontWeight: 600, color: t.text }}>{sup.name}</span>
                    </div>
                  </td>
                  <td style={ps.tdSub}>{sup.phone || "-"}</td>
                  <td style={{ ...ps.tdSub, fontFamily: "monospace", fontSize: "12px" }}>{sup.gstNumber || "-"}</td>
                  <td style={{ ...ps.tdSub, maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sup.address || "-"}</td>
                  <td style={ps.td} onClick={e => e.stopPropagation()}>
                    <div style={{ display: "flex", gap: "6px" }}>
                      <button className="erp-btn" style={{ ...ps.btnSmGhost, color: t.warning, borderColor: t.warning }} onClick={() => handleEdit(sup)}>Edit</button>
                      <button className="erp-btn" style={ps.btnSmDanger} onClick={() => handleDelete(sup.id)}>Delete</button>
                    </div>
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
