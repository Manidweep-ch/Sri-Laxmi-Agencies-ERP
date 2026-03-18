import api from "../api/axiosConfig";

export const getUsers = async () => (await api.get("/users")).data;
export const createUser = async (user) => (await api.post("/users", user)).data;
export const updateUser = async (id, user) => (await api.put(`/users/${id}`, user)).data;
export const setUserActive = async (id, active) => (await api.put(`/users/${id}/active`, { active })).data;
export const getRoles = async () => (await api.get("/users/roles")).data;
export const deleteUser = async (id) => (await api.delete(`/users/${id}`)).data;
