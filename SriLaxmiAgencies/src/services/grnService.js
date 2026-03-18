import api from "../api/axiosConfig";

export const getGRNAuditList = async () => (await api.get("/grn/audit")).data;
