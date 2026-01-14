import type { ApiError, User } from '@/types/api';
import { useGuard, type User as AuthingUser } from '@authing/guard-vue3';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { requestLogout, syncUserProfile } from '@/api/authApi';
import apiClient from '@/api/client';

export const useAuthStore = defineStore(
  'auth',
  () => {
    // State
    const loading = ref(false);
    const error = ref<string | null>(null);
    const isLoggedIn = ref(false);
    const user = ref<User | null>(null);
    const currentWorkspaceId = ref<string | null>(null);

    // Initialize guard
    const guard = useGuard();

    // Computed
    const isAuthenticated = computed(() => isLoggedIn.value && !!user.value);
    const userName = computed(() => user.value?.username || user.value?.email || '');

    /**
     * Fetch workspace ID from backend
     */
    const fetchAndSetWorkspaceId = async (): Promise<string | null> => {
      try {
        const response = await apiClient.get<any>('/homepage');
        const wsId = response.data?.workspaces?.[0]?.workspaceId || null;
        currentWorkspaceId.value = wsId;
        return wsId;
      } catch (err) {
        console.error('Failed to fetch workspace ID:', err);
        return null;
      }
    };

    /**
     * Handle Authing login success
     */
    const setAuthingUser = async (authingUser: AuthingUser) => {
      try {
        // Sync user info with backend
        const response = await syncUserProfile({
          authingId: authingUser.id,
          username: authingUser.username as string,
          email: authingUser.email as string,
          phone: authingUser.phone as string,
          token: authingUser.token as string,
        });

        console.log('User synced:', response);

        user.value = response.data as User;
        isLoggedIn.value = true;
        error.value = null;

        console.log('Authing user logged in:', user.value);
        
        // Fetch workspace ID after login
        await fetchAndSetWorkspaceId();
      } catch (err) {
        console.error('Failed to sync user:', err);
        throw err;
      }
    };

    /**
     * Logout user
     */
    const logout = async (): Promise<void> => {
      loading.value = true;

      try {
        // Clear local state first
        clearAuthState();

        // Then call backend and Authing logout
        await requestLogout();
        await guard.logout();
      } catch (err) {
        console.error('Logout failed:', err);
        // Even if remote logout fails, local state is cleared
      } finally {
        // Ensure state is cleared
        clearAuthState();
        loading.value = false;
      }
    };

    /**
     * Clear authentication state
     */
    const clearAuthState = () => {
      isLoggedIn.value = false;
      user.value = null;
      error.value = null;
      currentWorkspaceId.value = null;
    };

    /**
     * Handle authentication errors
     */
    const handleAuthError = (apiError: ApiError) => {
      if (apiError.code === 401) {
        error.value = 'Invalid username or password';
        clearAuthState();
      } else if (apiError.code === 403) {
        error.value = 'Access denied';
      } else if (apiError.code === 0) {
        error.value = 'Network error. Please check your connection.';
      } else {
        error.value = apiError.message || 'Login failed. Please try again.';
      }
    };

    /**
     * Clear error state
     */
    const clearError = () => {
      error.value = null;
    };

    return {
      // State
      loading,
      error,
      isLoggedIn,
      user,
      currentWorkspaceId,

      // Computed
      isAuthenticated,
      userName,

      // Methods
      setAuthingUser,
      fetchAndSetWorkspaceId,
      logout,
      clearAuthState,
      handleAuthError,
      clearError,
    };
  },
  {
    persist: true,
  }
);
