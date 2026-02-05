// API Response Types
export interface ApiResponse<T = any> {
  code: number;
  message: string;
  data: T;
  timestamp?: string;
}

// Authentication Types
export interface User {
  authingId: string;
  username?: string;
  name?: string;
  email?: string;
  phone?: string;
  avatar?: string;
}

// Error Types
export interface ApiError {
  code: number;
  message: string;
  details?: any;
}

// Request Configuration Types
export interface RequestConfig {
  timeout?: number;
  headers?: Record<string, string>;
  params?: Record<string, any>;
  data?: any;
}

// Generic API Request Types
export interface GetRequest<T = any> {
  params?: T;
}

export interface PostRequest<T = any> {
  data: T;
}

export interface PutRequest<T = any> {
  data: T;
}

export interface PatchRequest<T = any> {
  data: Partial<T>;
}

export interface DeleteRequest {
  params?: Record<string, any>;
}

// Upload Request Type
export interface UploadRequest {
  file: File | FormData;
  onProgress?: (progress: number) => void;
}
