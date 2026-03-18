import { useEffect, useState } from "react";
import MainLayout from "../layout/MainLayout";
import { getVehicles, createVehicle, updateVehicle, updateVehicleStatus, deleteVehicle } from "../services/vehicleService";
import { getOwnerDefaults } from "../services/staffService";
import { usePageStyles } from "../hooks/usePageStyles";
import { useTheme } from "../context/ThemeContext";
import { getTheme } from "../theme";

const STATUS_COLOR = { AVAILABLE: "#16a34a", ON_TRIP: "#2563eb", MAINTENANCE: "#f59e0b" };
const STATUS_LABEL = { AVAILABLE: "Available", ON_TRIP: "On Trip", MAINTENANCE: "Maintenance" };
const VEHICLE_TYPES = ["Truck", "Van", "Auto", "Bike", "Mini Truck", "Other"];

const EMPTY = { registrationNumber: "", vehicleType: "Truck", ownerName: "", phone: "", capacityKg: "" };

export default function VehiclesPage() {
  const ps = usePageStyles();
  const { dark } = useTheme();
  const t = getTheme(dark);

  const [vehicles, setVehicles] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try { setVehicles(await getVehicles()); } catch { setError("Failed to load vehicles"); }
  };

  const openAdd = async () => {
    let defaults = EMPTY;
    try {
      const od = await getOwnerDefaults();
      defaults = { ...EMPTY, ownerName: od.ownerName || "", phone: od.phone || "" };
    } catch { /* use empty defaults */ }
    setForm(defaults); setEditing(null); setShowForm(true); setError("");
  };
  const openEdit = (v) => {
    setForm({ registrationNumber: v.registrationNumber, vehicleType: v.vehicleType, ownerName: v.ownerName || "", phone: v.phone || "", capacityKg: v.capacityKg || "" });
    setEditing(v);
    setShowForm(true);
    setError("");
  };

  const handleSave = async () => {
    if (!form.registrationNumber.trim()) { setError("Registration number is required"); return; }
    try {
      setLoading(true); setError("");
      const payload = { ...form, capacityKg: form.capacityKg ? parseFloat(form.capacityKg) : null };
      if (editing) await updateVehicle(editing.id, payload);
      else await createVehicle(payload);
      setShowForm(false);
      load();
    } catch (e) { setError(e.response?.data?.message || "Failed to save"); }
    finally { setLoading(false); }
  };

  const handleStatusChange = async (v, status) => {
    try { await updateVehicleStatus(v.id, status); load(); }
    catch (e) { setError(e.response?.data?.message || "Failed to update status"); }
  };

  const handleDelete = async (v) => {
    if (!window.confirm(`Remove vehicle ${v.registrationNumber}?`)) return;
    try { await deleteVehicle(v.id); load(); }
    catch (e) { setError(e.response?.data?.message || "Failed to delete"); }
  };

  const f = (field, val) => setForm(p => ({ ...p, [field]: val }));

  return (
    <MainLayout>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h2 style={{ margin: 0, fontSize: "20px", color: t.text }}>Vehicles</h2>
        <button style={ps.btnPrimary} onClick={openAdd}>+ Add Vehicle</button>
      </div>

      {error && <div style={ps.alertError}>{error}</div>}

      {/* Form modal */}
      {showForm && (
        <div style={ps.overlay} onClick={() => setShowForm(false)}>
          <div style={{ ...ps.modal, width: "480px" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <div style={{ fontSize: "16px", fontWeight: 700, color: t.text }}>{editing ? "Edit Vehicle" : "Add Vehicle"}</div>
              <button onClick={() => setShowForm(false)} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: t.textSub }}>✕</button>
            </div>
            {error && <div style={ps.alertError}>{error}</div>}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
              <div style={{ gridColumn: "1/-1" }}>
                <label style={ps.label}>Registration Number *</label>
                <input style={ps.input} placeholder="e.g. KA-01-AB-1234" value={form.registrationNumber} onChange={e => f("registrationNumber", e.target.value)} />
              </div>
              <div>
                <label style={ps.label}>Vehicle Type</label>
                <select style={ps.input} value={form.vehicleType} onChange={e => f("vehicleType", e.target.value)}>
                  {VEHICLE_TYPES.map(vt => <option key={vt} value={vt}>{vt}</option>)}
                </select>
              </div>
              <div>
                <label style={ps.label}>Capacity (kg)</label>
                <input style={ps.input} type="number" min="0" placeholder="e.g. 1000" value={form.capacityKg} onChange={e => f("capacityKg", e.target.value)} />
              </div>
              <div>
                <label style={ps.label}>Owner Name</label>
                <input style={ps.input} placeholder="Owner / Company" value={form.ownerName} onChange={e => f("ownerName", e.target.value)} />
              </div>
              <div>
                <label style={ps.label}>Phone</label>
                <input style={ps.input} placeholder="Contact number" value={form.phone} onChange={e => f("phone", e.target.value)} />
              </div>
            </div>
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "20px" }}>
              <button style={ps.btnGhost} onClick={() => setShowForm(false)}>Cancel</button>
              <button style={ps.btnSuccess} onClick={handleSave} disabled={loading}>{loading ? "Saving..." : "Save"}</button>
            </div>
          </div>
        </div>
      )}

      <div style={ps.tableWrap}>
        <table style={ps.table}>
          <thead>
            <tr style={ps.thead}>
              <th style={ps.th}>Reg. Number</th>
              <th style={ps.th}>Type</th>
              <th style={ps.th}>Owner</th>
              <th style={ps.th}>Phone</th>
              <th style={ps.th}>Capacity</th>
              <th style={ps.th}>Status</th>
              <th style={ps.th}></th>
            </tr>
          </thead>
          <tbody>
            {vehicles.length === 0 && (
              <tr><td colSpan={7} style={{ ...ps.td, textAlign: "center", color: t.textMuted, padding: "40px" }}>No vehicles added yet</td></tr>
            )}
            {vehicles.map(v => (
              <tr key={v.id} style={ps.tr}>
                <td style={{ ...ps.td, fontWeight: 700 }}>{v.registrationNumber}</td>
                <td style={ps.td}>{v.vehicleType}</td>
                <td style={ps.td}>{v.ownerName || "—"}</td>
                <td style={{ ...ps.td, color: t.textSub }}>{v.phone || "—"}</td>
                <td style={ps.td}>{v.capacityKg ? `${v.capacityKg} kg` : "—"}</td>
                <td style={ps.td}>
                  <select
                    style={{ padding: "3px 8px", borderRadius: "6px", border: `1px solid ${STATUS_COLOR[v.status]}44`, background: STATUS_COLOR[v.status] + "18", color: STATUS_COLOR[v.status], fontSize: "12px", fontWeight: 600, cursor: "pointer" }}
                    value={v.status}
                    onChange={e => handleStatusChange(v, e.target.value)}>
                    <option value="AVAILABLE">Available</option>
                    <option value="ON_TRIP">On Trip</option>
                    <option value="MAINTENANCE">Maintenance</option>
                  </select>
                </td>
                <td style={ps.td}>
                  <div style={{ display: "flex", gap: "6px" }}>
                    <button style={ps.btnSmPrimary} onClick={() => openEdit(v)}>Edit</button>
                    <button style={ps.btnSmDanger} onClick={() => handleDelete(v)}>🗑</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </MainLayout>
  );
}
