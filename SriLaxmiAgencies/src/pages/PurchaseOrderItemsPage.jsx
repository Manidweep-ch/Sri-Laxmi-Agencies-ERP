import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import MainLayout from "../layout/MainLayout";
import { getPurchaseOrderById, getPurchaseOrderItems } from "../services/purchaseService";

function PurchaseOrderItemsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const [o, i] = await Promise.all([getPurchaseOrderById(id), getPurchaseOrderItems(id)]);
        setOrder(o); setItems(i);
      } catch { setError("Failed to load purchase order"); }
    };
    load();
  }, [id]);

  if (!order) return <div style={{ padding: "20px" }}>{error || "Loading..."}</div>;

  return (
    <MainLayout>
      <div style={s.header}>
        <div>
          <h2 style={{ margin: "0 0 4px" }}>{order.poNumber}</h2>
          <p style={{ margin: 0, color: "#6b7280", fontSize: "14px" }}>
            Supplier: {order.supplier?.name} | Date: {order.orderDate} | Status: {order.status}
          </p>
        </div>
        <button style={s.btnGray} onClick={() => navigate("/purchase")}>← Back</button>
      </div>

      {error && <div style={s.error}>{error}</div>}

      <table style={s.table}>
        <thead>
          <tr style={s.thead}>
        
            <th style={s.th}>Product</th>
            <th style={s.th}>Size / Unit</th>
            <th style={s.th}>Qty Ordered</th>
            <th style={s.th}>Qty Received</th>
            <th style={s.th}>Cost Price (₹)</th>
            <th style={s.th}>Line Total (₹)</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 && (
            <tr><td colSpan={6} style={{ ...s.td, textAlign: "center", color: "#9ca3af" }}>No items</td></tr>
          )}
          {items.map(item => (
            <tr key={item.id} style={s.tr}>
              <td style={s.td}>{item.product?.name}</td>
              <td style={s.td}>{item.product?.size || "-"} / {item.product?.unit || "-"}</td>
              <td style={s.td}>{item.quantity}</td>
              <td style={s.td}>{item.receivedQuantity}</td>
              <td style={s.td}>₹{item.price?.toFixed(2)}</td>
              <td style={s.td}>₹{(item.price * item.quantity).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={s.totalsBox}>
        <div style={s.totalRow}><span>Sub Total</span><span>₹{order.subTotal?.toFixed(2)}</span></div>
        <div style={s.totalRow}><span>GST</span><span>₹{order.tax?.toFixed(2)}</span></div>
        <div style={{ ...s.totalRow, fontWeight: "700", fontSize: "15px", borderTop: "1px solid #d1d5db", paddingTop: "8px" }}>
          <span>Grand Total</span><span>₹{order.totalAmount?.toFixed(2)}</span>
        </div>
      </div>
    </MainLayout>
  );
}

const s = {
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" },
  error: { background: "#fee2e2", color: "#dc2626", padding: "10px", borderRadius: "6px", marginBottom: "12px", fontSize: "13px" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: "14px" },
  thead: { background: "#1f2937" },
  th: { padding: "10px 12px", color: "white", textAlign: "left", fontWeight: "500" },
  tr: { borderBottom: "1px solid #e5e7eb" },
  td: { padding: "10px 12px", color: "#374151" },
  btnGray: { padding: "8px 16px", background: "#6b7280", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "13px" },
  totalsBox: { background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "8px", padding: "16px", maxWidth: "280px", marginLeft: "auto", marginTop: "20px" },
  totalRow: { display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: "14px", color: "#374151" },
};

export default PurchaseOrderItemsPage;
