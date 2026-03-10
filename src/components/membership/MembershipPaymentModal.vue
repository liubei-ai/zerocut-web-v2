<script setup lang="ts">
import { ref, computed, watch, nextTick, onUnmounted } from 'vue';
import { X } from 'lucide-vue-next';
import QRCode from 'qrcode';
import { purchaseOneTimeSubscription, closeOneTimeOrder, type MembershipPlanDto } from '@/api/membershipApi';

interface Props {
  open: boolean;
  membershipPlan: MembershipPlanDto | null;
  title?: string;
}

interface Emits {
  (e: 'update:open', value: boolean): void;
  (e: 'success', orderInfo: any): void;
  (e: 'cancel'): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const qrCodeCanvas = ref<HTMLCanvasElement>();
const orderInfo = ref<any>(null);
const paymentStatus = ref<'creating' | 'pending' | 'success' | 'failed' | 'timeout'>('creating');
const countdown = ref(300);
const errorMessage = ref('');

let paymentCheckInterval: number | null = null;
let countdownInterval: number | null = null;

const formatCountdown = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
};

const generateQRCode = async (codeUrl: string) => {
  if (!qrCodeCanvas.value) return;
  try {
    await QRCode.toCanvas(qrCodeCanvas.value, codeUrl, {
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
      paymentStatus.value = 'timeout';
      stopCountdown();
      stopPaymentCheck();
    }
  }, 1000);
};

const stopCountdown = () => {
  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
  }
};

const checkPaymentStatus = async () => {
  // Implement payment status check logic here
  // This should call your backend API to check order status
};

const startPaymentCheck = () => {
  paymentCheckInterval = window.setInterval(() => {
    checkPaymentStatus();
  }, 2000);
};

const stopPaymentCheck = () => {
  if (paymentCheckInterval) {
    clearInterval(paymentCheckInterval);
    paymentCheckInterval = null;
  }
};

const createPaymentOrder = async () => {
  if (!props.membershipPlan) return;

  try {
    paymentStatus.value = 'creating';
    errorMessage.value = '';

    const response = await purchaseOneTimeSubscription({
      planCode: props.membershipPlan.code,
      totalAmount: props.membershipPlan.priceYuan,
      workspaceId: 'default'
    });

    orderInfo.value = response;
    paymentStatus.value = 'pending';

    await nextTick();
    await generateQRCode(response.codeUrl);

    startCountdown();
    startPaymentCheck();
  } catch (error: any) {
    paymentStatus.value = 'failed';
    errorMessage.value = error.message || '创建支付订单失败';
  }
};

const handleCancel = async () => {
  stopPaymentCheck();
  stopCountdown();

  if (orderInfo.value?.outTradeNo) {
    try {
      await closeOneTimeOrder(orderInfo.value.outTradeNo, 'default');
    } catch (error) {
      console.warn('Failed to close order:', error);
    }
  }

  emit('cancel');
  emit('update:open', false);
};

const handleClose = () => {
  stopPaymentCheck();
  stopCountdown();
  emit('update:open', false);
};

const handleRetry = () => {
  createPaymentOrder();
};

const resetState = () => {
  orderInfo.value = null;
  paymentStatus.value = 'creating';
  errorMessage.value = '';
  countdown.value = 300;
  stopPaymentCheck();
  stopCountdown();
};

watch(() => props.open, (newOpen) => {
  if (newOpen && props.membershipPlan) {
    resetState();
    createPaymentOrder();
  } else if (!newOpen) {
    stopPaymentCheck();
    stopCountdown();
  }
});

onUnmounted(() => {
  stopPaymentCheck();
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

      <h2 class="mb-6 text-xl font-semibold text-gray-900">购买会员</h2>

      <!-- Creating -->
      <div v-if="paymentStatus === 'creating'" class="py-8 text-center">
        <div class="mb-4 text-gray-500">正在创建支付订单...</div>
      </div>

      <!-- Pending -->
      <div v-else-if="paymentStatus === 'pending'" class="space-y-4">
        <div class="rounded-lg border border-gray-200 p-4">
          <div class="mb-2 flex items-center justify-between">
            <span class="font-medium text-gray-900">{{ title }}</span>
            <span class="text-sm text-gray-500">{{ membershipPlan?.monthlyCredits }} 积分/月</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-sm text-gray-600">支付金额</span>
            <span class="text-xl font-bold text-teal-600">¥{{ membershipPlan?.priceYuan }}</span>
          </div>
        </div>

        <div class="flex justify-center rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 p-6">
          <div class="text-center">
            <canvas ref="qrCodeCanvas" class="mx-auto rounded-lg bg-white" />
            <div class="mt-3 text-sm text-gray-600">请使用微信扫码支付</div>
            <div class="mt-2 text-sm text-gray-500">剩余时间：{{ formatCountdown(countdown) }}</div>
          </div>
        </div>

        <div class="text-xs text-gray-500">
          订单号：{{ orderInfo?.outTradeNo }}
        </div>
      </div>

      <!-- Success -->
      <div v-else-if="paymentStatus === 'success'" class="py-8 text-center">
        <div class="mb-4 text-4xl">✅</div>
        <div class="mb-2 text-xl font-semibold text-green-600">支付成功！</div>
        <div class="text-gray-600">积分已到账，您可以开始使用了</div>
      </div>

      <!-- Failed -->
      <div v-else-if="paymentStatus === 'failed'" class="py-8 text-center">
        <div class="mb-4 text-4xl">❌</div>
        <div class="mb-2 text-xl font-semibold text-red-600">支付失败</div>
        <div class="text-gray-600">{{ errorMessage || '支付过程中出现错误，请重试' }}</div>
      </div>

      <!-- Timeout -->
      <div v-else-if="paymentStatus === 'timeout'" class="py-8 text-center">
        <div class="mb-4 text-4xl">⏰</div>
        <div class="mb-2 text-xl font-semibold text-orange-600">订单已超时</div>
        <div class="text-gray-600">请重新创建订单</div>
      </div>

      <!-- Actions -->
      <div class="mt-6 flex justify-end gap-3">
        <button
          v-if="paymentStatus === 'pending' || paymentStatus === 'creating'"
          @click="handleCancel"
          class="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
        >
          取消支付
        </button>
        <button
          v-if="paymentStatus === 'success'"
          @click="handleClose"
          class="rounded-lg bg-teal-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-600"
        >
          完成
        </button>
        <button
          v-if="paymentStatus === 'failed' || paymentStatus === 'timeout'"
          @click="handleClose"
          class="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
        >
          关闭
        </button>
        <button
          v-if="paymentStatus === 'failed' || paymentStatus === 'timeout'"
          @click="handleRetry"
          class="rounded-lg bg-teal-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-600"
        >
          重新支付
        </button>
      </div>
    </div>
  </div>
</template>
