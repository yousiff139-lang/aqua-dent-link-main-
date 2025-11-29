type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
type ResponseType = 'json' | 'blob';

interface RequestOptions {
  method?: HttpMethod;
  body?: any;
  params?: Record<string, string | number | undefined>;
  responseType?: ResponseType;
}

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001/api';
const ADMIN_API_KEY = import.meta.env.VITE_ADMIN_API_KEY;

const buildQueryString = (params?: Record<string, string | number | undefined>) => {
  if (!params) return '';
  const entries = Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '');
  if (entries.length === 0) return '';
  const searchParams = new URLSearchParams();
  entries.forEach(([key, value]) => searchParams.append(key, String(value)));
  return `?${searchParams.toString()}`;
};

async function request<T = any>(path: string, options?: RequestOptions): Promise<T> {
  const { method = 'GET', body, params, responseType = 'json' } = options || {};
  const url = `${API_BASE_URL}${path}${buildQueryString(params)}`;

  const headers: Record<string, string> = {};
  if (ADMIN_API_KEY) {
    headers['x-admin-api-key'] = ADMIN_API_KEY;
  }

  let payload: BodyInit | undefined;
  if (body !== undefined && body !== null) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: payload,
    });

    if (!response.ok) {
      let message = 'Request failed';
      let errorDetails: any = null;
      try {
        const errorBody = await response.json();
        message = errorBody?.error?.message || errorBody?.message || message;
        errorDetails = errorBody?.error?.details || errorBody?.details;
      } catch {
        try {
          message = await response.text();
        } catch {
          // Network error or connection refused
          if (!response.status) {
            message = `Failed to connect to backend server. Please ensure the backend is running on ${API_BASE_URL}`;
          } else {
            message = `Request failed with status ${response.status}`;
          }
        }
      }
      const error = new Error(message) as any;
      error.response = { data: { error: { message, details: errorDetails } } };
      throw error;
    }

    if (responseType === 'blob') {
      return (await response.blob()) as T;
    }

    return (await response.json()) as T;
  } catch (error: any) {
    // Handle network errors
    if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
      throw new Error(`Failed to connect to backend server at ${API_BASE_URL}. Please ensure the backend is running.`);
    }
    throw error;
  }
}

const api = {
  get: <T = any>(path: string, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...options, method: 'GET' }),
  post: <T = any>(path: string, body?: any, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...options, method: 'POST', body }),
  put: <T = any>(path: string, body?: any, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...options, method: 'PUT', body }),
  delete: <T = any>(path: string, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...options, method: 'DELETE' }),
};

export default api;

