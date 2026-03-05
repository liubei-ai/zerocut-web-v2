import { defineStore } from 'pinia';
import { ref } from 'vue';
import { getWalletInfo } from '@/api/walletApi';
import { useAuthStore } from './authStore';

export const useCreditsStore = defineStore('credits', () => {
  const creditsBalance = ref<null | Number>(null);
  const isLoadingCredits = ref(false);
  let creditsUpdateTimer: ReturnType<typeof setInterval> | null = null;

  /**
   * Fetch wallet balance
   */
  const fetchCreditsBalance = async () => {
    const authStore = useAuthStore();

    if (!authStore.user || isLoadingCredits.value) return;

    isLoadingCredits.value = true;
    try {
      let workspaceId = authStore.currentWorkspaceId;
      if (!workspaceId) {
        try {
          workspaceId = await authStore.fetchAndSetWorkspaceId();
        } catch (error) {
          console.warn('Failed to fetch workspace ID:', error);
        }
      }

      if (!workspaceId) {
        console.warn('No workspace ID found, skipping wallet balance fetch');
        return;
      }

      const walletInfo = await getWalletInfo(workspaceId);
      creditsBalance.value = walletInfo.availableCredits;
    } catch (error: any) {
      if (error.code === 401) {
        authStore.clearAuthState();
      }
      console.error('Failed to fetch wallet balance:', error);
    } finally {
      isLoadingCredits.value = false;
    }
  };

  /**
   * Start periodic wallet balance updates
   */
  const startCreditsUpdateTimer = () => {
    // Initial fetch with delay to avoid concurrent requests
    setTimeout(() => {
      fetchCreditsBalance();
    }, 500);

    // Update every 60 seconds
    creditsUpdateTimer = setInterval(() => {
      fetchCreditsBalance();
    }, 60000);
  };

  /**
   * Stop periodic wallet balance updates
   */
  const stopCreditsUpdateTimer = () => {
    if (creditsUpdateTimer) {
      clearInterval(creditsUpdateTimer);
      creditsUpdateTimer = null;
    }
  };

  /**
   * Reset credits state
   */
  const resetCredits = () => {
    creditsBalance.value = 0;
    stopCreditsUpdateTimer();
  };

  return {
    creditsBalance,
    isLoadingCredits,
    fetchCreditsBalance,
    startCreditsUpdateTimer,
    stopCreditsUpdateTimer,
    resetCredits,
  };
});
