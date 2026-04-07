import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;

export const login = async (login: string, password: string) => {
  const response = await axios.post(`${API_URL}/users/login`, { login, password });
  return response.data;
};

export const register = async (data: { login: string; password: string; name?: string }) => {
  const response = await axios.post(`${API_URL}/users`, data);
  return response.data;
};
