import { useEffect, useState, useRef } from "react";
import MainLayout from "../layout/MainLayout";
import { getGRNs, getGRNItems, createGRN, getPOItemsForGRN } from "../services/grnService";
import { getPurchaseOrders } from "../services/purchaseService";

const STATUS_COLORS = {
  DRAFT: "#6b7280", APPROVED: "#2563eb", SENT_TO_SUPPLIER: "#7c3aed",
  PARTIALLY_RECEIVED: "#f59e0b", FULLY_RECEIVED: "#16a34a", CANCELLED: "#ef4444"
};

function SearchDropdown({ placeholder, items, labelFn, onSelect, value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef();
  const filtered = items.filter(i => labelFn(i).toLowerCase().includes(value.toLowerCase()));
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
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
const sd = {
  input: { width: "100%", padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "14px", boxSizing: "border-box" },
  dropdown: { position: "absolute", top: "100%", left: 0, right: 0, background: "white", border: "1px solid #d1d5db", borderRadius: "6px", zIndex: 100, maxHeight: "200px", overflowY: "auto", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" },
  option: { padding: "8px 12px", cursor: "pointer", fontSize: "14px", color: "#374151", borderBottom: "1px solid #f3f4f6" },
};

function GRNPage() {
  const [grns, setGrns] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const [showCreate, setShowCreate] = useState(false);
  const [selectedPO, setSelectedPO] = useState(null);
  const [poSearch, setPoSearch] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [receiptDate, setReceiptDate] = useState(new Date().toISOString().split("T")[0]);
  const [lines, setLines] = useState([]);

  const [viewGRN, setViewGRN] = useState(null);
  const [viewItems, setViewItems] = useState([]);

  const filtered = grns.filter(g =>
    g.invoiceNumber?.toLowerCase().includes(search.toLowerCase()) ||
    g.purchaseOrder?.poNumber?.toLowerCase().includes(search.toLowerCase()) ||
    g.supplier?.name?.toLowerCase().includes(search.toLowerCase())
  );

  const load = async () => {
    setLoading(true);
    try {
      const [g, o] = await Promise.all([getGRNs(), getPurchaseOrders()]);
      setGrns(g); setOrders(o); setError("");
    } catch { setError("Failed to load data"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleSelectPO = async (po) => {
    setSelectedPO(po);
    if (!po) { setLines([]); return; }
    try {
      const poItems = await getPOItemsForGRN(po.id);
      // Pre-populate lines from PO items, receivedQty defaults to remaining
      setLines(poItems.map(item => ({
        poItemId: item.id,
        productId: item.product?.id,
        productName: item.product?.name,
        productSize: item.product?.size,
        productUnit: item.product?.unit,
        orderedQty: item.quantity,
        alreadyReceived: item.receivedQuantity || 0,
        remaining: item.quantity - (item.receivedQuantity || 0),
        receiveQty: Math.max(0, item.quantity - (item.receivedQuantity || 0)),
        purchasePrice: item.price || 0,
      })));
    } catch { setError("Failed to load PO items"); }
  };

  const updateLine = (idx, field, value) =>
    setLines(prev => prev.map((l, i) => i === idx ? { ...l, [field]: value } : l));

  const handleCreateGRN = async () => {
    if (!selectedPO) { setError("Select a Purchase Order"); return; }
    const itemsToReceive = lines.filter(l => parseInt(l.receiveQty) > 0);
    if (itemsToReceive.length === 0) { setError("Enter received quantity for at least one item"); return; }
    for (const l of itemsToReceive) {
      if (parseInt(l.receiveQty) > l.remaining) {
        setError(`Cannot receive more than remaining qty for ${l.productName}`); return;
      }
    }
    try {
      setLoading(true); setError("");
      await createGRN({
        purchaseOrder: { id: selectedPO.id },
        supplier: { id: selectedPO.supplier?.id },
        invoiceNumber: invoiceNumber.trim(),
        receiptDate,
        items: itemsToReceive.map(l => ({
          product: { id: l.productId },
          purchaseOrderItem: { id: l.poItemId },
          quantity: parseInt(l.receiveQty),
          purchasePrice: parseFloat(l.purchasePrice) || 0,
        }))
      });
      setShowCreate(false); setSelectedPO(null); setPoSearch(""); setInvoiceNumber(""); setLines([]);
      load();
    } catch (e) {
      setError(e.response?.data?.message || "Failed to create GRN");
    } finally { setLoading(false); }
  };

  const handleView = async (grn) => {
    try {
      const items = await getGRNItems(grn.id);
      setViewGRN(grn); setViewItems(items);
    } catch { setError("Failed to load GRN items"); }
  };

  return (
    <MainLayout>
      <div style={s.header}>
        <h2 style={{ margin: 0 }}>Goods Receipt Notes (GRN)</h2>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <input style={{ ...s.input, width: "220px" }} placeholder="Search invoice, PO, supplier..."
            value={search} onChange={e => setSearch(e.target.value)} />
          <button style={s.btnGreen} onClick={() => { setShowCreate(true); setSelectedPO(null); setPoSearch(""); setLines([]); setInvoiceNumber(""); setError(""); }}>
            + New GRN
          </button>
        </div>
      </div>

      {error && <div style={s.error}>{error}</div>}
      {loading && <div style={s.info}>Loading...</div>}

      {showCreate && (
        <div style={s.formBox}>
          <h3 style={{ margin: "0 0 16px" }}>Create Goods Receipt Note</h3>

          {/* PO selection */}
          <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", marginBottom: "16px" }}>
            <div style={{ flex: "2 1 260px" }}>
              <label style={s.label}>Purchase Order *</label>
              <SearchDropdown
                placeholder="Type PO number or supplier..."
                items={orders.filter(o => o.status !== "FULLY_RECEIVED" && o.status !== "CANCELLED")}
                labelFn={o => `${o.poNumber} — ${o.supplier?.name || ""}`}
                value={poSearch}
                onChange={setPoSearch}
                onSelect={handleSelectPO}
              />
              {selectedPO && (
                <div style={{ marginTop: "6px", fontSize: "13px", color: "#16a34a" }}>
                  ✓ {selectedPO.poNumber} | Supplier: {selectedPO.supplier?.name} | Status: {selectedPO.status}
                </div>
              )}
            </div>
            <div style={{ flex: "1 1 180px" }}>
              <label style={s.label}>Supplier Invoice No.</label>
              <input style={s.input} placeholder="e.g. INV-2024-001 (optional)" value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} />
            </div>
            <div style={{ flex: "1 1 160px" }}>
              <label style={s.label}>Receipt Date</label>
              <input style={s.input} type="date" value={receiptDate} onChange={e => setReceiptDate(e.target.value)} />
            </div>
          </div>

          {/* Items table pre-populated from PO */}
          {lines.length > 0 && (
            <table style={{ ...s.table, marginBottom: "16px" }}>
              <thead>
                <tr style={s.thead}>
                  <th style={s.th}>Product</th>
                  <th style={s.th}>Size / Unit</th>
                  <th style={s.th}>Ordered</th>
                  <th style={s.th}>Already Received</th>
                  <th style={s.th}>Remaining</th>
                  <th style={s.th}>Receive Now *</th>
                  <th style={s.th}>Purchase Price (₹)</th>
                  <th style={s.th}>Line Total</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line, idx) => {
                  const qty = parseInt(line.receiveQty) || 0;
                  const price = parseFloat(line.purchasePrice) || 0;
                  const lineTotal = qty * price;
                  const overReceive = qty > line.remaining;
                  return (
                    <tr key={idx} style={s.tr}>
                      <td style={s.td}>{line.productName}</td>
                      <td style={s.td}>{line.productSize || "-"} / {line.productUnit || "-"}</td>
                      <td style={s.td}>{line.orderedQty}</td>
                      <td style={s.td}>{line.alreadyReceived}</td>
                      <td style={{ ...s.td, color: line.remaining === 0 ? "#16a34a" : "#374151", fontWeight: line.remaining === 0 ? 600 : 400 }}>
                        {line.remaining === 0 ? "✓ Done" : line.remaining}
                      </td>
                      <td style={s.td}>
                        <input
                          style={{ ...s.input, width: "80px", borderColor: overReceive ? "#ef4444" : "#d1d5db" }}
                          type="number" min="0" max={line.remaining}
                          value={line.receiveQty}
                          onChange={e => updateLine(idx, "receiveQty", e.target.value)}
                          disabled={line.remaining === 0}
                        />
                        {overReceive && <div style={{ fontSize: "11px", color: "#ef4444" }}>Max {line.remaining}</div>}
                      </td>
                      <td style={s.td}>
                        <input style={{ ...s.input, width: "100px" }} type="number" placeholder="0.00"
                          value={line.purchasePrice}
                          onChange={e => updateLine(idx, "purchasePrice", e.target.value)} />
                      </td>
                      <td style={s.td}>₹{lineTotal.toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {selectedPO && lines.length === 0 && (
            <div style={{ color: "#6b7280", fontSize: "13px", marginBottom: "16px" }}>
              All items in this PO have been fully received.
            </div>
          )}

          {lines.length > 0 && (
            <div style={s.totalsBox}>
              {(() => {
                const total = lines.reduce((sum, l) => sum + (parseInt(l.receiveQty)||0) * (parseFloat(l.purchasePrice)||0), 0);
                return (
                  <div style={{ ...s.totalRow, fontWeight: "700", fontSize: "15px" }}>
                    <span>Total Receipt Value</span><span>₹{total.toFixed(2)}</span>
                  </div>
                );
              })()}
            </div>
          )}

          <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
            <button style={s.btnGreen} onClick={handleCreateGRN} disabled={loading}>Confirm & Save GRN</button>
            <button style={s.btnGray} onClick={() => { setShowCreate(false); setLines([]); }}>Cancel</button>
          </div>
        </div>
      )}

      {/* GRN List */}
      <table style={s.table}>
        <thead>
          <tr style={s.thead}>
            <th style={s.th}>GRN ID</th>
            <th style={s.th}>Purchase Order</th>
            <th style={s.th}>Supplier</th>
            <th style={s.th}>Invoice No.</th>
            <th style={s.th}>Receipt Date</th>
            <th style={s.th}>PO Status</th>
            <th style={s.th}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filtered.length === 0 && !loading && (
            <tr><td colSpan={7} style={{ ...s.td, textAlign: "center", color: "#9ca3af" }}>No GRNs found</td></tr>
          )}
          {filtered.map(g => (
            <tr key={g.id} style={s.tr}>
              <td style={{ ...s.td, fontWeight: 600 }}>GRN-{g.id}</td>
              <td style={s.td}>{g.purchaseOrder?.poNumber || `PO #${g.purchaseOrder?.id}`}</td>
              <td style={s.td}>{g.supplier?.name || "-"}</td>
              <td style={s.td}>{g.invoiceNumber}</td>
              <td style={s.td}>{g.receiptDate}</td>
              <td style={s.td}>
                <span style={{ ...s.badge, background: STATUS_COLORS[g.purchaseOrder?.status] || "#6b7280" }}>
                  {g.purchaseOrder?.status || "-"}
                </span>
              </td>
              <td style={s.td}>
                <button style={s.btnSmBlue} onClick={() => handleView(g)}>View Items</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* View Items Modal */}
      {viewGRN && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
              <h3 style={{ margin: 0 }}>GRN-{viewGRN.id}</h3>
              <button style={s.btnGray} onClick={() => setViewGRN(null)}>Close</button>
            </div>
            <p style={{ margin: "0 0 16px", color: "#6b7280", fontSize: "13px" }}>
              PO: {viewGRN.purchaseOrder?.poNumber} | Supplier: {viewGRN.supplier?.name} |
              Invoice: {viewGRN.invoiceNumber} | Date: {viewGRN.receiptDate}
            </p>
            <table style={s.table}>
              <thead>
                <tr style={s.thead}>
                  <th style={s.th}>Product</th>
                  <th style={s.th}>Qty Received</th>
                  <th style={s.th}>Purchase Price (₹)</th>
                  <th style={s.th}>Line Total</th>
                </tr>
              </thead>
              <tbody>
                {viewItems.length === 0 && (
                  <tr><td colSpan={4} style={{ ...s.td, textAlign: "center", color: "#9ca3af" }}>No items</td></tr>
                )}
                {viewItems.map(item => (
                  <tr key={item.id} style={s.tr}>
                    <td style={s.td}>{item.product?.name}{item.product?.size ? ` - ${item.product.size}` : ""}</td>
                    <td style={s.td}>{item.quantity}</td>
                    <td style={s.td}>₹{item.purchasePrice?.toFixed(2)}</td>
                    <td style={s.td}>₹{(item.quantity * item.purchasePrice).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {viewItems.length > 0 && (
              <div style={{ ...s.totalsBox, marginTop: "16px" }}>
                <div style={{ ...s.totalRow, fontWeight: 700, fontSize: "15px" }}>
                  <span>Total Receipt Value</span>
                  <span>₹{viewItems.reduce((sum, i) => sum + i.quantity * i.purchasePrice, 0).toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </MainLayout>
  );
}

const s = {
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" },
  error: { background: "#fee2e2", color: "#dc2626", padding: "10px", borderRadius: "6px", marginBottom: "12px", fontSize: "13px" },
  info: { color: "#2563eb", marginBottom: "10px", fontSize: "13px" },
  formBox: { background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "8px", padding: "20px", marginBottom: "20px" },
  label: { display: "block", fontSize: "13px", color: "#374151", marginBottom: "4px", fontWeight: "500" },
  input: { width: "100%", padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "14px", boxSizing: "border-box" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: "14px" },
  thead: { background: "#1f2937" },
  th: { padding: "10px 12px", color: "white", textAlign: "left", fontWeight: "500" },
  tr: { borderBottom: "1px solid #e5e7eb" },
  td: { padding: "10px 12px", color: "#374151" },
  btnGreen: { padding: "8px 16px", background: "#16a34a", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "13px" },
  btnGray: { padding: "8px 16px", background: "#6b7280", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "13px" },
  btnSmBlue: { padding: "4px 10px", background: "#3b82f6", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "12px" },
  badge: { padding: "3px 8px", borderRadius: "12px", color: "white", fontSize: "11px", fontWeight: "600" },
  totalsBox: { background: "white", border: "1px solid #e5e7eb", borderRadius: "8px", padding: "16px", maxWidth: "320px", marginLeft: "auto" },
  totalRow: { display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: "14px", color: "#374151" },
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 },
  modal: { background: "white", borderRadius: "10px", padding: "24px", width: "680px", maxWidth: "95vw", maxHeight: "85vh", overflowY: "auto" },
};

export default GRNPage;
