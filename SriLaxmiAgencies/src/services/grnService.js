import api from "../api/axiosConfig";

export const getGRNs = async () => (await api.get("/grn")).data;
export const getGRNById = async (id) => (await api.get(`/grn/${id}`)).data;
export const getGRNItems = async (id) => (await api.get(`/grn/${id}/items`)).data;
export const createGRN = async (grn) => (await api.post("/grn", grn)).data;
export const getPOItemsForGRN = async (poId) => (await api.get(`/grn/po-items/${poId}`)).data;
