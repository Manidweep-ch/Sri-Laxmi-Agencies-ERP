import api from "../api/axiosConfig";

export const getSalesOrders = async () => (await api.get("/sales-orders")).data;
export const createSalesOrder = async (order) => (await api.post("/sales-orders", order)).data;
export const getSalesOrderById = async (id) => (await api.get(`/sales-orders/${id}`)).data;
export const getSalesOrderItems = async (id) => (await api.get(`/sales-orders/${id}/items`)).data;
export const updateSalesOrderStatus = async (id, status) =>
  (await api.put(`/sales-orders/${id}/status`, status, { headers: { "Content-Type": "application/json" } })).data;
export const deleteSalesOrder = async (id) => (await api.delete(`/sales-orders/${id}`)).data;
export const addSalesOrderItem = async (id, item) => (await api.post(`/sales-orders/${id}/items`, item)).data;
export const removeSalesOrderItem = async (id, itemId) => (await api.delete(`/sales-orders/${id}/items/${itemId}`)).data;
export const getSalesOrderSummary = async (id) => (await api.get(`/sales-orders/${id}/summary`)).data;
export const updateSalesOrderFinalAmount = async (id, finalAmount) =>
  (await api.put(`/sales-orders/${id}/final-amount`, finalAmount !== null ? finalAmount : "", {
    headers: { "Content-Type": "application/json" }
  })).data;
