<script setup lang="ts">
import { Button } from '@/components/ui/button';
import LoginModal from '@/components/auth/LoginModal.vue';
import { useAuthStore } from '@/stores/authStore';
import { Gem, LogOut } from 'lucide-vue-next';
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { getWalletInfo } from '@/api/walletApi';

const authStore = useAuthStore();
const showLoginModal = ref(false);
const showUserMenu = ref(false);
const userMenuRef = ref<HTMLElement | null>(null);

// Wallet balance state
const creditsBalance = ref(0);
const isLoadingCredits = ref(false);
let creditsUpdateTimer: ReturnType<typeof setInterval> | null = null;

const userInitial = computed(() => {
  const user = authStore.user;
  console.log('user in computed: ', user);
  if (!user) return '尊贵的ZeroCut用户';

  // 优先级：username > name > email > phone > 默认
  if (user.username && user.username.trim()) {
    return user.username;
  }
  if (user.name && user.name.trim()) {
    return user.name;
  }
  if (user.email && user.email.trim()) {
    return user.email;
  }
  if (user.phone && user.phone.trim()) {
    return user.phone;
  }

  return '尊贵的ZeroCut用户';
});

// Fetch wallet balance
const fetchCreditsBalance = async () => {
  if (!authStore.user || isLoadingCredits.value) return;

  isLoadingCredits.value = true;
  try {
    // Get workspace ID
    let workspaceId = authStore.currentWorkspaceId;
    if (!workspaceId) {
      try {
        // @ts-ignore - fetchAndSetWorkspaceId may not be typed
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
  } catch (error) {
    console.error('Failed to fetch wallet balance:', error);
  } finally {
    isLoadingCredits.value = false;
  }
};

// Start periodic wallet balance updates
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

// Stop periodic wallet balance updates
const stopCreditsUpdateTimer = () => {
  if (creditsUpdateTimer) {
    clearInterval(creditsUpdateTimer);
    creditsUpdateTimer = null;
  }
};

const handleLogout = async () => {
  try {
    await authStore.logout();
    showUserMenu.value = false;
  } catch (error) {
    console.error('Logout failed:', error);
  }
};

// Close menu when clicking outside
const handleClickOutside = (event: MouseEvent) => {
  if (userMenuRef.value && !userMenuRef.value.contains(event.target as Node)) {
    showUserMenu.value = false;
  }
};

// Watch authentication state changes
watch(() => authStore.isAuthenticated, (isAuthenticated) => {
  if (isAuthenticated) {
    startCreditsUpdateTimer();
  } else {
    stopCreditsUpdateTimer();
    creditsBalance.value = 0;
  }
});

onMounted(() => {
  document.addEventListener('click', handleClickOutside);

  // Start wallet balance updates if user is logged in
  if (authStore.isAuthenticated) {
    startCreditsUpdateTimer();
  }
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
  stopCreditsUpdateTimer();
});
</script>

<template>
  <header class="sticky top-0 z-50 w-full border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
    <div class="container mx-auto flex h-16 items-center justify-between px-4">
      <!-- Logo -->
      <a href="/" class="flex items-center gap-2">
        <img src="/src/assets/logo.png" alt="ZeroCut" class="h-8" />
      </a>

      <!-- Right Actions -->
      <div class="flex items-center gap-3">
        <!-- Show login/register when not logged in -->
        <template v-if="!authStore.isAuthenticated">
          <Button size="sm" variant="ghost" @click="showLoginModal = true">
            登录
          </Button>
          <Button size="sm"
            class=" hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 rounded-full"
            @click="showLoginModal = true">
            注册
          </Button>
        </template>

        <!-- Show user info when logged in -->
        <template v-else>
          <div
            class="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 dark:bg-slate-800 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
            <Gem class="h-4 w-4 text-blue-600 dark:text-blue-500" />
            <span class="text-sm font-medium text-slate-900 dark:text-slate-50">
              {{ creditsBalance.toLocaleString() }}
            </span>
          </div>
          <Button size="sm"
            class=" hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 rounded-full">
            升级
          </Button>

          <!-- User menu -->
          <div ref="userMenuRef" class="relative">
            <Button size="sm"
              class="rounded-full p-0 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
              @click="showUserMenu = !showUserMenu">
              <span class="text-sm font-semibold text-white">{{ userInitial }}</span>
            </Button>

            <!-- Dropdown menu -->
            <div v-if="showUserMenu"
              class="absolute right-0 mt-2 min-w-[12rem] max-w-[16rem] rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 dark:bg-slate-800 dark:ring-slate-700">
              <div class="py-1">
                <div class="px-4 py-2 text-sm text-slate-700 dark:text-slate-300">
                  <div class="font-medium truncate">{{ authStore.userName }}</div>
                  <div class="text-xs text-slate-500 dark:text-slate-400 truncate">{{ authStore.user?.email }}</div>
                </div>
                <hr class="my-1 border-slate-200 dark:border-slate-700" />
                <button @click="handleLogout"
                  class="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700">
                  <LogOut class="h-4 w-4" />
                  退出登录
                </button>
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>

    <!-- Login Modal -->
    <LoginModal v-model:open="showLoginModal" />
  </header>
</template>
