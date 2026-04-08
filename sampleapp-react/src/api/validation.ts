import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;

export const checkLoginUnique = async (_login: string): Promise<boolean> => {
  // Эндпоинт не реализован на бэке
  return true;
};
