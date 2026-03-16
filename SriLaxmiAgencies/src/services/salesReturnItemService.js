import api from "../api/axiosConfig";

export const getSalesReturnItems = async (returnId) => {
  const res = await api.get(`/sales-return-items/return/${returnId}`);
  return res.data;
};

export const createSalesReturnItem = async (item) => {
  const res = await api.post("/sales-return-items", item);
  return res.data;
};