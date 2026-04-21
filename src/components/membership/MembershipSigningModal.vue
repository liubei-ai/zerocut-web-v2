<script setup lang="ts">
import { ref, watch, nextTick, onUnmounted } from 'vue';
import { X } from 'lucide-vue-next';
import QRCode from 'qrcode';
import {
  createSigningSession,
  getSigningSessionStatus,
  closeSigningSession,
  type MembershipPlanDto,
  type PureSigningSessionResponse,
  type SigningSessionStatus,
} from '@/api/membershipApi';
import { useAuthStore } from '@/stores/authStore';

interface Props {
  open: boolean;
  membershipPlan: MembershipPlanDto | null;
  title?: string;
}

interface Emits {
  (e: 'update:open', value: boolean): void;
  (e: 'success', status: SigningSessionStatus): void;
  (e: 'cancel'): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const authStore = useAuthStore();

type LocalStatus =
  | 'creating'
  | 'pending'
  | 'signing_confirmed'
  | 'success'
  | 'failed'
  | 'timeout';

const qrCodeCanvas = ref<HTMLCanvasElement>();
const sessionInfo = ref<PureSigningSessionResponse | null>(null);
const signingStatus = ref<LocalStatus>('creating');
const countdown = ref(0);
const errorMessage = ref('');
const isWeChat = /MicroMessenger/i.test(navigator.userAgent);

let statusCheckInterval: number | null = null;
let countdownInterval: number | null = null;

const formatCountdown = (seconds: number): string => {
  const safe = Math.max(0, seconds);
  const minutes = Math.floor(safe / 60);
  const remainingSeconds = safe % 60;
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
};

const generateQRCode = async (url: string) => {
  if (!qrCodeCanvas.value) return;
  try {
    await QRCode.toCanvas(qrCodeCanvas.value, url, {
      width: 200,
      margin: 2,
      color: { dark: '#000000', light: '#FFFFFF' }
    });
  } catch (error) {
    console.error('Failed to generate QR code:', error);
  }
};

const computeRemainingSeconds = (): number => {
  if (!sessionInfo.value?.expiresAt) return 0;
  const diffMs = new Date(sessionInfo.value.expiresAt).getTime() - Date.now();
  return Math.max(0, Math.floor(diffMs / 1000));
};

const startCountdown = () => {
  countdown.value = computeRemainingSeconds();
  countdownInterval = window.setInterval(() => {
    countdown.value = computeRemainingSeconds();
    if (countdown.value <= 0) {
      signingStatus.value = 'timeout';
      stopCountdown();
      stopStatusCheck();
    }
  }, 1000);
};

const stopCountdown = () => {
  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
  }
};

const checkSigningStatus = async () => {
  if (!sessionInfo.value?.signingSessionId) return;
  const workspaceId = authStore.currentWorkspaceId || '';
  if (!workspaceId) return;

  try {
    const status = await getSigningSessionStatus(sessionInfo.value.signingSessionId, workspaceId);

    if (status.latestOrderNo || status.latestOrderStatus) {
      console.debug('[pure-signing] order', status.latestOrderNo, status.latestOrderStatus);
    }

    if (status.status === 'signed') {
      // 签约成功，正在首次扣费，继续轮询
      if (signingStatus.value !== 'signing_confirmed') {
        signingStatus.value = 'signing_confirmed';
      }
    } else if (status.status === 'active') {
      signingStatus.value = 'success';
      stopStatusCheck();
      stopCountdown();
      emit('success', status);
    } else if (status.status === 'failed') {
      signingStatus.value = 'failed';
      errorMessage.value = status.failMessage || '签约或首次扣费失败，请重试';
      if (status.failCode) {
        console.warn('[pure-signing] failed', status.failCode, status.failMessage);
      }
      stopStatusCheck();
      stopCountdown();
    } else if (status.status === 'expired') {
      signingStatus.value = 'timeout';
      stopStatusCheck();
      stopCountdown();
    }
  } catch (error) {
    console.warn('Failed to check signing status:', error);
  }
};

const startStatusCheck = () => {
  statusCheckInterval = window.setInterval(() => {
    checkSigningStatus();
  }, 2000);
};

const stopStatusCheck = () => {
  if (statusCheckInterval) {
    clearInterval(statusCheckInterval);
    statusCheckInterval = null;
  }
};

const handleVisibilityChange = () => {
  if (document.visibilityState === 'visible' && statusCheckInterval) {
    checkSigningStatus();
  }
};

const createSession = async () => {
  if (!props.membershipPlan) return;

  try {
    signingStatus.value = 'creating';
    errorMessage.value = '';

    const response = await createSigningSession({
      workspaceId: authStore.currentWorkspaceId || '',
      planCode: props.membershipPlan.code,
      displayAccountName: authStore.currentWorkspaceName || undefined
    });

    sessionInfo.value = response;
    signingStatus.value = 'pending';

    startCountdown();
    startStatusCheck();

    if (isWeChat) {
      // 微信内置浏览器直接跳转至纯签约入口
      window.location.href = response.entrustwebUrl;
      return;
    }

    await nextTick();
    await generateQRCode(response.entrustwebUrl);
  } catch (error: any) {
    signingStatus.value = 'failed';
    errorMessage.value = error?.message || '创建签约会话失败';
  }
};

const handleCancel = async () => {
  stopStatusCheck();
  stopCountdown();

  // 仅在签约中且尚未 signed/active 时调用 close，避免 400
  if (sessionInfo.value?.signingSessionId && signingStatus.value === 'pending') {
    try {
      await closeSigningSession(
        sessionInfo.value.signingSessionId,
        authStore.currentWorkspaceId || '',
      );
    } catch (error) {
      console.warn('Failed to close signing session:', error);
    }
  }

  emit('cancel');
  emit('update:open', false);
};

const handleClose = () => {
  stopStatusCheck();
  stopCountdown();
  emit('update:open', false);
};

const handleRetry = () => {
  createSession();
};

const resetState = () => {
  sessionInfo.value = null;
  signingStatus.value = 'creating';
  errorMessage.value = '';
  countdown.value = 0;
  stopStatusCheck();
  stopCountdown();
};

watch(() => props.open, (newOpen) => {
  if (newOpen && props.membershipPlan) {
    resetState();
    document.addEventListener('visibilitychange', handleVisibilityChange);
    createSession();
  } else if (!newOpen) {
    stopStatusCheck();
    stopCountdown();
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  }
});

onUnmounted(() => {
  stopStatusCheck();
  stopCountdown();
  document.removeEventListener('visibilitychange', handleVisibilityChange);
});
</script>

<template>
  <div v-if="open" class="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
    <div class="relative w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl">
      <button
        @click="handleCancel"
        class="absolute right-4 top-4 text-gray-400 transition-colors hover:text-gray-600"
      >
        <X :size="20" />
      </button>

      <h2 class="mb-6 text-xl font-semibold text-gray-900">签约自动续费</h2>

      <!-- Creating -->
      <div v-if="signingStatus === 'creating'" class="py-8 text-center">
        <div class="mb-4 text-gray-500">正在创建签约会话...</div>
      </div>

      <!-- Pending -->
      <div v-else-if="signingStatus === 'pending'" class="space-y-4">
        <div class="rounded-lg border border-gray-200 p-4">
          <div class="mb-2 flex items-center justify-between">
            <span class="font-medium text-gray-900">{{ title }}</span>
            <span class="text-sm text-gray-500">{{ membershipPlan?.monthlyCredits }} 积分/月</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-sm text-gray-600">每月扣费</span>
            <span class="text-xl font-bold text-teal-600">¥{{ membershipPlan?.priceYuan }}</span>
          </div>
        </div>

        <div v-if="isWeChat" class="flex justify-center rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 p-6">
          <div class="text-center">
            <div class="mb-2 text-sm text-gray-600">正在跳转至微信签约页面...</div>
            <a :href="sessionInfo?.entrustwebUrl" class="text-sm text-teal-600 underline">未自动跳转？点此继续</a>
            <div class="mt-2 text-sm text-gray-500">剩余时间：{{ formatCountdown(countdown) }}</div>
          </div>
        </div>
        <div v-else class="flex justify-center rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 p-6">
          <div class="text-center">
            <canvas ref="qrCodeCanvas" class="mx-auto rounded-lg bg-white" />
            <div class="mt-3 text-sm text-gray-600">请使用微信扫码签约</div>
            <div class="mt-2 text-sm text-gray-500">剩余时间：{{ formatCountdown(countdown) }}</div>
          </div>
        </div>

        <div class="rounded-lg bg-yellow-50 p-3 text-xs text-yellow-800">
          <div class="font-medium">温馨提示：</div>
          <div class="mt-1">签约成功后将立即发起首次扣费，之后每月自动续费，您可以随时在订阅管理中取消自动续费</div>
        </div>
      </div>

      <!-- Signed, waiting for first deduction -->
      <div v-else-if="signingStatus === 'signing_confirmed'" class="py-8 text-center">
        <div class="mb-4 text-4xl">🔄</div>
        <div class="mb-2 text-xl font-semibold text-teal-600">签约成功</div>
        <div class="text-gray-600">正在完成首次扣费，请稍候...</div>
      </div>

      <!-- Success -->
      <div v-else-if="signingStatus === 'success'" class="py-8 text-center">
        <div class="mb-4 text-4xl">✅</div>
        <div class="mb-2 text-xl font-semibold text-green-600">签约成功！</div>
        <div class="text-gray-600">您的订阅已激活</div>
      </div>

      <!-- Failed -->
      <div v-else-if="signingStatus === 'failed'" class="py-8 text-center">
        <div class="mb-4 text-4xl">❌</div>
        <div class="mb-2 text-xl font-semibold text-red-600">签约失败</div>
        <div class="text-gray-600">{{ errorMessage || '签约过程中出现错误，请重试' }}</div>
      </div>

      <!-- Timeout -->
      <div v-else-if="signingStatus === 'timeout'" class="py-8 text-center">
        <div class="mb-4 text-4xl">⏰</div>
        <div class="mb-2 text-xl font-semibold text-orange-600">签约已超时</div>
        <div class="text-gray-600">请重新创建签约</div>
      </div>

      <!-- Actions -->
      <div class="mt-6 flex justify-end gap-3">
        <button
          v-if="signingStatus === 'pending' || signingStatus === 'creating'"
          @click="handleCancel"
          class="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
        >
          取消签约
        </button>
        <button
          v-if="signingStatus === 'success'"
          @click="handleClose"
          class="rounded-lg bg-teal-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-600"
        >
          完成
        </button>
        <button
          v-if="signingStatus === 'failed' || signingStatus === 'timeout'"
          @click="handleClose"
          class="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
        >
          关闭
        </button>
        <button
          v-if="signingStatus === 'failed' || signingStatus === 'timeout'"
          @click="handleRetry"
          class="rounded-lg bg-teal-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-600"
        >
          重新签约
        </button>
      </div>
    </div>
  </div>
</template>
