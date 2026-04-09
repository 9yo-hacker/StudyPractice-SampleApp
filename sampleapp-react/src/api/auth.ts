import { apiClient } from './client';
import { User } from '../types';

export const login = async (login: string, password: string): Promise<User> => {
  const response = await apiClient.post('/Users/Login', { login, password, name: login }, { skipGlobalError: true } as object);
  return response.data;
};

export const register = async (data: { login: string; password: string; name?: string }) => {
  const response = await apiClient.post('/Users', data, { skipGlobalError: true } as object);
  return response.data;
};
