import api from "../api/axiosConfig";

export const getSuppliers = async () => (await api.get("/suppliers")).data;
export const createSupplier = async (s) => (await api.post("/suppliers", s)).data;
export const updateSupplier = async (id, s) => (await api.put(`/suppliers/${id}`, s)).data;
export const deleteSupplier = async (id) => await api.delete(`/suppliers/${id}`);
