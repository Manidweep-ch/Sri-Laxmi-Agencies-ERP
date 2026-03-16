import api from "../api/axiosConfig";

export const getPrices = async () => {
  const res = await api.get("/prices");
  return res.data;
};

export const getCurrentPrice = async (productId) => {
  const res = await api.get(`/prices/current/${productId}`);
  return res.data;
};

export const createPrice = async (price) => {
  const res = await api.post("/prices", price);
  return res.data;
};

export const updatePrice = async (id, price) => {
  const res = await api.put(`/prices/${id}`, price);
  return res.data;
};

export const deletePrice = async (id) => {
  const res = await api.delete(`/prices/${id}`);
  return res.data;
};