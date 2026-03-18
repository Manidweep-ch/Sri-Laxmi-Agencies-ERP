import { useEffect, useState, useRef, Fragment } from "react";
import MainLayout from "../layout/MainLayout";
import { getSalesReturns, createSalesReturn, getSalesReturnItems, getRefundsByReturn, getTotalRefunded } from "../services/salesReturnService";
import { getInvoiceSummaries, getInvoiceItems } from "../services/invoiceService";
import { usePageStyles } from "../hooks/usePageStyles";
import { useTheme } from "../context/ThemeContext";
import { getTheme } from "../theme";

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
            <div key={item.id} style={sd.option} onMouseDown={() => { onSelect(item); onChange(labelFn(item)); setOpen(false); }}>
              {labelFn(item)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SalesReturnsPage() {
  const ps = usePageStyles();
  const { t } = ps;
  const s = {
    header: ps.pageHeader, error: ps.alertError, info: ps.alertInfo,
    formBox: ps.formBox, label: ps.label, input: ps.input,
    table: ps.table, thead: ps.thead, th: ps.th, tr: ps.tr, td: ps.td,
    btn: ps.btnPrimary, btnGreen: ps.btnSuccess, btnGray: ps.btnGhost,
    btnSmRed: ps.btnSmDanger, totalsBox: ps.totalsBox, totalRow: ps.totalRow,
  };

  const [returns, setReturns] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [expandedItems, setExpandedItems] = useState({});
  const [expandedTab, setExpandedTab] = useState({});
  const [refundData, setRefundData] = useState({}); // { [returnId]: { refunds, totalRefunded } }

  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [invoiceSearch, setInvoiceSearch] = useState("");
  const [reason, setReason] = useState("");
  const [lines, setLines] = useState([]);
  const [loadingItems, setLoadingItems] = useState(false);

  const filtered = returns.filter(r =>
    r.returnNumber?.toLowerCase().includes(search.toLowerCase()) ||
    r.invoice?.invoiceNumber?.toLowerCase().includes(search.toLowerCase())
  );

  const load = async () => {
    setLoading(true);
    try {
      const [ret, inv] = await Promise.all([getSalesReturns(), getInvoiceSummaries()]);
      setReturns(ret);
      setInvoices(inv.filter(i => i.invoiceType === "SO"));
      setError("");
    } catch { setError("Failed to load data"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  // When invoice is selected, auto-load its items and pre-fill lines
  const handleSelectInvoice = async (inv) => {
    setSelectedInvoice(inv);
    setLines([]);
    if (!inv) return;
    setLoadingItems(true);
    try {
      const items = await getInvoiceItems(inv.id);
      setLines(items.map(item => ({
        productId: item.product?.id,
        productName: item.product?.name + (item.product?.size ? ` - ${item.product.size}` : ""),
        unitPrice: item.unitPrice ? String(item.unitPrice) : "",
        maxQty: item.quantity,
        qty: item.quantity,
      })));
    } catch { setError("Failed to load invoice items"); }
    finally { setLoadingItems(false); }
  };

  const updateLine = (idx, f, v) => setLines(prev => prev.map((l, i) => i === idx ? { ...l, [f]: v } : l));
  const removeLine = (idx) => setLines(prev => prev.filter((_, i) => i !== idx));

  const total = lines.reduce((s, l) => s + (parseFloat(l.unitPrice) || 0) * (parseInt(l.qty) || 0), 0);

  const handleCreate = async () => {
    if (!selectedInvoice) { setError("Select an invoice"); return; }
    if (lines.length === 0) { setError("No items to return"); return; }
    const activeLines = lines.filter(l => parseInt(l.qty) > 0);
    if (activeLines.length === 0) { setError("Set quantity > 0 for at least one item"); return; }
    for (const l of activeLines) {
      if (!l.unitPrice || parseFloat(l.unitPrice) <= 0) { setError(`Enter unit price for ${l.productName}`); return; }
      if (parseInt(l.qty) > l.maxQty) { setError(`Max returnable qty for ${l.productName} is ${l.maxQty}`); return; }
    }
    try {
      setLoading(true); setError("");
      await createSalesReturn({
        invoice: { id: selectedInvoice.id },
        reason,
        items: activeLines.map(l => ({ product: { id: l.productId }, quantity: parseInt(l.qty), unitPrice: parseFloat(l.unitPrice) }))
      });
      setShowCreate(false); setSelectedInvoice(null); setInvoiceSearch(""); setReason(""); setLines([]);
      load();
    } catch (e) { setError(e.response?.data?.message || "Failed to create return"); }
    finally { setLoading(false); }
  };

  const fmt = (d) => {
    if (!d) return "-";
    if (Array.isArray(d)) return `${d[0]}-${String(d[1]).padStart(2,"0")}-${String(d[2]).padStart(2,"0")}`;
    return String(d);
  };

  const loadRefunds = async (id) => {
    try {
      const [refunds, totalRefunded] = await Promise.all([getRefundsByReturn(id), getTotalRefunded(id)]);
      setRefundData(prev => ({ ...prev, [id]: { refunds, totalRefunded: parseFloat(totalRefunded) || 0 } }));
    } catch { setRefundData(prev => ({ ...prev, [id]: { refunds: [], totalRefunded: 0 } })); }
  };

  const toggleExpand = async (id) => {
    if (expandedId === id) { setExpandedId(null); return; }
    setExpandedId(id);
    setExpandedTab(prev => ({ ...prev, [id]: prev[id] || "items" }));
    if (!expandedItems[id]) {
      try {
        const items = await getSalesReturnItems(id);
        setExpandedItems(prev => ({ ...prev, [id]: items }));
      } catch { setExpandedItems(prev => ({ ...prev, [id]: [] })); }
    }
    if (!refundData[id]) await loadRefunds(id);
  };

  return (
    <MainLayout>
      <div style={s.header}>
        <h2 style={{ margin: 0 }}>Sales Returns</h2>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <input style={{ ...s.input, width: "220px" }} placeholder="Search return#, invoice..."
            value={search} onChange={e => setSearch(e.target.value)} />
          <button style={s.btnGreen} onClick={() => { setShowCreate(true); setError(""); setLines([]); setSelectedInvoice(null); setInvoiceSearch(""); setReason(""); }}>
            + New Return
          </button>
        </div>
      </div>

      {error && <div style={s.error}>{error}</div>}
      {loading && <div style={s.info}>Loading...</div>}

      {showCreate && (
        <div style={s.formBox}>
          <h3 style={{ margin: "0 0 16px" }}>Create Sales Return</h3>
          <div style={{ display: "flex", gap: "16px", marginBottom: "16px", flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 300px" }}>
              <label style={s.label}>Invoice * (select to auto-load items)</label>
              <SearchDropdown placeholder="Search invoice number..." items={invoices}
                labelFn={i => `${i.invoiceNumber} — ${i.customerName || ""}`}
                value={invoiceSearch} onChange={setInvoiceSearch}
                onSelect={(inv) => { handleSelectInvoice(inv); setInvoiceSearch(inv ? `${inv.invoiceNumber} — ${inv.customerName || ""}` : ""); }} />
              {selectedInvoice && (
                <div style={{ marginTop: "4px", fontSize: "12px", color: t.success }}>
                  ✓ {selectedInvoice.invoiceNumber} | Total: ₹{parseFloat(selectedInvoice.totalAmount || 0).toFixed(2)}
                </div>
              )}
            </div>
            <div style={{ flex: "1 1 300px" }}>
              <label style={s.label}>Reason</label>
              <input style={s.input} placeholder="e.g. Damaged goods, Wrong item..." value={reason} onChange={e => setReason(e.target.value)} />
            </div>
          </div>

          {loadingItems && <div style={s.info}>Loading invoice items...</div>}

          {lines.length > 0 && (
            <>
              <div style={{ fontSize: "13px", color: "#6b7280", marginBottom: "8px" }}>
                Adjust qty to 0 for items not being returned. Unit price is auto-filled from invoice.
              </div>
              <table style={{ ...s.table, marginBottom: "16px" }}>
                <thead><tr style={s.thead}>
                  <th style={s.th}>Product</th>
                  <th style={s.th}>Unit Price (₹)</th>
                  <th style={s.th}>Return Qty</th>
                  <th style={s.th}>Max</th>
                  <th style={s.th}>Line Total</th>
                  <th style={s.th}></th>
                </tr></thead>
                <tbody>
                  {lines.map((l, idx) => {
                    const price = parseFloat(l.unitPrice) || 0;
                    const qty = parseInt(l.qty) || 0;
                    const over = qty > l.maxQty;
                    return (
                      <tr key={idx} style={s.tr}>
                        <td style={s.td}>{l.productName}</td>
                        <td style={s.td}>
                          <input style={{ ...s.input, width: "100px" }} type="number" value={l.unitPrice}
                            onChange={e => updateLine(idx, "unitPrice", e.target.value)} />
                        </td>
                        <td style={s.td}>
                          <input style={{ ...s.input, width: "70px", borderColor: over ? "#ef4444" : "#d1d5db" }}
                            type="number" min="0" max={l.maxQty} value={l.qty}
                            onChange={e => updateLine(idx, "qty", e.target.value)} />
                          {over && <div style={{ fontSize: "11px", color: "#ef4444" }}>Max {l.maxQty}</div>}
                        </td>
                        <td style={{ ...s.td, color: "#6b7280" }}>{l.maxQty}</td>
                        <td style={s.td}>₹{(price * qty).toFixed(2)}</td>
                        <td style={s.td}><button style={s.btnSmRed} onClick={() => removeLine(idx)}>✕</button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "16px" }}>
                <div style={s.totalsBox}>
                  <div style={{ ...s.totalRow, fontWeight: "700", fontSize: "16px" }}>
                    <span>Return Total</span><span>₹{total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </>
          )}

          <div style={{ display: "flex", gap: "10px" }}>
            <button style={s.btnGreen} onClick={handleCreate} disabled={loading || loadingItems}>Confirm Return</button>
            <button style={s.btnGray} onClick={() => { setShowCreate(false); setLines([]); }}>Cancel</button>
          </div>
        </div>
      )}

      <table style={s.table}>
        <thead><tr style={s.thead}>
          <th style={s.th}></th>
          <th style={s.th}>Return #</th><th style={s.th}>Date</th>
          <th style={s.th}>Invoice</th><th style={s.th}>Customer</th>
          <th style={s.th}>Reason</th><th style={s.th}>Total Amount</th>
        </tr></thead>
        <tbody>
          {filtered.length === 0 && !loading && (
            <tr><td colSpan={7} style={{ ...s.td, textAlign: "center", color: "#9ca3af" }}>No sales returns found</td></tr>
          )}
          {filtered.map(r => {
            const isExpanded = expandedId === r.id;
            return (
              <Fragment key={r.id}>
                <tr style={{ ...s.tr, cursor: "pointer", background: isExpanded ? t.successBg : t.surface, borderLeft: isExpanded ? `3px solid ${t.success}` : "3px solid transparent" }}
                  onClick={() => toggleExpand(r.id)}>
                  <td style={{ ...s.td, width: "32px", textAlign: "center", color: "#6b7280", fontSize: "12px" }}>
                    {isExpanded ? "▲" : "▼"}
                  </td>
                  <td style={{ ...s.td, fontWeight: 600 }}>{r.returnNumber}</td>
                  <td style={s.td}>{fmt(r.returnDate)}</td>
                  <td style={s.td}>{r.invoice?.invoiceNumber || "-"}</td>
                  <td style={s.td}>{r.invoice?.customer?.name || "-"}</td>
                  <td style={s.td}>{r.reason || "-"}</td>
                  <td style={{ ...s.td, color: "#ef4444", fontWeight: 600 }}>₹{parseFloat(r.totalAmount || 0).toFixed(2)}</td>
                </tr>
                {isExpanded && (
                  <tr>
                    <td colSpan={7} style={{ padding: 0, background: t.surfaceAlt, borderBottom: `3px solid ${t.success}` }}>
                      <div style={{ padding: "16px 24px" }}>
                        {/* Header */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                          <div>
                            <span style={{ fontWeight: 700, fontSize: "14px", color: t.text }}>{r.returnNumber}</span>
                            <span style={{ color: t.textMuted, fontSize: "12px", marginLeft: "8px" }}>
                              — {r.invoice?.invoiceNumber} — {r.invoice?.customer?.name}
                            </span>
                          </div>
                          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                            {(() => {
                              const rd = refundData[r.id] || {};
                              const totalAmt = parseFloat(r.totalAmount || 0);
                              const refunded = rd.totalRefunded || 0;
                              const pending = totalAmt - refunded;
                              return (
                                <>
                                  <span style={{ fontSize: "12px", color: "#6b7280" }}>Return: <b>₹{totalAmt.toFixed(2)}</b></span>
                                  <span style={{ fontSize: "12px", color: "#16a34a" }}>Refunded: <b>₹{refunded.toFixed(2)}</b></span>
                                  <span style={{ fontSize: "12px", color: pending > 0 ? "#ef4444" : "#16a34a", fontWeight: 700 }}>
                                    Pending: ₹{Math.max(0, pending).toFixed(2)}
                                  </span>
                                </>
                              );
                            })()}
                          </div>
                        </div>

                        {/* Tabs */}
                        <div style={{ display: "flex", gap: "6px", marginBottom: "14px" }}>
                          {[["items", "📦 Returned Items"], ["refunds", "💸 Refunds"]].map(([tabKey, label]) => (
                            <button key={tabKey} style={{
                              padding: "6px 14px", border: "none", cursor: "pointer", fontSize: "12px", fontWeight: 600, borderRadius: "6px",
                              background: (expandedTab[r.id] || "items") === tabKey ? t.tableHead : t.surfaceAlt,
                              color: (expandedTab[r.id] || "items") === tabKey ? t.tableHeadText : t.textSub
                            }} onClick={() => setExpandedTab(prev => ({ ...prev, [r.id]: tabKey }))}>{label}</button>
                          ))}
                        </div>

                        {/* Items Tab */}
                        {(expandedTab[r.id] || "items") === "items" && (
                          <table style={s.table}>
                            <thead><tr style={s.thead}>
                              <th style={s.th}>Product</th><th style={s.th}>Unit Price</th>
                              <th style={s.th}>Qty</th><th style={s.th}>Line Total</th>
                            </tr></thead>
                            <tbody>
                              {(expandedItems[r.id] || []).length === 0 && (
                                <tr><td colSpan={4} style={{ ...s.td, textAlign: "center", color: "#9ca3af" }}>No items</td></tr>
                              )}
                              {(expandedItems[r.id] || []).map(item => (
                                <tr key={item.id} style={s.tr}>
                                  <td style={s.td}>{item.product?.name}{item.product?.size ? ` - ${item.product.size}` : ""}</td>
                                  <td style={s.td}>Rs.{parseFloat(item.unitPrice || 0).toFixed(2)}</td>
                                  <td style={s.td}>{item.quantity}</td>
                                  <td style={{ ...s.td, color: "#ef4444", fontWeight: 600 }}>Rs.{parseFloat(item.totalAmount || 0).toFixed(2)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}

                        {/* Refunds Tab */}
                        {expandedTab[r.id] === "refunds" && (() => {
                          const rd = refundData[r.id] || {};
                          const totalAmt = parseFloat(r.totalAmount || 0);
                          const refunded = rd.totalRefunded || 0;
                          const pending = Math.max(0, totalAmt - refunded);
                          return (
                            <>
                              {pending > 0 && (
                                <div style={{ background: "#fffbeb", border: "1px solid #fcd34d", borderRadius: "6px", padding: "10px 14px", marginBottom: "12px", fontSize: "13px", color: "#92400e" }}>
                                  Rs.{pending.toFixed(2)} pending refund — go to Finance &gt; Payments &gt; Refunds tab to pay.
                                </div>
                              )}
                              {pending === 0 && (
                                <div style={{ background: t.successBg, border: `1px solid ${t.successBorder}`, borderRadius: "6px", padding: "10px 14px", marginBottom: "12px", fontSize: "13px", color: t.success }}>
                                  Full refund of Rs.{totalAmt.toFixed(2)} has been paid to customer.
                                </div>
                              )}
                              <table style={s.table}>
                                <thead><tr style={s.thead}>
                                  <th style={s.th}>#</th><th style={s.th}>Date</th>
                                  <th style={s.th}>Amount</th><th style={s.th}>Method</th><th style={s.th}>Notes</th>
                                </tr></thead>
                                <tbody>
                                  {(rd.refunds || []).length === 0 && (
                                    <tr><td colSpan={5} style={{ ...s.td, textAlign: "center", color: "#9ca3af" }}>No refunds recorded yet</td></tr>
                                  )}
                                  {(rd.refunds || []).map((rf, i) => (
                                    <tr key={rf.id} style={s.tr}>
                                      <td style={s.td}>{i + 1}</td>
                                      <td style={s.td}>{fmt(rf.refundDate)}</td>
                                      <td style={{ ...s.td, color: "#ef4444", fontWeight: 600 }}>Rs.{parseFloat(rf.amount).toFixed(2)}</td>
                                      <td style={s.td}>{rf.paymentMethod?.replace("_"," ")}</td>
                                      <td style={s.td}>{rf.notes || "-"}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </>
                          );
                        })()}
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </MainLayout>
  );
}

export default SalesReturnsPage;
