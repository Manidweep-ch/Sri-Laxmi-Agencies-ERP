import api from "../api/axiosConfig";

export const addStock = async (stockData) => {
  const res = await api.post("/stock/add", stockData);
  return res.data;
};

export const getProductStock = async (productId) => {
  const res = await api.get(`/stock/product/${productId}`);
  return res.data;
};

export const consumeStock = async (consumeData) => {
  const res = await api.post("/stock/consume", consumeData);
  return res.data;
};

export const getInventorySummary = async () => {
  const res = await api.get("/stock/inventory");
  return res.data;
};

export const getInventoryBatches = async (productId) => {
  const res = await api.get(`/stock/inventory/batches/${productId}`);
  return res.data;
};