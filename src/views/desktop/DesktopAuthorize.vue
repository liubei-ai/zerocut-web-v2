<script setup lang="ts">
import LoginModal from '@/components/auth/LoginModal.vue';
import { issueDesktopAuthorizationCode } from '@/api/desktopOauthApi';
import { validateToken } from '@/api/authApi';
import {
  buildDesktopCallback,
  parseDesktopAuthorizeQuery,
  type DesktopAuthorizeRequest,
} from '@/features/desktopAuthorize';
import { useAuthStore } from '@/stores/authStore';
import { computed, onMounted, ref, watch } from 'vue';

type PageState = 'checking' | 'login' | 'authorizing' | 'returning' | 'error';

const authStore = useAuthStore();
const parsed = parseDesktopAuthorizeQuery(
  window.location.search,
  import.meta.env.VITE_DESKTOP_OAUTH_AK ?? '',
);
const request = ref<DesktopAuthorizeRequest | null>(parsed.ok ? parsed.value : null);
const pageState = ref<PageState>(parsed.ok ? 'checking' : 'error');
const errorMessage = ref(parsed.ok ? '' : parsed.error);
let authorizationStarted = false;

const title = computed(() => {
  if (pageState.value === 'login') return 'Sign in to ZeroCut';
  if (pageState.value === 'authorizing') return 'Authorizing ZeroCut Desktop';
  if (pageState.value === 'returning') return 'Returning to ZeroCut Desktop';
  if (pageState.value === 'error') return 'Unable to connect ZeroCut Desktop';
  return 'Checking your ZeroCut account';
});

async function authorize(): Promise<void> {
  if (!request.value || authorizationStarted) return;
  authorizationStarted = true;
  pageState.value = 'authorizing';
  errorMessage.value = '';
  try {
    const result = await issueDesktopAuthorizationCode({
      ak: request.value.ak,
      redirectUri: request.value.redirectUri,
      codeChallenge: request.value.codeChallenge,
      codeChallengeMethod: request.value.codeChallengeMethod,
    });
    pageState.value = 'returning';
    window.location.replace(buildDesktopCallback(request.value, result.code));
  } catch (error) {
    authorizationStarted = false;
    pageState.value = 'error';
    errorMessage.value = error instanceof Error ? error.message : 'Authorization failed.';
  }
}

async function checkSession(): Promise<void> {
  if (!request.value) return;
  pageState.value = 'checking';
  try {
    await validateToken();
    await authorize();
  } catch {
    pageState.value = 'login';
    authStore.openLoginModal();
  }
}

function retry(): void {
  if (!request.value) return;
  if (!authStore.isAuthenticated) {
    pageState.value = 'login';
    authStore.openLoginModal();
    return;
  }
  void authorize();
}

watch(
  () => authStore.isAuthenticated,
  isAuthenticated => {
    if (isAuthenticated && pageState.value === 'login') void authorize();
  },
);

watch(
  () => authStore.showLoginModal,
  open => {
    if (!open && !authStore.isAuthenticated && pageState.value === 'login') {
      errorMessage.value = 'Sign-in was cancelled. You can try again when ready.';
    }
  },
);

onMounted(() => void checkSession());
</script>

<template>
  <main class="desktop-authorize">
    <section class="authorize-card" aria-live="polite">
      <div class="wordmark">ZeroCut</div>
      <div class="status-mark" :class="{ pulse: pageState !== 'error' }" aria-hidden="true"></div>
      <h1>{{ title }}</h1>
      <p v-if="pageState === 'checking'">One moment while we verify your session.</p>
      <p v-else-if="pageState === 'login'">Use your ZeroCut account to continue.</p>
      <p v-else-if="pageState === 'authorizing'">Securely approving this desktop sign-in.</p>
      <p v-else-if="pageState === 'returning'">You can close this tab after ZeroCut Desktop opens.</p>
      <p v-else>{{ errorMessage }}</p>
      <button v-if="pageState === 'error' || pageState === 'login'" type="button" @click="retry">
        {{ pageState === 'login' ? 'Sign in' : 'Try again' }}
      </button>
    </section>
    <LoginModal v-model:open="authStore.showLoginModal" />
  </main>
</template>

<style scoped>
.desktop-authorize {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 32px;
  color: #f5f5f5;
  background: #141414;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}
.authorize-card { width: min(440px, 100%); text-align: center; }
.wordmark { margin-bottom: 42px; font-size: 34px; font-weight: 600; letter-spacing: -1.5px; }
.status-mark { width: 8px; height: 8px; margin: 0 auto 22px; border-radius: 999px; background: #f5f5f5; }
.status-mark.pulse { animation: pulse 1.4s ease-in-out infinite; }
h1 { margin: 0; font-size: 24px; font-weight: 500; letter-spacing: -0.4px; }
p { min-height: 44px; margin: 14px 0 26px; color: #8b8b8b; font-size: 14px; line-height: 1.6; }
button { width: 100%; height: 42px; border: 0; border-radius: 14px; background: #f4f4f4; color: #151515; font-size: 13px; font-weight: 400; cursor: pointer; }
button:hover { background: #fff; }
@keyframes pulse { 50% { opacity: 0.35; transform: scale(0.75); } }
</style>
