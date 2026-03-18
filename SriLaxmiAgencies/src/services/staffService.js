import api from "../api/axiosConfig";

export const getStaff = async () => (await api.get("/staff")).data;
export const getDrivers = async () => (await api.get("/staff/drivers")).data;
export const getOwnerDefaults = async () => (await api.get("/staff/owner-defaults")).data;
export const getAdminStaff = async () => (await api.get("/staff/admins")).data;
export const deleteStaff = async (id) => (await api.delete(`/staff/${id}`)).data;
export const getStaffById = async (id) => (await api.get(`/staff/${id}`)).data;
export const createStaff = async (staff) => (await api.post("/staff", staff)).data;
export const updateStaff = async (id, staff) => (await api.put(`/staff/${id}`, staff)).data;
export const setStaffActive = async (id, active) => (await api.put(`/staff/${id}/active`, { active })).data;

export const paySalary = async (id, payment) => (await api.post(`/staff/${id}/salary`, payment)).data;
export const getSalaryHistory = async (id) => (await api.get(`/staff/${id}/salary`)).data;
export const getSalarySummary = async (id) => (await api.get(`/staff/${id}/salary/summary`)).data;
