<script setup lang="ts">
import { ref, computed, watch, nextTick, onUnmounted } from 'vue';
import { X } from 'lucide-vue-next';
import QRCode from 'qrcode';
import { createSigningSession, getSigningSessionStatus, closeSigningSession, type MembershipPlanDto } from '@/api/membershipApi';

interface Props {
  open: boolean;
  membershipPlan: MembershipPlanDto | null;
  title?: string;
}

interface Emits {
  (e: 'update:open', value: boolean): void;
  (e: 'success', status: any): void;
  (e: 'cancel'): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const qrCodeCanvas = ref<HTMLCanvasElement>();
const sessionInfo = ref<any>(null);
const signingStatus = ref<'creating' | 'pending' | 'success' | 'failed' | 'timeout'>('creating');
const countdown = ref(300);
const errorMessage = ref('');

let statusCheckInterval: number | null = null;
let countdownInterval: number | null = null;

const formatCountdown = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
};

const generateQRCode = async (qrUrl: string) => {
  if (!qrCodeCanvas.value) return;
  try {
    await QRCode.toCanvas(qrCodeCanvas.value, qrUrl, {
      width: 200,
      margin: 2,
      color: { dark: '#000000', light: '#FFFFFF' }
    });
  } catch (error) {
    console.error('Failed to generate QR code:', error);
  }
};

const startCountdown = () => {
  countdown.value = 300;
  countdownInterval = window.setInterval(() => {
    countdown.value--;
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
  
  try {
    const status = await getSigningSessionStatus(sessionInfo.value.signingSessionId);
    
    if (status.status === 'signed') {
      signingStatus.value = 'success';
      stopStatusCheck();
      stopCountdown();
      emit('success', status);
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

const createSession = async () => {
  if (!props.membershipPlan) return;

  try {
    signingStatus.value = 'creating';
    errorMessage.value = '';

    const response = await createSigningSession({
      workspaceId: 'default',
      planCode: props.membershipPlan.code
    });

    sessionInfo.value = response;
    signingStatus.value = 'pending';

    await nextTick();
    await generateQRCode(response.qrUrl);

    startCountdown();
    startStatusCheck();
  } catch (error: any) {
    signingStatus.value = 'failed';
    errorMessage.value = error.message || '创建签约会话失败';
  }
};

const handleCancel = async () => {
  stopStatusCheck();
  stopCountdown();

  if (sessionInfo.value?.signingSessionId) {
    try {
      await closeSigningSession(sessionInfo.value.signingSessionId, 'default');
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
  countdown.value = 300;
  stopStatusCheck();
  stopCountdown();
};

watch(() => props.open, (newOpen) => {
  if (newOpen && props.membershipPlan) {
    resetState();
    createSession();
  } else if (!newOpen) {
    stopStatusCheck();
    stopCountdown();
  }
});

onUnmounted(() => {
  stopStatusCheck();
  stopCountdown();
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

        <div class="flex justify-center rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 p-6">
          <div class="text-center">
            <canvas ref="qrCodeCanvas" class="mx-auto rounded-lg bg-white" />
            <div class="mt-3 text-sm text-gray-600">请使用微信扫码签约</div>
            <div class="mt-2 text-sm text-gray-500">剩余时间：{{ formatCountdown(countdown) }}</div>
          </div>
        </div>

        <div class="rounded-lg bg-yellow-50 p-3 text-xs text-yellow-800">
          <div class="font-medium">温馨提示：</div>
          <div class="mt-1">签约后将按月自动扣费，您可以随时在订阅管理中取消自动续费</div>
        </div>
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
