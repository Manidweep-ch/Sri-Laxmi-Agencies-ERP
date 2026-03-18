import api from "../api/axiosConfig";

export const getAllWallets = async () => (await api.get("/wallets")).data;
export const getStaffWallet = async (staffId) => (await api.get(`/wallets/staff/${staffId}`)).data;
export const getAdminWallet = async (userId) => (await api.get(`/wallets/admin/${userId}`)).data;
export const recordStaffTransfer = async (staffId, body) => (await api.post(`/wallets/staff/${staffId}/transfer`, body)).data;
export const recordAdminTransfer = async (userId, body) => (await api.post(`/wallets/admin/${userId}/transfer`, body)).data;
