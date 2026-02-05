<template>
  <TransitionGroup
    name="toast"
    tag="div"
    class="fixed bottom-4 right-4 z-[100] flex flex-col-reverse gap-2 max-w-sm w-full"
  >
    <Toast
      v-for="toast in toasts"
      :key="toast.id"
      :variant="toast.variant"
      :title="toast.title"
      :description="toast.description"
      :duration="toast.duration"
      @update:open="(open: boolean) => !open && removeToast(toast.id)"
    />
  </TransitionGroup>
</template>

<script setup lang="ts">
import { useToast } from '@/composables/useToast'
import Toast from './Toast.vue'

const { toasts, removeToast } = useToast()
</script>

<style scoped>
/* Toast enter animation - slide up from bottom */
.toast-enter-active {
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.toast-leave-active {
  transition: all 0.3s cubic-bezier(0.55, 0.085, 0.68, 0.53);
}

.toast-enter-from {
  opacity: 0;
  transform: translateY(100%) scale(0.8);
}

.toast-leave-to {
  opacity: 0;
  transform: translateY(100%) scale(0.8);
}

/* Move animation for other toasts when one is removed */
.toast-move {
  transition: transform 0.3s ease;
}
</style>