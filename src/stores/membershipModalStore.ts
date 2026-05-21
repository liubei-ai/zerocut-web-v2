import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useMembershipModalStore = defineStore('membershipModal', () => {
  const showMembershipModal = ref(false);
  const pendingReopen = ref(false);

  const openMembershipModal = () => {
    showMembershipModal.value = true;
  };

  const closeMembershipModal = () => {
    showMembershipModal.value = false;
  };

  const markPendingReopen = () => {
    pendingReopen.value = true;
  };

  const clearPendingReopen = () => {
    pendingReopen.value = false;
  };

  return {
    showMembershipModal,
    pendingReopen,
    openMembershipModal,
    closeMembershipModal,
    markPendingReopen,
    clearPendingReopen,
  };
});
