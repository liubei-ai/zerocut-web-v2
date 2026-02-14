<script setup lang="ts">
import { Button } from '@/components/ui/button';
import LoginModal from '@/components/auth/LoginModal.vue';
import { useAuthStore } from '@/stores/authStore';
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { RouterLink } from 'vue-router';
import { getWalletInfo } from '@/api/walletApi';

const authStore = useAuthStore();
const showUserMenu = ref(false);
const userMenuRef = ref<HTMLElement | null>(null);

const workspaceUrl = import.meta.env.VITE_WORKSPACE_URL

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
  } catch (error: any) {
    if (error.code === 401) {
      authStore.clearAuthState();
    }
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
  <header class="sticky top-0 z-50 w-full h-16 bg-white border-b border-[#e5e7eb]">
    <div class="flex h-full items-center justify-between px-10">
      <!-- Logo -->
      <RouterLink to="/" class="flex items-center">
        <img src="/src/assets/logo.png" alt="ZeroCut" class="h-8 cursor-pointer" />
      </RouterLink>

      <!-- Right Actions -->
      <div class="flex items-center gap-4">
        <!-- Show login/register when not logged in -->
        <template v-if="!authStore.isAuthenticated">
          <Button size="sm" variant="ghost" @click="authStore.openLoginModal()" class="text-[#6b7280]">
            登录
          </Button>
          <Button size="sm" @click="authStore.openLoginModal()"
            class="bg-[#111827] text-white hover:bg-black rounded-[20px] px-4 py-2 text-sm font-medium">
            注册
          </Button>
        </template>

        <!-- Show user info when logged in -->
        <template v-else>
          <a title="剩余积分" :href="workspaceUrl + 'wallet'" target="_blank"
            class="flex items-center gap-2 bg-[#f9fafb] px-4 py-2 rounded-[20px] border border-[#e5e7eb]">
            <span class="text-base">💎</span>
            <span class="text-sm font-semibold text-[#111827]">
              {{ creditsBalance.toLocaleString() }}
            </span>
          </a>

          <!-- <Button size="sm" class="bg-[#111827] text-white hover:bg-black rounded-[20px] px-4 py-2 text-sm font-medium">
            升级
          </Button> -->

          <!-- User menu -->
          <div ref="userMenuRef" class="relative">
            <button :title="userInitial" @click="showUserMenu = !showUserMenu"
              class="w-9 h-9 rounded-full bg-[#111827] border-2 border-[#e5e7eb] cursor-pointer flex items-center justify-center text-base font-semibold text-white">
              {{ String(userInitial || '我').toUpperCase().slice(0, 1) }}
            </button>

            <!-- Dropdown menu -->
            <div v-if="showUserMenu"
              class="absolute right-0 mt-2 min-w-[160px] bg-white border border-[#e5e7eb] rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.12)] overflow-hidden z-[1000]">
              <button @click="handleLogout"
                class="w-full flex items-center gap-2 px-4 py-3 text-sm font-medium text-[#dc2626] hover:bg-[#fef2f2] transition-colors">
                <span>🚪</span>
                <span>退出</span>
              </button>
            </div>
          </div>
        </template>
      </div>
    </div>

    <!-- Login Modal -->
    <LoginModal v-model:open="authStore.showLoginModal" />
  </header>
</template>
