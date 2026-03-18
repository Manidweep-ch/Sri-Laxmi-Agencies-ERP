import api from "../api/axiosConfig";

export const login = async (credentials) => {
  const res = await api.post("/auth/login", credentials);
  return res.data;
};

export const logout = () => {
  localStorage.removeItem("token");
  window.location.href = "/";
};

export const getCurrentUser = () => {
  const token = localStorage.getItem("token");
  if (!token) return null;
  
  try {
    // Decode JWT payload (basic decode, not verification)
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload;
  } catch (error) {
    console.error('Error decoding token:', error);
    return null;
  }
};

export const isAuthenticated = () => {
  const token = localStorage.getItem("token");
  if (!token) return false;
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const currentTime = Date.now() / 1000;
    return payload.exp > currentTime;
  } catch (error) {
    return false;
  }
};