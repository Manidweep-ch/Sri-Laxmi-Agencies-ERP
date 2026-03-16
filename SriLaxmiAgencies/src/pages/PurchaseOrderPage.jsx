import { useEffect, useState, useRef, Fragment } from "react";
import MainLayout from "../layout/MainLayout";
import { getPurchaseOrders, createPurchaseOrder, getPurchaseOrderItems, addPurchaseOrderItem,
  updatePurchaseOrderItem, removePurchaseOrderItem, updatePurchaseOrderStatus,
  receiveStockForPO, getGRNsForPO, getSupplierPayments, recordSupplierPayment,
  getSupplierTotalPaid } from "../services/purchaseService";
import { getSuppliers } from "../services/supplierService";
import { getProducts } from "../services/productService";
import { usePageStyles } from "../hooks/usePageStyles";
import { getCurrentPrice } from "../services/priceService";
import { useTheme } from "../context/ThemeContext";
import { getTheme } from "../theme";

const STATUS_LABELS = {
  DRAFT: "Draft", APPROVED: "Approved", SENT_TO_SUPPLIER: "Sent",
  PARTIALLY_RECEIVED: "Partial GRN", FULLY_RECEIVED: "Fully Received", CANCELLED: "Cancelled"
};
const STATUS_COLORS = {
  DRAFT: "#6b7280", APPROVED: "#2563eb", SENT_TO_SUPPLIER: "#7c3aed",
  PARTIALLY_RECEIVED: "#f59e0b", FULLY_RECEIVED: "#16a34a", CANCELLED: "#ef4444"
};

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

function ExpandedPORow({ po, products, onRefresh, onClose }) {
  const [tab, setTab] = useState("items");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
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

  // Items tab
  const [newItemProduct, setNewItemProduct] = useState(null);
  const [newItemProductSearch, setNewItemProductSearch] = useState("");
  const [newItemPrice, setNewItemPrice] = useState("");
  const [newItemQty, setNewItemQty] = useState(1);
  const [editingItemId, setEditingItemId] = useState(null);
  const [editItemPrice, setEditItemPrice] = useState("");
  const [editItemQty, setEditItemQty] = useState("");

  // Receive tab
  const [receiveLines, setReceiveLines] = useState([]);
  const [receiveInvoice, setReceiveInvoice] = useState("");
  const [receiveDate, setReceiveDate] = useState(new Date().toISOString().split("T")[0]);

  // GRN tab
  const [grns, setGrns] = useState([]);

  // Payments tab
  const [payments, setPayments] = useState([]);
  const [totalPaid, setTotalPaid] = useState(0);
  const [payAmount, setPayAmount] = useState("");
  const [payDate, setPayDate] = useState(new Date().toISOString().split("T")[0]);
  const [payMethod, setPayMethod] = useState("CASH");
  const [payNotes, setPayNotes] = useState("");

  const hasGRN = po.status === "FULLY_RECEIVED" || po.status === "PARTIALLY_RECEIVED";
  const isLocked = po.status === "FULLY_RECEIVED" || po.status === "CANCELLED";

  useEffect(() => { loadItems(); }, []);

  const loadItems = async () => {
    try {
      const data = await getPurchaseOrderItems(po.id);
      setItems(data);
      setReceiveLines(data.map(item => ({
        poItemId: item.id, productId: item.product?.id, productName: item.product?.name,
        productSize: item.product?.size, orderedQty: item.quantity,
        alreadyReceived: item.receivedQuantity || 0,
        remaining: item.quantity - (item.receivedQuantity || 0),
        receiveQty: Math.max(0, item.quantity - (item.receivedQuantity || 0)),
        purchasePrice: item.price || 0,
      })));
    } catch { setError("Failed to load items"); }
  };

  const loadGRNs = async () => {
    try { const data = await getGRNsForPO(po.id); setGrns(data); } catch { setGrns([]); }
  };

  const loadPayments = async () => {
    try {
      const [pmts, paid] = await Promise.all([getSupplierPayments(po.id), getSupplierTotalPaid(po.id)]);
      setPayments(pmts); setTotalPaid(parseFloat(paid) || 0);
    } catch { setPayments([]); setTotalPaid(0); }
  };

  const handleTabChange = (t) => {
    setTab(t);
    if (t === "grns") loadGRNs();
    if (t === "payments") loadPayments();
  };

  const handleAddItem = async () => {
    if (!newItemProduct || !newItemPrice || !newItemQty) { setError("Fill all fields"); return; }
    try {
      await addPurchaseOrderItem(po.id, { product: { id: newItemProduct.id }, price: parseFloat(newItemPrice), quantity: parseInt(newItemQty) });
      setNewItemProduct(null); setNewItemProductSearch(""); setNewItemPrice(""); setNewItemQty(1);
      loadItems(); onRefresh();
    } catch { setError("Failed to add item"); }
  };

  const handleUpdateItem = async (itemId) => {
    try {
      await updatePurchaseOrderItem(po.id, itemId, { price: parseFloat(editItemPrice), quantity: parseInt(editItemQty) });
      setEditingItemId(null); loadItems(); onRefresh();
    } catch { setError("Failed to update item"); }
  };

  const handleRemoveItem = async (itemId) => {
    if (!window.confirm("Remove this item?")) return;
    try { await removePurchaseOrderItem(po.id, itemId); loadItems(); onRefresh(); }
    catch { setError("Failed to remove item"); }
  };

  const handleReceiveStock = async () => {
    const toReceive = receiveLines.filter(l => parseInt(l.receiveQty) > 0);
    if (toReceive.length === 0) { setError("Enter quantity for at least one item"); return; }
    for (const l of toReceive) {
      if (parseInt(l.receiveQty) > l.remaining) { setError(`Max ${l.remaining} for ${l.productName}`); return; }
    }
    try {
      setLoading(true); setError("");
      await receiveStockForPO(po.id, {
        supplier: { id: po.supplier?.id }, invoiceNumber: receiveInvoice || null, receiptDate: receiveDate,
        items: toReceive.map(l => ({ product: { id: l.productId }, purchaseOrderItem: { id: l.poItemId }, quantity: parseInt(l.receiveQty), purchasePrice: parseFloat(l.purchasePrice) || 0 }))
      });
      setTab("grns"); loadItems(); loadGRNs(); onRefresh();
    } catch (e) { setError(e.response?.data?.message || "Failed to receive stock"); }
    finally { setLoading(false); }
  };

  const handleRecordPayment = async () => {
    if (!payAmount || parseFloat(payAmount) <= 0) { setError("Enter a valid amount"); return; }
    if (!hasGRN) { setError("Receive goods first before recording payment"); return; }
    try {
      setLoading(true); setError("");
      await recordSupplierPayment(po.id, { amount: parseFloat(payAmount), paymentDate: payDate, paymentMethod: payMethod, notes: payNotes });
      setPayAmount(""); setPayNotes(""); loadPayments(); onRefresh();
    } catch (e) { setError(e.response?.data?.message || "Failed to record payment"); }
    finally { setLoading(false); }
  };

  const handleStatusChange = async (status) => {
    try { await updatePurchaseOrderStatus(po.id, status); onRefresh(); }
    catch (e) { setError(e.response?.data?.message || "Failed to update status"); }
  };

  const mSub = items.reduce((s, i) => s + (i.price || 0) * (i.quantity || 0), 0);
  const mTax = items.reduce((s, i) => s + (i.price || 0) * (i.quantity || 0) * ((i.product?.gst || 0) / 100), 0);
  const orderAmt = parseFloat(po.totalAmount) || 0;
  const amtDue = orderAmt - totalPaid;

  const tabStyle = (tabKey) => ({
    padding: "7px 16px", border: "none", cursor: "pointer", fontSize: "12px", fontWeight: 600,
    background: tab === tabKey ? t.tableHead : t.surfaceAlt, color: tab === tabKey ? t.tableHeadText : t.textSub,
    borderRadius: "6px", transition: "all 0.15s"
  });

  return (
    <tr>
      <td colSpan={9} style={{ padding: 0, background: t.surfaceAlt, borderBottom: `3px solid ${t.primary}` }}>
        <div style={{ padding: "20px 24px" }}>
          {/* Header row */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <span style={{ fontWeight: 700, fontSize: "15px", color: t.text }}>{po.poNumber}</span>
              <span style={{ color: t.textSub, fontSize: "13px" }}>— {po.supplier?.name} — {po.orderDate}</span>
            </div>
            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
              {po.status !== "CANCELLED" && po.status !== "FULLY_RECEIVED" && (
                <>
                  {["APPROVED", "SENT_TO_SUPPLIER"].map(st => (
                    <button key={st} style={{ padding: "5px 10px", border: "none", borderRadius: "5px", cursor: "pointer", fontSize: "11px", fontWeight: 600, background: STATUS_COLORS[st], color: "white" }}
                      onClick={() => handleStatusChange(st)}>{STATUS_LABELS[st]}</button>
                  ))}
                  <button style={{ padding: "5px 10px", border: "none", borderRadius: "5px", cursor: "pointer", fontSize: "11px", fontWeight: 600, background: "#ef4444", color: "white" }}
                    onClick={() => handleStatusChange("CANCELLED")}>Cancel</button>
                </>
              )}
              <button style={{ padding: "5px 12px", border: `1px solid ${t.border}`, borderRadius: "5px", cursor: "pointer", fontSize: "12px", background: t.surface, color: t.text }}
                onClick={onClose}>✕ Close</button>
            </div>
          </div>

          {error && <div style={ps.alertError}>{error}</div>}

          {/* Tabs */}
          <div style={{ display: "flex", gap: "6px", marginBottom: "16px" }}>
            {[["items","📋 Items"],["receive","📦 Receive Stock"],["grns","🗂 GRN History"],["payments","💳 Payments"]].map(([t, label]) => (
              <button key={t} style={tabStyle(t)} onClick={() => handleTabChange(t)}>{label}</button>
            ))}
          </div>

          {/* ITEMS TAB */}
          {tab === "items" && (
            <>
              {isLocked && (
                <div style={ps.alertInfo}>
                  This PO is {po.status === "FULLY_RECEIVED" ? "fully received" : "cancelled"} — items cannot be modified.
                </div>
              )}
              {!isLocked && (
                <div style={{ display: "flex", gap: "8px", marginBottom: "12px", alignItems: "center" }}>
                  <div style={{ flex: 1 }}>
                    <SearchDropdown placeholder="Add product..." items={products}
                      labelFn={p => `${p.name}${p.size ? ` - ${p.size}` : ""} (${p.brand?.name || ""})`}
                      value={newItemProductSearch} onChange={setNewItemProductSearch}
                      onSelect={prod => { setNewItemProduct(prod); if (prod) getCurrentPrice(prod.id).then(pr => { if (pr?.costPrice) setNewItemPrice(String(pr.costPrice)); }).catch(() => {}); }} />
                  </div>
                  <input style={{ ...s.input, width: "90px" }} type="number" placeholder="Price" value={newItemPrice} onChange={e => setNewItemPrice(e.target.value)} />
                  <input style={{ ...s.input, width: "70px" }} type="number" placeholder="Qty" min="1" value={newItemQty} onChange={e => setNewItemQty(e.target.value)} />
                  <button style={s.btnSmGreen} onClick={handleAddItem}>+ Add</button>
                </div>
              )}
              <table style={s.table}>
                <thead><tr style={s.thead}>
                  <th style={s.th}>Product</th><th style={s.th}>GST%</th><th style={s.th}>Cost Price</th>
                  <th style={s.th}>Qty</th><th style={s.th}>Received</th><th style={s.th}>Line Total</th><th style={s.th}>Tax</th><th style={s.th}></th>
                </tr></thead>
                <tbody>
                  {items.map(item => {
                    const isEditing = editingItemId === item.id;
                    const price = isEditing ? (parseFloat(editItemPrice) || 0) : (item.price || 0);
                    const qty = isEditing ? (parseInt(editItemQty) || 0) : (item.quantity || 0);
                    const gst = item.product?.gst || 0;
                    const recv = item.receivedQuantity || 0;
                    return (
                      <tr key={item.id} style={s.tr}>
                        <td style={s.td}>{item.product?.name}{item.product?.size ? ` - ${item.product.size}` : ""}</td>
                        <td style={s.td}>{gst}%</td>
                        <td style={s.td}>
                          <input style={{ ...s.input, width: "90px", background: isEditing ? t.inputBg : t.surfaceAlt }} type="number"
                            value={isEditing ? editItemPrice : item.price}
                            onFocus={() => { if (!isEditing && !isLocked) { setEditingItemId(item.id); setEditItemPrice(String(item.price)); setEditItemQty(String(item.quantity)); } }}
                            onChange={e => { if (isEditing) setEditItemPrice(e.target.value); }}
                            readOnly={isLocked} />
                        </td>
                        <td style={s.td}>
                          <input style={{ ...s.input, width: "65px", background: isEditing ? t.inputBg : t.surfaceAlt }} type="number"
                            value={isEditing ? editItemQty : item.quantity}
                            onFocus={() => { if (!isEditing && !isLocked) { setEditingItemId(item.id); setEditItemPrice(String(item.price)); setEditItemQty(String(item.quantity)); } }}
                            onChange={e => { if (isEditing) setEditItemQty(e.target.value); }}
                            readOnly={isLocked} />
                        </td>
                        <td style={{ ...s.td, color: recv >= item.quantity ? "#16a34a" : recv > 0 ? "#f59e0b" : "#6b7280", fontWeight: 600 }}>
                          {recv}/{item.quantity}
                        </td>
                        <td style={s.td}>₹{(price * qty).toFixed(2)}</td>
                        <td style={s.td}>₹{(price * qty * gst / 100).toFixed(2)}</td>
                        <td style={s.td}>
                          {isEditing && <button style={{ ...s.btnSmGreen, marginRight: "4px" }} onClick={() => handleUpdateItem(item.id)}>Save</button>}
                          {!isLocked && <button style={s.btnSmRed} onClick={() => handleRemoveItem(item.id)}>✕</button>}
                        </td>
                      </tr>
                    );
                  })}
                  {items.length === 0 && <tr><td colSpan={8} style={{ ...s.td, textAlign: "center", color: "#9ca3af" }}>No items</td></tr>}
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

          {/* RECEIVE STOCK TAB */}
          {tab === "receive" && (
            <>
              <div style={{ display: "flex", gap: "16px", marginBottom: "14px" }}>
                <div style={{ flex: "1 1 200px" }}>
                  <label style={s.label}>Supplier Invoice No. (optional)</label>
                  <input style={s.input} placeholder="e.g. INV-001" value={receiveInvoice} onChange={e => setReceiveInvoice(e.target.value)} />
                </div>
                <div style={{ flex: "1 1 160px" }}>
                  <label style={s.label}>Receipt Date</label>
                  <input style={s.input} type="date" value={receiveDate} onChange={e => setReceiveDate(e.target.value)} />
                </div>
              </div>
              <table style={s.table}>
                <thead><tr style={s.thead}>
                  <th style={s.th}>Product</th><th style={s.th}>Ordered</th><th style={s.th}>Received</th>
                  <th style={s.th}>Remaining</th><th style={s.th}>Receive Now</th><th style={s.th}>Purchase Price</th><th style={s.th}>Total</th>
                </tr></thead>
                <tbody>
                  {receiveLines.map((line, idx) => {
                    const qty = parseInt(line.receiveQty) || 0;
                    const price = parseFloat(line.purchasePrice) || 0;
                    const over = qty > line.remaining;
                    return (
                      <tr key={idx} style={s.tr}>
                        <td style={s.td}>{line.productName}{line.productSize ? ` - ${line.productSize}` : ""}</td>
                        <td style={s.td}>{line.orderedQty}</td>
                        <td style={s.td}>{line.alreadyReceived}</td>
                        <td style={{ ...s.td, color: line.remaining === 0 ? t.success : t.text, fontWeight: line.remaining === 0 ? 600 : 400 }}>
                          {line.remaining === 0 ? "✓ Done" : line.remaining}
                        </td>
                        <td style={s.td}>
                          <input style={{ ...s.input, width: "75px", borderColor: over ? "#ef4444" : "#d1d5db" }}
                            type="number" min="0" max={line.remaining} value={line.receiveQty}
                            disabled={line.remaining === 0}
                            onChange={e => setReceiveLines(prev => prev.map((l, i) => i === idx ? { ...l, receiveQty: e.target.value } : l))} />
                          {over && <div style={{ fontSize: "11px", color: "#ef4444" }}>Max {line.remaining}</div>}
                        </td>
                        <td style={s.td}>
                          <input style={{ ...s.input, width: "90px" }} type="number" value={line.purchasePrice}
                            onChange={e => setReceiveLines(prev => prev.map((l, i) => i === idx ? { ...l, purchasePrice: e.target.value } : l))} />
                        </td>
                        <td style={s.td}>₹{(qty * price).toFixed(2)}</td>
                      </tr>
                    );
                  })}
                  {receiveLines.every(l => l.remaining === 0) && (
                    <tr><td colSpan={7} style={{ ...s.td, textAlign: "center", color: "#16a34a", fontWeight: 600 }}>✓ All items fully received</td></tr>
                  )}
                </tbody>
              </table>
              {receiveLines.some(l => l.remaining > 0) && (
                <div style={{ marginTop: "12px" }}>
                  <button style={s.btnGreen} onClick={handleReceiveStock} disabled={loading}>Confirm Receipt & Add to Inventory</button>
                </div>
              )}
            </>
          )}

          {/* GRN HISTORY TAB */}
          {tab === "grns" && (
            <table style={s.table}>
              <thead><tr style={s.thead}>
                <th style={s.th}>GRN ID</th><th style={s.th}>Supplier Invoice</th><th style={s.th}>Date</th><th style={s.th}>Items</th>
              </tr></thead>
              <tbody>
                {grns.length === 0 && <tr><td colSpan={4} style={{ ...s.td, textAlign: "center", color: "#9ca3af" }}>No receipts yet</td></tr>}
                {grns.map(g => (
                  <tr key={g.id} style={s.tr}>
                    <td style={{ ...s.td, fontWeight: 600 }}>GRN-{g.id}</td>
                    <td style={s.td}>{g.invoiceNumber || "-"}</td>
                    <td style={s.td}>{g.receiptDate}</td>
                    <td style={s.td}>{g.items?.length || "-"} item(s)</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* PAYMENTS TAB */}
          {tab === "payments" && (
            <>
              <div style={{ display: "flex", gap: "12px", marginBottom: "16px" }}>
                <div style={s.card}><div style={s.cardLabel}>Order Amount</div><div style={s.cardValue}>₹{orderAmt.toFixed(2)}</div></div>
                <div style={{ ...s.card, borderColor: "#16a34a" }}><div style={s.cardLabel}>Paid</div><div style={{ ...s.cardValue, color: "#16a34a" }}>₹{totalPaid.toFixed(2)}</div></div>
                <div style={{ ...s.card, borderColor: amtDue > 0 ? "#ef4444" : "#16a34a" }}>
                  <div style={s.cardLabel}>Due</div>
                  <div style={{ ...s.cardValue, color: amtDue > 0 ? "#ef4444" : "#16a34a" }}>₹{Math.max(0, amtDue).toFixed(2)}</div>
                </div>
              </div>
              {!hasGRN && (
                <div style={ps.alertInfo}>
                  ⚠️ Receive goods first (GRN) before recording payment.
                </div>
              )}
              {hasGRN && amtDue > 0 && (
                <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "8px", padding: "14px", marginBottom: "16px" }}>
                  <div style={{ fontWeight: 600, marginBottom: "10px", fontSize: "13px", color: t.text }}>Record Payment to Supplier</div>
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "flex-end" }}>
                    <div style={{ flex: "1 1 100px" }}><label style={s.label}>Amount (₹)</label><input style={s.input} type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} /></div>
                    <div style={{ flex: "1 1 130px" }}><label style={s.label}>Date</label><input style={s.input} type="date" value={payDate} onChange={e => setPayDate(e.target.value)} /></div>
                    <div style={{ flex: "1 1 120px" }}><label style={s.label}>Method</label>
                      <select style={s.input} value={payMethod} onChange={e => setPayMethod(e.target.value)}>
                        {["CASH","UPI","BANK_TRANSFER","CHEQUE","NEFT","RTGS"].map(m => <option key={m} value={m}>{m.replace("_"," ")}</option>)}
                      </select>
                    </div>
                    <div style={{ flex: "2 1 150px" }}><label style={s.label}>Notes</label><input style={s.input} placeholder="optional" value={payNotes} onChange={e => setPayNotes(e.target.value)} /></div>
                    <button style={s.btnGreen} onClick={handleRecordPayment} disabled={loading}>Pay</button>
                  </div>
                </div>
              )}
              <table style={s.table}>
                <thead><tr style={s.thead}><th style={s.th}>#</th><th style={s.th}>Date</th><th style={s.th}>Amount</th><th style={s.th}>Method</th><th style={s.th}>Notes</th></tr></thead>
                <tbody>
                  {payments.length === 0 && <tr><td colSpan={5} style={{ ...s.td, textAlign: "center", color: "#9ca3af" }}>No payments yet</td></tr>}
                  {payments.map((p, i) => (
                    <tr key={p.id} style={s.tr}>
                      <td style={s.td}>{i + 1}</td><td style={s.td}>{p.paymentDate}</td>
                      <td style={{ ...s.td, color: "#16a34a", fontWeight: 600 }}>₹{parseFloat(p.amount).toFixed(2)}</td>
                      <td style={s.td}>{p.paymentMethod?.replace("_", " ")}</td>
                      <td style={s.td}>{p.notes || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}

function PurchaseOrderPage() {
  const [orders, setOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const ps = usePageStyles();
  const { t } = ps;

  // Theme-aware styles used throughout this component
  const s = {
    header: ps.pageHeader,
    error: ps.alertError,
    info: ps.alertInfo,
    formBox: ps.formBox,
    label: ps.label,
    input: ps.input,
    table: ps.table,
    thead: ps.thead,
    th: ps.th,
    tr: ps.tr,
    td: ps.td,
    btn: ps.btnPrimary,
    btnGreen: ps.btnSuccess,
    btnGray: ps.btnGhost,
    btnSmRed: ps.btnSmDanger,
    btnSmGreen: ps.btnSmSuccess,
    badge: ps.badge,
    totalRow: ps.totalRow,
    card: ps.card,
    cardLabel: ps.cardLabel,
    cardValue: ps.cardValue,
  };

  const [showCreate, setShowCreate] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [supplierSearch, setSupplierSearch] = useState("");
  const [lines, setLines] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [productSearch, setProductSearch] = useState("");

  const filtered = orders.filter(o =>
    o.poNumber?.toLowerCase().includes(search.toLowerCase()) ||
    o.supplier?.name?.toLowerCase().includes(search.toLowerCase())
  );

  const load = async () => {
    setLoading(true);
    try {
      const [o, sup, p] = await Promise.all([getPurchaseOrders(), getSuppliers(), getProducts()]);
      setOrders([...o].sort((a, b) => b.id - a.id)); setSuppliers(sup); setProducts(p); setError("");
    } catch { setError("Failed to load data"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleAddLine = async () => {
    if (!selectedProduct) { setError("Select a product first"); return; }
    if (lines.find(l => l.productId === selectedProduct.id)) { setError("Product already added"); return; }
    let costPrice = "";
    try { const pd = await getCurrentPrice(selectedProduct.id); if (pd?.costPrice) costPrice = pd.costPrice; } catch {}
    setLines(prev => [...prev, {
      productId: selectedProduct.id, productName: selectedProduct.name,
      size: selectedProduct.size, unit: selectedProduct.unit,
      gst: selectedProduct.gst || 0, costPrice, qty: 1
    }]);
    setSelectedProduct(null); setProductSearch(""); setError("");
  };

  const updateLine = (idx, field, value) => setLines(prev => prev.map((l, i) => i === idx ? { ...l, [field]: value } : l));
  const removeLine = (idx) => setLines(prev => prev.filter((_, i) => i !== idx));

  const subTotal = lines.reduce((s, l) => s + (parseFloat(l.costPrice) || 0) * (parseInt(l.qty) || 0), 0);
  const totalTax = lines.reduce((s, l) => {
    const base = (parseFloat(l.costPrice) || 0) * (parseInt(l.qty) || 0);
    return s + base * ((parseFloat(l.gst) || 0) / 100);
  }, 0);

  const handleCreatePO = async () => {
    if (!selectedSupplier) { setError("Please select a supplier"); return; }
    if (lines.length === 0) { setError("Add at least one product"); return; }
    for (const l of lines) {
      if (!l.costPrice || parseFloat(l.costPrice) <= 0) { setError(`Enter cost price for ${l.productName}`); return; }
    }
    try {
      setLoading(true); setError("");
      await createPurchaseOrder({
        supplier: { id: selectedSupplier.id },
        items: lines.map(l => ({ product: { id: l.productId }, quantity: parseInt(l.qty), price: parseFloat(l.costPrice) }))
      });
      setShowCreate(false); setSelectedSupplier(null); setSupplierSearch(""); setLines([]);
      load();
    } catch { setError("Failed to create purchase order"); }
    finally { setLoading(false); }
  };

  const toggleExpand = (id) => setExpandedId(prev => prev === id ? null : id);

  return (
    <MainLayout>
      <div style={s.header}>
        <h2 style={{ margin: 0 }}>Purchase Orders</h2>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <input style={{ ...s.input, width: "220px" }} placeholder="Search PO#, supplier..."
            value={search} onChange={e => setSearch(e.target.value)} />
          <button style={s.btnGreen} onClick={() => { setShowCreate(true); setSelectedSupplier(null); setSupplierSearch(""); setLines([]); setError(""); }}>
            + New PO
          </button>
        </div>
      </div>

      {error && <div style={s.error}>{error}</div>}
      {loading && <div style={s.info}>Loading...</div>}

      {showCreate && (
        <div style={s.formBox}>
          <h3 style={{ margin: "0 0 16px" }}>Create Purchase Order</h3>
          <div style={{ marginBottom: "16px", maxWidth: "360px" }}>
            <label style={s.label}>Supplier *</label>
            <SearchDropdown placeholder="Type to search supplier..." items={suppliers}
              labelFn={sup => sup.name} value={supplierSearch} onChange={setSupplierSearch} onSelect={setSelectedSupplier} />
            {selectedSupplier && <div style={{ marginTop: "6px", fontSize: "13px", color: "#16a34a" }}>✓ {selectedSupplier.name}</div>}
          </div>
          <div style={{ marginBottom: "12px" }}>
            <label style={{ ...s.label, display: "block", marginBottom: "8px" }}>Add Product</label>
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <div style={{ flex: 1 }}>
                <SearchDropdown placeholder="Type product name, brand..."
                  items={products} labelFn={p => `${p.name}${p.size ? ` - ${p.size}` : ""} (${p.brand?.name || ""})`}
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
                <th style={s.th}>Cost Price (₹)*</th><th style={s.th}>Qty*</th>
                <th style={s.th}>Line Total</th><th style={s.th}>Tax</th><th style={s.th}></th>
              </tr></thead>
              <tbody>
                {lines.map((line, idx) => {
                  const price = parseFloat(line.costPrice) || 0, qty = parseInt(line.qty) || 0;
                  return (
                    <tr key={idx} style={s.tr}>
                      <td style={s.td}>{line.productName}{line.size ? ` - ${line.size}` : ""}</td>
                      <td style={s.td}>{line.gst}%</td>
                      <td style={s.td}><input style={{ ...s.input, width: "100px" }} type="number" value={line.costPrice} onChange={e => updateLine(idx, "costPrice", e.target.value)} /></td>
                      <td style={s.td}><input style={{ ...s.input, width: "70px" }} type="number" min="1" value={line.qty} onChange={e => updateLine(idx, "qty", e.target.value)} /></td>
                      <td style={s.td}>₹{(price * qty).toFixed(2)}</td>
                      <td style={s.td}>₹{(price * qty * line.gst / 100).toFixed(2)}</td>
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
            <button style={s.btnGreen} onClick={handleCreatePO} disabled={loading}>Confirm & Generate PO</button>
            <button style={s.btnGray} onClick={() => { setShowCreate(false); setLines([]); }}>Cancel</button>
          </div>
        </div>
      )}

      <table style={s.table}>
        <thead>
          <tr style={s.thead}>
            <th style={s.th}></th>
            <th style={s.th}>PO Number</th><th style={s.th}>Date</th><th style={s.th}>Supplier</th>
            <th style={s.th}>Order Amt</th><th style={s.th}>Amt Paid</th><th style={s.th}>Amt Due</th>
            <th style={s.th}>Status</th><th style={s.th}>Payment</th>
          </tr>
        </thead>
        <tbody>
          {filtered.length === 0 && !loading && (
            <tr><td colSpan={9} style={{ ...s.td, textAlign: "center", color: "#9ca3af" }}>No purchase orders found</td></tr>
          )}
          {filtered.map(o => {
            const orderAmt = parseFloat(o.totalAmount) || 0;
            const amtPaid = parseFloat(o.amountPaid) || 0;
            const amtDue = orderAmt - amtPaid;
            const isExpanded = expandedId === o.id;
            const payStatus = amtPaid === 0 ? "Unpaid" : amtDue <= 0 ? "Paid" : "Partial";
            const PAY_COLORS = { Unpaid: "#6b7280", Partial: "#f59e0b", Paid: "#16a34a" };
            return (
              <Fragment key={o.id}>
                <tr
                  style={{ ...s.tr, cursor: "pointer", background: isExpanded ? t.surfaceAlt : t.surface, borderLeft: isExpanded ? `3px solid ${t.primary}` : "3px solid transparent" }}
                  onClick={() => toggleExpand(o.id)}>
                  <td style={{ ...s.td, width: "32px", textAlign: "center", color: t.textMuted, fontSize: "12px" }}>
                    {isExpanded ? "▲" : "▼"}
                  </td>
                  <td style={{ ...s.td, fontWeight: 600, color: t.text }}>{o.poNumber}</td>
                  <td style={s.td}>{o.orderDate}</td>
                  <td style={s.td}>{o.supplier?.name || "-"}</td>
                  <td style={s.td}>₹{orderAmt.toFixed(2)}</td>
                  <td style={{ ...s.td, color: amtPaid > 0 ? t.success : t.text }}>₹{amtPaid.toFixed(2)}</td>
                  <td style={{ ...s.td, color: amtDue > 0 ? t.danger : t.success, fontWeight: 600 }}>₹{Math.max(0, amtDue).toFixed(2)}</td>
                  <td style={s.td}>
                    <span style={{ ...s.badge, background: STATUS_COLORS[o.status] || "#6b7280" }}>
                      {STATUS_LABELS[o.status] || o.status}
                    </span>
                  </td>
                  <td style={s.td}>
                    <span style={{ ...s.badge, background: PAY_COLORS[payStatus] }}>{payStatus}</span>
                  </td>
                </tr>
                {isExpanded && (
                  <ExpandedPORow
                    po={o}
                    products={products}
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

export default PurchaseOrderPage;
