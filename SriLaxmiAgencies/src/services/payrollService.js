import api from "../api/axiosConfig";

export const getPayrollRuns = async () => (await api.get("/payroll")).data;
export const getPayrollRun = async (id) => (await api.get(`/payroll/${id}`)).data;
export const preparePayroll = async (month, year) => (await api.post("/payroll/prepare", { month, year })).data;
export const updatePayrollItems = async (id, items) => (await api.put(`/payroll/${id}/items`, items)).data;
export const confirmPayroll = async (id, paymentMethod) => (await api.post(`/payroll/${id}/confirm`, { paymentMethod })).data;
