import { type User } from '@/types/api';
import apiClient from './client';

export interface SyncUserProfileRequest {
  authingId: string;
  username: string;
  email: string;
  phone: string;
  token: string;
}

export async function syncUserProfile(user: SyncUserProfileRequest) {
  return apiClient.post<User>('/auth/sync', user);
}

export async function requestLogout() {
  return apiClient.post('/auth/logout');
}

export async function validateToken() {
  return apiClient.get<User>('/auth/me');
}
