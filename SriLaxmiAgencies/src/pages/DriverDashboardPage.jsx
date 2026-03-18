import { useEffect, useState } from "react";
import MainLayout from "../layout/MainLayout";
import { getDeliveriesByDriver, markDelivered, markVehicleReturned, markCancelled } from "../services/deliveryService";
import { getInvoiceItems } from "../services/invoiceService";
import { usePageStyles } from "../hooks/usePageStyles";
import { useTheme } from "../context/ThemeContext";
import { getTheme } from "../theme";
import { useAuth } from "../context/AuthContext";
import { getStaff } from "../services/staffService";

const STATUS_COLOR = {
  DRAFT: "#6b7280", CONFIRMED: "#2563eb",
  DELIVERED: "#16a34a", RETURNED: "#8b5cf6", CANCELLED: "#ef4444"
};
const STATUS_LABEL = {
  DRAFT: "Draft", CONFIRMED: "Out for Delivery",
  DELIVERED: "Delivered", RETURNED: "Vehicle Returned", CANCELLED: "Cancelled"
};

function InvoiceReadOnly({ delivery, onBack, ps, isDriver }) {
  const { dark } = useTheme();
  const t = getTheme(dark);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");

  const inv = delivery.invoice;

  useEffect(() => {
    if (!inv?.id) { setLoading(false); return; }
    getInvoiceItems(inv.id).then(setItems).catch(() => {}).finally(() => setLoading(false));
  }, [inv?.id]);

  const subTotal = items.reduce((acc, i) => acc + (parseFloat(i.price) || 0) * (i.quantity || 0), 0);
  const totalTax = items.reduce((acc, i) => acc + (parseFloat(i.price) || 0) * (i.quantity || 0) * ((i.product?.gst || 0) / 100), 0);

  const handleDelivered = async () => {
    if (!window.confirm("Confirm goods were delivered to the customer?")) return;
    try { setActionLoading(true); await markDelivered(delivery.id); onBack(true); }
    catch (e) { setError(e.response?.data?.message || "Failed"); }
    finally { setActionLoading(false); }
  };

  const handleVehicleReturned = async () => {
    if (!window.confirm("Confirm vehicle has returned to base?")) return;
    try { setActionLoading(true); await markVehicleReturned(delivery.id); onBack(true); }
    catch (e) { setError(e.response?.data?.message || "Failed"); }
    finally { setActionLoading(false); }
  };

  const handleCancelled = async () => {
    if (!window.confirm("Cancel this delivery? Goods were NOT sent. Vehicle will be freed for re-assignment.")) return;
    try { setActionLoading(true); await markCancelled(delivery.id); onBack(true); }
    catch (e) { setError(e.response?.data?.message || "Failed"); }
    finally { setActionLoading(false); }
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
        <button onClick={() => onBack(false)} style={{ padding: "7px 14px", border: `1px solid ${t.border}`, borderRadius: "6px", background: t.surface, color: t.text, cursor: "pointer", fontSize: "13px" }}>← Back</button>
        <div>
          <h2 style={{ margin: 0, fontSize: "18px", color: t.text }}>{inv?.invoiceNumber || "Delivery"}</h2>
          <div style={{ fontSize: "12px", color: t.textSub, marginTop: "2px" }}>
            {delivery.salesOrder?.orderNumber} · {delivery.salesOrder?.customer?.name}
          </div>
        </div>
        <span style={{ marginLeft: "auto", padding: "3px 10px", borderRadius: "12px", fontSize: "11px", fontWeight: 700, background: STATUS_COLOR[delivery.status] + "22", color: STATUS_COLOR[delivery.status] }}>
          {STATUS_LABEL[delivery.status]}
        </span>
      </div>

      {error && <div style={ps.alertError}>{error}</div>}

      {/* Delivery info */}
      <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "8px", padding: "16px", marginBottom: "16px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "12px" }}>
          {[
            { label: "Customer", value: delivery.salesOrder?.customer?.name },
            { label: "Vehicle", value: delivery.vehicle?.registrationNumber || delivery.porterVehicleNumber || "Porter" },
            { label: "Assigned Date", value: delivery.assignedDate || "—" },
            ...(!isDriver ? [{ label: "Transport Charge", value: delivery.transportCharge ? `Rs.${parseFloat(delivery.transportCharge).toFixed(2)}` : "—" }] : []),
          ].map(c => (
            <div key={c.label} style={{ background: t.surfaceAlt, border: `1px solid ${t.border}`, borderRadius: "8px", padding: "10px 12px" }}>
              <div style={{ fontSize: "10px", color: t.textSub, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "4px" }}>{c.label}</div>
              <div style={{ fontSize: "13px", fontWeight: 600, color: t.text }}>{c.value}</div>
            </div>
          ))}
        </div>
        {delivery.drivers?.length > 1 && (
          <div style={{ marginTop: "12px", fontSize: "12px", color: t.textSub }}>
            Co-drivers: {delivery.drivers.map(dd => dd.staff?.name).join(", ")}
          </div>
        )}
        {delivery.notes && <div style={{ marginTop: "8px", fontSize: "12px", color: t.textSub }}>Notes: {delivery.notes}</div>}
      </div>

      {/* Invoice items */}
      {loading ? (
        <div style={ps.alertInfo}>Loading invoice...</div>
      ) : (
        <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "8px", padding: "16px", marginBottom: "16px" }}>
          <div style={{ fontWeight: 700, fontSize: "13px", color: t.text, marginBottom: "12px" }}>Invoice Items</div>
          <table style={ps.table}>
            <thead><tr style={ps.thead}>
              <th style={ps.th}>Product</th>
              <th style={ps.th}>Qty</th>
              <th style={ps.th}>Price (Rs.)</th>
              <th style={ps.th}>Total (Rs.)</th>
            </tr></thead>
            <tbody>
              {items.length === 0 && <tr><td colSpan={4} style={{ ...ps.td, textAlign: "center", color: t.textMuted }}>No items</td></tr>}
              {items.map(item => {
                const price = parseFloat(item.price) || 0;
                const qty = item.quantity || 0;
                const gst = item.product?.gst || 0;
                return (
                  <tr key={item.id} style={ps.tr}>
                    <td style={{ ...ps.td, fontWeight: 600 }}>{item.product?.name}{item.product?.size ? ` - ${item.product.size}` : ""}</td>
                    <td style={ps.td}>{qty}</td>
                    <td style={ps.td}>Rs.{price.toFixed(2)}</td>
                    <td style={{ ...ps.td, fontWeight: 600 }}>Rs.{(price * qty * (1 + gst / 100)).toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "10px" }}>
            <div style={{ background: t.surfaceAlt, border: `1px solid ${t.border}`, borderRadius: "8px", padding: "10px 16px", minWidth: "200px" }}>
              <div style={ps.totalRow}><span>Sub Total</span><span>Rs.{subTotal.toFixed(2)}</span></div>
              <div style={ps.totalRow}><span>GST</span><span>Rs.{totalTax.toFixed(2)}</span></div>
              <div style={{ ...ps.totalRow, fontWeight: 700, borderTop: `1px solid ${t.border}`, paddingTop: "6px", marginTop: "4px" }}>
                <span>Grand Total</span><span>Rs.{(subTotal + totalTax).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action buttons */}
      {delivery.status === "CONFIRMED" && (
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <button style={ps.btnSuccess} onClick={handleDelivered} disabled={actionLoading}>
            ✓ Goods Delivered
          </button>
          <button style={ps.btnDanger} onClick={handleCancelled} disabled={actionLoading}>
            ✕ Cancelled
          </button>
        </div>
      )}
      {delivery.status === "DELIVERED" && (
        <div style={{ display: "flex", gap: "12px" }}>
          <button style={{ ...ps.btnPrimary, background: "#7c3aed", borderColor: "#7c3aed" }} onClick={handleVehicleReturned} disabled={actionLoading}>
            🚛 Vehicle Returned to Base
          </button>
        </div>
      )}
    </div>
  );
}

export default function DriverDashboardPage() {
  const ps = usePageStyles();
  const { dark } = useTheme();
  const t = getTheme(dark);
  const { user } = useAuth();

  const isDriver = user?.role === "DRIVER";

  const [staffId, setStaffId] = useState(null);
  const [deliveries, setDeliveries] = useState([]);
  const [tab, setTab] = useState("active"); // "active" | "completed" | "cancelled"
  const [selectedDelivery, setSelectedDelivery] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Find staff record linked to this user
    getStaff().then(list => {
      const me = list.find(s => s.user?.id === parseInt(user?.userId || 0) || s.user?.username === user?.username);
      if (me) {
        setStaffId(me.id);
        loadDeliveries(me.id);
      } else {
        setError("No staff record linked to your account. Ask admin to link your user account to a staff profile.");
        setLoading(false);
      }
    }).catch(() => { setError("Failed to load staff data"); setLoading(false); });
  }, [user]);

  const loadDeliveries = async (sid) => {
    try {
      setLoading(true);
      const all = await getDeliveriesByDriver(sid);
      setDeliveries(Array.isArray(all) ? all : []);
    } catch { setError("Failed to load deliveries"); }
    finally { setLoading(false); }
  };

  const handleBack = (reload) => {
    setSelectedDelivery(null);
    if (reload && staffId) loadDeliveries(staffId);
  };

  if (selectedDelivery) {
    return (
      <MainLayout>
        <InvoiceReadOnly delivery={selectedDelivery} onBack={handleBack} ps={ps} isDriver={isDriver} />
      </MainLayout>
    );
  }

  const active = deliveries.filter(d => d.status === "CONFIRMED");
  const completed = deliveries.filter(d => d.status === "DELIVERED" || d.status === "RETURNED");
  const cancelled = deliveries.filter(d => d.status === "CANCELLED");

  const displayed = tab === "active" ? active : tab === "completed" ? completed : cancelled;

  return (
    <MainLayout>
      <div style={{ marginBottom: "20px" }}>
        <h2 style={{ margin: 0, fontSize: "20px", color: t.text }}>My Deliveries</h2>
        <div style={{ fontSize: "12px", color: t.textMuted, marginTop: "2px" }}>
          {active.length} active · {completed.length} completed · {cancelled.length} cancelled
        </div>
      </div>

      {error && <div style={ps.alertError}>{error}</div>}

      {/* Tabs */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }}>
        {[
          ["active",    `Active (${active.length})`,        "#2563eb"],
          ["completed", `Completed (${completed.length})`,  "#16a34a"],
          ["cancelled", `Cancelled (${cancelled.length})`,  "#ef4444"],
        ].map(([key, label, color]) => (
          <button key={key} style={ps.filterPill(tab === key, color)} onClick={() => setTab(key)}>{label}</button>
        ))}
      </div>

      {loading && <div style={ps.alertInfo}>Loading...</div>}

      {!loading && displayed.length === 0 && (
        <div style={{ textAlign: "center", padding: "48px", color: t.textMuted }}>
          {tab === "active" ? "No active deliveries assigned to you" : tab === "completed" ? "No completed deliveries yet" : "No cancelled deliveries"}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {displayed.map(d => {
          const myDriver = d.drivers?.find(dd => dd.staff?.id === staffId);
          const coDrivers = d.drivers?.filter(dd => dd.staff?.id !== staffId) || [];
          return (
            <div key={d.id}
              onClick={() => setSelectedDelivery(d)}
              style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: "10px", padding: "16px", cursor: "pointer", transition: "box-shadow 0.15s", boxShadow: t.shadow }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: "15px", color: t.text }}>
                    {d.invoice?.invoiceNumber || d.salesOrder?.orderNumber || `Delivery #${d.id}`}
                  </div>
                  <div style={{ fontSize: "13px", color: t.textSub, marginTop: "2px" }}>
                    {d.salesOrder?.customer?.name}
                  </div>
                  <div style={{ fontSize: "12px", color: t.textSub, marginTop: "4px" }}>
                    {d.vehicle ? `🚛 ${d.vehicle.registrationNumber} (${d.vehicle.vehicleType})` : `🚚 Porter: ${d.porterVehicleNumber || "—"}`}
                    {d.assignedDate && <span style={{ marginLeft: "12px" }}>📅 {d.assignedDate}</span>}
                  </div>
                  {coDrivers.length > 0 && (
                    <div style={{ fontSize: "11px", color: "#8b5cf6", marginTop: "4px" }}>
                      Co-drivers: {coDrivers.map(dd => dd.staff?.name).join(", ")}
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "6px" }}>
                  <span style={{ padding: "3px 10px", borderRadius: "12px", fontSize: "11px", fontWeight: 700, background: STATUS_COLOR[d.status] + "22", color: STATUS_COLOR[d.status] }}>
                    {STATUS_LABEL[d.status]}
                  </span>
                  {myDriver?.shareAmount && !isDriver && (
                    <span style={{ fontSize: "12px", fontWeight: 600, color: "#16a34a" }}>
                      Rs.{parseFloat(myDriver.shareAmount).toFixed(2)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </MainLayout>
  );
}
