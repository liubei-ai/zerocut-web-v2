import { defineStore } from 'pinia';
import { ref } from 'vue';
import { useAuthStore } from './authStore';

const LOW_CREDIT_THRESHOLD = 50;
const STORAGE_KEY_PREFIX = 'membership_modal_auto_shown';

function getTodayKey(userId: string) {
  const d = new Date();
  const ymd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return `${STORAGE_KEY_PREFIX}:${userId}:${ymd}`;
}

export const useMembershipModalStore = defineStore('membershipModal', () => {
  const showMembershipModal = ref(false);

  const openMembershipModal = () => {
    showMembershipModal.value = true;
    const authingId = useAuthStore().user?.authingId;
    if (authingId) {
      try {
        localStorage.setItem(getTodayKey(authingId), '1');
      } catch (e) {
        console.warn('Failed to persist membership modal shown state:', e);
      }
    }
  };

  const closeMembershipModal = () => {
    showMembershipModal.value = false;
  };

  const tryAutoOpenForLowCredits = (balance: number | null) => {
    if (balance == null || balance >= LOW_CREDIT_THRESHOLD) return;
    if (showMembershipModal.value) return;
    const authingId = useAuthStore().user?.authingId;
    if (!authingId) return;
    try {
      if (localStorage.getItem(getTodayKey(authingId))) return;
    } catch (e) {
      console.warn('Failed to read membership modal shown state:', e);
      return;
    }
    openMembershipModal();
  };

  return {
    showMembershipModal,
    openMembershipModal,
    closeMembershipModal,
    tryAutoOpenForLowCredits,
  };
});
