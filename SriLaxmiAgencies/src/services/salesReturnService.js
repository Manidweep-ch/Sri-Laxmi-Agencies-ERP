import api from "../api/axiosConfig";

export const getSalesReturns = async () => (await api.get("/sales-returns")).data;
export const createSalesReturn = async (ret) => (await api.post("/sales-returns", ret)).data;
export const getSalesReturnItems = async (returnId) => (await api.get(`/sales-return-items/return/${returnId}`)).data;
export const getRefundsByReturn = async (returnId) => (await api.get(`/sales-returns/${returnId}/refunds`)).data;
export const getTotalRefunded = async (returnId) => (await api.get(`/sales-returns/${returnId}/refunds/total-refunded`)).data;
export const recordRefund = async (returnId, refund) => (await api.post(`/sales-returns/${returnId}/refunds`, refund)).data;
