import api from "../api/axiosConfig";

export const getDashboardData = async () => (await api.get("/dashboard")).data;
export const getWalletData = async () => (await api.get("/dashboard/wallet")).data;
