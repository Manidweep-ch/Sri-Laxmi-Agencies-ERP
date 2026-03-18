import api from "../api/axiosConfig";

export const getInventory = async () => {
  const res = await api.get("/stock/inventory");
  return res.data;
};