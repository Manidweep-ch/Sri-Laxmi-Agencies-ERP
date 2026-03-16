import api from "../api/axiosConfig";

export const getInvoices = async () => {
  const res = await api.get("/invoices");
  return res.data;
};

export const createInvoice = async (invoice) => {
  const res = await api.post("/invoices", invoice);
  return res.data;
};

export const getInvoiceById = async (id) => {
  const res = await api.get(`/invoices/${id}`);
  return res.data;
};

export const updateInvoicePaymentStatus = async (id, paymentStatus) => {
  const res = await api.put(`/invoices/${id}/payment-status`, paymentStatus, {
    headers: {
      'Content-Type': 'text/plain'
    }
  });
  return res.data;
};

export const generateInvoiceFromSalesOrder = async (salesOrderId) => {
  const res = await api.post(`/invoice-generation/${salesOrderId}`);
  return res.data;
};

export const getInvoiceSummaries = async () => {
  const res = await api.get("/invoices/summary");
  return res.data;
};

export const deleteInvoice = async (id) => (await api.delete(`/invoices/${id}`)).data;

export const getInvoiceItems = async (invoiceId) => {
  const res = await api.get(`/invoice-items/invoice/${invoiceId}`);
  return res.data;
};
