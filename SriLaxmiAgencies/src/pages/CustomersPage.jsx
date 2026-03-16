import { useEffect, useState } from "react";
import MainLayout from "../layout/MainLayout";
import { getCustomers, createCustomer, updateCustomer, deleteCustomer } from "../services/customerService";
import { usePageStyles } from "../hooks/usePageStyles";

const emptyForm = { name: "", phone: "", address: "", gstNumber: "" };

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const ps = usePageStyles();
  const { t } = ps;

  const filtered = customers.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.toLowerCase().includes(search.toLowerCase()) ||
    c.gstNumber?.toLowerCase().includes(search.toLowerCase())
  );

  const load = async () => {
    setLoading(true);
    try { setCustomers(await getCustomers()); setError(""); }
    catch { setError("Failed to load customers"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    if (!form.name.trim()) { setError("Customer name is required"); return; }
    try {
      setLoading(true); setError("");
      if (editId) await updateCustomer(editId, form);
      else await createCustomer({ ...form, active: true });
      setForm(emptyForm); setShowForm(false); setEditId(null); load();
    } catch { setError("Failed to save customer"); }
    finally { setLoading(false); }
  };

  const handleEdit = (c) => {
    setEditId(c.id);
    setForm({ name: c.name, phone: c.phone || "", address: c.address || "", gstNumber: c.gstNumber || "" });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Deactivate this customer?")) return;
    try { await deleteCustomer(id); load(); }
    catch { setError("Failed to delete customer"); }
  };

  const avatarColors = [t.primary, t.success, t.warning, t.purple, t.teal, t.orange];

  return (
    <MainLayout>
      <div className="erp-page">
        <div style={ps.pageHeader}>
          <div>
            <h2 style={ps.pageTitle}>Customers</h2>
            <div style={{ fontSize: "12px", color: t.textMuted, marginTop: "2px" }}>
              {customers.length} registered customers
            </div>
          </div>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <input className="erp-input" style={ps.searchInput} placeholder="Search name, phone, GST..." value={search} onChange={e => setSearch(e.target.value)} />
            <button className="erp-btn" style={ps.btnSuccess} onClick={() => { setShowForm(true); setForm(emptyForm); setEditId(null); }}>
              + Add Customer
            </button>
          </div>
        </div>

        {error && <div style={ps.alertError}>⚠ {error}</div>}
        {loading && <div style={ps.alertInfo}>Loading...</div>}

        {showForm && (
          <div className="erp-form-box" style={ps.formBox}>
            <div style={{ fontSize: "15px", fontWeight: 700, color: t.text, marginBottom: "18px", display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ width: "4px", height: "18px", background: t.success, borderRadius: "2px", display: "inline-block" }} />
              {editId ? "Edit Customer" : "Add New Customer"}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "18px" }}>
              <div>
                <label style={ps.label}>Customer Name *</label>
                <input className="erp-input" style={{ ...ps.input, marginBottom: 0 }} placeholder="e.g. Ravi Constructions" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
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
              <button className="erp-btn" style={ps.btnPrimary} onClick={handleSave} disabled={loading}>{editId ? "Update Customer" : "Save Customer"}</button>
              <button className="erp-btn" style={ps.btnGhost} onClick={() => { setShowForm(false); setEditId(null); }}>Cancel</button>
            </div>
          </div>
        )}

        <div className="erp-table-wrap" style={ps.tableWrap}>
          <table style={ps.table}>
            <thead>
              <tr style={ps.thead}>
                <th style={ps.th}>#</th>
                <th style={ps.th}>Customer Name</th>
                <th style={ps.th}>Phone</th>
                <th style={ps.th}>GST Number</th>
                <th style={ps.th}>Address</th>
                <th style={ps.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && !loading && (
                <tr><td colSpan={6} style={{ ...ps.td, textAlign: "center", color: t.textMuted, padding: "40px" }}>No customers found</td></tr>
              )}
              {filtered.map((cust, i) => {
                const avatarColor = avatarColors[i % avatarColors.length];
                return (
                  <tr key={cust.id} className="erp-tr" style={{ ...ps.tr, background: t.surface }}>
                    <td style={ps.tdSub}>{i + 1}</td>
                    <td style={ps.td}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: avatarColor + "20", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", fontWeight: 700, color: avatarColor, flexShrink: 0 }}>
                          {cust.name.charAt(0).toUpperCase()}
                        </div>
                        <span style={{ fontWeight: 600, color: t.text }}>{cust.name}</span>
                      </div>
                    </td>
                    <td style={ps.tdSub}>{cust.phone || "-"}</td>
                    <td style={{ ...ps.tdSub, fontFamily: "monospace", fontSize: "12px" }}>{cust.gstNumber || "-"}</td>
                    <td style={{ ...ps.tdSub, maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{cust.address || "-"}</td>
                    <td style={ps.td}>
                      <div style={{ display: "flex", gap: "6px" }}>
                        <button className="erp-btn" style={{ ...ps.btnSmGhost, color: t.warning, borderColor: t.warning }} onClick={() => handleEdit(cust)}>Edit</button>
                        <button className="erp-btn" style={ps.btnSmDanger} onClick={() => handleDelete(cust.id)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </MainLayout>
  );
}
