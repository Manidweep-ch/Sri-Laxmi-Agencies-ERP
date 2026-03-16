import api from "../api/axiosConfig";

export const getSalesOrderItems = async (orderId) => {
  const res = await api.get(`/sales-order-items/order/${orderId}`);
  return res.data;
};

export const createSalesOrderItem = async (item) => {
  const res = await api.post("/sales-order-items", item);
  return res.data;
};