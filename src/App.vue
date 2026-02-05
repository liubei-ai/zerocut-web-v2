<script setup lang="ts">
import { Toaster, ToastProvider } from '@/components/ui/toast'
</script>

<template>
  <ToastProvider>
    <router-view />
    <Toaster />
  </ToastProvider>
</template>

<style scoped></style>
