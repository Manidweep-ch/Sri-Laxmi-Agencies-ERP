import { useEffect, useState, useRef } from "react";
import MainLayout from "../layout/MainLayout";
import {
  getSalesOrders, createSalesOrder, getSalesOrderItems,
  updateSalesOrderStatus, deleteSalesOrder,
  addSalesOrderItem, removeSalesOrderItem, getSalesOrderSummary,
  updateSalesOrderFinalAmount
} from "../services/salesService";
import { getCustomers } from "../services/customerService";
import { getProducts } from "../services/productService";
import { getCurrentPrice } from "../services/priceService";
import { getProductStock } from "../services/stockService";
import { generateInvoiceFromSalesOrder } from "../services/invoiceService";
import { createPayment } from "../services/paymentService";
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
const METHODS = ["CASH", "UPI", "BANK_TRANSFER", "CHEQUE", "NEFT", "RTGS"];

// ── FIFO split preview (read-only, does NOT consume stock) ───────────────────
// Returns [{ qty, sellingPrice, purchasePrice }] slices for a given qty
function computeFifoSplits(batches, qty) {
  const sorted = [...batches].sort((a, b) => {
    const da = Array.isArray(a.receivedDate) ? a.receivedDate.join("-") : a.receivedDate;
    const db = Array.isArray(b.receivedDate) ? b.receivedDate.join("-") : b.receivedDate;
    return da < db ? -1 : da > db ? 1 : 0;
  });
  let remaining = qty;
  const splits = [];
  for (const batch of sorted) {
    if (remaining <= 0) break;
    const take = Math.min(batch.quantity, remaining);
    splits.push({ qty: take, sellingPrice: batch.sellingPrice || 0, purchasePrice: batch.purchasePrice || 0 });
    remaining -= take;
  }
  return splits;
}

// ── Shared components ─────────────────────────────────────────────────────────
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

// ── New SO Page ───────────────────────────────────────────────────────────────
function NewSOPage({ customers, products, onBack, onCreated }) {
  const ps = usePageStyles();
  const { dark } = useTheme();
  const t = getTheme(dark);
  const s = { label: ps.label, input: ps.input, table: ps.table, thead: ps.thead, th: ps.th, tr: ps.tr, td: ps.td, totalRow: ps.totalRow };

  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerSearch, setCustomerSearch] = useState("");
  const [lines, setLines] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [productSearch, setProductSearch] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [finalPrice, setFinalPrice] = useState(""); // manual override for round figure
  const [finalPriceEdited, setFinalPriceEdited] = useState(false); // true once user manually changed it
  const [batchMap, setBatchMap] = useState({}); // { [productId]: [batches] }

  // Compute totals using FIFO batch SPs when available, else fall back to price list
  const getLineSplits = (l) => {
    const batches = batchMap[l.productId];
    if (batches && batches.length > 0 && batches.some(b => b.sellingPrice > 0)) {
      return computeFifoSplits(batches, parseInt(l.qty) || 0);
    }
    const net = (parseFloat(l.basePrice) || 0) * (1 - (parseFloat(l.discount) || 0) / 100);
    return [{ qty: parseInt(l.qty) || 0, sellingPrice: net, purchasePrice: 0 }];
  };

  const subTotal = lines.reduce((acc, l) => {
    return acc + getLineSplits(l).reduce((s, sp) => s + sp.sellingPrice * sp.qty, 0);
  }, 0);
  const totalTax = lines.reduce((acc, l) => {
    const lineBase = getLineSplits(l).reduce((s, sp) => s + sp.sellingPrice * sp.qty, 0);
    return acc + lineBase * ((parseFloat(l.gst) || 0) / 100);
  }, 0);

  // Sync finalPrice to grand total whenever lines/batches change, unless user has manually edited it
  useEffect(() => {
    if (!finalPriceEdited) {
      setFinalPrice((subTotal + totalTax).toFixed(2));
    }
  }, [subTotal, totalTax, finalPriceEdited]);

  const handleAddLine = async () => {
    if (!selectedProduct) { setError("Select a product first"); return; }
    if (lines.find(l => l.productId === selectedProduct.id)) { setError("Product already added"); return; }
    let basePrice = 0, discount = 0;
    try {
      const pd = await getCurrentPrice(selectedProduct.id);
      basePrice = parseFloat(pd?.basePrice) || 0;
      discount = parseFloat(pd?.baseDiscount) || 0;
    } catch {}
    // Fetch batches for FIFO SP preview
    try {
      const batches = await getProductStock(selectedProduct.id);
      setBatchMap(prev => ({ ...prev, [selectedProduct.id]: batches }));
    } catch {}
    setLines(prev => [...prev, {
      productId: selectedProduct.id, productName: selectedProduct.name,
      size: selectedProduct.size, gst: selectedProduct.gst || 0,
      basePrice, discount, qty: 1
    }]);
    setSelectedProduct(null); setProductSearch(""); setError("");
  };

  const updateLine = (idx, f, v) => { setLines(prev => prev.map((l, i) => i === idx ? { ...l, [f]: v } : l)); setFinalPriceEdited(false); };
  const removeLine = (idx) => { setLines(prev => prev.filter((_, i) => i !== idx)); setFinalPriceEdited(false); };

  const handleCreate = async () => {
    if (!selectedCustomer) { setError("Please select a customer"); return; }
    if (lines.length === 0) { setError("Add at least one product"); return; }
    for (const l of lines) {
      if (!l.basePrice || parseFloat(l.basePrice) <= 0) { setError(`No price for ${l.productName}. Check price list.`); return; }
    }
    const fp = parseFloat(finalPrice);
    if (finalPriceEdited && finalPrice !== "" && (isNaN(fp) || fp <= 0)) { setError("Enter a valid final price"); return; }
    try {
      setLoading(true); setError("");
      await createSalesOrder({
        customer: { id: selectedCustomer.id },
        finalAmount: (finalPriceEdited && finalPrice !== "" && !isNaN(fp)) ? fp : null,
        items: lines.map(l => {
          const splits = getLineSplits(l);
          const totalQty = splits.reduce((s, sp) => s + sp.qty, 0);
          const weightedSP = totalQty > 0
            ? splits.reduce((s, sp) => s + sp.sellingPrice * sp.qty, 0) / totalQty
            : parseFloat(l.basePrice) * (1 - (parseFloat(l.discount) || 0) / 100);
          return {
            product: { id: l.productId },
            quantity: parseInt(l.qty),
            price: weightedSP
          };
        })
      });
      onCreated();
    } catch (e) { setError(e.response?.data?.message || "Failed to create sales order"); }
    finally { setLoading(false); }
  };

  return (
    <div>
      <PageHeader title="New Sales Order" onBack={onBack} t={t} />
      {error && <div style={ps.alertError}>{error}</div>}

      <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "8px", padding: "16px", marginBottom: "16px" }}>
        <label style={{ ...s.label, fontWeight: 700, fontSize: "14px" }}>Customer *</label>
        <div style={{ maxWidth: "400px", marginTop: "6px" }}>
          <SearchDropdown placeholder="Type to search customer..." items={customers} labelFn={c => c.name} value={customerSearch} onChange={setCustomerSearch} onSelect={setSelectedCustomer} />
        </div>
        {selectedCustomer && (
          <div style={{ marginTop: "10px", display: "flex", gap: "20px", fontSize: "13px", color: t.textSub }}>
            <span>✓ <strong style={{ color: t.text }}>{selectedCustomer.name}</strong></span>
            {selectedCustomer.phone && <span>📞 {selectedCustomer.phone}</span>}
            {selectedCustomer.gstNumber && <span>GST: {selectedCustomer.gstNumber}</span>}
          </div>
        )}
      </div>

      <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "8px", padding: "16px", marginBottom: "16px" }}>
        <label style={{ ...s.label, fontWeight: 700, fontSize: "14px", display: "block", marginBottom: "8px" }}>Add Products</label>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <div style={{ flex: 1 }}>
            <SearchDropdown placeholder="Search product..." items={products}
              labelFn={p => `${p.name}${p.size ? ` - ${p.size}` : ""} (${p.brand?.name || ""})`}
              value={productSearch} onChange={setProductSearch} onSelect={setSelectedProduct} />
            {selectedProduct && <div style={{ marginTop: "4px", fontSize: "12px", color: "#2563eb" }}>✓ {selectedProduct.name} | GST: {selectedProduct.gst || 0}%</div>}
          </div>
          <button style={ps.btnPrimary} onClick={handleAddLine}>+ Add</button>
        </div>
      </div>

      {lines.length > 0 && (
        <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "8px", padding: "16px", marginBottom: "16px" }}>
          <table style={s.table}>
            <thead><tr style={s.thead}>
              <th style={s.th}>Product</th><th style={s.th}>GST%</th>
              <th style={s.th}>Batch SP (Rs.)</th>
              <th style={s.th}>Qty</th>
              <th style={s.th}>Line Total (Rs.)</th><th style={s.th}>Tax (Rs.)</th><th style={s.th}></th>
            </tr></thead>
            <tbody>
              {lines.map((line, idx) => {
                const splits = getLineSplits(line);
                const lineTotal = splits.reduce((s, sp) => s + sp.sellingPrice * sp.qty, 0);
                const tax = lineTotal * ((parseFloat(line.gst) || 0) / 100);
                const isMultiBatch = splits.length > 1;
                return [
                  <tr key={`${idx}-main`} style={s.tr}>
                    <td style={{ ...s.td, fontWeight: 600 }}>{line.productName}{line.size ? ` - ${line.size}` : ""}</td>
                    <td style={s.td}>{line.gst}%</td>
                    <td style={{ ...s.td, color: isMultiBatch ? "#f59e0b" : t.text, fontSize: "12px" }}>
                      {isMultiBatch
                        ? splits.map((sp, i) => <div key={i}>{sp.qty} × Rs.{sp.sellingPrice.toFixed(2)}</div>)
                        : `Rs.${splits[0]?.sellingPrice.toFixed(2) || "0.00"}`}
                    </td>
                    <td style={s.td}>
                      <input style={{ ...s.input, width: "70px" }} type="number" min="1"
                        value={line.qty} onChange={e => updateLine(idx, "qty", e.target.value)} />
                    </td>
                    <td style={{ ...s.td, fontWeight: 600 }}>Rs.{lineTotal.toFixed(2)}</td>
                    <td style={s.td}>Rs.{tax.toFixed(2)}</td>
                    <td style={s.td}><button style={ps.btnSmDanger} onClick={() => removeLine(idx)}>✕</button></td>
                  </tr>,
                  isMultiBatch && (
                    <tr key={`${idx}-note`}>
                      <td colSpan={7} style={{ ...s.td, fontSize: "11px", color: "#f59e0b", paddingTop: 0, paddingBottom: "6px", fontStyle: "italic" }}>
                        FIFO split: {splits.map((sp, i) => `${sp.qty} units @ Rs.${sp.sellingPrice.toFixed(2)}`).join(" + ")}
                      </td>
                    </tr>
                  )
                ];
              })}
            </tbody>
          </table>
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "12px" }}>
            <div style={{ background: t.surfaceAlt, border: `1px solid ${t.border}`, borderRadius: "8px", padding: "12px 20px", minWidth: "280px" }}>
              <div style={s.totalRow}><span>Sub Total</span><span>Rs.{subTotal.toFixed(2)}</span></div>
              <div style={s.totalRow}><span>Total GST</span><span>Rs.{totalTax.toFixed(2)}</span></div>
              <div style={{ ...s.totalRow, fontWeight: 700, fontSize: "16px", borderTop: `1px solid ${t.border}`, paddingTop: "8px", marginTop: "4px" }}>
                <span>Grand Total</span><span>Rs.{(subTotal + totalTax).toFixed(2)}</span>
              </div>

              {/* Final price override */}
              <div style={{ marginTop: "12px", paddingTop: "10px", borderTop: `1px dashed ${t.border}` }}>
                <label style={{ fontSize: "11px", color: t.textSub, display: "block", marginBottom: "6px" }}>
                  Final Price — customer agreed amount (optional)
                </label>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <input
                    type="number" min="0" step="1"
                    value={finalPrice}
                    onChange={e => { setFinalPrice(e.target.value); setFinalPriceEdited(true); }}
                    style={{
                      ...s.input, width: "150px", fontWeight: 700, fontSize: "15px", marginBottom: 0,
                      borderColor: finalPriceEdited ? "#2563eb" : t.inputBorder,
                      background: finalPriceEdited ? (dark ? "#1e3a5f" : "#eff6ff") : t.inputBg,
                      color: finalPriceEdited ? "#2563eb" : t.text,
                    }}
                  />
                  {finalPriceEdited && (
                    <button style={{ ...ps.btnSmDanger, padding: "3px 7px" }} onClick={() => { setFinalPriceEdited(false); setFinalPrice((subTotal + totalTax).toFixed(2)); }}>✕</button>
                  )}
                </div>
                {finalPriceEdited && finalPrice !== "" && (() => {
                  const fp = parseFloat(finalPrice);
                  const calc = subTotal + totalTax;
                  const diff = fp - calc;
                  if (Math.abs(diff) < 0.001) return null;
                  return (
                    <div style={{ marginTop: "6px", fontSize: "12px", color: diff < 0 ? "#ef4444" : "#16a34a", fontWeight: 600 }}>
                      {diff < 0 ? `Discount: −Rs.${Math.abs(diff).toFixed(2)}` : `Extra: +Rs.${diff.toFixed(2)}`}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: "10px" }}>
        <button style={ps.btnSuccess} onClick={handleCreate} disabled={loading}>{loading ? "Creating..." : "Create Sales Order"}</button>
        <button style={ps.btnGhost} onClick={onBack}>Cancel</button>
      </div>
    </div>
  );
}

// ── Edit SO Page (DRAFT/PENDING only) ────────────────────────────────────────
// ── Edit SO Page — same layout as NewSOPage ───────────────────────────────────
function EditSOPage({ order, products, onBack, onSaved }) {
  const ps = usePageStyles();
  const { dark } = useTheme();
  const t = getTheme(dark);
  const s = { label: ps.label, input: ps.input, table: ps.table, thead: ps.thead, th: ps.th, tr: ps.tr, td: ps.td, totalRow: ps.totalRow };

  // lines mirrors NewSOPage structure: { itemId (existing), productId, productName, size, gst, basePrice, discount, qty }
  const [lines, setLines] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [productSearch, setProductSearch] = useState("");
  const [finalPrice, setFinalPrice] = useState(order.finalAmount ? String(order.finalAmount) : "");
  const [finalPriceEdited, setFinalPriceEdited] = useState(!!order.finalAmount);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [batchMap, setBatchMap] = useState({});

  // Load existing items on mount — fetch price list + batches
  useEffect(() => {
    getSalesOrderItems(order.id).then(async items => {
      const lines = await Promise.all(items.map(async i => {
        let basePrice = parseFloat(i.price) || 0;
        let discount = 0;
        try {
          const pd = await getCurrentPrice(i.product?.id);
          if (pd?.basePrice) {
            basePrice = parseFloat(pd.basePrice);
            discount = parseFloat(pd.baseDiscount) || 0;
          }
        } catch {}
        // fetch batches for FIFO preview
        try {
          const batches = await getProductStock(i.product?.id);
          setBatchMap(prev => ({ ...prev, [i.product?.id]: batches }));
        } catch {}
        return {
          itemId: i.id,
          productId: i.product?.id,
          productName: i.product?.name || "",
          size: i.product?.size || "",
          gst: i.product?.gst || 0,
          basePrice,
          discount,
          qty: i.quantity || 1,
        };
      }));
      setLines(lines);
    }).catch(() => setError("Failed to load items"));
  }, [order.id]);

  const getLineSplits = (l) => {
    const batches = batchMap[l.productId];
    if (batches && batches.length > 0 && batches.some(b => b.sellingPrice > 0)) {
      return computeFifoSplits(batches, parseInt(l.qty) || 0);
    }
    const net = (parseFloat(l.basePrice) || 0) * (1 - (parseFloat(l.discount) || 0) / 100);
    return [{ qty: parseInt(l.qty) || 0, sellingPrice: net, purchasePrice: 0 }];
  };

  const subTotal = lines.reduce((acc, l) => {
    return acc + getLineSplits(l).reduce((s, sp) => s + sp.sellingPrice * sp.qty, 0);
  }, 0);
  const totalTax = lines.reduce((acc, l) => {
    const lineBase = getLineSplits(l).reduce((s, sp) => s + sp.sellingPrice * sp.qty, 0);
    return acc + lineBase * ((parseFloat(l.gst) || 0) / 100);
  }, 0);

  // Sync finalPrice to grand total when lines/batches change, unless user has manually edited it
  useEffect(() => {
    if (!finalPriceEdited) {
      setFinalPrice((subTotal + totalTax).toFixed(2));
    }
  }, [subTotal, totalTax, finalPriceEdited]);

  const handleAddLine = async () => {
    if (!selectedProduct) { setError("Select a product first"); return; }
    if (lines.find(l => l.productId === selectedProduct.id)) { setError("Product already added"); return; }
    let basePrice = 0, discount = 0;
    try {
      const pd = await getCurrentPrice(selectedProduct.id);
      basePrice = parseFloat(pd?.basePrice) || 0;
      discount = parseFloat(pd?.baseDiscount) || 0;
    } catch {}
    // Add to backend immediately
    try {
      setLoading(true);
      const netPrice = basePrice * (1 - discount / 100);
      await addSalesOrderItem(order.id, { product: { id: selectedProduct.id }, price: netPrice, quantity: 1 });
      // fetch batches for FIFO preview
      try {
        const batches = await getProductStock(selectedProduct.id);
        setBatchMap(prev => ({ ...prev, [selectedProduct.id]: batches }));
      } catch {}
      const updatedItems = await getSalesOrderItems(order.id);
      const newItem = updatedItems.find(i => i.product?.id === selectedProduct.id);
      setLines(prev => [...prev, {
        itemId: newItem?.id,
        productId: selectedProduct.id,
        productName: selectedProduct.name,
        size: selectedProduct.size || "",
        gst: selectedProduct.gst || 0,
        basePrice, discount, qty: 1,
      }]);
      setSelectedProduct(null); setProductSearch(""); setError("");
      onSaved();
    } catch (e) { setError(e.response?.data?.message || "Failed to add item"); }
    finally { setLoading(false); }
  };

  const updateLine = async (idx, field, value) => {
    const updated = lines.map((l, i) => i === idx ? { ...l, [field]: value } : l);
    setLines(updated);
    setFinalPriceEdited(false);
    // sync qty/price change to backend
    const line = updated[idx];
    if (!line.itemId) return;
    try {
      const net = (parseFloat(line.basePrice) || 0) * (1 - (parseFloat(line.discount) || 0) / 100);
      await addSalesOrderItem(order.id, { product: { id: line.productId }, price: net, quantity: parseInt(line.qty) || 1 });
      onSaved();
    } catch {}
  };

  const removeLine = async (idx) => {
    const line = lines[idx];
    if (line.itemId) {
      try { await removeSalesOrderItem(order.id, line.itemId); onSaved(); }
      catch (e) { setError(e.response?.data?.message || "Failed to remove item"); return; }
    }
    setLines(prev => prev.filter((_, i) => i !== idx));
    setFinalPriceEdited(false);
  };

  const handleSave = async () => {
    try {
      setLoading(true); setError("");
      const fp = finalPriceEdited && finalPrice !== "" ? parseFloat(finalPrice) : null;
      if (fp !== null && (isNaN(fp) || fp <= 0)) { setError("Enter a valid final price"); setLoading(false); return; }
      await updateSalesOrderFinalAmount(order.id, fp);
      onSaved();
      onBack();
    } catch (e) { setError(e.response?.data?.message || "Failed to save"); }
    finally { setLoading(false); }
  };

  return (
    <div>
      <PageHeader title={`Edit SO — ${order.orderNumber}`} onBack={onBack} t={t} />
      {error && <div style={ps.alertError}>{error}</div>}

      {/* Customer — read-only display */}
      <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "8px", padding: "16px", marginBottom: "16px" }}>
        <label style={{ ...s.label, fontWeight: 700, fontSize: "14px" }}>Customer</label>
        <div style={{ marginTop: "10px", display: "flex", gap: "20px", fontSize: "13px", color: t.textSub }}>
          <span>✓ <strong style={{ color: t.text }}>{order.customer?.name}</strong></span>
          {order.customer?.phone && <span>📞 {order.customer.phone}</span>}
          {order.customer?.gstNumber && <span>GST: {order.customer.gstNumber}</span>}
        </div>
      </div>

      {/* Add product */}
      <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "8px", padding: "16px", marginBottom: "16px" }}>
        <label style={{ ...s.label, fontWeight: 700, fontSize: "14px", display: "block", marginBottom: "8px" }}>Add Products</label>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <div style={{ flex: 1 }}>
            <SearchDropdown placeholder="Search product..." items={products}
              labelFn={p => `${p.name}${p.size ? ` - ${p.size}` : ""} (${p.brand?.name || ""})`}
              value={productSearch} onChange={setProductSearch} onSelect={setSelectedProduct} />
            {selectedProduct && <div style={{ marginTop: "4px", fontSize: "12px", color: "#2563eb" }}>✓ {selectedProduct.name} | GST: {selectedProduct.gst || 0}%</div>}
          </div>
          <button style={ps.btnPrimary} onClick={handleAddLine} disabled={loading}>+ Add</button>
        </div>
      </div>

      {/* Items table */}
      {lines.length > 0 && (
        <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "8px", padding: "16px", marginBottom: "16px" }}>
          <table style={s.table}>
            <thead><tr style={s.thead}>
              <th style={s.th}>Product</th><th style={s.th}>GST%</th>
              <th style={s.th}>Batch SP (Rs.)</th>
              <th style={s.th}>Qty</th>
              <th style={s.th}>Line Total (Rs.)</th><th style={s.th}>Tax (Rs.)</th><th style={s.th}></th>
            </tr></thead>
            <tbody>
              {lines.map((line, idx) => {
                const splits = getLineSplits(line);
                const lineTotal = splits.reduce((s, sp) => s + sp.sellingPrice * sp.qty, 0);
                const tax = lineTotal * ((parseFloat(line.gst) || 0) / 100);
                const isMultiBatch = splits.length > 1;
                return [
                  <tr key={`${idx}-main`} style={s.tr}>
                    <td style={{ ...s.td, fontWeight: 600 }}>{line.productName}{line.size ? ` - ${line.size}` : ""}</td>
                    <td style={s.td}>{line.gst}%</td>
                    <td style={{ ...s.td, color: isMultiBatch ? "#f59e0b" : t.text, fontSize: "12px" }}>
                      {isMultiBatch
                        ? splits.map((sp, i) => <div key={i}>{sp.qty} × Rs.{sp.sellingPrice.toFixed(2)}</div>)
                        : `Rs.${splits[0]?.sellingPrice.toFixed(2) || "0.00"}`}
                    </td>
                    <td style={s.td}>
                      <input style={{ ...s.input, width: "70px" }} type="number" min="1"
                        value={line.qty} onChange={e => updateLine(idx, "qty", e.target.value)} />
                    </td>
                    <td style={{ ...s.td, fontWeight: 600 }}>Rs.{lineTotal.toFixed(2)}</td>
                    <td style={s.td}>Rs.{tax.toFixed(2)}</td>
                    <td style={s.td}><button style={ps.btnSmDanger} onClick={() => removeLine(idx)}>✕</button></td>
                  </tr>,
                  isMultiBatch && (
                    <tr key={`${idx}-note`}>
                      <td colSpan={7} style={{ ...s.td, fontSize: "11px", color: "#f59e0b", paddingTop: 0, paddingBottom: "6px", fontStyle: "italic" }}>
                        FIFO split: {splits.map((sp, i) => `${sp.qty} units @ Rs.${sp.sellingPrice.toFixed(2)}`).join(" + ")}
                      </td>
                    </tr>
                  )
                ];
              })}
            </tbody>
          </table>

          {/* Totals + final price */}
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "12px" }}>
            <div style={{ background: t.surfaceAlt, border: `1px solid ${t.border}`, borderRadius: "8px", padding: "12px 20px", minWidth: "280px" }}>
              <div style={s.totalRow}><span>Sub Total</span><span>Rs.{subTotal.toFixed(2)}</span></div>
              <div style={s.totalRow}><span>Total GST</span><span>Rs.{totalTax.toFixed(2)}</span></div>
              <div style={{ ...s.totalRow, fontWeight: 700, fontSize: "16px", borderTop: `1px solid ${t.border}`, paddingTop: "8px", marginTop: "4px" }}>
                <span>Grand Total</span><span>Rs.{(subTotal + totalTax).toFixed(2)}</span>
              </div>
              <div style={{ marginTop: "12px", paddingTop: "10px", borderTop: `1px dashed ${t.border}` }}>
                <label style={{ fontSize: "11px", color: t.textSub, display: "block", marginBottom: "6px" }}>
                  Final Price — customer agreed amount (optional)
                </label>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <input type="number" min="0" step="1"
                    value={finalPrice}
                    onChange={e => { setFinalPrice(e.target.value); setFinalPriceEdited(true); }}
                    style={{ ...s.input, width: "150px", fontWeight: 700, fontSize: "15px", marginBottom: 0,
                      borderColor: finalPriceEdited ? "#2563eb" : t.inputBorder,
                      background: finalPriceEdited ? (dark ? "#1e3a5f" : "#eff6ff") : t.inputBg,
                      color: finalPriceEdited ? "#2563eb" : t.text,
                    }} />
                  {finalPriceEdited && (
                    <button style={{ ...ps.btnSmDanger, padding: "3px 7px" }} onClick={() => { setFinalPriceEdited(false); setFinalPrice((subTotal + totalTax).toFixed(2)); }}>✕</button>
                  )}
                </div>
                {finalPriceEdited && finalPrice !== "" && (() => {
                  const fp = parseFloat(finalPrice);
                  const calc = subTotal + totalTax;
                  const diff = fp - calc;
                  if (Math.abs(diff) < 0.001) return null;
                  return (
                    <div style={{ marginTop: "6px", fontSize: "12px", color: diff < 0 ? "#ef4444" : "#16a34a", fontWeight: 600 }}>
                      {diff < 0 ? `Discount: −Rs.${Math.abs(diff).toFixed(2)}` : `Extra: +Rs.${diff.toFixed(2)}`}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: "10px" }}>
        <button style={ps.btnSuccess} onClick={handleSave} disabled={loading}>{loading ? "Saving..." : "Save Changes"}</button>
        <button style={ps.btnGhost} onClick={onBack}>Cancel</button>
      </div>
    </div>
  );
}

// ── Pay Page ──────────────────────────────────────────────────────────────────
function PaySOPage({ order, onBack, onDone }) {
  const ps = usePageStyles();
  const { dark } = useTheme();
  const t = getTheme(dark);
  const s = { label: ps.label, input: ps.input, table: ps.table, thead: ps.thead, th: ps.th, tr: ps.tr, td: ps.td, totalRow: ps.totalRow };

  const [summary, setSummary] = useState(null);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("CASH");
  const [payDate, setPayDate] = useState(new Date().toISOString().split("T")[0]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => { loadSummary(); }, []);

  const loadSummary = async () => {
    try { setSummary(await getSalesOrderSummary(order.id)); } catch { setError("Failed to load summary"); }
  };

  const handlePay = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { setError("Enter a valid amount"); return; }
    if (summary && amt > parseFloat(summary.balanceDue)) { setError(`Exceeds balance due (Rs.${parseFloat(summary.balanceDue).toFixed(2)})`); return; }
    if (!summary?.invoiceId) { setError("No invoice found. Generate invoice first."); return; }
    try {
      setLoading(true); setError("");
      await createPayment({ invoice: { id: summary.invoiceId }, amount: amt, paymentDate: payDate, paymentMethod: method });
      setAmount("");
      await loadSummary();
      onDone();
    } catch (e) { setError(e.response?.data?.message || "Payment failed"); }
    finally { setLoading(false); }
  };

  const balanceDue = parseFloat(summary?.balanceDue || 0);

  return (
    <div>
      <PageHeader title={`Payment — ${order.orderNumber}`} subtitle={`Customer: ${order.customer?.name}`} onBack={onBack} t={t} />
      {error && <div style={ps.alertError}>{error}</div>}

      {summary && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "12px", marginBottom: "16px" }}>
            {[
              { label: "Invoice", value: summary.invoiceNumber || "—", isText: true },
              { label: "Total Amount", value: `Rs.${parseFloat(summary.totalAmount || 0).toFixed(2)}` },
              { label: "Amount Paid", value: `Rs.${parseFloat(summary.paidAmount || 0).toFixed(2)}`, color: "#16a34a" },
              { label: "Balance Due", value: `Rs.${balanceDue.toFixed(2)}`, color: "#ef4444", highlight: true },
            ].map(c => (
              <div key={c.label} style={{ background: c.highlight ? "#eff6ff" : t.surfaceAlt, border: `1px solid ${c.highlight ? "#bfdbfe" : t.border}`, borderRadius: "8px", padding: "12px" }}>
                <div style={{ fontSize: "11px", color: t.textSub, marginBottom: "4px" }}>{c.label}</div>
                <div style={{ fontSize: c.isText ? "14px" : "18px", fontWeight: 700, color: c.color || (c.highlight ? "#2563eb" : t.text) }}>{c.value}</div>
              </div>
            ))}
          </div>

          {summary.payments?.length > 0 && (
            <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "8px", padding: "16px", marginBottom: "16px" }}>
              <div style={{ fontWeight: 700, fontSize: "14px", color: t.text, marginBottom: "12px" }}>Payment History</div>
              <table style={s.table}>
                <thead><tr style={s.thead}>
                  <th style={s.th}>Date</th><th style={s.th}>Amount</th><th style={s.th}>Method</th>
                </tr></thead>
                <tbody>
                  {summary.payments.map(p => (
                    <tr key={p.id} style={s.tr}>
                      <td style={ps.tdSub}>{p.paymentDate || "—"}</td>
                      <td style={{ ...s.td, fontWeight: 600, color: "#16a34a" }}>Rs.{parseFloat(p.amount || 0).toFixed(2)}</td>
                      <td style={ps.tdSub}>{p.paymentMethod?.replace("_", " ") || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {balanceDue > 0 ? (
            <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "8px", padding: "16px" }}>
              <div style={{ fontWeight: 700, fontSize: "14px", color: t.text, marginBottom: "12px" }}>Record Payment</div>
              <div style={{ display: "flex", gap: "10px", alignItems: "flex-end", flexWrap: "wrap" }}>
                <div>
                  <label style={s.label}>Amount (Rs.) *</label>
                  <input style={{ ...s.input, width: "140px" }} type="number" min="0" max={balanceDue} placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)} />
                </div>
                <div>
                  <label style={s.label}>Date</label>
                  <input style={{ ...s.input, width: "140px" }} type="date" value={payDate} onChange={e => setPayDate(e.target.value)} />
                </div>
                <div>
                  <label style={s.label}>Method</label>
                  <select style={{ ...s.input, width: "140px" }} value={method} onChange={e => setMethod(e.target.value)}>
                    {METHODS.map(m => <option key={m} value={m}>{m.replace("_", " ")}</option>)}
                  </select>
                </div>
                <button style={ps.btnSuccess} onClick={handlePay} disabled={loading}>{loading ? "Saving..." : "Record Payment"}</button>
              </div>
            </div>
          ) : (
            <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "8px", padding: "14px 16px", color: "#16a34a", fontWeight: 600 }}>
              ✓ Fully paid
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Main SalesOrdersPage ──────────────────────────────────────────────────────
export default function SalesOrdersPage() {
  const ps = usePageStyles();
  const { dark } = useTheme();
  const t = getTheme(dark);

  const [view, setView] = useState("list"); // "list"|"new"|"edit"|"pay"
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [invoiceSummaries, setInvoiceSummaries] = useState([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const { getInvoiceSummaries } = await import("../services/invoiceService");
      const [o, c, p, inv] = await Promise.all([getSalesOrders(), getCustomers(), getProducts(), getInvoiceSummaries()]);
      setOrders([...o].sort((a, b) => b.id - a.id));
      setCustomers(c); setProducts(p); setInvoiceSummaries(inv); setError("");
    } catch { setError("Failed to load data"); }
    finally { setLoading(false); }
  };

  const goBack = () => { setView("list"); setSelectedOrder(null); loadAll(); };

  const getInvForSO = (soId) => invoiceSummaries.find(i => i.salesOrderId === soId);

  const handleStatusChange = async (order, newStatus) => {
    try { await updateSalesOrderStatus(order.id, newStatus); loadAll(); }
    catch (e) { setError(e.response?.data?.message || "Failed to update status"); }
  };

  const handleGenerateInvoice = async (order) => {
    try { await generateInvoiceFromSalesOrder(order.id); loadAll(); }
    catch (e) { setError(e.response?.data?.message || "Failed to generate invoice"); }
  };

  const filtered = orders.filter(o =>
    o.orderNumber?.toLowerCase().includes(search.toLowerCase()) ||
    o.customer?.name?.toLowerCase().includes(search.toLowerCase())
  );

  // ── Sub-page routing ────────────────────────────────────────────────────────
  if (view === "new") return <MainLayout><NewSOPage customers={customers} products={products} onBack={goBack} onCreated={goBack} /></MainLayout>;
  if (view === "edit" && selectedOrder) return <MainLayout><EditSOPage order={selectedOrder} products={products} onBack={goBack} onSaved={loadAll} /></MainLayout>;
  if (view === "pay" && selectedOrder) return <MainLayout><PaySOPage order={selectedOrder} onBack={goBack} onDone={loadAll} /></MainLayout>;

  // ── Column helpers ──────────────────────────────────────────────────────────
  const canEdit = (o) => o.status === "DRAFT" || o.status === "PENDING";
  const canDelete = (o) => !getInvForSO(o.id);
  const canInvoice = (o) => o.status === "CONFIRMED" && !getInvForSO(o.id);
  const canMarkSent = (o) => o.status === "INVOICED";
  const canPay = (o) => {
    const inv = getInvForSO(o.id);
    return inv && inv.paymentStatus !== "PAID";
  };

  const handleDelete = async (o) => {
    if (!window.confirm(`Delete order ${o.orderNumber}? This cannot be undone.`)) return;
    try { await deleteSalesOrder(o.id); loadAll(); }
    catch (e) { setError(e.response?.data?.message || "Failed to delete order"); }
  };

  // th style — compact
  const th = { ...ps.th, padding: "8px 10px", fontSize: "11px", whiteSpace: "nowrap" };
  const td = { ...ps.td, padding: "8px 10px", fontSize: "12px" };

  return (
    <MainLayout>
      <div className="erp-page">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "20px", color: t.text }}>Sales Orders</h2>
            <div style={{ fontSize: "12px", color: t.textMuted, marginTop: "2px" }}>{filtered.length} orders</div>
          </div>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <input className="erp-input" style={{ ...ps.searchInput }} placeholder="Search order#, customer..." value={search} onChange={e => setSearch(e.target.value)} />
            <button style={ps.btnSuccess} onClick={() => setView("new")}>+ New Order</button>
          </div>
        </div>

        {error && <div style={ps.alertError}>{error}</div>}
        {loading && <div style={ps.alertInfo}>Loading...</div>}

        <div style={{ ...ps.tableWrap, overflowX: "auto" }}>
          <table style={{ ...ps.table, tableLayout: "fixed", width: "100%" }}>
            <colgroup>
              <col style={{ width: "90px" }} /><col style={{ width: "110px" }} /><col style={{ width: "140px" }} /><col style={{ width: "100px" }} /><col style={{ width: "90px" }} /><col style={{ width: "90px" }} /><col style={{ width: "110px" }} /><col style={{ width: "130px" }} /><col style={{ width: "120px" }} /><col style={{ width: "90px" }} /><col style={{ width: "130px" }} />
            </colgroup>
            <thead>
              <tr style={ps.thead}>
                <th style={th}>Date</th>
                <th style={th}>Order No</th>
                <th style={th}>Customer</th>
                <th style={th}>Total (Rs.)</th>
                <th style={th}>Paid (Rs.)</th>
                <th style={th}>Balance (Rs.)</th>
                <th style={th}>Status</th>
                <th style={th}>Invoice</th>
                <th style={th}>Goods Status</th>
                <th style={th}>Payment</th>
                <th style={th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && !loading && (
                <tr><td colSpan={11} style={{ ...td, textAlign: "center", color: t.textMuted, padding: "40px" }}>No sales orders found</td></tr>
              )}
              {filtered.map(o => {
                const inv = getInvForSO(o.id);
                const totalAmt = parseFloat(o.totalAmount || 0);
                const finalAmt = o.finalAmount ? parseFloat(o.finalAmount) : null;
                const displayTotal = finalAmt ?? totalAmt;
                const paidAmt = parseFloat(inv?.paidAmount || 0);
                const balanceAmt = parseFloat(inv?.dueAmount ?? (displayTotal - paidAmt));
                const isEditable = canEdit(o);
                const isDeletable = canDelete(o);

                return (
                  <tr key={o.id} style={{ ...ps.tr, background: t.surface, cursor: isEditable ? "pointer" : "default" }}
                    onClick={() => { if (isEditable) { setSelectedOrder(o); setView("edit"); } }}>

                    {/* Date */}
                    <td style={{ ...td, color: t.textSub }}>{o.orderDate || "—"}</td>

                    {/* Order No */}
                    <td style={{ ...td, fontWeight: 600, color: "#2563eb", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{o.orderNumber}</td>

                    {/* Customer */}
                    <td style={{ ...td, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{o.customer?.name}</td>

                    {/* Total */}
                    <td style={{ ...td, fontWeight: 600 }}>
                      Rs.{displayTotal.toFixed(2)}
                      {finalAmt !== null && finalAmt !== totalAmt && (
                        <div style={{ fontSize: "10px", color: t.textMuted, fontWeight: 400 }}>calc: Rs.{totalAmt.toFixed(2)}</div>
                      )}
                    </td>

                    {/* Paid */}
                    <td style={{ ...td, color: "#16a34a" }}>Rs.{paidAmt.toFixed(2)}</td>

                    {/* Balance */}
                    <td style={{ ...td, fontWeight: 600, color: balanceAmt > 0 ? "#ef4444" : "#16a34a" }}>Rs.{balanceAmt.toFixed(2)}</td>

                    {/* Status */}
                    <td style={td} onClick={e => e.stopPropagation()}>
                      {o.status === "DRAFT" || o.status === "PENDING" || o.status === "CONFIRMED" ? (
                        <select style={{ padding: "3px 6px", borderRadius: "6px", border: `1px solid ${t.border}`, background: t.inputBg, color: t.text, fontSize: "11px", cursor: "pointer", width: "100%" }}
                          value={o.status}
                          onChange={e => handleStatusChange(o, e.target.value)}>
                          <option value="DRAFT">Draft</option>
                          <option value="PENDING">Pending</option>
                          <option value="CONFIRMED">Confirmed</option>
                          <option value="CANCELLED">Cancelled</option>
                        </select>
                      ) : (
                        <span style={{ padding: "2px 7px", borderRadius: "10px", fontSize: "10px", fontWeight: 600, background: (STATUS_COLORS[o.status] || "#6b7280") + "22", color: STATUS_COLORS[o.status] || "#6b7280" }}>
                          {STATUS_LABELS[o.status] || o.status}
                        </span>
                      )}
                    </td>

                    {/* Invoice */}
                    <td style={td} onClick={e => e.stopPropagation()}>
                      {inv ? (
                        <span style={{ fontSize: "11px", fontWeight: 600, color: "#16a34a" }}>✓ {inv.invoiceNumber}</span>
                      ) : canInvoice(o) ? (
                        <button style={{ ...ps.btnSmSuccess, fontSize: "11px", padding: "3px 8px" }}
                          onClick={() => handleGenerateInvoice(o)}>
                          Generate
                        </button>
                      ) : (
                        <span style={{ color: t.textMuted, fontSize: "11px" }}>—</span>
                      )}
                    </td>

                    {/* Goods Status */}
                    <td style={td} onClick={e => e.stopPropagation()}>
                      {o.status === "CANCELLED" ? (
                        <span style={{ color: "#9ca3af", fontSize: "11px" }}>—</span>
                      ) : canMarkSent(o) ? (
                        <button style={{ padding: "3px 8px", borderRadius: "10px", fontSize: "10px", fontWeight: 600, border: "none", cursor: "pointer", background: "#7c3aed22", color: "#7c3aed" }}
                          onClick={() => handleStatusChange(o, "SHIPPED")}>
                          Mark Sent
                        </button>
                      ) : o.status === "SHIPPED" ? (
                        <span style={{ padding: "2px 7px", borderRadius: "10px", fontSize: "10px", fontWeight: 600, background: "#7c3aed22", color: "#7c3aed" }}>Goods Sent</span>
                      ) : (
                        <span style={{ color: t.textMuted, fontSize: "11px" }}>—</span>
                      )}
                    </td>

                    {/* Payment */}
                    <td style={td} onClick={e => e.stopPropagation()}>
                      {canPay(o) ? (
                        <button style={{ ...ps.btnSmSuccess, fontSize: "11px", padding: "3px 8px" }}
                          onClick={() => { setSelectedOrder(o); setView("pay"); }}>
                          Pay
                        </button>
                      ) : inv?.paymentStatus === "PAID" ? (
                        <span style={{ fontSize: "10px", fontWeight: 600, color: "#16a34a" }}>✓ Paid</span>
                      ) : (
                        <span style={{ color: t.textMuted, fontSize: "11px" }}>—</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td style={td} onClick={e => e.stopPropagation()}>
                      {isDeletable && (
                        <button style={{ ...ps.btnSmDanger, fontSize: "11px", padding: "3px 8px" }}
                          onClick={() => handleDelete(o)}>
                          Delete
                        </button>
                      )}
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
