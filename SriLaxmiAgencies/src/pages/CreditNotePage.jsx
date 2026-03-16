import { useEffect, useState, useRef } from "react";
import MainLayout from "../layout/MainLayout";
import { getCreditNotes, createCreditNote } from "../services/creditNoteService";
import { getInvoiceSummaries } from "../services/invoiceService";
import { getOutstanding } from "../services/paymentService";
import { usePageStyles } from "../hooks/usePageStyles";

function SearchDropdown({ placeholder, items, labelFn, onSelect, value, onChange, t }) {
  const [open, setOpen] = useState(false);
  const ref = useRef();
  const filtered = items.filter(i => labelFn(i).toLowerCase().includes(value.toLowerCase()));
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h);
  }, []);
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <input style={{ width: "100%", padding: "9px 12px", border: `1px solid ${t.inputBorder}`, borderRadius: "7px", fontSize: "13px", background: t.inputBg, color: t.text, boxSizing: "border-box", outline: "none" }}
        placeholder={placeholder} value={value}
        onChange={e => { onChange(e.target.value); onSelect(null); setOpen(true); }}
        onFocus={() => setOpen(true)} />
      {open && filtered.length > 0 && (
        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: t.surface, border: `1px solid ${t.border}`, borderRadius: "7px", zIndex: 100, maxHeight: "200px", overflowY: "auto", boxShadow: "0 4px 16px rgba(0,0,0,0.12)" }}>
          {filtered.map(item => (
            <div key={item.id} style={{ padding: "9px 12px", cursor: "pointer", fontSize: "13px", color: t.text, borderBottom: `1px solid ${t.border}` }}
              onMouseDown={() => { onSelect(item); onChange(labelFn(item)); setOpen(false); }}>
              {labelFn(item)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CreditNotePage() {
  const [creditNotes, setCreditNotes] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [invoiceSearch, setInvoiceSearch] = useState("");
  const [outstanding, setOutstanding] = useState(null);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [cnDate, setCnDate] = useState(new Date().toISOString().split("T")[0]);
  const ps = usePageStyles();
  const { t } = ps;

  const filtered = creditNotes.filter(cn =>
    cn.creditNoteNumber?.toLowerCase().includes(search.toLowerCase()) ||
    cn.invoice?.invoiceNumber?.toLowerCase().includes(search.toLowerCase())
  );

  const load = async () => {
    setLoading(true);
    try {
      const [cn, inv] = await Promise.all([getCreditNotes(), getInvoiceSummaries()]);
      setCreditNotes(cn);
      setInvoices(inv.filter(i => i.invoiceType === "SO" && parseFloat(i.dueAmount || 0) > 0));
      setError("");
    } catch { setError("Failed to load data"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleSelectInvoice = async (inv) => {
    setSelectedInvoice(inv);
    if (inv) {
      try { setOutstanding(await getOutstanding(inv.id)); }
      catch { setOutstanding(null); }
    } else setOutstanding(null);
  };

  const handleCreate = async () => {
    if (!selectedInvoice) { setError("Select an invoice"); return; }
    if (!amount || parseFloat(amount) <= 0) { setError("Enter a valid amount"); return; }
    if (outstanding && parseFloat(amount) > parseFloat(outstanding.outstandingAmount || 0)) {
      setError(`Amount cannot exceed outstanding balance of ₹${parseFloat(outstanding.outstandingAmount).toFixed(2)}`); return;
    }
    try {
      setLoading(true); setError("");
      await createCreditNote({ invoice: { id: selectedInvoice.id }, amount: parseFloat(amount), date: cnDate, reason });
      setShowCreate(false); setSelectedInvoice(null); setInvoiceSearch(""); setAmount(""); setReason(""); setOutstanding(null);
      load();
    } catch (e) { setError(e.response?.data?.message || "Failed to create credit note"); }
    finally { setLoading(false); }
  };

  const fmt = (d) => {
    if (!d) return "-";
    if (Array.isArray(d)) return `${d[0]}-${String(d[1]).padStart(2,"0")}-${String(d[2]).padStart(2,"0")}`;
    return String(d);
  };

  const inp = { ...ps.input, marginBottom: 0 };

  return (
    <MainLayout>
      <div style={ps.pageHeader}>
        <h2 style={ps.pageTitle}>Credit Notes</h2>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <input style={ps.searchInput} placeholder="Search CN#, invoice..." value={search} onChange={e => setSearch(e.target.value)} />
          <button style={ps.btnSuccess} onClick={() => { setShowCreate(true); setError(""); }}>+ New Credit Note</button>
        </div>
      </div>

      {error && <div style={ps.alertError}>{error}</div>}
      {loading && <div style={ps.alertInfo}>Loading...</div>}

      {showCreate && (
        <div style={ps.formBox}>
          <div style={{ fontSize: "15px", fontWeight: 700, color: t.text, marginBottom: "16px" }}>Create Credit Note</div>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: "14px", marginBottom: "14px" }}>
            <div>
              <label style={ps.label}>Invoice * (outstanding &gt; 0 only)</label>
              <SearchDropdown placeholder="Search invoice..." items={invoices} t={t}
                labelFn={i => `${i.invoiceNumber} — ${i.customerName || ""} (Due: ₹${parseFloat(i.dueAmount||0).toFixed(2)})`}
                value={invoiceSearch} onChange={setInvoiceSearch}
                onSelect={(inv) => { handleSelectInvoice(inv); setInvoiceSearch(inv ? `${inv.invoiceNumber} — ${inv.customerName || ""}` : ""); }} />
              {outstanding && (
                <div style={{ marginTop: "5px", fontSize: "12px", color: t.textSub }}>
                  Outstanding: <span style={{ color: t.danger, fontWeight: 700 }}>₹{parseFloat(outstanding.outstandingAmount || 0).toFixed(2)}</span>
                </div>
              )}
            </div>
            <div>
              <label style={ps.label}>Date</label>
              <input style={inp} type="date" value={cnDate} onChange={e => setCnDate(e.target.value)} />
            </div>
            <div>
              <label style={ps.label}>Amount (₹) *</label>
              <input style={inp} type="number" placeholder="0.00"
                max={outstanding ? parseFloat(outstanding.outstandingAmount) : undefined}
                value={amount} onChange={e => setAmount(e.target.value)} />
              {outstanding && <div style={{ fontSize: "11px", color: t.textMuted, marginTop: "3px" }}>Max: ₹{parseFloat(outstanding.outstandingAmount || 0).toFixed(2)}</div>}
            </div>
          </div>
          <div style={{ marginBottom: "16px" }}>
            <label style={ps.label}>Reason</label>
            <input style={inp} placeholder="e.g. Discount, Return adjustment..." value={reason} onChange={e => setReason(e.target.value)} />
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <button style={ps.btnSuccess} onClick={handleCreate} disabled={loading}>Issue Credit Note</button>
            <button style={ps.btnGhost} onClick={() => setShowCreate(false)}>Cancel</button>
          </div>
        </div>
      )}

      <div style={ps.tableWrap}>
        <table style={ps.table}>
          <thead><tr style={ps.thead}>
            <th style={ps.th}>CN #</th><th style={ps.th}>Date</th>
            <th style={ps.th}>Invoice</th><th style={ps.th}>Customer</th>
            <th style={ps.th}>Amount</th><th style={ps.th}>Reason</th>
          </tr></thead>
          <tbody>
            {filtered.length === 0 && !loading && (
              <tr><td colSpan={6} style={{ ...ps.td, textAlign: "center", color: t.textMuted, padding: "32px" }}>No credit notes found</td></tr>
            )}
            {filtered.map(cn => (
              <tr key={cn.id} style={{ ...ps.tr, background: t.surface }}>
                <td style={{ ...ps.td, fontWeight: 700 }}>{cn.creditNoteNumber}</td>
                <td style={ps.tdSub}>{fmt(cn.date)}</td>
                <td style={ps.td}>{cn.invoice?.invoiceNumber || "-"}</td>
                <td style={ps.td}>{cn.invoice?.customer?.name || "-"}</td>
                <td style={{ ...ps.td, color: t.warning, fontWeight: 700 }}>₹{parseFloat(cn.amount || 0).toFixed(2)}</td>
                <td style={ps.tdSub}>{cn.reason || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </MainLayout>
  );
}
