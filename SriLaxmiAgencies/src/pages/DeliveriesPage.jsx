import { useEffect, useState } from "react";
import MainLayout from "../layout/MainLayout";
import { getDeliveries } from "../services/deliveryService";
import { usePageStyles } from "../hooks/usePageStyles";
import { useTheme } from "../context/ThemeContext";
import { getTheme } from "../theme";
import { useAuth } from "../context/AuthContext";

const STATUS_COLOR = { DRAFT: "#6b7280", CONFIRMED: "#2563eb", DELIVERED: "#16a34a", RETURNED: "#8b5cf6", CANCELLED: "#ef4444" };
const STATUS_LABEL = { DRAFT: "Draft", CONFIRMED: "Out for Delivery", DELIVERED: "Delivered", RETURNED: "Vehicle Returned", CANCELLED: "Cancelled" };

export default function DeliveriesPage() {
  const ps = usePageStyles();
  const { dark } = useTheme();
  const t = getTheme(dark);
  const { user } = useAuth();

  const hideFinancials = user?.role === "DRIVER" || user?.role === "SALES";

  const [deliveries, setDeliveries] = useState([]);
  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  useEffect(() => { load(); }, []);

  const load = async () => {
    try { const res = await getDeliveries(); setDeliveries(Array.isArray(res) ? res : []); }
    catch { setError("Failed to load deliveries"); }
  };

  const filtered = deliveries.filter(d => {
    const matchStatus = filter === "ALL" || d.status === filter;
    const q = search.toLowerCase();
    const matchSearch = !q ||
      d.salesOrder?.orderNumber?.toLowerCase().includes(q) ||
      d.salesOrder?.customer?.name?.toLowerCase().includes(q) ||
      d.invoice?.invoiceNumber?.toLowerCase().includes(q) ||
      d.vehicle?.registrationNumber?.toLowerCase().includes(q) ||
      d.porterVehicleNumber?.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  return (
    <MainLayout>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "20px", color: t.text }}>Deliveries</h2>
          <div style={{ fontSize: "12px", color: t.textMuted, marginTop: "2px" }}>{filtered.length} records</div>
        </div>
        <input style={ps.searchInput} placeholder="Search order, customer, vehicle..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {error && <div style={ps.alertError}>{error}</div>}

      {/* Status filter pills */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }}>
        {["ALL", "DRAFT", "CONFIRMED", "DELIVERED", "RETURNED", "CANCELLED"].map(s => (
          <button key={s} style={ps.filterPill(filter === s, STATUS_COLOR[s] || "#6b7280")} onClick={() => setFilter(s)}>
            {s === "ALL" ? "All" : STATUS_LABEL[s]}
          </button>
        ))}
      </div>

      <div style={ps.tableWrap}>
        <table style={ps.table}>
          <thead>
            <tr style={ps.thead}>
              <th style={ps.th}>Date</th>
              <th style={ps.th}>Order / Invoice</th>
              <th style={ps.th}>Customer</th>
              <th style={ps.th}>Vehicle</th>
              <th style={ps.th}>Drivers</th>
              {!hideFinancials && <th style={ps.th}>Transport Charge</th>}
              <th style={ps.th}>Status</th>
              <th style={ps.th}>Delivered On</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={hideFinancials ? 7 : 8} style={{ ...ps.td, textAlign: "center", color: t.textMuted, padding: "40px" }}>No deliveries found</td></tr>
            )}
            {filtered.map(d => (
              <tr key={d.id} style={ps.tr}>
                <td style={{ ...ps.td, color: t.textSub, fontSize: "12px" }}>{d.assignedDate || "—"}</td>
                <td style={ps.td}>
                  <div style={{ fontWeight: 600, fontSize: "12px", color: "#2563eb" }}>{d.salesOrder?.orderNumber}</div>
                  {d.invoice && <div style={{ fontSize: "11px", color: t.textSub }}>{d.invoice.invoiceNumber}</div>}
                </td>
                <td style={ps.td}>{d.salesOrder?.customer?.name || "—"}</td>
                <td style={ps.td}>
                  {d.vehicle
                    ? <span>{d.vehicle.registrationNumber} <span style={{ fontSize: "11px", color: t.textSub }}>({d.vehicle.vehicleType})</span></span>
                    : <span style={{ fontSize: "12px", color: "#7c3aed" }}>Porter: {d.porterVehicleNumber || "—"}{d.porterName ? ` (${d.porterName})` : ""}</span>
                  }
                </td>
                <td style={ps.td}>
                  {d.drivers?.map((dd, i) => (
                    <div key={i} style={{ fontSize: "12px" }}>
                      {dd.staff?.name}
                      {!hideFinancials && dd.shareAmount && <span style={{ color: "#16a34a", marginLeft: "4px" }}>Rs.{parseFloat(dd.shareAmount).toFixed(0)}</span>}
                    </div>
                  ))}
                </td>
                {!hideFinancials && (
                  <td style={ps.td}>{d.transportCharge ? `Rs.${parseFloat(d.transportCharge).toFixed(2)}` : "—"}</td>
                )}
                <td style={ps.td}>
                  <span style={{ padding: "2px 8px", borderRadius: "10px", fontSize: "11px", fontWeight: 700, background: STATUS_COLOR[d.status] + "22", color: STATUS_COLOR[d.status] }}>
                    {STATUS_LABEL[d.status]}
                  </span>
                </td>
                <td style={{ ...ps.td, color: t.textSub, fontSize: "12px" }}>{d.deliveredDate || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </MainLayout>
  );
}
