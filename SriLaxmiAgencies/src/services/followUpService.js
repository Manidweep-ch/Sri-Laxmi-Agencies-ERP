import api from "../api/axiosConfig";

export const getAllFollowUps = async () => (await api.get("/follow-ups")).data;
export const getFollowUpById = async (id) => (await api.get(`/follow-ups/${id}`)).data;
export const getFollowUpByInvoice = async (invoiceId) => (await api.get(`/follow-ups/invoice/${invoiceId}`)).data;
export const createFollowUp = async (data) => (await api.post("/follow-ups", data)).data;
export const addNote = async (id, data) => (await api.post(`/follow-ups/${id}/notes`, data)).data;
export const resolveFollowUp = async (id, closingNote) => (await api.put(`/follow-ups/${id}/resolve`, { closingNote })).data;
export const updateAssignment = async (id, data) => (await api.put(`/follow-ups/${id}/assign`, data)).data;
