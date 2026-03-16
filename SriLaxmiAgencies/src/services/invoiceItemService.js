import api from "../api/axiosConfig";

export const getInvoiceItems = async (invoiceId) => {
  const res = await api.get(`/invoice-items/invoice/${invoiceId}`);
  return res.data;
};

export const createInvoiceItem = async (item) => {
  const res = await api.post("/invoice-items", item);
  return res.data;
};