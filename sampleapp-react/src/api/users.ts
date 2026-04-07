import axios from 'axios';
import { User } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5071/api';

export const getUsers = async (): Promise<User[]> => {
  const response = await axios.get<User[]>(`${API_URL}/Users`);
  return response.data;
};

export const getUserById = async (id: number): Promise<User> => {
  const response = await axios.get<User>(`${API_URL}/Users/${id}`);
  return response.data;
};

export const createUser = async (user: User): Promise<User> => {
  const response = await axios.post<User>(`${API_URL}/Users`, user);
  return response.data;
};

export const updateUser = async (user: User): Promise<User> => {
  const response = await axios.put<User>(`${API_URL}/Users`, user);
  return response.data;
};

export const deleteUser = async (id: number): Promise<boolean> => {
  const response = await axios.delete<boolean>(`${API_URL}/Users/${id}`);
  return response.data;
};
