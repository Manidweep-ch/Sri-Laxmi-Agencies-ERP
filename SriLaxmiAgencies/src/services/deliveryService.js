import api from "../api/axiosConfig";

export const getDeliveries = async () => (await api.get("/deliveries")).data;
export const getDeliveryById = async (id) => (await api.get(`/deliveries/${id}`)).data;
export const getDeliveryBySalesOrder = async (soId) => (await api.get(`/deliveries/by-sales-order/${soId}`)).data;
export const getDeliveriesByDriver = async (staffId) => (await api.get(`/deliveries/driver/${staffId}`)).data;
export const getActiveDeliveriesByDriver = async (staffId) => (await api.get(`/deliveries/driver/${staffId}/active`)).data;
export const createDelivery = async (d) => (await api.post("/deliveries", d)).data;
export const updateDelivery = async (id, d) => (await api.put(`/deliveries/${id}`, d)).data;
export const confirmDelivery = async (id) => (await api.post(`/deliveries/${id}/confirm`)).data;
export const markDelivered = async (id) => (await api.post(`/deliveries/${id}/delivered`)).data;
export const markReturned = async (id) => (await api.post(`/deliveries/${id}/returned`)).data;
export const markVehicleReturned = async (id) => (await api.post(`/deliveries/${id}/vehicle-returned`)).data;
export const markCancelled = async (id) => (await api.post(`/deliveries/${id}/cancelled`)).data;
