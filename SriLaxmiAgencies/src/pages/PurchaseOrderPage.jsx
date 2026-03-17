import { useEffect, useState, useRef, Fragment } from "react";
import MainLayout from "../layout/MainLayout";
import {
  getPurchaseOrders, createPurchaseOrder, getPurchaseOrderItems,
  addPurchaseOrderItem, updatePurchaseOrderItem, removePurchaseOrderItem,
  updatePurchaseOrderStatus, receiveStockForPO, getGRNsForPO,
  recordSupplierPayment, getPaymentSummary
} from "../services/purchaseService";
import { getSuppliers } from "../services/supplierService";
import { getProducts } from "../services/productService";
import { usePageStyles } from "../hooks/usePageStyles";
import { getCurrentPrice } from "../services/priceService";
import { useTheme } from "../context/ThemeContext";
import { getTheme } from "../theme";

const STATUS_COLORS = {
  DRAFT: "#6b7280", APPROVED: "#2563eb",
  PARTIALLY_RECEIVED: "#f59e0b", FULLY_RECEIVED: "#16a34a", CANCELLED: "#ef4444"
};
const STATUS_LABELS = {
  DRAFT: "Draft", APPROVED: "Approved",
  PARTIALLY_RECEIVED: "Partial", FULLY_RECEIVED: "Fully Received", CANCELLED: "Cancelled"
};
const GRN_STATUS_LABELS = {
  DRAFT: "Not Yet Received", APPROVED: "Not Yet Received",
  PARTIALLY_RECEIVED: "Partially Received", FULLY_RECEIVED: "Fully Received", CANCELLED: "-"
};
const GRN_STATUS_COLORS = {
  DRAFT: "#6b7280", APPROVED: "#6b7280",
  PARTIALLY_RECEIVED: "#f59e0b", FULLY_RECEIVED: "#16a34a", CANCELLED: "#9ca3af"
};

// ── Shared back-button header ─────────────────────────────────────────────────
function PageHeader({ title, subtitle, onBack, t }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
      <button onClick={onBack} style={{ padding: "7px 14px", border: `1px solid ${t.border}`, borderRadius: "6px", background: t.surface, color: t.text, cursor: "pointer", fontSize: "13px" }}>
        ← Back
      </button>
      <div>
        <h2 style={{ margin: 0, fontSize: "18px", color: t.text }}>{title}</h2>
        {subtitle && <div style={{ fontSize: "12px", color: t.textSub, marginTop: "2px" }}>{subtitle}</div>}
      </div>
    </div>
  );
}

// ── Search dropdown ───────────────────────────────────────────────────────────
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
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <input style={{ width: "100%", padding: "8px 10px", border: `1px solid ${t.inputBorder}`, borderRadius: "6px", fontSize: "14px", boxSizing: "border-box", background: t.inputBg, color: t.text }}
        placeholder={placeholder} value={value}
        onChange={e => { onChange(e.target.value); onSelect(null); setOpen(true); }}
        onFocus={() => setOpen(true)} />
      {open && filtered.length > 0 && (
        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: t.surface, border: `1px solid ${t.border}`, borderRadius: "6px", zIndex: 100, maxHeight: "200px", overflowY: "auto", boxShadow: t.shadowMd }}>
          {filtered.map(item => (
            <div key={item.id} style={{ padding: "8px 12px", cursor: "pointer", fontSize: "14px", color: t.text, borderBottom: `1px solid ${t.border}` }}
              onMouseDown={() => { onSelect(item); onChange(labelFn(item)); setOpen(false); }}>
              {labelFn(item)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── New PO Page ───────────────────────────────────────────────────────────────
function NewPOPage({ suppliers, products, onBack, onCreated }) {
  const ps = usePageStyles();
  const { dark } = useTheme();
  const t = getTheme(dark);
  const s = { label: ps.label, input: ps.input, table: ps.table, thead: ps.thead, th: ps.th, tr: ps.tr, td: ps.td, totalRow: ps.totalRow };

  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [supplierSearch, setSupplierSearch] = useState("");
  const [lines, setLines] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [productSearch, setProductSearch] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const subTotal = lines.reduce((acc, l) => acc + (parseFloat(l.costPrice) || 0) * (parseInt(l.qty) || 0), 0);
  const totalTax = lines.reduce((acc, l) => acc + (parseFloat(l.costPrice) || 0) * (parseInt(l.qty) || 0) * ((parseFloat(l.gst) || 0) / 100), 0);

  const handleAddLine = async () => {
    if (!selectedProduct) { setError("Select a product first"); return; }
    if (lines.find(l => l.productId === selectedProduct.id)) { setError("Product already added"); return; }
    let costPrice = "";
    try { const pd = await getCurrentPrice(selectedProduct.id); if (pd?.costPrice) costPrice = String(pd.costPrice); } catch {}
    setLines(prev => [...prev, { productId: selectedProduct.id, productName: selectedProduct.name, hsnCode: selectedProduct.hsnCode || "-", size: selectedProduct.size, gst: selectedProduct.gst || 0, costPrice, qty: 1 }]);
    setSelectedProduct(null); setProductSearch(""); setError("");
  };

  const updateLine = (idx, field, value) => setLines(prev => prev.map((l, i) => i === idx ? { ...l, [field]: value } : l));
  const removeLine = (idx) => setLines(prev => prev.filter((_, i) => i !== idx));

  const handleCreate = async () => {
    if (!selectedSupplier) { setError("Please select a supplier"); return; }
    if (lines.length === 0) { setError("Add at least one product"); return; }
    for (const l of lines) {
      if (!l.costPrice || parseFloat(l.costPrice) <= 0) { setError(`Enter cost price for ${l.productName}`); return; }
    }
    try {
      setLoading(true); setError("");
      await createPurchaseOrder({ supplier: { id: selectedSupplier.id }, items: lines.map(l => ({ product: { id: l.productId }, quantity: parseInt(l.qty), price: parseFloat(l.costPrice) })) });
      onCreated();
    } catch (e) { setError(e.response?.data?.message || "Failed to create purchase order"); }
    finally { setLoading(false); }
  };

  return (
    <div>
      <PageHeader title="New Purchase Order" onBack={onBack} t={t} />
      {error && <div style={ps.alertError}>{error}</div>}

      <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "8px", padding: "16px", marginBottom: "16px" }}>
        <label style={{ ...s.label, fontWeight: 700, fontSize: "14px" }}>Supplier *</label>
        <div style={{ maxWidth: "400px", marginTop: "6px" }}>
          <SearchDropdown placeholder="Type to search supplier..." items={suppliers} labelFn={sup => sup.name} value={supplierSearch} onChange={setSupplierSearch} onSelect={setSelectedSupplier} />
        </div>
        {selectedSupplier && (
          <div style={{ marginTop: "12px", display: "flex", gap: "24px", fontSize: "13px", color: t.textSub }}>
            <span>✓ <strong style={{ color: t.text }}>{selectedSupplier.name}</strong></span>
            {selectedSupplier.phone && <span>📞 {selectedSupplier.phone}</span>}
            {selectedSupplier.gstNumber && <span>GST: {selectedSupplier.gstNumber}</span>}
            {selectedSupplier.address && <span>📍 {selectedSupplier.address}</span>}
          </div>
        )}
      </div>

      <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "8px", padding: "16px", marginBottom: "16px" }}>
        <label style={{ ...s.label, fontWeight: 700, fontSize: "14px", display: "block", marginBottom: "8px" }}>Add Products</label>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <div style={{ flex: 1 }}>
            <SearchDropdown placeholder="Search product by name or brand..." items={products} labelFn={p => `${p.name}${p.size ? ` - ${p.size}` : ""} (${p.brand?.name || ""})`} value={productSearch} onChange={setProductSearch} onSelect={setSelectedProduct} />
            {selectedProduct && <div style={{ marginTop: "4px", fontSize: "12px", color: "#2563eb" }}>✓ {selectedProduct.name} | GST: {selectedProduct.gst || 0}%</div>}
          </div>
          <button style={ps.btnPrimary} onClick={handleAddLine}>+ Add</button>
        </div>
      </div>

      {lines.length > 0 && (
        <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "8px", padding: "16px", marginBottom: "16px" }}>
          <table style={s.table}>
            <thead><tr style={s.thead}>
              <th style={s.th}>Product Code</th><th style={s.th}>Product Name</th>
              <th style={s.th}>CP (Rs.) *</th><th style={s.th}>GST %</th>
              <th style={s.th}>Tax (Rs.)</th><th style={s.th}>Qty *</th>
              <th style={s.th}>Total Value (Rs.)</th><th style={s.th}></th>
            </tr></thead>
            <tbody>
              {lines.map((line, idx) => {
                const price = parseFloat(line.costPrice) || 0, qty = parseInt(line.qty) || 0;
                const tax = price * qty * (line.gst / 100);
                return (
                  <tr key={idx} style={s.tr}>
                    <td style={{ ...s.td, color: t.textSub, fontSize: "12px" }}>{line.hsnCode}</td>
                    <td style={s.td}>{line.productName}{line.size ? ` - ${line.size}` : ""}</td>
                    <td style={s.td}><input style={{ ...s.input, width: "100px" }} type="number" min="0" value={line.costPrice} onChange={e => updateLine(idx, "costPrice", e.target.value)} /></td>
                    <td style={s.td}>{line.gst}%</td>
                    <td style={s.td}>Rs.{tax.toFixed(2)}</td>
                    <td style={s.td}><input style={{ ...s.input, width: "70px" }} type="number" min="1" value={line.qty} onChange={e => updateLine(idx, "qty", e.target.value)} /></td>
                    <td style={{ ...s.td, fontWeight: 600 }}>Rs.{(price * qty + tax).toFixed(2)}</td>
                    <td style={s.td}><button style={ps.btnSmDanger} onClick={() => removeLine(idx)}>✕</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "12px" }}>
            <div style={{ background: t.surfaceAlt, border: `1px solid ${t.border}`, borderRadius: "8px", padding: "12px 20px", minWidth: "260px" }}>
              <div style={s.totalRow}><span>Sub Total</span><span>Rs.{subTotal.toFixed(2)}</span></div>
              <div style={s.totalRow}><span>Total GST</span><span>Rs.{totalTax.toFixed(2)}</span></div>
              <div style={{ ...s.totalRow, fontWeight: 700, fontSize: "16px", borderTop: `1px solid ${t.border}`, paddingTop: "8px", marginTop: "4px" }}>
                <span>Grand Total</span><span>Rs.{(subTotal + totalTax).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: "10px" }}>
        <button style={ps.btnSuccess} onClick={handleCreate} disabled={loading}>{loading ? "Creating..." : "Generate PO"}</button>
        <button style={ps.btnGhost} onClick={onBack}>Cancel</button>
      </div>
    </div>
  );
}

// ── Edit PO Page (DRAFT only) ─────────────────────────────────────────────────
function EditPOPage({ po, suppliers, products, onBack, onSaved }) {
  const ps = usePageStyles();
  const { dark } = useTheme();
  const t = getTheme(dark);
  const s = { label: ps.label, input: ps.input, table: ps.table, thead: ps.thead, th: ps.th, tr: ps.tr, td: ps.td, totalRow: ps.totalRow };

  const [items, setItems] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [productSearch, setProductSearch] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newQty, setNewQty] = useState(1);
  const [editingId, setEditingId] = useState(null);
  const [editPrice, setEditPrice] = useState("");
  const [editQty, setEditQty] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => { loadItems(); }, []);

  const loadItems = async () => {
    try { setItems(await getPurchaseOrderItems(po.id)); } catch { setError("Failed to load items"); }
  };

  const subTotal = items.reduce((acc, i) => acc + (parseFloat(i.price) || 0) * (i.quantity || 0), 0);
  const totalTax = items.reduce((acc, i) => acc + (parseFloat(i.price) || 0) * (i.quantity || 0) * ((i.product?.gst || 0) / 100), 0);

  const handleAdd = async () => {
    if (!selectedProduct || !newPrice || !newQty) { setError("Fill all fields"); return; }
    try {
      setLoading(true);
      await addPurchaseOrderItem(po.id, { product: { id: selectedProduct.id }, price: parseFloat(newPrice), quantity: parseInt(newQty) });
      setSelectedProduct(null); setProductSearch(""); setNewPrice(""); setNewQty(1);
      loadItems(); onSaved();
    } catch (e) { setError(e.response?.data?.message || "Failed to add item"); }
    finally { setLoading(false); }
  };

  const handleUpdate = async (itemId) => {
    try {
      setLoading(true);
      await updatePurchaseOrderItem(po.id, itemId, { price: parseFloat(editPrice), quantity: parseInt(editQty) });
      setEditingId(null); loadItems(); onSaved();
    } catch (e) { setError(e.response?.data?.message || "Failed to update item"); }
    finally { setLoading(false); }
  };

  const handleRemove = async (itemId) => {
    if (!window.confirm("Remove this item?")) return;
    try { await removePurchaseOrderItem(po.id, itemId); loadItems(); onSaved(); }
    catch (e) { setError(e.response?.data?.message || "Failed to remove item"); }
  };

  return (
    <div>
      <PageHeader title={`Edit PO — ${po.poNumber}`} subtitle={`Supplier: ${po.supplier?.name} · ${po.orderDate}`} onBack={onBack} t={t} />
      {error && <div style={ps.alertError}>{error}</div>}

      {/* Add product row */}
      <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "8px", padding: "16px", marginBottom: "16px" }}>
        <label style={{ ...s.label, fontWeight: 700, fontSize: "14px", display: "block", marginBottom: "8px" }}>Add Product</label>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <div style={{ flex: 1 }}>
            <SearchDropdown placeholder="Search product..." items={products} labelFn={p => `${p.name}${p.size ? ` - ${p.size}` : ""} (${p.brand?.name || ""})`} value={productSearch} onChange={setProductSearch} onSelect={prod => { setSelectedProduct(prod); if (prod) getCurrentPrice(prod.id).then(pr => { if (pr?.costPrice) setNewPrice(String(pr.costPrice)); }).catch(() => {}); }} />
          </div>
          <input style={{ ...s.input, width: "100px" }} type="number" placeholder="Price" value={newPrice} onChange={e => setNewPrice(e.target.value)} />
          <input style={{ ...s.input, width: "70px" }} type="number" placeholder="Qty" min="1" value={newQty} onChange={e => setNewQty(e.target.value)} />
          <button style={ps.btnPrimary} onClick={handleAdd} disabled={loading}>+ Add</button>
        </div>
      </div>

      {/* Items table */}
      <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "8px", padding: "16px", marginBottom: "16px" }}>
        <table style={s.table}>
          <thead><tr style={s.thead}>
            <th style={s.th}>Product Code</th><th style={s.th}>Product Name</th>
            <th style={s.th}>CP (Rs.)</th><th style={s.th}>GST %</th>
            <th style={s.th}>Tax (Rs.)</th><th style={s.th}>Qty</th>
            <th style={s.th}>Total Value (Rs.)</th><th style={s.th}></th>
          </tr></thead>
          <tbody>
            {items.length === 0 && <tr><td colSpan={8} style={{ ...s.td, textAlign: "center", color: "#9ca3af" }}>No items yet</td></tr>}
            {items.map(item => {
              const isEditing = editingId === item.id;
              const price = isEditing ? (parseFloat(editPrice) || 0) : (parseFloat(item.price) || 0);
              const qty = isEditing ? (parseInt(editQty) || 0) : (item.quantity || 0);
              const gst = item.product?.gst || 0;
              const tax = price * qty * gst / 100;
              return (
                <tr key={item.id} style={s.tr}>
                  <td style={{ ...s.td, color: t.textSub, fontSize: "12px" }}>{item.product?.hsnCode || "-"}</td>
                  <td style={s.td}>{item.product?.name}{item.product?.size ? ` - ${item.product.size}` : ""}</td>
                  <td style={s.td}>
                    <input style={{ ...s.input, width: "100px", background: isEditing ? t.inputBg : t.surfaceAlt }} type="number"
                      value={isEditing ? editPrice : item.price}
                      onFocus={() => { if (!isEditing) { setEditingId(item.id); setEditPrice(String(item.price)); setEditQty(String(item.quantity)); } }}
                      onChange={e => { if (isEditing) setEditPrice(e.target.value); }} />
                  </td>
                  <td style={s.td}>{gst}%</td>
                  <td style={s.td}>Rs.{tax.toFixed(2)}</td>
                  <td style={s.td}>
                    <input style={{ ...s.input, width: "70px", background: isEditing ? t.inputBg : t.surfaceAlt }} type="number"
                      value={isEditing ? editQty : item.quantity}
                      onFocus={() => { if (!isEditing) { setEditingId(item.id); setEditPrice(String(item.price)); setEditQty(String(item.quantity)); } }}
                      onChange={e => { if (isEditing) setEditQty(e.target.value); }} />
                  </td>
                  <td style={{ ...s.td, fontWeight: 600 }}>Rs.{(price * qty + tax).toFixed(2)}</td>
                  <td style={s.td}>
                    {isEditing && <button style={{ ...ps.btnSmSuccess, marginRight: "4px" }} onClick={() => handleUpdate(item.id)}>Save</button>}
                    <button style={ps.btnSmDanger} onClick={() => handleRemove(item.id)}>✕</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "12px" }}>
          <div style={{ background: t.surfaceAlt, border: `1px solid ${t.border}`, borderRadius: "8px", padding: "12px 20px", minWidth: "260px" }}>
            <div style={s.totalRow}><span>Sub Total</span><span>Rs.{subTotal.toFixed(2)}</span></div>
            <div style={s.totalRow}><span>Total GST</span><span>Rs.{totalTax.toFixed(2)}</span></div>
            <div style={{ ...s.totalRow, fontWeight: 700, fontSize: "16px", borderTop: `1px solid ${t.border}`, paddingTop: "8px", marginTop: "4px" }}>
              <span>Grand Total</span><span>Rs.{(subTotal + totalTax).toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      <button style={ps.btnGhost} onClick={onBack}>← Back to List</button>
    </div>
  );
}

// ── GRN Full Page ─────────────────────────────────────────────────────────────
function GRNPage({ po, products, onBack, onDone }) {
  const ps = usePageStyles();
  const { dark } = useTheme();
  const t = getTheme(dark);
  const s = { label: ps.label, input: ps.input, table: ps.table, thead: ps.thead, th: ps.th, tr: ps.tr, td: ps.td };

  const [poItems, setPoItems] = useState([]);
  const [grnHistory, setGrnHistory] = useState([]);
  const [lines, setLines] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [items, grns] = await Promise.all([getPurchaseOrderItems(po.id), getGRNsForPO(po.id)]);
      setPoItems(items);
      setGrnHistory(grns);
      setLines(items.map(i => ({
        poItemId: i.id,
        productId: i.product?.id,
        productName: i.product?.name,
        purchasePrice: parseFloat(i.price) || 0,
        orderedQty: i.quantity,
        alreadyReceived: i.receivedQuantity || 0,
        receivedQty: String(i.quantity - (i.receivedQuantity || 0))  // pre-fill with remaining qty
      })));
    } catch { setError("Failed to load PO data"); }
  };

  const updateQty = (idx, val) => setLines(prev => prev.map((l, i) => i === idx ? { ...l, receivedQty: val } : l));

  const handleReceive = async () => {
    const toReceive = lines.filter(l => parseInt(l.receivedQty) > 0);
    if (toReceive.length === 0) { setError("Enter at least one received quantity"); return; }
    // Validate against remaining qty
    for (const l of toReceive) {
      const remaining = l.orderedQty - l.alreadyReceived;
      if (parseInt(l.receivedQty) > remaining) {
        setError(`${l.productName}: max receivable is ${remaining}`); return;
      }
    }
    try {
      setLoading(true); setError("");
      await receiveStockForPO(po.id, {
        items: toReceive.map(l => ({
          product: { id: l.productId },
          purchaseOrderItem: { id: l.poItemId },
          purchasePrice: l.purchasePrice,
          quantity: parseInt(l.receivedQty)
        }))
      });
      onDone();
    } catch (e) { setError(e.response?.data?.message || "Failed to record GRN"); }
    finally { setLoading(false); }
  };

  return (
    <div>
      <PageHeader title={`Goods Receipt — ${po.poNumber}`} subtitle={`Supplier: ${po.supplier?.name} · ${po.orderDate}`} onBack={onBack} t={t} />
      {error && <div style={ps.alertError}>{error}</div>}

      <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "8px", padding: "16px", marginBottom: "16px" }}>
        <div style={{ fontWeight: 700, fontSize: "14px", color: t.text, marginBottom: "12px" }}>Receive Goods</div>
        <table style={s.table}>
          <thead><tr style={s.thead}>
            <th style={s.th}>Product</th>
            <th style={s.th}>Ordered Qty</th>
            <th style={s.th}>Receive Now</th>
          </tr></thead>
          <tbody>
            {lines.map((line, idx) => (
              <tr key={idx} style={s.tr}>
                <td style={s.td}>{line.productName}</td>
                <td style={s.td}>{line.orderedQty}</td>
                <td style={s.td}>
                  <input style={{ ...s.input, width: "80px" }} type="number" min="0" max={line.orderedQty}
                    placeholder="0" value={line.receivedQty} onChange={e => updateQty(idx, e.target.value)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ marginTop: "12px" }}>
          <button style={ps.btnSuccess} onClick={handleReceive} disabled={loading}>{loading ? "Saving..." : "Record GRN"}</button>
        </div>
      </div>

      {grnHistory.length > 0 && (
        <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "8px", padding: "16px" }}>
          <div style={{ fontWeight: 700, fontSize: "14px", color: t.text, marginBottom: "12px" }}>GRN History</div>
          <table style={s.table}>
            <thead><tr style={s.thead}>
              <th style={s.th}>Date</th>
              <th style={s.th}>Product</th>
              <th style={s.th}>Qty Received</th>
            </tr></thead>
            <tbody>
              {grnHistory.flatMap(grn =>
                (grn.items || []).map((item, i) => (
                  <tr key={`${grn.id}-${i}`} style={s.tr}>
                    <td style={{ ...s.td, color: t.textSub, fontSize: "12px" }}>{grn.receivedDate || grn.createdAt || "-"}</td>
                    <td style={s.td}>{item.product?.name || "-"}</td>
                    <td style={s.td}>{item.quantity}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Pay Full Page ─────────────────────────────────────────────────────────────
function PayPage({ po, onBack, onDone }) {
  const ps = usePageStyles();
  const { dark } = useTheme();
  const t = getTheme(dark);
  const s = { label: ps.label, input: ps.input, table: ps.table, thead: ps.thead, th: ps.th, tr: ps.tr, td: ps.td, totalRow: ps.totalRow };

  const [summary, setSummary] = useState(null);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("CASH");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => { loadSummary(); }, []);

  const loadSummary = async () => {
    try { setSummary(await getPaymentSummary(po.id)); } catch { setError("Failed to load payment summary"); }
  };

  const handlePay = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { setError("Enter a valid amount"); return; }
    if (summary && amt > summary.balanceDue) { setError(`Amount exceeds balance due (Rs.${summary.balanceDue?.toFixed(2)})`); return; }
    try {
      setLoading(true); setError("");
      await recordSupplierPayment(po.id, { amount: amt, paymentMethod: method, notes: note });
      setAmount(""); setNote("");
      await loadSummary();
      onDone();
    } catch (e) { setError(e.response?.data?.message || "Payment failed"); }
    finally { setLoading(false); }
  };

  return (
    <div>
      <PageHeader title={`Supplier Payment — ${po.poNumber}`} subtitle={`Supplier: ${po.supplier?.name}`} onBack={onBack} t={t} />
      {error && <div style={ps.alertError}>{error}</div>}

      {summary && (
        <>
          <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "8px", padding: "16px", marginBottom: "16px" }}>
            <div style={{ fontWeight: 700, fontSize: "14px", color: t.text, marginBottom: "12px" }}>Payment Summary</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "12px" }}>
              {[
                { label: "PO Total", value: summary.poTotal },
                { label: "Received Value", value: summary.receivedValue },
                { label: "Total Paid", value: summary.totalPaid },
                { label: "Balance Due", value: summary.balanceDue, highlight: true },
              ].map(card => (
                <div key={card.label} style={{ background: card.highlight ? "#eff6ff" : t.surfaceAlt, border: `1px solid ${card.highlight ? "#bfdbfe" : t.border}`, borderRadius: "8px", padding: "12px" }}>
                  <div style={{ fontSize: "11px", color: t.textSub, marginBottom: "4px" }}>{card.label}</div>
                  <div style={{ fontSize: "18px", fontWeight: 700, color: card.highlight ? "#2563eb" : t.text }}>Rs.{(card.value || 0).toFixed(2)}</div>
                </div>
              ))}
            </div>
          </div>

          {/* GRN History */}
          {summary.grnHistory?.length > 0 && (
            <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "8px", padding: "16px", marginBottom: "16px" }}>
              <div style={{ fontWeight: 700, fontSize: "14px", color: t.text, marginBottom: "12px" }}>GRN History</div>
              <table style={s.table}>
                <thead><tr style={s.thead}>
                  <th style={s.th}>Date</th><th style={s.th}>Product</th><th style={s.th}>Qty</th><th style={s.th}>Unit Price</th><th style={s.th}>Value</th>
                </tr></thead>
                <tbody>
                  {summary.grnHistory.flatMap((grn, gi) =>
                    (grn.items || []).map((item, ii) => (
                      <tr key={`${gi}-${ii}`} style={s.tr}>
                        <td style={{ ...s.td, color: t.textSub, fontSize: "12px" }}>{grn.receivedDate || "-"}</td>
                        <td style={s.td}>{item.product?.name || "-"}</td>
                        <td style={s.td}>{item.quantity}</td>
                        <td style={s.td}>Rs.{(item.purchasePrice || 0).toFixed(2)}</td>
                        <td style={s.td}>Rs.{((item.quantity || 0) * (item.purchasePrice || 0)).toFixed(2)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Payment History */}
          {summary.paymentHistory?.length > 0 && (
            <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "8px", padding: "16px", marginBottom: "16px" }}>
              <div style={{ fontWeight: 700, fontSize: "14px", color: t.text, marginBottom: "12px" }}>Payment History</div>
              <table style={s.table}>
                <thead><tr style={s.thead}>
                  <th style={s.th}>Date</th><th style={s.th}>Amount</th><th style={s.th}>Method</th><th style={s.th}>Notes</th>
                </tr></thead>
                <tbody>
                  {summary.paymentHistory.map(p => (
                    <tr key={p.id} style={s.tr}>
                      <td style={{ ...s.td, color: t.textSub, fontSize: "12px" }}>{p.paymentDate || "-"}</td>
                      <td style={{ ...s.td, fontWeight: 600 }}>Rs.{(p.amount || 0).toFixed(2)}</td>
                      <td style={s.td}>{p.paymentMethod || "-"}</td>
                      <td style={{ ...s.td, color: t.textSub }}>{p.notes || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Make Payment */}
          {summary.balanceDue > 0 && (
            <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "8px", padding: "16px" }}>
              <div style={{ fontWeight: 700, fontSize: "14px", color: t.text, marginBottom: "12px" }}>Make Payment</div>
              <div style={{ display: "flex", gap: "10px", alignItems: "flex-end", flexWrap: "wrap" }}>
                <div>
                  <label style={s.label}>Amount (Rs.) *</label>
                  <input style={{ ...s.input, width: "140px" }} type="number" min="0" max={summary.balanceDue}
                    placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)} />
                </div>
                <div>
                  <label style={s.label}>Method</label>
                  <select style={{ ...s.input, width: "130px" }} value={method} onChange={e => setMethod(e.target.value)}>
                    <option value="CASH">Cash</option>
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                    <option value="CHEQUE">Cheque</option>
                    <option value="UPI">UPI</option>
                  </select>
                </div>
                <div style={{ flex: 1, minWidth: "160px" }}>
                  <label style={s.label}>Notes</label>
                  <input style={s.input} placeholder="Optional note..." value={note} onChange={e => setNote(e.target.value)} />
                </div>
                <button style={ps.btnSuccess} onClick={handlePay} disabled={loading}>{loading ? "Saving..." : "Pay"}</button>
              </div>
            </div>
          )}
          {summary.balanceDue <= 0 && (
            <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "8px", padding: "14px 16px", color: "#16a34a", fontWeight: 600 }}>
              ✓ Fully paid
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Main PurchaseOrderPage ────────────────────────────────────────────────────
export default function PurchaseOrderPage() {
  const ps = usePageStyles();
  const { dark } = useTheme();
  const t = getTheme(dark);
  const s = { table: ps.table, thead: ps.thead, th: ps.th, tr: ps.tr, td: ps.td };

  const [view, setView] = useState("list"); // "list" | "new" | "edit" | "grn" | "pay"
  const [selectedPO, setSelectedPO] = useState(null);
  const [orders, setOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    try {
      const [pos, sups, prods] = await Promise.all([getPurchaseOrders(), getSuppliers(), getProducts()]);
      setOrders(pos);
      setSuppliers(sups);
      setProducts(prods);
    } catch { setError("Failed to load data"); }
  };

  const goBack = () => { setView("list"); setSelectedPO(null); loadAll(); };

  // ── Sub-page routing ──────────────────────────────────────────────────────
  if (view === "new") {
    return (
      <MainLayout>
        <NewPOPage suppliers={suppliers} products={products} onBack={goBack} onCreated={goBack} />
      </MainLayout>
    );
  }
  if (view === "edit" && selectedPO) {
    return (
      <MainLayout>
        <EditPOPage po={selectedPO} suppliers={suppliers} products={products} onBack={goBack} onSaved={loadAll} />
      </MainLayout>
    );
  }
  if (view === "grn" && selectedPO) {
    return (
      <MainLayout>
        <GRNPage po={selectedPO} products={products} onBack={goBack} onDone={goBack} />
      </MainLayout>
    );
  }
  if (view === "pay" && selectedPO) {
    return (
      <MainLayout>
        <PayPage po={selectedPO} onBack={goBack} onDone={loadAll} />
      </MainLayout>
    );
  }

  // ── List view ─────────────────────────────────────────────────────────────
  const canChangeStatus = (status) => status === "DRAFT" || status === "APPROVED";
  const canGRN = (status) => status === "APPROVED" || status === "PARTIALLY_RECEIVED";
  const canPay = (status) => status === "PARTIALLY_RECEIVED" || status === "FULLY_RECEIVED";

  const handleStatusChange = async (po, newStatus) => {
    try { await updatePurchaseOrderStatus(po.id, newStatus); loadAll(); }
    catch (e) { setError(e.response?.data?.message || "Failed to update status"); }
  };

  return (
    <MainLayout>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h2 style={{ margin: 0, fontSize: "20px", color: t.text }}>Purchase Orders</h2>
        <button style={ps.btnPrimary} onClick={() => setView("new")}>+ New PO</button>
      </div>

      {error && <div style={ps.alertError}>{error}</div>}

      <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "8px", overflow: "hidden" }}>
        <table style={s.table}>
          <thead><tr style={s.thead}>
            <th style={s.th}>PO Number</th>
            <th style={s.th}>Date</th>
            <th style={s.th}>Supplier</th>
            <th style={s.th}>Total Bill</th>
            <th style={s.th}>Total Paid</th>
            <th style={s.th}>To Be Paid</th>
            <th style={s.th}>Status</th>
            <th style={s.th}>GRN Status</th>
            <th style={s.th}>Pay</th>
          </tr></thead>
          <tbody>
            {orders.length === 0 && (
              <tr><td colSpan={9} style={{ ...s.td, textAlign: "center", color: "#9ca3af", padding: "32px" }}>No purchase orders yet</td></tr>
            )}
            {orders.map(o => {
              const totalBill = o.totalAmount || 0;
              const totalPaid = o.totalPaid || 0;
              const toBePaid = o.toBePaid ?? (totalBill - totalPaid);
              return (
                <tr key={o.id} style={{ ...s.tr, cursor: o.status === "DRAFT" ? "pointer" : "default" }}
                  onClick={() => { if (o.status === "DRAFT") { setSelectedPO(o); setView("edit"); } }}>
                  <td style={{ ...s.td, fontWeight: 600, color: "#2563eb" }}>{o.poNumber}</td>
                  <td style={{ ...s.td, color: t.textSub, fontSize: "12px" }}>{o.orderDate}</td>
                  <td style={s.td}>{o.supplier?.name}</td>
                  <td style={{ ...s.td, fontWeight: 600 }}>Rs.{totalBill.toFixed(2)}</td>
                  <td style={s.td}>Rs.{totalPaid.toFixed(2)}</td>
                  <td style={{ ...s.td, fontWeight: 600, color: toBePaid > 0 ? "#ef4444" : "#16a34a" }}>Rs.{toBePaid.toFixed(2)}</td>

                  {/* Status column */}
                  <td style={s.td} onClick={e => e.stopPropagation()}>
                    {canChangeStatus(o.status) ? (
                      <select
                        style={{ padding: "4px 8px", borderRadius: "6px", border: `1px solid ${t.border}`, background: t.inputBg, color: t.text, fontSize: "12px", cursor: "pointer" }}
                        value={o.status}
                        onChange={e => handleStatusChange(o, e.target.value)}>
                        <option value="DRAFT">Draft</option>
                        <option value="APPROVED">Approved</option>
                        <option value="CANCELLED">Cancelled</option>
                      </select>
                    ) : (
                      <span style={{ padding: "3px 8px", borderRadius: "12px", fontSize: "11px", fontWeight: 600, background: STATUS_COLORS[o.status] + "22", color: STATUS_COLORS[o.status] }}>
                        {STATUS_LABELS[o.status] || o.status}
                      </span>
                    )}
                  </td>

                  {/* GRN Status column */}
                  <td style={s.td} onClick={e => e.stopPropagation()}>
                    {o.status === "CANCELLED" ? (
                      <span style={{ color: "#9ca3af", fontSize: "12px" }}>—</span>
                    ) : (
                      <button
                        style={{ padding: "3px 10px", borderRadius: "12px", fontSize: "11px", fontWeight: 600, border: "none", cursor: canGRN(o.status) ? "pointer" : "default", background: GRN_STATUS_COLORS[o.status] + "22", color: GRN_STATUS_COLORS[o.status] }}
                        onClick={() => { if (canGRN(o.status)) { setSelectedPO(o); setView("grn"); } }}>
                        {GRN_STATUS_LABELS[o.status]}
                      </button>
                    )}
                  </td>

                  {/* Pay column */}
                  <td style={s.td} onClick={e => e.stopPropagation()}>
                    {canPay(o.status) && toBePaid > 0 ? (
                      <button style={{ ...ps.btnSmSuccess }}
                        onClick={() => { setSelectedPO(o); setView("pay"); }}>
                        Pay
                      </button>
                    ) : (
                      <span style={{ color: "#9ca3af", fontSize: "12px" }}>—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </MainLayout>
  );
}
