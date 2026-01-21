import type { ApiError, ApiResponse } from '@/types/api';
import axios, { AxiosError, AxiosInstance, AxiosResponse } from 'axios';

// URL prefixes that should use the proxy target
const USER_TARGET_PREFIXES = ['/wallet/', '/homepage'];

// Create axios instance with default configuration
const apiClient: AxiosInstance = axios.create({
  timeout: Number(import.meta.env.VITE_REQUEST_TIMEOUT) || 15000,
  withCredentials: true, // Enable httpOnly cookies
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    // Set baseURL based on request URL
    const shouldUseUserTarget = USER_TARGET_PREFIXES.some(prefix =>
      config.url?.startsWith(prefix)
    );

    if (shouldUseUserTarget) {
      config.baseURL = import.meta.env.VITE_API_USER_URL;
    } else {
      config.baseURL = import.meta.env.VITE_API_AGENT_URL;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle unified ApiResponse structure
apiClient.interceptors.response.use(
  (response: AxiosResponse<ApiResponse>) => {
    const { code, message, data } = response.data;

    // Check if the response indicates success
    if (code === 200 || code === 0) {
      // Return the data directly for successful responses
      return { ...response, data: data };
    } else if (code === 401) {
      // Handle authentication failure
      console.warn('Authentication failed');
      const apiError: ApiError = {
        code,
        message: message || 'Authentication failed',
        details: data,
      };
      return Promise.reject(apiError);
    } else {
      // Handle other API-level errors
      const apiError: ApiError = {
        code,
        message,
        details: data,
      };
      return Promise.reject(apiError);
    }
  },
  (error: AxiosError) => {
    // Handle HTTP-level errors
    if (error.response) {
      const status = error.response.status;

      // Server responded with error status
      const apiError: ApiError = {
        code: status,
        message: error.response.statusText || 'Request failed',
        details: error.response.data,
      };
      return Promise.reject(apiError);
    } else if (error.request) {
      // Request was made but no response received
      const apiError: ApiError = {
        code: 0,
        message: 'Network error - no response received',
        details: error.request,
      };
      return Promise.reject(apiError);
    } else {
      // Something else happened
      const apiError: ApiError = {
        code: -1,
        message: error.message || 'Unknown error occurred',
        details: error,
      };
      return Promise.reject(apiError);
    }
  }
);

export default apiClient;
