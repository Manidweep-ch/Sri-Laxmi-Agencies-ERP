import { useEffect, useState } from "react";
import MainLayout from "../layout/MainLayout";
import { getVehicles } from "../services/vehicleService";
import { getDrivers } from "../services/staffService";
import { createDelivery, updateDelivery, confirmDelivery, getDeliveryBySalesOrder } from "../services/deliveryService";
import { usePageStyles } from "../hooks/usePageStyles";
import { useTheme } from "../context/ThemeContext";
import { getTheme } from "../theme";

const STATUS_COLOR = { AVAILABLE: "#16a34a", ON_TRIP: "#2563eb", MAINTENANCE: "#f59e0b" };

export default function DeliveryAssignmentPage({ salesOrder, invoice, onBack, onSaved }) {
  const ps = usePageStyles();
  const { dark } = useTheme();
  const t = getTheme(dark);

  const [vehicles, setVehicles] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [existing, setExisting] = useState(null); // existing DRAFT delivery if any

  const [isPorter, setIsPorter] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState("");
  const [porterVehicleNumber, setPorterVehicleNumber] = useState("");
  const [porterName, setPorterName] = useState("");
  const [drivers, setDrivers] = useState([{ staffId: "", shareAmount: "" }]);
  const [transportCharge, setTransportCharge] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Promise.all([getVehicles(), getDrivers()]).then(([vs, dr]) => {
      setVehicles(vs);
      setStaffList(dr);
    }).catch(() => setError("Failed to load data"));

    // Load existing delivery if any
    getDeliveryBySalesOrder(salesOrder.id).then(res => {
      const d = res?.delivery;
      if (d && (d.status === "DRAFT" || d.status === "CANCELLED")) {
        setExisting(d);
        setIsPorter(!d.vehicle && (d.porterVehicleNumber || d.porterName));
        setSelectedVehicleId(d.vehicle?.id ? String(d.vehicle.id) : "");
        setPorterVehicleNumber(d.porterVehicleNumber || "");
        setPorterName(d.porterName || "");
        setTransportCharge(d.transportCharge ? String(d.transportCharge) : "");
        setNotes(d.notes || "");
        setDrivers(d.drivers?.length > 0
          ? d.drivers.map(dd => ({ staffId: String(dd.staff?.id || ""), shareAmount: dd.shareAmount ? String(dd.shareAmount) : "" }))
          : [{ staffId: "", shareAmount: "" }]);
      }
    }).catch(() => {});
  }, [salesOrder.id]);

  const addDriver = () => setDrivers(prev => [...prev, { staffId: "", shareAmount: "" }]);
  const removeDriver = (idx) => setDrivers(prev => prev.filter((_, i) => i !== idx));
  const updateDriver = (idx, field, val) => setDrivers(prev => prev.map((d, i) => i === idx ? { ...d, [field]: val } : d));

  const buildPayload = () => ({
    salesOrder: { id: salesOrder.id },
    invoice: invoice ? { id: invoice.id } : null,
    vehicle: (!isPorter && selectedVehicleId) ? { id: parseInt(selectedVehicleId) } : null,
    porterVehicleNumber: isPorter ? porterVehicleNumber : null,
    porterName: isPorter ? porterName : null,
    transportCharge: transportCharge ? parseFloat(transportCharge) : null,
    notes,
    drivers: drivers.filter(d => d.staffId).map(d => ({
      staff: { id: parseInt(d.staffId) },
      shareAmount: d.shareAmount ? parseFloat(d.shareAmount) : null
    }))
  });

  const validate = () => {
    if (!isPorter && !selectedVehicleId) { setError("Select a vehicle or use porter option"); return false; }
    if (isPorter && !porterVehicleNumber.trim()) { setError("Enter porter vehicle number"); return false; }
    if (!isPorter && drivers.filter(d => d.staffId).length === 0) { setError("Assign at least one driver"); return false; }
    return true;
  };

  const handleSaveDraft = async () => {
    if (!validate()) return;
    try {
      setLoading(true); setError("");
      if (existing) await updateDelivery(existing.id, buildPayload());
      else await createDelivery(buildPayload());
      onSaved("draft");
    } catch (e) { setError(e.response?.data?.message || "Failed to save"); }
    finally { setLoading(false); }
  };

  const handleConfirm = async () => {
    if (!validate()) return;
    try {
      setLoading(true); setError("");
      let delivery;
      if (existing) delivery = await updateDelivery(existing.id, buildPayload());
      else delivery = await createDelivery(buildPayload());
      await confirmDelivery(delivery.id);
      onSaved("confirmed");
    } catch (e) { setError(e.response?.data?.message || "Failed to confirm"); }
    finally { setLoading(false); }
  };

  const availableVehicles = vehicles.filter(v => v.status === "AVAILABLE" || (existing?.vehicle?.id === v.id));

  return (
    <MainLayout>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
        <button onClick={onBack} style={{ padding: "7px 14px", border: `1px solid ${t.border}`, borderRadius: "6px", background: t.surface, color: t.text, cursor: "pointer", fontSize: "13px" }}>← Back</button>
        <div>
          <h2 style={{ margin: 0, fontSize: "18px", color: t.text }}>Assign Delivery</h2>
          <div style={{ fontSize: "12px", color: t.textSub, marginTop: "2px" }}>
            {salesOrder.orderNumber} · {salesOrder.customer?.name}
            {invoice && <span> · {invoice.invoiceNumber}</span>}
          </div>
        </div>
        {existing && (
          <span style={{ marginLeft: "auto", padding: "3px 10px", borderRadius: "12px", fontSize: "11px", fontWeight: 700, background: "#f59e0b22", color: "#f59e0b" }}>
            Editing Draft
          </span>
        )}
      </div>

      {error && <div style={ps.alertError}>{error}</div>}

      {/* Transport type toggle */}
      <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "8px", padding: "16px", marginBottom: "16px" }}>
        <div style={{ fontWeight: 700, fontSize: "13px", color: t.text, marginBottom: "12px" }}>Transport Type</div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button style={ps.filterPill(!isPorter, "#2563eb")} onClick={() => setIsPorter(false)}>Own Fleet</button>
          <button style={ps.filterPill(isPorter, "#7c3aed")} onClick={() => setIsPorter(true)}>Porter / Hired</button>
        </div>
      </div>

      {/* Vehicle selection */}
      <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "8px", padding: "16px", marginBottom: "16px" }}>
        <div style={{ fontWeight: 700, fontSize: "13px", color: t.text, marginBottom: "12px" }}>
          {isPorter ? "Porter Details" : "Select Vehicle"}
        </div>

        {!isPorter ? (
          <>
            {availableVehicles.length === 0 ? (
              <div style={ps.alertWarning}>No vehicles available. All are on trip or under maintenance.</div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "10px" }}>
                {availableVehicles.map(v => (
                  <div key={v.id}
                    onClick={() => setSelectedVehicleId(String(v.id))}
                    style={{ border: `2px solid ${selectedVehicleId === String(v.id) ? "#2563eb" : t.border}`, borderRadius: "8px", padding: "12px", cursor: "pointer", background: selectedVehicleId === String(v.id) ? "#eff6ff" : t.surfaceAlt, transition: "all 0.15s" }}>
                    <div style={{ fontWeight: 700, fontSize: "14px", color: selectedVehicleId === String(v.id) ? "#2563eb" : t.text }}>{v.registrationNumber}</div>
                    <div style={{ fontSize: "12px", color: t.textSub, marginTop: "2px" }}>{v.vehicleType}{v.capacityKg ? ` · ${v.capacityKg}kg` : ""}</div>
                    <div style={{ marginTop: "6px", fontSize: "11px", fontWeight: 600, color: STATUS_COLOR[v.status] }}>{v.status}</div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
            <div>
              <label style={ps.label}>Porter Vehicle Number *</label>
              <input style={ps.input} placeholder="e.g. KA-01-XY-9999" value={porterVehicleNumber} onChange={e => setPorterVehicleNumber(e.target.value)} />
            </div>
            <div>
              <label style={ps.label}>Porter / Transporter Name</label>
              <input style={ps.input} placeholder="Name or company" value={porterName} onChange={e => setPorterName(e.target.value)} />
            </div>
          </div>
        )}
      </div>

      {/* Drivers — only for own fleet */}
      {!isPorter && (
      <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "8px", padding: "16px", marginBottom: "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
          <div style={{ fontWeight: 700, fontSize: "13px", color: t.text }}>Assign Drivers</div>
          <button style={ps.btnSmPrimary} onClick={addDriver}>+ Add Driver</button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {drivers.map((d, idx) => (
            <div key={idx} style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <div style={{ flex: 2 }}>
                {idx === 0 && <label style={ps.label}>Driver (Staff) *</label>}
                <select style={ps.input} value={d.staffId} onChange={e => updateDriver(idx, "staffId", e.target.value)}>
                  <option value="">— Select driver —</option>
                  {staffList.map(s => (
                    <option key={s.id} value={s.id}>{s.employeeId ? `${s.employeeId} · ` : ""}{s.name} ({s.designation || "Driver"})</option>
                  ))}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                {idx === 0 && <label style={ps.label}>Share Amount (Rs.)</label>}
                <input style={ps.input} type="number" min="0" placeholder="Optional" value={d.shareAmount} onChange={e => updateDriver(idx, "shareAmount", e.target.value)} />
              </div>
              {drivers.length > 1 && (
                <button style={{ ...ps.btnSmDanger, marginTop: idx === 0 ? "18px" : "0" }} onClick={() => removeDriver(idx)}>✕</button>
              )}
            </div>
          ))}
        </div>
        {drivers.length > 1 && (
          <div style={{ fontSize: "11px", color: t.textSub, marginTop: "8px" }}>Multiple drivers — enter share amount for each to split transport charge</div>
        )}
      </div>
      )}

      {/* Transport charge + notes */}
      <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "8px", padding: "16px", marginBottom: "20px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "14px" }}>
          <div>
            <label style={ps.label}>Transport Charge (Rs.)</label>
            <input style={ps.input} type="number" min="0" placeholder="0.00" value={transportCharge} onChange={e => setTransportCharge(e.target.value)} />
          </div>
          <div>
            <label style={ps.label}>Notes</label>
            <input style={ps.input} placeholder="Any delivery instructions..." value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: "10px" }}>
        <button style={ps.btnSuccess} onClick={handleConfirm} disabled={loading}>{loading ? "Confirming..." : "Confirm Delivery"}</button>
        <button style={{ ...ps.btnGhost, borderColor: "#f59e0b", color: "#f59e0b" }} onClick={handleSaveDraft} disabled={loading}>{loading ? "Saving..." : "Save as Draft"}</button>
        <button style={ps.btnGhost} onClick={onBack}>Cancel</button>
      </div>
    </MainLayout>
  );
}
