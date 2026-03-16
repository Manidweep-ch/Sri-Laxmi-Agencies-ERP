import api from "../api/axiosConfig";

export const getGRNItems = async (grnId) => {
  const res = await api.get(`/grn-items/grn/${grnId}`);
  return res.data;
};

export const createGRNItem = async (item) => {
  const res = await api.post("/grn-items", item);
  return res.data;
};