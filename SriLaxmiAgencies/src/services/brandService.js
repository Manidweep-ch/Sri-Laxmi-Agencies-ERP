import api from "../api/axiosConfig";

export const getBrands = async () => {
  const res = await api.get("/brands");
  return res.data;
};

export const createBrand = async (brand) => {
  const res = await api.post("/brands", brand);
  return res.data;
};