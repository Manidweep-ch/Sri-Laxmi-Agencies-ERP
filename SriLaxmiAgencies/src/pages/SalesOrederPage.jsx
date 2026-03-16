import { useEffect, useState, useRef, Fragment } from "react";
import MainLayout from "../layout/MainLayout";
import { getSalesOrders, createSalesOrder, getSalesOrderItems, updateSalesOrderStatus,
  deleteSalesOrder, addSalesOrderItem, removeSalesOrderItem } from "../services/salesService";
import { getCustomers } from "../services/customerService";
import { getProducts } from "../services/productService";
import { getCurrentPrice } from "../services/priceService";
import { generateInvoiceFromSalesOrder, getInvoiceSummaries } from "../services/invoiceService";
import { getPaymentsByInvoice, getOutstanding, createPayment } from "../services/paymentService";
import { usePageStyles } from "../hooks/usePageStyles";
import { useTheme } from "../context/ThemeContext";
import { getTheme } from "../theme";

const STATUS_LABELS = {
  DRAFT: "Draft", PENDING: "Pending", CONFIRMED: "Confirmed",
  SHIPPED: "Goods Sent", INVOICED: "Invoiced", CANCELLED: "Cancelled"
};
const STATUS_COLORS = {
  DRAFT: "#6b7280", PENDING: "#f59e0b", CONFIRMED: "#2563eb",
  SHIPPED: "#7c3aed", INVOICED: "#16a34a", CANCELLED: "#ef4444"
};
const STATUS_FLOW = ["DRAFT", "PENDING", "CONFIRMED", "SHIPPED"];
const METHODS = ["CASH", "UPI", "BANK_TRANSFER", "CHEQUE", "NEFT", "RTGS"];

function SearchDropdown({ placeholder, items, labelFn, onSelect, value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef();
  const { dark } = useTheme();
  const t = getTheme(dark);
  const filtered = items.filter(i => labelFn(i).toLowerCase().includes(value.toLowerCase()));
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const sd = {
    input: { width: "100%", padding: "8px 10px", border: `1px solid ${t.inputBorder}`, borderRadius: "6px", fontSize: "14px", boxSizing: "border-box", background: t.inputBg, color: t.text },
    dropdown: { position: "absolute", top: "100%", left: 0, right: 0, background: t.surface, border: `1px solid ${t.border}`, borderRadius: "6px", zIndex: 100, maxHeight: "200px", overflowY: "auto", boxShadow: t.shadowMd },
    option: { padding: "8px 12px", cursor: "pointer", fontSize: "14px", color: t.text, borderBottom: `1px solid ${t.border}` },
  };
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <input style={sd.input} placeholder={placeholder} value={value}
        onChange={e => { onChange(e.target.value); onSelect(null); setOpen(true); }}
        onFocus={() => setOpen(true)} />
      {open && filtered.length > 0 && (
        <div style={sd.dropdown}>
          {filtered.map(item => (
            <div key={item.id} style={sd.option}
              onMouseDown={() => { onSelect(item); onChange(labelFn(item)); setOpen(false); }}>
              {labelFn(item)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ExpandedSORow({ order, products, invoiceSummaries, onRefresh, onClose }) {
  const [tab, setTab] = useState("items");
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { dark } = useTheme();
  const t = getTheme(dark);
  const ps = usePageStyles();
  const s = {
    label: ps.label, input: ps.input,
    table: ps.table, thead: ps.thead, th: ps.th, tr: ps.tr, td: ps.td,
    btnGreen: ps.btnSuccess, btnSmGreen: ps.btnSmSuccess, btnSmRed: ps.btnSmDanger,
    card: ps.card, cardLabel: ps.cardLabel, cardValue: ps.cardValue,
    totalRow: ps.totalRow,
  };
  const [newItemProduct, setNewItemProduct] = useState(null);
  const [newItemProductSearch, setNewItemProductSearch] = useState("");
  const [newItemBasePrice, setNewItemBasePrice] = useState("");
  const [newItemDiscount, setNewItemDiscount] = useState(0);
  const [newItemQty, setNewItemQty] = useState(1);
  const [discountMap, setDiscountMap] = useState({}); // { [productId]: baseDiscount% }
  const [payments, setPayments] = useState([]);
  const [outstanding, setOutstanding] = useState(null);
  const [payAmount, setPayAmount] = useState("");
  const [payDate, setPayDate] = useState(new Date().toISOString().split("T")[0]);
  const [payMethod, setPayMethod] = useState("CASH");

  const inv = invoiceSummaries.find(i => i.salesOrderId === order.id);
  const canEdit = order.status === "DRAFT" || order.status === "PENDING";

  useEffect(() => { loadItems(); }, []);

  const loadItems = async () => {
    try {
      const data = await getSalesOrderItems(order.id);
      setItems(data);
      // fetch discounts for each product
      const map = {};
      await Promise.all(data.map(async item => {
        if (item.product?.id) {
          try {
            const pr = await getCurrentPrice(item.product.id);
            map[item.product.id] = parseFloat(pr?.baseDiscount) || 0;
          } catch { map[item.product.id] = 0; }
        }
      }));
      setDiscountMap(map);
    }
    catch { setError("Failed to load items"); }
  };

  const loadPayments = async () => {
    if (!inv) return;
    try {
      const [p, o] = await Promise.all([getPaymentsByInvoice(inv.id), getOutstanding(inv.id)]);
      setPayments(p); setOutstanding(o);
    } catch { setPayments([]); setOutstanding(null); }
  };

  const handleTabChange = (t) => {
    setTab(t);
    if (t === "payments") loadPayments();
  };

  const handleAddItem = async () => {
    if (!newItemProduct || !newItemBasePrice || !newItemQty) { setError("Fill all fields"); return; }
    const netPrice = parseFloat(newItemBasePrice) * (1 - (parseFloat(newItemDiscount) || 0) / 100);
    try {
      await addSalesOrderItem(order.id, { product: { id: newItemProduct.id }, price: netPrice, quantity: parseInt(newItemQty) });
      setNewItemProduct(null); setNewItemProductSearch(""); setNewItemBasePrice(""); setNewItemDiscount(0); setNewItemQty(1);
      loadItems(); onRefresh();
    } catch (e) { setError(e.response?.data?.message || "Failed to add item"); }
  };

  const handleRemoveItem = async (itemId) => {
    if (!window.confirm("Remove this item?")) return;
    try { await removeSalesOrderItem(order.id, itemId); loadItems(); onRefresh(); }
    catch (e) { setError(e.response?.data?.message || "Failed to remove item"); }
  };

  const handleStatusChange = async (status) => {
    try { await updateSalesOrderStatus(order.id, status); onRefresh(); }
    catch (e) { setError(e.response?.data?.message || "Failed to update status"); }
  };

  const handleGenerateInvoice = async () => {
    try {
      setLoading(true); setError("");
      await generateInvoiceFromSalesOrder(order.id);
      onRefresh();
    } catch (e) { setError(e.response?.data?.message || "Failed to generate invoice"); }
    finally { setLoading(false); }
  };

  const handleRecordPayment = async () => {
    if (!inv || !payAmount || parseFloat(payAmount) <= 0) { setError("Enter a valid amount"); return; }
    try {
      setLoading(true); setError("");
      await createPayment({ invoice: { id: inv.id }, amount: parseFloat(payAmount), paymentDate: payDate, paymentMethod: payMethod });
      setPayAmount(""); loadPayments(); onRefresh();
    } catch (e) { setError(e.response?.data?.message || "Failed to record payment"); }
    finally { setLoading(false); }
  };

  const mSub = items.reduce((s, i) => s + (i.price || 0) * (i.quantity || 0), 0);
  const mTax = items.reduce((s, i) => s + (i.price || 0) * (i.quantity || 0) * ((i.product?.gst || 0) / 100), 0);

  const tabStyle = (tabKey) => ({
    padding: "7px 16px", border: "none", cursor: "pointer", fontSize: "12px", fontWeight: 600,
    background: tab === tabKey ? t.tableHead : t.surfaceAlt, color: tab === tabKey ? t.tableHeadText : t.textSub,
    borderRadius: "6px", transition: "all 0.15s"
  });

  return (
    <tr>
      <td colSpan={11} style={{ padding: 0, background: t.surfaceAlt, borderBottom: `3px solid ${t.primary}` }}>
        <div style={{ padding: "20px 24px" }}>
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <span style={{ fontWeight: 700, fontSize: "15px", color: t.text }}>{order.orderNumber}</span>
              <span style={{ color: t.textSub, fontSize: "13px" }}>— {order.customer?.name} — {order.orderDate}</span>
            </div>
            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
              {order.status !== "CANCELLED" && order.status !== "INVOICED" && (
                <>
                  {STATUS_FLOW.filter(st => st !== order.status).map(st => (
                    <button key={st} style={{ padding: "5px 10px", border: "none", borderRadius: "5px", cursor: "pointer", fontSize: "11px", fontWeight: 600, background: STATUS_COLORS[st], color: "white" }}
                      onClick={() => handleStatusChange(st)}>{STATUS_LABELS[st]}</button>
                  ))}
                  {order.status === "SHIPPED" && !inv && (
                    <button style={{ padding: "5px 10px", border: "none", borderRadius: "5px", cursor: "pointer", fontSize: "11px", fontWeight: 600, background: "#16a34a", color: "white" }}
                      onClick={handleGenerateInvoice} disabled={loading}>Gen Invoice</button>
                  )}
                  <button style={{ padding: "5px 10px", border: "none", borderRadius: "5px", cursor: "pointer", fontSize: "11px", fontWeight: 600, background: "#ef4444", color: "white" }}
                    onClick={() => handleStatusChange("CANCELLED")}>Cancel</button>
                </>
              )}
              <button style={{ padding: "5px 12px", border: `1px solid ${t.border}`, borderRadius: "5px", cursor: "pointer", fontSize: "12px", background: t.surface, color: t.text }}
                onClick={onClose}>✕ Close</button>
            </div>
          </div>

          {error && <div style={ps.alertError}>{error}</div>}

          {order.status === "CONFIRMED" && (
            <div style={ps.alertInfo}>
              ℹ️ Mark as "Goods Sent" once dispatched. Invoice can only be generated after goods are sent.
            </div>
          )}
          {order.status === "SHIPPED" && !inv && (
            <div style={ps.alertSuccess}>
              ✓ Goods sent. Click "Gen Invoice" to create invoice and record stock consumption.
            </div>
          )}

          {/* Tabs */}
          <div style={{ display: "flex", gap: "6px", marginBottom: "16px" }}>
            <button style={tabStyle("items")} onClick={() => handleTabChange("items")}>📋 Order Items</button>
            <button style={tabStyle("payments")} onClick={() => handleTabChange("payments")}>💳 Payments</button>
          </div>

          {/* ITEMS TAB */}
          {tab === "items" && (
            <>
              {canEdit && (
                <div style={{ display: "flex", gap: "8px", marginBottom: "12px", alignItems: "center", flexWrap: "wrap" }}>
                  <div style={{ flex: 2, minWidth: "180px" }}>
                    <SearchDropdown placeholder="Add product..." items={products}
                      labelFn={p => `${p.name}${p.size ? ` - ${p.size}` : ""}`}
                      value={newItemProductSearch} onChange={setNewItemProductSearch}
                      onSelect={p => {
                        setNewItemProduct(p);
                        if (p) getCurrentPrice(p.id).then(pr => {
                          setNewItemBasePrice(pr?.basePrice ? String(pr.basePrice) : "");
                          setNewItemDiscount(pr?.baseDiscount ? parseFloat(pr.baseDiscount) : 0);
                        }).catch(() => {});
                      }} />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                    <span style={{ fontSize: "11px", color: t.textSub }}>Base Price</span>
                    <input style={{ ...s.input, width: "90px", background: t.surfaceAlt, color: t.textSub }} type="number" placeholder="Price" value={newItemBasePrice} readOnly />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                    <span style={{ fontSize: "11px", color: t.textSub }}>Discount %</span>
                    <input style={{ ...s.input, width: "80px" }} type="number" min="0" max="100" step="0.5" placeholder="Disc%" value={newItemDiscount} onChange={e => setNewItemDiscount(e.target.value)} />
                  </div>
                  {newItemBasePrice && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                      <span style={{ fontSize: "11px", color: t.textSub }}>Net Price</span>
                      <span style={{ ...s.input, width: "90px", display: "flex", alignItems: "center", background: t.surfaceAlt, color: t.success, fontWeight: 600 }}>
                        ₹{(parseFloat(newItemBasePrice) * (1 - (parseFloat(newItemDiscount) || 0) / 100)).toFixed(2)}
                      </span>
                    </div>
                  )}
                  <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                    <span style={{ fontSize: "11px", color: t.textSub }}>Qty</span>
                    <input style={{ ...s.input, width: "70px" }} type="number" placeholder="Qty" min="1" value={newItemQty} onChange={e => setNewItemQty(e.target.value)} />
                  </div>
                  <button style={{ ...s.btnSmGreen, alignSelf: "flex-end" }} onClick={handleAddItem}>+ Add</button>
                </div>
              )}
              <table style={s.table}>
                <thead><tr style={s.thead}>
                  <th style={s.th}>Product</th><th style={s.th}>Size/Unit</th><th style={s.th}>GST%</th>
                  <th style={s.th}>Price (₹)</th><th style={s.th}>Discount</th><th style={s.th}>Qty</th>
                  <th style={s.th}>Line Total</th><th style={s.th}>Tax</th>
                  {canEdit && <th style={s.th}></th>}
                </tr></thead>
                <tbody>
                  {items.map(item => {
                    const lt = (item.price || 0) * item.quantity;
                    const tax = lt * ((item.product?.gst || 0) / 100);
                    const disc = discountMap[item.product?.id] || 0;
                    const discAmt = lt * disc / 100;
                    return (
                      <tr key={item.id} style={s.tr}>
                        <td style={s.td}>{item.product?.name}</td>
                        <td style={s.td}>{item.product?.size || "-"}/{item.product?.unit || "-"}</td>
                        <td style={s.td}>{item.product?.gst || 0}%</td>
                        <td style={s.td}>₹{(item.price || 0).toFixed(2)}</td>
                        <td style={{ ...s.td, color: disc > 0 ? t.warning : t.textMuted, fontWeight: disc > 0 ? 600 : 400 }}>
                          {disc > 0 ? `${disc}% (−₹${discAmt.toFixed(2)})` : "—"}
                        </td>
                        <td style={s.td}>{item.quantity}</td>
                        <td style={s.td}>₹{lt.toFixed(2)}</td>
                        <td style={s.td}>₹{tax.toFixed(2)}</td>
                        {canEdit && <td style={s.td}><button style={s.btnSmRed} onClick={() => handleRemoveItem(item.id)}>✕</button></td>}
                      </tr>
                    );
                  })}
                  {items.length === 0 && <tr><td colSpan={9} style={{ ...s.td, textAlign: "center", color: t.textMuted }}>No items</td></tr>}
                </tbody>
              </table>
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "12px" }}>
                <div style={{ background: t.surfaceAlt, border: `1px solid ${t.border}`, borderRadius: "8px", padding: "12px 20px", minWidth: "240px" }}>
                  <div style={s.totalRow}><span>Sub Total</span><span>₹{mSub.toFixed(2)}</span></div>
                  <div style={s.totalRow}><span>GST</span><span>₹{mTax.toFixed(2)}</span></div>
                  <div style={{ ...s.totalRow, fontWeight: 700, fontSize: "15px", borderTop: `1px solid ${t.border}`, paddingTop: "8px", marginTop: "4px" }}>
                    <span>Grand Total</span><span>₹{(mSub + mTax).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* PAYMENTS TAB */}
          {tab === "payments" && (
            <>
              {!inv ? (
                <div style={{ color: t.textSub, textAlign: "center", padding: "20px", fontSize: "13px" }}>
                  No invoice yet. {order.status === "SHIPPED" ? "Click 'Gen Invoice' above." : "Mark goods as sent first."}
                </div>
              ) : (
                <>
                  <div style={{ display: "flex", gap: "12px", marginBottom: "16px" }}>
                    <div style={s.card}><div style={s.cardLabel}>Invoice</div><div style={{ ...s.cardValue, fontSize: "14px" }}>{inv.invoiceNumber}</div></div>
                    <div style={s.card}><div style={s.cardLabel}>Total</div><div style={s.cardValue}>₹{parseFloat(inv.totalAmount || 0).toFixed(2)}</div></div>
                    <div style={{ ...s.card, borderColor: "#16a34a" }}><div style={s.cardLabel}>Received</div><div style={{ ...s.cardValue, color: "#16a34a" }}>₹{parseFloat(outstanding?.paidAmount || 0).toFixed(2)}</div></div>
                    <div style={{ ...s.card, borderColor: "#ef4444" }}><div style={s.cardLabel}>Due</div><div style={{ ...s.cardValue, color: "#ef4444" }}>₹{parseFloat(outstanding?.outstandingAmount || 0).toFixed(2)}</div></div>
                  </div>
                  {outstanding?.outstandingAmount > 0 && (
                    <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "8px", padding: "14px", marginBottom: "16px" }}>
                      <div style={{ fontWeight: 600, marginBottom: "10px", fontSize: "13px", color: t.text }}>Record Payment Received</div>
                      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "flex-end" }}>
                        <div style={{ flex: "1 1 100px" }}><label style={s.label}>Amount (₹)</label><input style={s.input} type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} /></div>
                        <div style={{ flex: "1 1 130px" }}><label style={s.label}>Date</label><input style={s.input} type="date" value={payDate} onChange={e => setPayDate(e.target.value)} /></div>
                        <div style={{ flex: "1 1 120px" }}><label style={s.label}>Method</label>
                          <select style={s.input} value={payMethod} onChange={e => setPayMethod(e.target.value)}>
                            {METHODS.map(m => <option key={m} value={m}>{m.replace("_", " ")}</option>)}
                          </select>
                        </div>
                        <button style={s.btnGreen} onClick={handleRecordPayment} disabled={loading}>Record</button>
                      </div>
                    </div>
                  )}
                  <table style={s.table}>
                    <thead><tr style={s.thead}><th style={s.th}>#</th><th style={s.th}>Date</th><th style={s.th}>Amount</th><th style={s.th}>Method</th></tr></thead>
                    <tbody>
                      {payments.length === 0 && <tr><td colSpan={4} style={{ ...s.td, textAlign: "center", color: "#9ca3af" }}>No payments yet</td></tr>}
                      {payments.map((p, i) => (
                        <tr key={p.id} style={s.tr}>
                          <td style={s.td}>{i + 1}</td><td style={s.td}>{p.paymentDate}</td>
                          <td style={{ ...s.td, color: "#16a34a", fontWeight: 600 }}>₹{parseFloat(p.amount).toFixed(2)}</td>
                          <td style={s.td}>{p.paymentMethod?.replace("_", " ")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
            </>
          )}
        </div>
      </td>
    </tr>
  );
}

function SalesOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [invoiceSummaries, setInvoiceSummaries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const ps = usePageStyles();
  const { t } = ps;
  const s = {
    header: ps.pageHeader, error: ps.alertError, info: ps.alertInfo,
    formBox: ps.formBox, label: ps.label, input: ps.input,
    table: ps.table, thead: ps.thead, th: ps.th, tr: ps.tr, td: ps.td,
    btn: ps.btnPrimary, btnGreen: ps.btnSuccess, btnGray: ps.btnGhost,
    btnSmRed: ps.btnSmDanger, btnSmGreen: ps.btnSmSuccess,
    badge: ps.badge, totalRow: ps.totalRow, card: ps.card,
    cardLabel: ps.cardLabel, cardValue: ps.cardValue,
  };

  const [showCreate, setShowCreate] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerSearch, setCustomerSearch] = useState("");
  const [lines, setLines] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [productSearch, setProductSearch] = useState("");

  const filtered = orders.filter(o =>
    o.orderNumber?.toLowerCase().includes(search.toLowerCase()) ||
    o.customer?.name?.toLowerCase().includes(search.toLowerCase())
  );

  const load = async () => {
    setLoading(true);
    try {
      const [o, c, p, inv] = await Promise.all([getSalesOrders(), getCustomers(), getProducts(), getInvoiceSummaries()]);
      setOrders([...o].sort((a, b) => b.id - a.id)); setCustomers(c); setProducts(p); setInvoiceSummaries(inv); setError("");
    } catch { setError("Failed to load data"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const getInvoiceForSO = (soId) => invoiceSummaries.find(i => i.salesOrderId === soId);

  const handleAddLine = async () => {
    if (!selectedProduct) { setError("Select a product first"); return; }
    if (lines.find(l => l.productId === selectedProduct.id)) { setError("Product already added"); return; }
    let basePrice = 0;
    let discount = 0;
    try {
      const pd = await getCurrentPrice(selectedProduct.id);
      if (pd?.basePrice) basePrice = parseFloat(pd.basePrice) || 0;
      if (pd?.baseDiscount) discount = parseFloat(pd.baseDiscount) || 0;
    } catch {}
    setLines(prev => [...prev, {
      productId: selectedProduct.id, productName: selectedProduct.name,
      size: selectedProduct.size, unit: selectedProduct.unit,
      gst: selectedProduct.gst || 0, basePrice, discount, qty: 1,
    }]);
    setSelectedProduct(null); setProductSearch(""); setError("");
  };

  const updateLine = (idx, f, v) => setLines(prev => prev.map((l, i) => i === idx ? { ...l, [f]: v } : l));
  const removeLine = (idx) => setLines(prev => prev.filter((_, i) => i !== idx));

  const subTotal = lines.reduce((s, l) => {
    const net = (parseFloat(l.basePrice) || 0) * (1 - (parseFloat(l.discount) || 0) / 100);
    return s + net * (parseInt(l.qty) || 0);
  }, 0);
  const totalTax = lines.reduce((s, l) => {
    const net = (parseFloat(l.basePrice) || 0) * (1 - (parseFloat(l.discount) || 0) / 100);
    return s + net * (parseInt(l.qty) || 0) * ((parseFloat(l.gst) || 0) / 100);
  }, 0);

  const handleCreateSO = async () => {
    if (!selectedCustomer) { setError("Please select a customer"); return; }
    if (lines.length === 0) { setError("Add at least one product"); return; }
    for (const l of lines) {
      if (!l.basePrice || parseFloat(l.basePrice) <= 0) { setError(`No price found for ${l.productName}. Check price list.`); return; }
    }
    try {
      setLoading(true); setError("");
      await createSalesOrder({
        customer: { id: selectedCustomer.id },
        items: lines.map(l => ({
          product: { id: l.productId },
          quantity: parseInt(l.qty),
          price: parseFloat(l.basePrice) * (1 - (parseFloat(l.discount) || 0) / 100)
        }))
      });
      setShowCreate(false); setSelectedCustomer(null); setCustomerSearch(""); setLines([]);
      load();
    } catch (e) { setError(e.response?.data?.message || "Failed to create sales order"); }
    finally { setLoading(false); }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm("Delete this sales order?")) return;
    try { await deleteSalesOrder(id); load(); }
    catch (err) { setError(err.response?.data?.message || "Cannot delete"); }
  };

  const toggleExpand = (id) => setExpandedId(prev => prev === id ? null : id);

  return (
    <MainLayout>
      <div style={s.header}>
        <h2 style={{ margin: 0 }}>Sales Orders</h2>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <input style={{ ...s.input, width: "220px" }} placeholder="Search SO#, customer..."
            value={search} onChange={e => setSearch(e.target.value)} />
          <button style={s.btnGreen} onClick={() => { setShowCreate(true); setSelectedCustomer(null); setCustomerSearch(""); setLines([]); setError(""); }}>
            + New Order
          </button>
        </div>
      </div>

      {error && <div style={s.error}>{error}</div>}
      {loading && <div style={s.info}>Loading...</div>}

      {showCreate && (
        <div style={s.formBox}>
          <h3 style={{ margin: "0 0 16px" }}>Create Sales Order</h3>
          <div style={{ marginBottom: "16px", maxWidth: "360px" }}>
            <label style={s.label}>Customer *</label>
            <SearchDropdown placeholder="Type to search customer..." items={customers}
              labelFn={c => c.name} value={customerSearch} onChange={setCustomerSearch} onSelect={setSelectedCustomer} />
            {selectedCustomer && <div style={{ marginTop: "6px", fontSize: "13px", color: "#16a34a" }}>✓ {selectedCustomer.name}</div>}
          </div>
          <div style={{ marginBottom: "12px" }}>
            <label style={{ ...s.label, display: "block", marginBottom: "8px" }}>Add Product</label>
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <div style={{ flex: 1 }}>
                <SearchDropdown placeholder="Type product name..." items={products}
                  labelFn={p => `${p.name}${p.size ? ` - ${p.size}` : ""} (${p.brand?.name || ""})`}
                  value={productSearch} onChange={setProductSearch} onSelect={setSelectedProduct} />
                {selectedProduct && <div style={{ marginTop: "4px", fontSize: "12px", color: "#2563eb" }}>✓ {selectedProduct.name} | GST: {selectedProduct.gst || 0}%</div>}
              </div>
              <button style={s.btn} onClick={handleAddLine}>Add</button>
            </div>
          </div>
          {lines.length > 0 && (
            <table style={{ ...s.table, marginBottom: "16px" }}>
              <thead><tr style={s.thead}>
                <th style={s.th}>Product</th><th style={s.th}>GST%</th>
                <th style={s.th}>Base Price (₹)</th><th style={s.th}>Discount %</th>
                <th style={s.th}>Net Price (₹)</th><th style={s.th}>Qty*</th>
                <th style={s.th}>Line Total</th><th style={s.th}>Tax</th><th style={s.th}></th>
              </tr></thead>
              <tbody>
                {lines.map((line, idx) => {
                  const basePrice = parseFloat(line.basePrice) || 0;
                  const disc = parseFloat(line.discount) || 0;
                  const netPrice = basePrice * (1 - disc / 100);
                  const qty = parseInt(line.qty) || 0;
                  const lineTotal = netPrice * qty;
                  const tax = lineTotal * (parseFloat(line.gst) || 0) / 100;
                  return (
                    <tr key={idx} style={s.tr}>
                      <td style={s.td}>{line.productName}{line.size ? ` - ${line.size}` : ""}</td>
                      <td style={s.td}>{line.gst}%</td>
                      <td style={{ ...s.td, color: t.textSub }}>₹{basePrice.toFixed(2)}</td>
                      <td style={s.td}>
                        <input
                          style={{ ...s.input, width: "80px" }}
                          type="number" min="0" max="100" step="0.5"
                          value={line.discount}
                          onChange={e => updateLine(idx, "discount", e.target.value)}
                        />
                      </td>
                      <td style={{ ...s.td, fontWeight: 600, color: disc > 0 ? t.success : t.text }}>
                        ₹{netPrice.toFixed(2)}
                        {disc > 0 && <span style={{ fontSize: "11px", color: t.warning, marginLeft: "4px" }}>(-{disc}%)</span>}
                      </td>
                      <td style={s.td}><input style={{ ...s.input, width: "70px" }} type="number" min="1" value={line.qty} onChange={e => updateLine(idx, "qty", e.target.value)} /></td>
                      <td style={s.td}>₹{lineTotal.toFixed(2)}</td>
                      <td style={s.td}>₹{tax.toFixed(2)}</td>
                      <td style={s.td}><button style={s.btnSmRed} onClick={() => removeLine(idx)}>✕</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          {lines.length > 0 && (
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "16px" }}>
              <div style={{ background: t.surfaceAlt, border: `1px solid ${t.border}`, borderRadius: "8px", padding: "12px 20px", minWidth: "240px" }}>
                <div style={s.totalRow}><span>Sub Total</span><span>₹{subTotal.toFixed(2)}</span></div>
                <div style={s.totalRow}><span>GST</span><span>₹{totalTax.toFixed(2)}</span></div>
                <div style={{ ...s.totalRow, fontWeight: 700, fontSize: "15px", borderTop: `1px solid ${t.border}`, paddingTop: "8px", marginTop: "4px" }}>
                  <span>Grand Total</span><span>₹{(subTotal + totalTax).toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}
          <div style={{ display: "flex", gap: "10px" }}>
            <button style={s.btnGreen} onClick={handleCreateSO} disabled={loading}>Confirm & Create Order</button>
            <button style={s.btnGray} onClick={() => { setShowCreate(false); setLines([]); }}>Cancel</button>
          </div>
        </div>
      )}

      <table style={s.table}>
        <thead>
          <tr style={s.thead}>
            <th style={s.th}></th>
            <th style={s.th}>Order #</th><th style={s.th}>Date</th><th style={s.th}>Customer</th>
            <th style={s.th}>Sub Total</th><th style={s.th}>GST</th><th style={s.th}>Grand Total</th>
            <th style={s.th}>Status</th><th style={s.th}>Goods</th>
            <th style={s.th}>Payment</th><th style={s.th}>Invoice</th>
          </tr>
        </thead>
        <tbody>
          {filtered.length === 0 && !loading && (
            <tr><td colSpan={11} style={{ ...s.td, textAlign: "center", color: "#9ca3af" }}>No sales orders found</td></tr>
          )}
          {filtered.map(o => {
            const inv = getInvoiceForSO(o.id);
            const goodsSent = o.status === "SHIPPED" || o.status === "INVOICED";
            const isExpanded = expandedId === o.id;
            return (
              <Fragment key={o.id}>
                <tr
                  style={{ ...s.tr, cursor: "pointer", background: isExpanded ? t.surfaceAlt : t.surface, borderLeft: isExpanded ? `3px solid ${t.primary}` : "3px solid transparent" }}
                  onClick={() => toggleExpand(o.id)}>
                  <td style={{ ...s.td, width: "32px", textAlign: "center", color: t.textMuted, fontSize: "12px" }}>
                    {isExpanded ? "▲" : "▼"}
                  </td>
                  <td style={{ ...s.td, fontWeight: 600, color: t.text }}>{o.orderNumber}</td>
                  <td style={s.td}>{o.orderDate}</td>
                  <td style={s.td}>{o.customer?.name || "-"}</td>
                  <td style={s.td}>₹{parseFloat(o.subTotal || 0).toFixed(2)}</td>
                  <td style={s.td}>₹{parseFloat(o.tax || 0).toFixed(2)}</td>
                  <td style={{ ...s.td, fontWeight: 600 }}>₹{parseFloat(o.totalAmount || 0).toFixed(2)}</td>
                  <td style={s.td}>
                    <span style={{ ...s.badge, background: STATUS_COLORS[o.status] || "#6b7280" }}>
                      {STATUS_LABELS[o.status] || o.status}
                    </span>
                  </td>
                  <td style={s.td}>
                    <span style={{ ...s.badge, background: goodsSent ? "#16a34a" : "#f59e0b" }}>
                      {goodsSent ? "Sent" : "Pending"}
                    </span>
                  </td>
                  <td style={s.td}>
                    {inv
                      ? <span style={{ ...s.badge, background: inv.paymentStatus === "PAID" ? "#16a34a" : inv.paymentStatus === "OVERDUE" ? "#ef4444" : "#f59e0b" }}>
                          {inv.paymentStatus || "PENDING"}
                        </span>
                      : <span style={{ color: "#9ca3af", fontSize: "12px" }}>-</span>}
                  </td>
                  <td style={s.td} onClick={e => e.stopPropagation()}>
                    {inv
                      ? <span style={{ fontSize: "12px", fontWeight: 600, color: t.text }}>{inv.invoiceNumber}</span>
                      : o.status === "SHIPPED"
                        ? <button style={s.btnSmGreen} onClick={async (e) => { e.stopPropagation(); try { await generateInvoiceFromSalesOrder(o.id); load(); } catch(err) { setError(err.response?.data?.message || "Failed"); } }}>Gen Invoice</button>
                        : (o.status === "DRAFT" || o.status === "PENDING")
                          ? <button style={s.btnSmRed} onClick={(e) => handleDelete(o.id, e)}>Del</button>
                          : <span style={{ color: "#9ca3af", fontSize: "12px" }}>-</span>}
                  </td>
                </tr>
                {isExpanded && (
                  <ExpandedSORow
                    order={o}
                    products={products}
                    invoiceSummaries={invoiceSummaries}
                    onRefresh={load}
                    onClose={() => setExpandedId(null)}
                  />
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </MainLayout>
  );
}

export default SalesOrdersPage;
