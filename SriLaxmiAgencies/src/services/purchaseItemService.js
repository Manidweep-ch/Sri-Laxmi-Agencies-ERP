import api from "../api/axiosConfig";

export const getPOItems = async (poId) => {
  const res = await api.get(`/po-items/order/${poId}`);
  return res.data;
};

export const createPOItem = async (item) => {
  const res = await api.post("/po-items", item);
  return res.data;
};