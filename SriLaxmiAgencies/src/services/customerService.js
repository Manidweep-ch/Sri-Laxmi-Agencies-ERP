import api from "../api/axiosConfig";

export const getCustomers = async () => (await api.get("/customers")).data;
export const createCustomer = async (c) => (await api.post("/customers", c)).data;
export const updateCustomer = async (id, c) => (await api.put(`/customers/${id}`, c)).data;
export const deleteCustomer = async (id) => await api.delete(`/customers/${id}`);
