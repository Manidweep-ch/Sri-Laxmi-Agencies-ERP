import api from "../api/axiosConfig";

export const getPaymentsByInvoice = async (invoiceId) => {
  const res = await api.get(`/payments/invoice/${invoiceId}`);
  return res.data;
};

export const getPayments = async () => {
  const res = await api.get("/payments");
  return res.data;
};

export const getAllPayments = async () => {
  const res = await api.get("/payments");
  return res.data;
};

export const createPayment = async (payment) => {
  const res = await api.post("/payments", payment);
  return res.data;
};

export const getOutstanding = async (invoiceId) => {
  const res = await api.get(`/payments/invoice/${invoiceId}/outstanding`);
  return res.data;
};