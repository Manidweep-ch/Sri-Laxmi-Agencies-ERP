import api from "../api/axiosConfig";

export const getCategories = async () => {
  const res = await api.get("/categories");
  return res.data;
};

export const createCategory = async (category) => {
  const res = await api.post("/categories", category);
  return res.data;
};