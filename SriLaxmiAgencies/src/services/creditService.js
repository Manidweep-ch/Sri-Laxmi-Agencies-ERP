import axios from 'axios';

const API_URL = 'http://localhost:8081/api/credit-notes';

export const createCredit = async (creditData) => {
  const response = await axios.post(API_URL, creditData);
  return response.data;
};

export const getCreditsByInvoice = async (invoiceId) => {
  const response = await axios.get(`${API_URL}/invoice/${invoiceId}`);
  return response.data;
};

export const getAllCreditNotes = async () => {
  const response = await axios.get(API_URL);
  return response.data;
};