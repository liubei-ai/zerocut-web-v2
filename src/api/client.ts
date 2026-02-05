import type { ApiError as IApiError } from '@/types/api';
import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from 'axios';
import { useToast } from '@/composables/useToast';
import { useAuthStore } from '@/stores/authStore';

// Create ApiError class
export class ApiError extends Error implements IApiError {
  code: number;
  details?: any;

  constructor(code: number, message: string, details?: any) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.details = details;
  }
}

// Custom options interface
export interface ICustomOptions {
  noLoginModal?: boolean; // 当没有登录时不要显示登录框
  noLoading?: boolean; // 不显示加载中
  noErrorAlert?: boolean; // 请求出错后不弹出提示
  baseUrl?: string; // 自定义基础URL
  rawResponse?: boolean; // 是否返回原始响应而不是解析后的data
  timeout?: number; // 自定义超时时间
}

// Request options interface
export interface IRequestOptions extends ICustomOptions, Omit<AxiosRequestConfig, 'url' | 'method'> { }

// Common response interface
export interface ICommonResponse<T = any> {
  code: number;
  message: string;
  data: T;
  timestamp?: string;
  error?: {
    message: string;
    name: string;
  }
}

// Loading state management
let loadingCount = 0;
let loadingTimer: NodeJS.Timeout | null = null;

const showLoading = () => {
  loadingCount++;
  if (loadingTimer) {
    clearTimeout(loadingTimer);
  }
  loadingTimer = setTimeout(() => {
    // You can implement your loading UI here
    console.log('Loading started...');
  }, 300);
};

const hideLoading = () => {
  loadingCount--;
  if (loadingCount <= 0) {
    loadingCount = 0;
    if (loadingTimer) {
      clearTimeout(loadingTimer);
      loadingTimer = null;
    }
    // You can implement your loading UI hide here
    console.log('Loading finished...');
  }
};

// URL prefixes that should use the proxy target
const USER_TARGET_PREFIXES = ['/wallet/', '/homepage', '/auth'];

// Utility functions
export function isHttpStatusOk(statusCode: number): boolean {
  return statusCode >= 200 && statusCode < 300;
}

export function getAPIPrefix(customBaseUrl?: string): string {
  if (customBaseUrl) return customBaseUrl;
  return import.meta.env.VITE_API_AGENT_URL;
}

export function getUserAPIPrefix(): string {
  return import.meta.env.VITE_API_USER_URL;
}

// Request cancellation management
const cancelTokenMap: WeakMap<Promise<any>, AbortController> = new WeakMap();

// Show login modal instead of redirecting
const showLoginModal = () => {
  const authStore = useAuthStore();
  authStore.openLoginModal();
};

class HttpRequest {
  private defaultTimeout: number;
  private toast: any;

  constructor() {
    this.defaultTimeout = Number(import.meta.env.VITE_REQUEST_TIMEOUT) || 15000;
    this.toast = useToast().toast;
  }

  public get<RES = any, REQ = any>(
    url: string,
    params?: REQ,
    options: IRequestOptions = {}
  ): Promise<ICommonResponse<RES>> {
    return this.request<RES>({
      method: 'GET',
      url,
      params,
      ...options,
    });
  }

  public post<REQ = any, RES = any>(
    url: string,
    data?: REQ,
    options: IRequestOptions = {}
  ): Promise<ICommonResponse<RES>> {
    return this.request<RES>({
      method: 'POST',
      url,
      data,
      ...options,
    });
  }

  public put<REQ = any, RES = any>(
    url: string,
    data?: REQ,
    options: IRequestOptions = {}
  ): Promise<ICommonResponse<RES>> {
    return this.request<RES>({
      method: 'PUT',
      url,
      data,
      ...options,
    });
  }

  public patch<REQ = any, RES = any>(
    url: string,
    data?: REQ,
    options: IRequestOptions = {}
  ): Promise<ICommonResponse<RES>> {
    return this.request<RES>({
      method: 'PATCH',
      url,
      data,
      ...options,
    });
  }

  public delete<RES = any>(
    url: string,
    options: IRequestOptions = {}
  ): Promise<ICommonResponse<RES>> {
    return this.request<RES>({
      method: 'DELETE',
      url,
      ...options,
    });
  }

  public upload<RES = any>(
    url: string,
    file: File | FormData,
    options: IRequestOptions = {}
  ): Promise<ICommonResponse<RES>> {
    const formData = file instanceof FormData ? file : new FormData();
    if (file instanceof File) {
      formData.append('file', file);
    }

    return this.request<RES>({
      method: 'POST',
      url,
      data: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
        ...options.headers,
      },
      ...options,
    });
  }

  private async request<RES = any>(options: IRequestOptions & { method: string; url: string }): Promise<ICommonResponse<RES>> {
    const requestOptions = this.mergeOptions(options);
    const authStore = useAuthStore();

    let hasShowLoading = false;
    let loadingTimeout: NodeJS.Timeout | null = null;

    // Setup headers
    if (!requestOptions.headers) {
      requestOptions.headers = {};
    }

    // Add auth header if available
    /* const token = authStore.token;
    if (token) {
      requestOptions.headers['Authorization'] = `Bearer ${token}`;
    } */


    // Setup loading
    if (!options.noLoading) {
      loadingTimeout = setTimeout(() => {
        showLoading();
        hasShowLoading = true;
      }, 300);
    }

    // Setup abort controller for cancellation
    const abortController = new AbortController();
    requestOptions.signal = abortController.signal;

    try {
      const axiosInstance = this.createAxiosInstance();
      const requestPromise = axiosInstance.request<ICommonResponse<RES>>(requestOptions);

      // Store abort controller for potential cancellation
      cancelTokenMap.set(requestPromise, abortController);

      const response = await requestPromise;

      // Clean up
      cancelTokenMap.delete(requestPromise);

      // Handle raw response option
      if (options.rawResponse) {
        return response.data;
      }

      // Handle response based on status and custom options
      if (options.noLoginModal) {
        return response.data;
      }

      const { code, message, data } = response.data;

      if (response.status === 401 || code === 401) {
        // if (!options.noErrorAlert) {
        //   this.toast.error('登录已过期，请重新登录');
        // }
        authStore.clearAuthState();
        if (!options.noLoginModal) {
          showLoginModal();
        }
        throw new ApiError(401, 'Authentication failed', response);
      }

      if (!isHttpStatusOk(response.status) || (code && !isHttpStatusOk(code))) {
        if (!options.noErrorAlert) {
          this.toast.error(`请求失败，请稍后再试:${message}`);
        }
        throw new ApiError(code || response.status, message || 'Request failed', response);
      }

      return response.data;

    } catch (error) {
      if (axios.isCancel(error)) {
        // Request was cancelled, don't show error
        throw error;
      }

      if (error instanceof ApiError) {
        throw error;
      }

      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<ICommonResponse>;

        if (axiosError.response) {
          const { status, data } = axiosError.response;
          const errorMessage = data?.message || data?.error?.message
            || axiosError.message || 'Request failed';

          if (!options.noErrorAlert) {
            this.toast.error(errorMessage);
          }

          throw new ApiError(status, errorMessage, axiosError.response);
        } else if (axiosError.request) {
          const errorMessage = 'Network error, please check your connection';
          if (!options.noErrorAlert) {
            this.toast.error(errorMessage);
          }
          throw new ApiError(0, errorMessage, axiosError.request);
        }
      }

      // Unknown error
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      if (!options.noErrorAlert) {
        this.toast.error(errorMessage);
      }
      throw new ApiError(-1, errorMessage, error);

    } finally {
      // Clean up loading
      if (hasShowLoading) {
        hideLoading();
      }
      if (loadingTimeout) {
        clearTimeout(loadingTimeout);
      }
    }
  }

  private mergeOptions(options: IRequestOptions & { method: string; url: string }): AxiosRequestConfig {
    // Determine base URL
    let baseURL: string;
    if (options.baseUrl) {
      baseURL = options.baseUrl;
    } else {
      const shouldUseUserTarget = USER_TARGET_PREFIXES.some(prefix =>
        options.url.startsWith(prefix)
      );
      baseURL = shouldUseUserTarget ? getUserAPIPrefix() : getAPIPrefix();
    }

    const url = options.url.startsWith('http') ? options.url : `${baseURL}${options.url}`;

    return {
      timeout: options.timeout || this.defaultTimeout,
      withCredentials: true,
      headers: {
        ...options.headers,
      },
      ...options,
      url,
      baseURL: undefined, // Clear baseURL since we're using full URL
    };
  }

  private createAxiosInstance(): AxiosInstance {
    const instance = axios.create();

    // Request interceptor
    instance.interceptors.request.use(
      (config) => config,
      (error) => Promise.reject(error)
    );

    // Response interceptor
    instance.interceptors.response.use(
      (response) => response,
      (error) => Promise.reject(error)
    );

    return instance;
  }
}

// Request cancellation utility
export function cancelRequest(requestPromise: Promise<any>): void {
  const abortController = cancelTokenMap.get(requestPromise);
  if (abortController) {
    abortController.abort();
    cancelTokenMap.delete(requestPromise);
  }
}

// Export the HTTP client instance
export const request = new HttpRequest();

export default request;