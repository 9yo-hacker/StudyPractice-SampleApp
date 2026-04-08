import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;

export const checkLoginUnique = async (login: string): Promise<boolean> => {
  try {
    const response = await axios.get(`${API_URL}/Users/check-login?login=${login}`);
    return response.data.isUnique;
  } catch {
    return false;
  }
};
