<script setup lang="ts">
import { useAuthStore } from '@/stores/authStore';
import type { User } from '@authing/guard-vue3';
import { useGuard } from '@authing/guard-vue3';
import { onMounted, onUnmounted, ref, watch } from 'vue';
// Import clean Authing CSS with global resets removed
import '@/assets/authing-clean.css';
//import '@authing/guard-vue3/dist/esm/guard.min.css';

const props = defineProps<{
  open: boolean;
}>();

const emit = defineEmits<{
  'update:open': [value: boolean];
}>();

const authStore = useAuthStore();
const guard = useGuard();
const error = ref('');
const showError = ref(false);

// Handle login success
guard.on('login', async (authingUser: User) => {
  try {
    if (authingUser) {
      console.log('Login successful, user info:', authingUser);
      await authStore.setAuthingUser(authingUser);
      // Close modal after successful login
      authStore.closeLoginModal();
    }
  } catch (err) {
    console.error('Login failed:', err);
    error.value = 'Login failed, please try again';
    showError.value = true;
  }
});

// Handle login error
guard.on('login-error', (err: any) => {
  console.error('Login failed:', err);
  error.value = err.message || 'Login failed, please try again';
  showError.value = true;
});

// Start guard when modal opens
watch(() => props.open, (isOpen) => {
  console.log('isoepn',isOpen)
  if (isOpen) {
    setTimeout(() => {
      guard.start('#authing-guard-container');
    }, 100);
  }
});

onMounted(() => {
  if (props.open) {
    guard.start('#authing-guard-container');
  }
});

onUnmounted(() => {
  // Cleanup if needed
});
</script>

<template>
  <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" @click.self="authStore.closeLoginModal()">
    <div class="relative w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-slate-900">
      <!-- Close button -->
      <button
        class="absolute right-4 top-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
        @click="authStore.closeLoginModal()"
      >
        <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <!-- Authing Guard Container -->
      <div id="authing-guard-container"></div>

      <!-- Error message -->
      <div v-if="showError" class="mt-4 rounded-md bg-red-50 p-4 dark:bg-red-900/20">
        <div class="flex">
          <div class="flex-shrink-0">
            <svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
            </svg>
          </div>
          <div class="ml-3">
            <p class="text-sm text-red-800 dark:text-red-200">{{ error }}</p>
          </div>
          <div class="ml-auto pl-3">
            <button @click="showError = false" class="inline-flex rounded-md text-red-400 hover:text-red-500">
              <span class="sr-only">Dismiss</span>
              <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
