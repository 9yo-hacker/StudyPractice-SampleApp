import axios from 'axios';
import { errorService } from '../services/error.service';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5071/api/v1';

let activeRequests = 0;
let loadingCallback: ((loading: boolean) => void) | null = null;

export const setLoadingCallback = (callback: (loading: boolean) => void) => {
  loadingCallback = callback;
};

const updateLoadingState = () => {
  if (loadingCallback) {
    loadingCallback(activeRequests > 0);
  }
};

const getToken = () => {
  const userStr = localStorage.getItem('user');
  if (userStr) {
    try {
      const user = JSON.parse(userStr);
      return user.token;
    } catch {
      return null;
    }
  }
  return null;
};

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
});

apiClient.interceptors.request.use((config) => {
  const token = getToken();
  const isAuthRequest =
    config.url?.includes('/Users/Login') || config.url?.includes('/Users/Register');

  if (token && !isAuthRequest) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  activeRequests++;
  updateLoadingState();
  return config;
});

apiClient.interceptors.response.use(
  (response) => {
    activeRequests--;
    updateLoadingState();
    return response;
  },
  (error) => {
    activeRequests--;
    updateLoadingState();

    if (!error.config?.skipGlobalError) {
      errorService.handleError(error);
    }

    if (error.response?.status === 401) {
      const isAuthRequest = error.config?.url?.includes('/Users/Login');
      if (!isAuthRequest) {
        localStorage.removeItem('user');
        window.dispatchEvent(new Event('storage'));
        window.location.href = '/login?session=expired';
      }
    }

    return Promise.reject(error);
  }
);
