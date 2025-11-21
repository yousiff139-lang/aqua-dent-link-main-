import axios, { AxiosInstance, AxiosError } from 'axios';
import { getAuthToken, clearAuthSession } from '@/utils/storage';

const API_BASE_URL = import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001/api';

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
    // Handle network errors
    if (!error.response && error.request) {
      const errorMessage =
        'Unable to reach the Aqua Dent Link servers right now. Please check your connection or try again shortly.';
      return Promise.reject({
        message: errorMessage,
        status: 0,
        data: null,
      });
    }

    // Handle 401 Unauthorized - clear session and redirect to login
    // But only if it's not a 403 Forbidden (which is different from 401)
    if (error.response?.status === 401) {
      clearAuthSession();
      // Don't redirect immediately - let the error be handled by the component first
      // The component can show a proper error message before redirecting
      return Promise.reject({
        message: 'Authentication failed. Please log in again.',
        status: 401,
        data: error.response?.data,
        shouldRedirect: true,
      });
    }

    // Handle other errors
    const responseData = error.response?.data as { message?: string; error?: { message?: string } } | undefined;
    const errorMessage = responseData?.error?.message || responseData?.message || error.message || 'An error occurred';
    
    return Promise.reject({
      message: errorMessage,
      status: error.response?.status,
      data: error.response?.data,
    });
  }
);

export default api;
