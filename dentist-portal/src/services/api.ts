import axios, { AxiosInstance, AxiosError } from 'axios';
import { getAuthToken, clearAuthSession } from '@/utils/storage';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - add auth token
api.interceptors.request.use(
  (config) => {
    const token = getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle errors
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    // Handle 401 Unauthorized - clear session and redirect to login
    if (error.response?.status === 401) {
      clearAuthSession();
      window.location.href = '/login';
    }

    // Handle other errors
    const responseData = error.response?.data as { message?: string } | undefined;
    const errorMessage = responseData?.message || error.message || 'An error occurred';
    
    return Promise.reject({
      message: errorMessage,
      status: error.response?.status,
      data: error.response?.data,
    });
  }
);

export default api;
