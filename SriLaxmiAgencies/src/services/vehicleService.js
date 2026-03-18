import api from "../api/axiosConfig";

export const getVehicles = async () => (await api.get("/vehicles")).data;
export const getAvailableVehicles = async () => (await api.get("/vehicles/available")).data;
export const createVehicle = async (v) => (await api.post("/vehicles", v)).data;
export const updateVehicle = async (id, v) => (await api.put(`/vehicles/${id}`, v)).data;
export const updateVehicleStatus = async (id, status) =>
  (await api.put(`/vehicles/${id}/status`, JSON.stringify(status), { headers: { "Content-Type": "application/json" } })).data;
export const deleteVehicle = async (id) => (await api.delete(`/vehicles/${id}`)).data;
