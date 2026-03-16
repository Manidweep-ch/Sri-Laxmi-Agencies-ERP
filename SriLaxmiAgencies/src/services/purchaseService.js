import api from "../api/axiosConfig";

export const getPurchaseOrders = async () => (await api.get("/purchase-orders")).data;
export const createPurchaseOrder = async (po) => (await api.post("/purchase-orders", po)).data;
export const deletePurchaseOrder = async (id) => (await api.delete(`/purchase-orders/${id}`)).data;
export const getPurchaseOrderById = async (id) => (await api.get(`/purchase-orders/${id}`)).data;
export const getPurchaseOrderItems = async (id) => (await api.get(`/purchase-orders/${id}/items`)).data;
export const addPurchaseOrderItem = async (id, item) => (await api.post(`/purchase-orders/${id}/items`, item)).data;
export const updatePurchaseOrderItem = async (id, itemId, item) => (await api.put(`/purchase-orders/${id}/items/${itemId}`, item)).data;
export const removePurchaseOrderItem = async (id, itemId) => (await api.delete(`/purchase-orders/${id}/items/${itemId}`)).data;
export const updatePurchaseOrderStatus = async (id, status) =>
  (await api.put(`/purchase-orders/${id}/status`, status, { headers: { "Content-Type": "application/json" } })).data;
export const receiveStockForPO = async (id, grn) => (await api.post(`/purchase-orders/${id}/receive`, grn)).data;
export const getGRNsForPO = async (id) => (await api.get(`/purchase-orders/${id}/grns`)).data;
export const getSupplierPayments = async (poId) => (await api.get(`/purchase-orders/${poId}/payments`)).data;
export const recordSupplierPayment = async (poId, payment) => (await api.post(`/purchase-orders/${poId}/payments`, payment)).data;
export const getSupplierTotalPaid = async (poId) => (await api.get(`/purchase-orders/${poId}/payments/total-paid`)).data;
