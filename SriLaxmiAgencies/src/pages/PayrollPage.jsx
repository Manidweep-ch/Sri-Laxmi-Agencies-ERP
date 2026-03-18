import { useEffect, useState } from "react";
import MainLayout from "../layout/MainLayout";
import { getPayrollRuns, getPayrollRun, preparePayroll, updatePayrollItems, confirmPayroll } from "../services/payrollService";
import { usePageStyles } from "../hooks/usePageStyles";
import { useTheme } from "../context/ThemeContext";
import { getTheme } from "../theme";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const METHODS = ["CASH","UPI","BANK_TRANSFER","CHEQUE","NEFT","RTGS"];
const fmt = v => `Rs.${parseFloat(v || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
const now = new Date();

function PayrollRunPage({ runId, onBack, onDone, ps }) {
  const { dark } = useTheme();
  const t = getTheme(dark);
  const [run, setRun] = useState(null);
  const [items, setItems] = useState([]);
  const [method, setMethod] = useState("BANK_TRANSFER");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const r = await getPayrollRun(runId);
      setRun(r);
      setItems((r.items || []).map(i => ({
        id: i.id,
        staffName: i.staff?.name || "Unknown",
        designation: i.staff?.designation || "",
        baseSalary: parseFloat(i.baseSalary || 0),
        deduction: parseFloat(i.deduction || 0),
        finalAmount: parseFloat(i.finalAmount || 0),
        included: i.included,
        notes: i.notes || "",
      })));
    } catch { setError("Failed to load payroll run"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [runId]);

  const updateItem = (idx, field, value) => {
    setItems(prev => prev.map((item, i) => {
      if (i !== idx) return item;
      const updated = { ...item, [field]: value };
      if (field === "deduction") {
        const ded = parseFloat(value) || 0;
        updated.finalAmount = Math.max(0, updated.baseSalary - ded);
      }
      return updated;
    }));
  };

  const handleSaveDraft = async () => {
    try {
      setLoading(true); setError("");
      await updatePayrollItems(runId, items.map(i => ({
        id: i.id, deduction: i.deduction, finalAmount: i.finalAmount,
        included: i.included, notes: i.notes,
      })));
      await load();
    } catch (e) { setError(e.response?.data?.message || "Failed to save"); }
    finally { setLoading(false); }
  };

  const handleConfirm = async () => {
    if (!window.confirm("Confirm payroll? This will record salary payments for all included staff.")) return;
    try {
      setConfirming(true); setError("");
      await updatePayrollItems(runId, items.map(i => ({
        id: i.id, deduction: i.deduction, finalAmount: i.finalAmount,
        included: i.included, notes: i.notes,
      })));
      await confirmPayroll(runId, method);
      onDone();
      onBack();
    } catch (e) { setError(e.response?.data?.message || "Failed to confirm payroll"); }
    finally { setConfirming(false); }
  };

  const totalPayable = items.filter(i => i.included).reduce((s, i) => s + i.finalAmount, 0);
  const includedCount = items.filter(i => i.included).length;
  const skippedCount = items.filter(i => !i.included).length;
  const isDraft = run?.status === "DRAFT";

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
        <button onClick={onBack} style={{ padding: "7px 14px", border: `1px solid ${t.border}`, borderRadius: "6px", background: t.surface, color: t.text, cursor: "pointer", fontSize: "13px" }}>
          Back
        </button>
        <div>
          <h2 style={{ margin: 0, fontSize: "18px", color: t.text }}>
            Payroll — {run ? `${MONTHS[run.month - 1]} ${run.year}` : "Loading..."}
          </h2>
          <div style={{ fontSize: "12px", color: t.textSub, marginTop: "2px" }}>
            {run?.status === "CONFIRMED"
              ? `Confirmed by ${run.processedBy} · Total paid: ${fmt(run.totalPaid)}`
              : `Draft · Prepared by ${run?.processedBy}`}
          </div>
        </div>
        <span style={{ marginLeft: "auto", padding: "4px 12px", borderRadius: "12px", fontSize: "12px", fontWeight: 700,
          background: run?.status === "CONFIRMED" ? "#dcfce7" : "#fef9c3",
          color: run?.status === "CONFIRMED" ? "#16a34a" : "#ca8a04" }}>
          {run?.status || "DRAFT"}
        </span>
      </div>

      {error && <div style={ps.alertError}>{error}</div>}

      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px,1fr))", gap: "12px", marginBottom: "20px" }}>
        {[
          { label: "Total Staff", value: items.length, color: "#2563eb" },
          { label: "Included", value: includedCount, color: "#16a34a" },
          { label: "Skipped", value: skippedCount, color: "#ef4444" },
          { label: "Total Payable", value: fmt(totalPayable), color: "#7c3aed", big: true },
        ].map(c => (
          <div key={c.label} style={{ background: t.surfaceAlt, border: `1px solid ${t.border}`, borderRadius: "8px", padding: "14px" }}>
            <div style={{ fontSize: "11px", color: t.textSub, marginBottom: "4px" }}>{c.label}</div>
            <div style={{ fontSize: c.big ? "18px" : "22px", fontWeight: 700, color: c.color }}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* Items table */}
      <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "8px", padding: "16px", marginBottom: "20px" }}>
        <table style={ps.table}>
          <thead>
            <tr style={ps.thead}>
              <th style={ps.th}>Include</th>
              <th style={ps.th}>Staff</th>
              <th style={ps.th}>Designation</th>
              <th style={ps.th}>Base Salary</th>
              <th style={ps.th}>Deduction</th>
              <th style={ps.th}>Final Amount</th>
              <th style={ps.th}>Notes / Reason</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={item.id} style={{ ...ps.tr, opacity: item.included ? 1 : 0.45 }}>
                <td style={{ ...ps.td, textAlign: "center" }}>
                  {isDraft ? (
                    <input type="checkbox" checked={item.included}
                      onChange={e => updateItem(idx, "included", e.target.checked)}
                      style={{ width: "16px", height: "16px", cursor: "pointer" }} />
                  ) : (
                    <span style={{ color: item.included ? "#16a34a" : "#ef4444", fontWeight: 700 }}>
                      {item.included ? "Yes" : "No"}
                    </span>
                  )}
                </td>
                <td style={{ ...ps.td, fontWeight: 600 }}>{item.staffName}</td>
                <td style={ps.tdSub}>{item.designation || "—"}</td>
                <td style={ps.td}>{fmt(item.baseSalary)}</td>
                <td style={ps.td}>
                  {isDraft ? (
                    <input type="number" min="0" max={item.baseSalary}
                      value={item.deduction}
                      onChange={e => updateItem(idx, "deduction", e.target.value)}
                      style={{ ...ps.input, width: "110px", marginBottom: 0, borderColor: item.deduction > 0 ? "#f59e0b" : undefined }} />
                  ) : (
                    <span style={{ color: item.deduction > 0 ? "#f59e0b" : t.textSub }}>
                      {item.deduction > 0 ? `-${fmt(item.deduction)}` : "—"}
                    </span>
                  )}
                </td>
                <td style={{ ...ps.td, fontWeight: 700, color: item.included ? "#16a34a" : "#ef4444" }}>
                  {fmt(item.finalAmount)}
                </td>
                <td style={ps.td}>
                  {isDraft ? (
                    <input type="text" placeholder="e.g. Half day, absent..."
                      value={item.notes}
                      onChange={e => updateItem(idx, "notes", e.target.value)}
                      style={{ ...ps.input, width: "180px", marginBottom: 0 }} />
                  ) : (
                    <span style={ps.tdSub}>{item.notes || "—"}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Actions */}
      {isDraft && (
        <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "8px", padding: "16px" }}>
          <div style={{ display: "flex", gap: "12px", alignItems: "flex-end", flexWrap: "wrap" }}>
            <div>
              <label style={ps.label}>Payment Method</label>
              <select style={{ ...ps.input, width: "180px", marginBottom: 0 }}
                value={method} onChange={e => setMethod(e.target.value)}>
                {METHODS.map(m => <option key={m} value={m}>{m.replace(/_/g, " ")}</option>)}
              </select>
            </div>
            <button style={ps.btnGhost} onClick={handleSaveDraft} disabled={loading}>
              {loading ? "Saving..." : "Save Draft"}
            </button>
            <button style={{ ...ps.btnSuccess, minWidth: "160px" }} onClick={handleConfirm} disabled={confirming}>
              {confirming ? "Confirming..." : `Confirm & Pay ${fmt(totalPayable)}`}
            </button>
          </div>
          <div style={{ marginTop: "10px", fontSize: "12px", color: t.textSub }}>
            Confirming will record salary payments for {includedCount} staff member{includedCount !== 1 ? "s" : ""}. This cannot be undone.
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main PayrollPage ──────────────────────────────────────────────────────────
export default function PayrollPage() {
  const ps = usePageStyles();
  const { t } = ps;
  const { dark } = useTheme();

  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedRunId, setSelectedRunId] = useState(null);
  const [preparing, setPreparing] = useState(false);
  const [selMonth, setSelMonth] = useState(now.getMonth() + 1);
  const [selYear, setSelYear] = useState(now.getFullYear());

  const load = async () => {
    setLoading(true);
    try { setRuns(await getPayrollRuns()); }
    catch { setError("Failed to load payroll history"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handlePrepare = async () => {
    try {
      setPreparing(true); setError("");
      const run = await preparePayroll(selMonth, selYear);
      await load();
      setSelectedRunId(run.id);
    } catch (e) { setError(e.response?.data?.message || "Failed to prepare payroll"); }
    finally { setPreparing(false); }
  };

  if (selectedRunId) {
    return (
      <MainLayout>
        <PayrollRunPage runId={selectedRunId} ps={ps}
          onBack={() => setSelectedRunId(null)} onDone={load} />
      </MainLayout>
    );
  }

  const years = [];
  for (let y = now.getFullYear(); y >= now.getFullYear() - 3; y--) years.push(y);

  return (
    <MainLayout>
      <div style={ps.pageHeader}>
        <h2 style={{ margin: 0 }}>Payroll</h2>
      </div>

      {error && <div style={ps.alertError}>{error}</div>}
      {loading && <div style={ps.alertInfo}>Loading...</div>}

      {/* Run payroll */}
      <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "8px", padding: "20px", marginBottom: "24px" }}>
        <div style={{ fontWeight: 700, fontSize: "14px", color: t.text, marginBottom: "14px" }}>Run Payroll for Month</div>
        <div style={{ display: "flex", gap: "12px", alignItems: "flex-end", flexWrap: "wrap" }}>
          <div>
            <label style={ps.label}>Month</label>
            <select style={{ ...ps.input, width: "120px", marginBottom: 0 }}
              value={selMonth} onChange={e => setSelMonth(parseInt(e.target.value))}>
              {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
          </div>
          <div>
            <label style={ps.label}>Year</label>
            <select style={{ ...ps.input, width: "100px", marginBottom: 0 }}
              value={selYear} onChange={e => setSelYear(parseInt(e.target.value))}>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <button style={ps.btnPrimary} onClick={handlePrepare} disabled={preparing}>
            {preparing ? "Preparing..." : "Prepare Payroll"}
          </button>
        </div>
        <div style={{ marginTop: "8px", fontSize: "12px", color: t.textSub }}>
          If a payroll for this month already exists, it will open the existing draft.
        </div>
      </div>

      {/* History */}
      <div style={{ fontWeight: 700, fontSize: "14px", color: t.text, marginBottom: "12px" }}>Payroll History</div>
      <div style={ps.tableWrap}>
        <table style={ps.table}>
          <thead>
            <tr style={ps.thead}>
              <th style={ps.th}>Month</th>
              <th style={ps.th}>Year</th>
              <th style={ps.th}>Status</th>
              <th style={ps.th}>Total Paid</th>
              <th style={ps.th}>Processed By</th>
              <th style={ps.th}>Date</th>
              <th style={ps.th}>Action</th>
            </tr>
          </thead>
          <tbody>
            {runs.length === 0 && !loading && (
              <tr><td colSpan={7} style={{ ...ps.td, textAlign: "center", color: "#9ca3af", padding: "32px" }}>No payroll runs yet</td></tr>
            )}
            {runs.map(r => (
              <tr key={r.id} style={ps.tr}>
                <td style={{ ...ps.td, fontWeight: 600 }}>{MONTHS[r.month - 1]}</td>
                <td style={ps.tdSub}>{r.year}</td>
                <td style={ps.td}>
                  <span style={{ padding: "3px 10px", borderRadius: "12px", fontSize: "11px", fontWeight: 700,
                    background: r.status === "CONFIRMED" ? "#dcfce7" : "#fef9c3",
                    color: r.status === "CONFIRMED" ? "#16a34a" : "#ca8a04" }}>
                    {r.status}
                  </span>
                </td>
                <td style={{ ...ps.td, fontWeight: 600, color: "#16a34a" }}>{fmt(r.totalPaid)}</td>
                <td style={ps.tdSub}>{r.processedBy || "—"}</td>
                <td style={ps.tdSub}>{r.runDate || "—"}</td>
                <td style={ps.td}>
                  <button style={ps.btnSmPrimary} onClick={() => setSelectedRunId(r.id)}>
                    {r.status === "DRAFT" ? "Edit Draft" : "View"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </MainLayout>
  );
}
