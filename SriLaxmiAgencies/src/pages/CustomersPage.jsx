import { useEffect, useState } from "react";
import MainLayout from "../layout/MainLayout";
import { getCustomers, createCustomer, updateCustomer, deleteCustomer, getCustomerSummary } from "../services/customerService";
import { usePageStyles } from "../hooks/usePageStyles";
import { useTheme } from "../context/ThemeContext";
import { getTheme } from "../theme";

const emptyForm = { name: "", phone: "", address: "", gstNumber: "" };

const SO_STATUS_COLORS = {
  DRAFT: "#6b7280", PENDING: "#2563eb", CONFIRMED: "#7c3aed",
  SHIPPED: "#f59e0b", DELIVERED: "#16a34a", CANCELLED: "#ef4444"
};
const PAY_COLORS = {
  PAID: "#16a34a", PARTIALLY_PAID: "#f59e0b", OVERDUE: "#ef4444",
  PENDING: "#6b7280", UNPAID: "#6b7280"
};

// ── Customer Detail Page ──────────────────────────────────────────────────────
function CustomerDetailPage({ customerId, onBack }) {
  const ps = usePageStyles();
  const { dark } = useTheme();
  const t = getTheme(dark);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("orders");

  useEffect(() => { load(); }, [customerId]);

  const load = async () => {
    setLoading(true);
    try { setData(await getCustomerSummary(customerId)); setError(""); }
    catch { setError("Failed to load customer summary"); }
    finally { setLoading(false); }
  };

  if (loading) return (
    <MainLayout><div style={{ padding: "40px", textAlign: "center", color: "#6b7280" }}>Loading...</div></MainLayout>
  );

  const cust = data?.customer;
  const orders = data?.salesOrders || [];
  const invoices = data?.invoices || [];
  const payments = data?.payments || [];
  const totalInvoiced = invoices.reduce((s, i) => s + parseFloat(i.totalAmount || 0), 0);

  const cards = [
    { label: "Total Ordered",  value: data?.grandTotalOrdered, color: "#2563eb", icon: "🛒" },
    { label: "Total Invoiced", value: totalInvoiced,           color: "#7c3aed", icon: "🧾" },
    { label: "Total Received", value: data?.grandTotalPaid,    color: "#16a34a", icon: "💳" },
    { label: "Balance Due",    value: data?.grandBalance,      color: "#ef4444", icon: "⚠️" },
  ];

  return (
    <MainLayout>
      <div className="erp-page">
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
          <button onClick={onBack} style={{ padding: "7px 14px", border: `1px solid ${t.border}`, borderRadius: "6px", background: t.surface, color: t.text, cursor: "pointer", fontSize: "13px" }}>
            Back
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: "#16a34a22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", fontWeight: 700, color: "#16a34a" }}>
              {cust?.name?.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: "18px", color: t.text }}>{cust?.name}</h2>
              <div style={{ fontSize: "12px", color: t.textMuted, marginTop: "2px" }}>
                {cust?.phone && `Ph: ${cust.phone}`}
                {cust?.gstNumber && `  |  GST: ${cust.gstNumber}`}
                {cust?.address && `  |  ${cust.address}`}
              </div>
            </div>
          </div>
        </div>

        {error && <div style={ps.alertError}>{error}</div>}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "12px", marginBottom: "24px" }}>
          {cards.map(c => (
            <div key={c.label} style={{ ...ps.card, borderTop: `3px solid ${c.color}` }}>
              <div style={{ fontSize: "20px", marginBottom: "6px" }}>{c.icon}</div>
              <div style={ps.cardLabel}>{c.label}</div>
              <div style={{ ...ps.cardValue, color: c.color, fontSize: "18px" }}>
                Rs.{parseFloat(c.value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: "4px", marginBottom: "16px", borderBottom: `1px solid ${t.border}` }}>
          {[["orders", `Sales Orders (${orders.length})`], ["invoices", `Invoices (${invoices.length})`], ["payments", `Payments (${payments.length})`]].map(([key, label]) => (
            <button key={key} onClick={() => setActiveTab(key)} style={{
              padding: "8px 16px", border: "none", background: "transparent", cursor: "pointer",
              fontSize: "13px", fontWeight: activeTab === key ? 700 : 400,
              color: activeTab === key ? t.primary : t.textMuted,
              borderBottom: activeTab === key ? `2px solid ${t.primary}` : "2px solid transparent",
              marginBottom: "-1px"
            }}>{label}</button>
          ))}
        </div>

        {activeTab === "orders" && (
          <div style={ps.tableWrap}>
            <table style={ps.table}>
              <thead>
                <tr style={ps.thead}>
                  <th style={ps.th}>Order No</th>
                  <th style={ps.th}>Date</th>
                  <th style={ps.th}>Status</th>
                  <th style={ps.th}>Grand Total</th>
                  <th style={ps.th}>Final Price</th>
                  <th style={ps.th}>Paid</th>
                  <th style={ps.th}>Balance</th>
                </tr>
              </thead>
              <tbody>
                {orders.length === 0 && <tr><td colSpan={7} style={{ ...ps.td, textAlign: "center", color: t.textMuted, padding: "32px" }}>No sales orders</td></tr>}
                {orders.map(so => (
                  <tr key={so.id} style={{ ...ps.tr, background: t.surface }}>
                    <td style={{ ...ps.td, fontWeight: 600, color: "#2563eb" }}>{so.orderNumber}</td>
                    <td style={ps.tdSub}>{so.orderDate || "-"}</td>
                    <td style={ps.td}>
                      <span style={{ padding: "3px 8px", borderRadius: "12px", fontSize: "11px", fontWeight: 600, background: (SO_STATUS_COLORS[so.status] || "#6b7280") + "22", color: SO_STATUS_COLORS[so.status] || "#6b7280" }}>
                        {so.status}
                      </span>
                    </td>
                    <td style={ps.td}>Rs.{parseFloat(so.totalAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                    <td style={{ ...ps.td, color: so.finalAmount ? "#7c3aed" : t.textMuted, fontStyle: so.finalAmount ? "normal" : "italic" }}>
                      {so.finalAmount ? `Rs.${parseFloat(so.finalAmount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "-"}
                    </td>
                    <td style={{ ...ps.td, color: "#16a34a", fontWeight: 600 }}>Rs.{parseFloat(so.paidAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                    <td style={{ ...ps.td, color: parseFloat(so.balance) > 0 ? "#ef4444" : "#16a34a", fontWeight: 700 }}>
                      Rs.{parseFloat(so.balance || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
              {orders.length > 0 && (
                <tfoot>
                  <tr style={{ background: t.surfaceAlt, fontWeight: 700 }}>
                    <td colSpan={3} style={{ ...ps.td, textAlign: "right", color: t.textMuted }}>Grand Total</td>
                    <td style={ps.td}>Rs.{parseFloat(data?.grandTotalOrdered || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                    <td style={ps.td}>-</td>
                    <td style={{ ...ps.td, color: "#16a34a" }}>Rs.{parseFloat(data?.grandTotalPaid || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                    <td style={{ ...ps.td, color: parseFloat(data?.grandBalance) > 0 ? "#ef4444" : "#16a34a" }}>Rs.{parseFloat(data?.grandBalance || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}

        {activeTab === "invoices" && (
          <div style={ps.tableWrap}>
            <table style={ps.table}>
              <thead>
                <tr style={ps.thead}>
                  <th style={ps.th}>Invoice #</th>
                  <th style={ps.th}>SO Number</th>
                  <th style={ps.th}>Date</th>
                  <th style={ps.th}>Due Date</th>
                  <th style={ps.th}>Total</th>
                  <th style={ps.th}>Paid</th>
                  <th style={ps.th}>Due</th>
                  <th style={ps.th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {invoices.length === 0 && <tr><td colSpan={8} style={{ ...ps.td, textAlign: "center", color: t.textMuted, padding: "32px" }}>No invoices</td></tr>}
                {invoices.map(inv => (
                  <tr key={inv.id} style={{ ...ps.tr, background: t.surface }}>
                    <td style={{ ...ps.td, fontWeight: 700 }}>{inv.invoiceNumber}</td>
                    <td style={{ ...ps.td, color: "#2563eb" }}>{inv.soNumber || "-"}</td>
                    <td style={ps.tdSub}>{inv.invoiceDate || "-"}</td>
                    <td style={ps.tdSub}>{inv.dueDate || "-"}</td>
                    <td style={{ ...ps.td, fontWeight: 600 }}>Rs.{parseFloat(inv.totalAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                    <td style={{ ...ps.td, color: "#16a34a" }}>Rs.{parseFloat(inv.paidAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
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
        )}

        {activeTab === "payments" && (
          <div style={ps.tableWrap}>
            <table style={ps.table}>
              <thead>
                <tr style={ps.thead}>
                  <th style={ps.th}>Date</th>
                  <th style={ps.th}>Invoice #</th>
                  <th style={ps.th}>Amount</th>
                  <th style={ps.th}>Method</th>
                  <th style={ps.th}>Notes</th>
                </tr>
              </thead>
              <tbody>
                {payments.length === 0 && <tr><td colSpan={5} style={{ ...ps.td, textAlign: "center", color: t.textMuted, padding: "32px" }}>No payments recorded</td></tr>}
                {payments.map(p => (
                  <tr key={p.id} style={{ ...ps.tr, background: t.surface }}>
                    <td style={ps.tdSub}>{p.paymentDate || "-"}</td>
                    <td style={{ ...ps.td, color: "#2563eb", fontWeight: 600 }}>{p.invoice?.invoiceNumber || "-"}</td>
                    <td style={{ ...ps.td, fontWeight: 700, color: "#16a34a" }}>Rs.{parseFloat(p.amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                    <td style={ps.tdSub}>{p.paymentMethod || "-"}</td>
                    <td style={ps.tdSub}>{p.notes || "-"}</td>
                  </tr>
                ))}
              </tbody>
              {payments.length > 0 && (
                <tfoot>
                  <tr style={{ background: t.surfaceAlt }}>
                    <td colSpan={2} style={{ ...ps.td, textAlign: "right", color: t.textMuted, fontWeight: 700 }}>Total Received</td>
                    <td style={{ ...ps.td, fontWeight: 700, color: "#16a34a" }}>Rs.{parseFloat(data?.grandTotalPaid || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
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

// ── Main Customers List ───────────────────────────────────────────────────────
export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const ps = usePageStyles();
  const { dark } = useTheme();
  const t = getTheme(dark);

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

  if (selectedCustomerId) {
    return <CustomerDetailPage customerId={selectedCustomerId} onBack={() => setSelectedCustomerId(null)} />;
  }

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

  const avatarColors = ["#2563eb", "#16a34a", "#f59e0b", "#7c3aed", "#0891b2", "#ea580c"];

  return (
    <MainLayout>
      <div className="erp-page">
        <div style={ps.pageHeader}>
          <div>
            <h2 style={ps.pageTitle}>Customers</h2>
            <div style={{ fontSize: "12px", color: t.textMuted, marginTop: "2px" }}>
              {customers.length} registered customers &middot; click a row to view full history
            </div>
          </div>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <input className="erp-input" style={ps.searchInput} placeholder="Search name, phone, GST..." value={search} onChange={e => setSearch(e.target.value)} />
            <button className="erp-btn" style={ps.btnSuccess} onClick={() => { setShowForm(true); setForm(emptyForm); setEditId(null); }}>
              + Add Customer
            </button>
          </div>
        </div>

        {error && <div style={ps.alertError}>{error}</div>}
        {loading && <div style={ps.alertInfo}>Loading...</div>}

        {showForm && (
          <div className="erp-form-box" style={ps.formBox}>
            <div style={{ fontSize: "15px", fontWeight: 700, color: t.text, marginBottom: "18px", display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ width: "4px", height: "18px", background: "#16a34a", borderRadius: "2px", display: "inline-block" }} />
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
                  <tr key={cust.id} className="erp-tr"
                    style={{ ...ps.tr, background: t.surface, cursor: "pointer" }}
                    onClick={() => setSelectedCustomerId(cust.id)}>
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
                    <td style={ps.td} onClick={e => e.stopPropagation()}>
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
