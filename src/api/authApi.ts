import { type User } from '@/types/api';
import { request, type IRequestOptions } from './client';

export interface SyncUserProfileRequest {
  authingId: string;
  username: string;
  email: string;
  phone: string;
  token: string;
}

// Sync user profile with custom options
export async function syncUserProfile(
  user: SyncUserProfileRequest, 
  options?: IRequestOptions
) {
  return request.post<SyncUserProfileRequest, User>(
    '/auth/sync', 
    user, 
    {
      noLoading: false, // Show loading by default
      noErrorAlert: false, // Show error alerts by default
      ...options
    }
  );
}

// Request logout with no loading indicator
export async function requestLogout(options?: IRequestOptions) {
  return request.post('/auth/logout', undefined, {
    noLoading: true, // Don't show loading for logout
    noErrorAlert: true, // Don't show error alerts for logout
    ...options
  });
}

// Validate token silently (no loading, no error alerts)
export async function validateToken(options?: IRequestOptions) {
  return request.get<undefined, User>('/auth/me', undefined, {
    noLoading: true,
    noErrorAlert: true,
    noLoginModal: true, // Don't redirect on auth failure for token validation
    ...options
  });
}

// Example of using custom base URL
export async function validateTokenWithCustomUrl(customApiUrl: string) {
  return request.get<undefined, User>('/auth/me', undefined, {
    baseUrl: customApiUrl,
    noLoading: true,
    noErrorAlert: true,
    noLoginModal: true,
  });
}

// Example of getting raw response
export async function getUserProfileRaw() {
  return request.get<undefined, User>('/auth/me', undefined, {
    rawResponse: true, // Return the full response object
    noLoading: true,
  });
}
