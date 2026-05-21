import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useMembershipModalStore = defineStore('membershipModal', () => {
  const showMembershipModal = ref(false);

  const openMembershipModal = () => {
    showMembershipModal.value = true;
  };

  const closeMembershipModal = () => {
    showMembershipModal.value = false;
  };

  return {
    showMembershipModal,
    openMembershipModal,
    closeMembershipModal,
  };
});
