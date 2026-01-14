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
}

// Error Types
export interface ApiError {
  code: number;
  message: string;
  details?: any;
}
