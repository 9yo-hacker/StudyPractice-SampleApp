import axios from 'axios';

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

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((config) => {
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
    return Promise.reject(error);
  }
);
