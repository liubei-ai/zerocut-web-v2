import type { ApiError as IApiError, User } from '@/types/api';
import { useGuard, type User as AuthingUser } from '@authing/guard-vue3';
import { defineStore } from 'pinia';
import { computed, ref, watch } from 'vue';
import { requestLogout, syncUserProfile } from '@/api/authApi';
import apiClient from '@/api/client';
import { useToast } from '@/composables/useToast';

export const useAuthStore = defineStore(
  'auth',
  () => {
    // State
    const loading = ref(false);
    const error = ref<string | null>(null);
    const isLoggedIn = ref(false);
    const user = ref<User | null>(null);
    const currentWorkspaceId = ref<string | null>(null);
    const showLoginModal = ref(false);
    const token = ref<string | null>(null);

    // Initialize guard and toast
    const guard = useGuard();
    const { toast } = useToast();

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

        user.value = response.data;
        //token.value = response.data.token;
        isLoggedIn.value = true;
        error.value = null;

        console.log('Authing user logged in:', user.value);

        // Show success toast
        //toast.success(`Welcome back, ${user.value.username || user.value.email}!`, 'Login Successful');

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

        // Show success toast
        toast.success('You have been logged out successfully.', 'Logout Successful');
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
      token.value = null;
      error.value = null;
      currentWorkspaceId.value = null;
    };

    /**
     * Handle authentication errors
     */
    const handleAuthError = (apiError: IApiError) => {
      if (apiError.code === 401) {
        error.value = 'Invalid username or password';
        clearAuthState();
        console.log('openLoginModal', openLoginModal)
        openLoginModal(); // Show login modal on auth error
      } else if (apiError.code === 403) {
        error.value = 'Access denied';
      } else if (apiError.code === 0) {
        error.value = 'Network error. Please check your connection.';
      } else {
        error.value = apiError.message || 'Login failed. Please try again.';
      }
    };

    /**
     * Show login modal
     */
    const openLoginModal = () => {
      showLoginModal.value = true;
    };

    /**
     * Hide login modal
     */
    const closeLoginModal = () => {
      showLoginModal.value = false;
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
      showLoginModal,
      token,

      // Computed
      isAuthenticated,
      userName,

      // Methods
      setAuthingUser,
      fetchAndSetWorkspaceId,
      logout,
      clearAuthState,
      handleAuthError,
      openLoginModal,
      closeLoginModal,
      clearError,
    };
  },
  {
    persist: {
      pick: ['isLoggedIn', 'currentWorkspaceId', 'user'],
    },
  }
);
