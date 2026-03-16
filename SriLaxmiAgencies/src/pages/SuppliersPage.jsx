import { useEffect, useState } from "react";
import MainLayout from "../layout/MainLayout";
import { getSuppliers, createSupplier, updateSupplier, deleteSupplier } from "../services/supplierService";
import { usePageStyles } from "../hooks/usePageStyles";

const emptyForm = { name: "", phone: "", address: "", gstNumber: "" };

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const ps = usePageStyles();
  const { t } = ps;

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
              {suppliers.length} registered suppliers
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
                <tr key={sup.id} className="erp-tr" style={{ ...ps.tr, background: t.surface }}>
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
                  <td style={ps.td}>
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
