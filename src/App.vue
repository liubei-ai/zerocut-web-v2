<script setup lang="ts">
import { watch } from 'vue';
import { Toaster, ToastProvider } from '@/components/ui/toast';
import MembershipModal from '@/components/membership/MembershipModal.vue';
import { useMembershipModalStore } from '@/stores/membershipModalStore';
import { useCreditsStore } from '@/stores/creditsStore';

const membershipModalStore = useMembershipModalStore();
const creditsStore = useCreditsStore();

watch(
  () => creditsStore.creditsBalance,
  balance => {
    if (typeof balance === 'number') {
      membershipModalStore.tryAutoOpenForLowCredits(balance);
    }
  },
);
</script>

<template>
  <ToastProvider>
    <router-view />
    <Toaster />
    <MembershipModal v-model:open="membershipModalStore.showMembershipModal" />
  </ToastProvider>
</template>

<style scoped></style>
