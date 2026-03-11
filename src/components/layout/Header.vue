<script setup lang="ts">
import { Button } from '@/components/ui/button';
import LoginModal from '@/components/auth/LoginModal.vue';
import { useAuthStore } from '@/stores/authStore';
import { useCreditsStore } from '@/stores/creditsStore';
import { useMembershipModalStore } from '@/stores/membershipModalStore';
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { RouterLink } from 'vue-router';

const authStore = useAuthStore();
const creditsStore = useCreditsStore();
const membershipModalStore = useMembershipModalStore();
const showUserMenu = ref(false);
const userMenuRef = ref<HTMLElement | null>(null);

const workspaceUrl = import.meta.env.VITE_WORKSPACE_URL;

const userInitial = computed(() => {
  const user = authStore.user;
  console.log('user in computed: ', user);
  if (!user) return 'ZeroCut用户';

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

  return 'ZeroCut用户';
});

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
watch(
  () => authStore.isAuthenticated,
  isAuthenticated => {
    if (isAuthenticated) {
      creditsStore.startCreditsUpdateTimer();
    } else {
      creditsStore.resetCredits();
    }
  },
);

onMounted(() => {
  document.addEventListener('click', handleClickOutside);

  // Start wallet balance updates if user is logged in
  if (authStore.isAuthenticated) {
    creditsStore.startCreditsUpdateTimer();
  }
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
  creditsStore.stopCreditsUpdateTimer();
});
</script>

<template>
  <header class="sticky top-0 z-50 h-16 w-full border-b border-[#e5e7eb] bg-white">
    <div class="flex h-full items-center justify-between px-10">
      <!-- Logo -->
      <RouterLink to="/" class="flex items-center">
        <img src="/src/assets/logo.png" alt="ZeroCut" class="h-8 cursor-pointer" />
      </RouterLink>

      <!-- Right Actions -->
      <div class="flex items-center gap-4">
        <!-- Show login/register when not logged in -->
        <template v-if="!authStore.isAuthenticated">
          <Button size="sm" variant="ghost" @click="authStore.openLoginModal()" class="text-[#6b7280]"> 登录 </Button>
          <Button
            size="sm"
            @click="authStore.openLoginModal()"
            class="rounded-[20px] bg-[#111827] px-4 py-2 text-sm font-medium text-white hover:bg-black"
          >
            注册
          </Button>
        </template>

        <!-- Show user info when logged in -->
        <template v-else>
          <button
            title="会员中心"
            @click="membershipModalStore.openMembershipModal()"
            class="flex items-center gap-2 rounded-[20px] border border-[#e5e7eb] bg-[#f9fafb] px-4 py-2 transition-colors hover:bg-[#f3f4f6]"
          >
            <span class="text-base">💎</span>
            <span class="text-sm font-semibold text-[#111827]">
              {{ creditsStore.creditsBalance || 0 }}
            </span>
          </button>

          <!-- <Button size="sm" class="bg-[#111827] text-white hover:bg-black rounded-[20px] px-4 py-2 text-sm font-medium">
            升级
          </Button> -->

          <!-- User menu -->
          <div ref="userMenuRef" class="relative">
            <button
              :title="userInitial"
              @click="showUserMenu = !showUserMenu"
              class="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border-2 border-[#e5e7eb] bg-[#111827] text-base font-semibold text-white"
            >
              {{
                String(userInitial || '我')
                  .toUpperCase()
                  .slice(0, 1)
              }}
            </button>

            <!-- Dropdown menu -->
            <div
              v-if="showUserMenu"
              class="absolute right-0 z-[1000] mt-2 min-w-[160px] overflow-hidden rounded-xl border border-[#e5e7eb] bg-white shadow-[0_8px_24px_rgba(0,0,0,0.12)]"
            >
              <a
                :href="workspaceUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="flex w-full items-center gap-2 px-4 py-3 text-sm font-medium text-[#111827] transition-colors hover:bg-[#f9fafb]"
              >
                <span>🎛️</span>
                <span>控制台</span>
              </a>
              <button
                @click="handleLogout"
                class="flex w-full items-center gap-2 px-4 py-3 text-sm font-medium text-[#dc2626] transition-colors hover:bg-[#fef2f2]"
              >
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
