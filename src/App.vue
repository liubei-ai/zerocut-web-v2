<script setup lang="ts">
import { Toaster, ToastProvider } from '@/components/ui/toast';
import MembershipModal from '@/components/membership/MembershipModal.vue';
import { useMembershipModalStore } from '@/stores/membershipModalStore';

const membershipModalStore = useMembershipModalStore();
</script>

<template>
  <ToastProvider>
    <router-view />
    <Toaster />
    <MembershipModal v-model:open="membershipModalStore.showMembershipModal" />
  </ToastProvider>
</template>

<style scoped></style>
