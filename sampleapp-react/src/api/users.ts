import { apiClient } from './client';
import { User } from '../types';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const getUsers = async (): Promise<User[]> => {
  await delay(1000);
  const response = await apiClient.get<User[]>('/Users');
  return response.data;
};

export const getUserById = async (id: number): Promise<User> => {
  await delay(800);
  const response = await apiClient.get<User>(`/Users/${id}`);
  return response.data;
};

export const createUser = async (user: Partial<User>) => {
  await delay(1200);
  const response = await apiClient.post('/Users', user);
  return response.data;
};

export const updateUser = async (id: number, user: Partial<User>) => {
  await delay(1200);
  const response = await apiClient.put(`/Users/${id}`, user);
  return response.data;
};

export const deleteUser = async (id: number) => {
  await delay(1000);
  const response = await apiClient.delete(`/Users/${id}`);
  return response.data;
};
