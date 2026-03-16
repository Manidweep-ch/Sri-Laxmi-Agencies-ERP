import api from "../api/axiosConfig";

export const getCreditNotes = async () => (await api.get("/credit-notes")).data;
export const createCreditNote = async (cn) => (await api.post("/credit-notes", cn)).data;
export const getCreditNotesByInvoice = async (invoiceId) => (await api.get(`/credit-notes/invoice/${invoiceId}`)).data;
