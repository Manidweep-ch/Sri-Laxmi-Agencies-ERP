import api from "../api/axiosConfig";

export const getPaymentsByInvoice = async (invoiceId) => (await api.get(`/payments/invoice/${invoiceId}`)).data;
export const getOutstanding = async (invoiceId) => (await api.get(`/payments/invoice/${invoiceId}/outstanding`)).data;
export const createPayment = async (payment) => (await api.post("/payments", payment)).data;
export const getAllPayments = async () => (await api.get("/payments")).data;

// Verification (admin confirms online payment received in their account)
export const verifyPayment = async (id, status, notes) => (await api.put(`/payments/${id}/verify`, { status, notes })).data;

// Cheque status (ACCOUNTS confirms deposited or bounced)
export const updateChequeStatus = async (id, status, notes) => (await api.put(`/payments/${id}/cheque-status`, { status, notes })).data;

// Pending verifications for a specific admin user
export const getPendingVerifications = async (userId) => (await api.get(`/payments/pending-verification/user/${userId}`)).data;

// Cheque reminders
export const getPendingCheques = async () => (await api.get("/payments/cheques/pending")).data;
export const getOverdueCheques = async () => (await api.get("/payments/cheques/overdue")).data;

// Accounts history — all payments across the system
export const getAllSupplierPayments = async () => (await api.get("/supplier-payments")).data;
export const getAllSalaryPayments = async () => (await api.get("/salary-payments")).data;
export const getAllWalletTransfers = async () => (await api.get("/wallet-transfers")).data;
export const getWalletHistory = async () => (await api.get("/wallet-history")).data;
