<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { X, Check, Sparkles, Crown, Gem, User } from 'lucide-vue-next';
import { getMembershipPlans, getCurrentSubscription, type MembershipPlanDto } from '@/api/membershipApi';
import { useCreditsStore } from '@/stores/creditsStore';
import { useAuthStore } from '@/stores/authStore';
import MembershipPaymentModal from './MembershipPaymentModal.vue';
import MembershipSigningModal from './MembershipSigningModal.vue';

interface Props {
  open: boolean;
}

interface Emits {
  (e: 'update:open', value: boolean): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const creditsStore = useCreditsStore();
const authStore = useAuthStore();

const billingCycle = ref<'subscription' | 'yearly' | 'monthly'>('subscription');
const loading = ref(false);
const rawPlans = ref<MembershipPlanDto[]>([]);
const currentSubscription = ref<any>(null);

const showPaymentModal = ref(false);
const showSigningModal = ref(false);
const selectedPlan = ref<MembershipPlanDto | null>(null);
const selectedPlanTitle = ref('');

const workspaceUrl = import.meta.env.VITE_WORKSPACE_URL;

const workspaceId = computed(() => authStore.currentWorkspaceId || '');

// Hardcoded i18n translations for membership features
const featureTranslations: Record<string, string> = {
  'zerocut.membership.priceList.benefits.quotas.basic': '最多可生成 250 张图片或最多生成 200 秒视频（以默认模型计算）',
  'zerocut.membership.priceList.benefits.quotas.standard': '最多可生成 1000 张图片或生成 800 秒视频（以默认模型计算）',
  'zerocut.membership.priceList.benefits.quotas.premium': '最多可生成 3125 张图片或生成 2500 秒视频（以默认模型计算）',
  'zerocut.membership.priceList.benefits.universal.allModels': '所有模型均可使用',
  'zerocut.membership.priceList.benefits.universal.hdVideo': '生成高清视频',
  'zerocut.membership.priceList.benefits.universal.noWatermark': '没有水印',
};

const userName = computed(() => {
  const user = authStore.user;
  if (!user) return '用户';
  return user.username || user.name || user.email || user.phone || '用户';
});

const currentMembership = computed(() => {
  if (!currentSubscription.value) return '免费会员';
  const tier = currentSubscription.value.tier;
  const tierNames = { basic: '基础会员', standard: '标准会员', premium: '高级会员' };
  return tierNames[tier as keyof typeof tierNames] || '会员';
});

const expiryDate = computed(() => {
  if (!currentSubscription.value?.termEndAt) return '永久';
  return new Date(currentSubscription.value.termEndAt).toLocaleDateString('zh-CN');
});

const currentPoints = computed(() => creditsStore.creditsBalance || 0);

const plans = computed(() => {
  const cycleMap = {
    monthly: 'one_time_month',
    subscription: 'auto_monthly',
    yearly: 'one_time_year',
  };

  const targetMode = cycleMap[billingCycle.value];
  const filtered = rawPlans.value.filter(p => p.purchaseMode === targetMode);

  const tierOrder = ['basic', 'standard', 'premium'];
  const sorted = filtered.sort((a, b) => tierOrder.indexOf(a.tier) - tierOrder.indexOf(b.tier));

  return sorted.map(plan => {
    const isYearly = plan.purchaseMode === 'one_time_year' || plan.purchaseMode === 'auto_yearly';
    const monthlyPrice = isYearly ? (plan.priceYuan / 12).toFixed(2) : plan.priceYuan;
    const pricePerCredit = (plan.unitPriceYuanPer100 / 100).toFixed(4);
    const discount = plan.discountZhe > 0 && plan.discountZhe < 10 ? `${plan.discountZhe.toFixed(1)}折` : '';

    const tierNames = { basic: '基础会员', standard: '标准会员', premium: '高级会员' };
    const icons = { basic: Sparkles, standard: Crown, premium: Gem };

    const features = (plan.features || [])
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .map(f => f.label || featureTranslations[f.i18nKey] || f.key);

    const creditsText = `每月${plan.monthlyCredits.toLocaleString()}积分`;
    const allFeatures = [creditsText, ...features];

    const isCurrentSubscription =
      currentSubscription.value !== null &&
      currentSubscription.value.planCode === plan.code &&
      currentSubscription.value.status === 'active';

    return {
      id: plan.code,
      name: tierNames[plan.tier as keyof typeof tierNames] || plan.name,
      icon: icons[plan.tier as keyof typeof icons],
      price: plan.priceYuan,
      monthlyPrice: isYearly ? monthlyPrice : undefined,
      pricePerCredit,
      discount,
      features: allFeatures,
      popular: plan.tier === 'premium',
      isCurrentSubscription,
      planData: plan,
    };
  });
});

async function fetchData() {
  if (!workspaceId.value) return;

  try {
    loading.value = true;
    const [plansData, subscription] = await Promise.all([
      getMembershipPlans(),
      getCurrentSubscription(workspaceId.value).catch(() => null),
    ]);
    rawPlans.value = plansData || [];
    currentSubscription.value = subscription;
  } catch (error) {
    console.error('Failed to fetch membership data:', error);
  } finally {
    loading.value = false;
  }
}

function handlePurchase(planCode: string) {
  const plan = plans.value.find(p => p.id === planCode);
  if (!plan) return;

  selectedPlan.value = plan.planData;
  selectedPlanTitle.value = plan.name;

  if (plan.planData.purchaseMode === 'one_time_month' || plan.planData.purchaseMode === 'one_time_year') {
    showPaymentModal.value = true;
  } else if (plan.planData.purchaseMode === 'auto_monthly' || plan.planData.purchaseMode === 'auto_yearly') {
    showSigningModal.value = true;
  }
}

function handlePaymentSuccess() {
  showPaymentModal.value = false;
  selectedPlan.value = null;
  selectedPlanTitle.value = '';
  fetchData();
  creditsStore.fetchCreditsBalance();
}

function handlePaymentCancel() {
  showPaymentModal.value = false;
  selectedPlan.value = null;
  selectedPlanTitle.value = '';
}

function handleSigningSuccess() {
  showSigningModal.value = false;
  selectedPlan.value = null;
  selectedPlanTitle.value = '';
  fetchData();
  creditsStore.fetchCreditsBalance();
}

function handleSigningCancel() {
  showSigningModal.value = false;
  selectedPlan.value = null;
  selectedPlanTitle.value = '';
}

function closeModal() {
  emit('update:open', false);
}

watch(
  () => props.open,
  isOpen => {
    if (isOpen) {
      fetchData();
    }
  },
);

onMounted(() => {
  if (props.open) {
    fetchData();
  }
});
</script>

<template>
  <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
    <div class="relative my-8 max-h-[90vh] w-full max-w-6xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
      <!-- Close Button -->
      <button @click="closeModal"
        class="absolute top-6 right-6 z-10 text-gray-400 transition-colors hover:text-gray-600">
        <X :size="24" />
      </button>

      <!-- Header -->
      <div class="border-b border-gray-100 p-4 pb-4 sm:p-6 md:p-8">
        <!-- Mobile Layout -->
        <div class="block space-y-4 lg:hidden">
          <div class="flex items-center gap-3">
            <div
              class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-teal-400 to-teal-600 sm:h-12 sm:w-12">
              <User class="text-white" :size="20" />
            </div>
            <div class="min-w-0 flex-1">
              <h2 class="truncate text-base font-semibold text-gray-900 sm:text-lg">{{ userName }}</h2>
              <div class="flex items-center gap-2 text-xs sm:text-sm">
                <span class="text-gray-600">{{ currentMembership }}</span>
              </div>
            </div>
          </div>

          <div class="pl-13 text-xs text-gray-500 sm:pl-15 sm:text-sm">到期时间：{{ expiryDate }}</div>

          <div class="rounded-lg bg-teal-50 p-3 sm:p-4">
            <div class="flex items-center justify-between">
              <span class="text-sm text-gray-600">积分余额</span>
              <span class="text-xl font-bold text-teal-600 sm:text-2xl">{{ currentPoints.toLocaleString() }}</span>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-2 sm:gap-3">
            <a v-if="currentSubscription" :href="workspaceUrl + 'packages'" target="_blank"
              class="rounded-lg bg-teal-500 px-3 py-2 text-center text-xs font-medium text-white transition-colors hover:bg-teal-600 hover:!text-white sm:px-4 sm:py-2.5 sm:text-sm">
              积分充值
            </a>
            <a :href="workspaceUrl + 'plans-and-billing'" target="_blank"
              class="rounded-lg bg-gray-100 px-3 py-2 text-center text-xs font-medium text-gray-700 transition-colors hover:bg-gray-200 sm:px-4 sm:py-2.5 sm:text-sm">
              订阅管理
            </a>
          </div>
        </div>

        <!-- Desktop Layout -->
        <div class="hidden items-center justify-between pr-12 lg:flex">
          <div class="flex items-center gap-6">
            <div
              class="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-teal-400 to-teal-600">
              <User class="text-white" :size="24" />
            </div>
            <div>
              <h2 class="text-lg font-semibold text-gray-900">{{ userName }}</h2>
              <div class="flex items-center gap-3 text-sm">
                <span class="text-gray-600">{{ currentMembership }}</span>
                <span class="text-gray-400">|</span>
                <span class="text-gray-500">到期时间：{{ expiryDate }}</span>
              </div>
            </div>
            <div class="ml-8 flex items-center gap-2">
              <span class="text-sm text-gray-600">积分余额</span>
              <span class="text-2xl font-bold text-teal-600">{{ currentPoints.toLocaleString() }}</span>
            </div>
          </div>
          <div class="flex gap-3">
            <a v-if="currentSubscription" :href="workspaceUrl + 'packages'" target="_blank"
              class="rounded-lg bg-teal-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-600 hover:!text-white">
              积分充值
            </a>
            <a :href="workspaceUrl + 'plans-and-billing'" target="_blank"
              class="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200">
              订阅管理
            </a>
          </div>
        </div>
      </div>

      <!-- Billing Cycle Selector -->
      <div class="p-4 pb-4 sm:p-6 sm:pb-6 md:p-8">
        <h3 class="mb-4 text-center text-lg font-semibold text-gray-900 sm:mb-6 sm:text-xl">订阅计划</h3>
        <div class="mx-auto flex max-w-2xl gap-2 sm:gap-3">
          <button @click="billingCycle = 'subscription'" :class="[
            'flex-1 rounded-lg border-2 px-2 py-2 transition-all sm:px-4 sm:py-3',
            billingCycle === 'subscription' ? 'border-teal-500 bg-teal-50' : 'border-gray-200 hover:border-gray-300',
          ]">
            <div class="text-xs font-medium text-gray-900 sm:text-sm">连续包月</div>
          </button>
          <button @click="billingCycle = 'yearly'" :class="[
            'flex-1 rounded-lg border-2 px-2 py-2 transition-all sm:px-4 sm:py-3',
            billingCycle === 'yearly' ? 'border-teal-500 bg-teal-50' : 'border-gray-200 hover:border-gray-300',
          ]">
            <div class="text-xs font-medium text-gray-900 sm:text-sm">包年</div>
          </button>
          <button @click="billingCycle = 'monthly'" :class="[
            'flex-1 rounded-lg border-2 px-2 py-2 transition-all sm:px-4 sm:py-3',
            billingCycle === 'monthly' ? 'border-teal-500 bg-teal-50' : 'border-gray-200 hover:border-gray-300',
          ]">
            <div class="text-xs font-medium text-gray-900 sm:text-sm">单月购买</div>
          </button>
        </div>
      </div>

      <!-- Plans Grid -->
      <div class="px-4 pb-6 sm:px-6 sm:pb-8 md:px-8">
        <div v-if="loading" class="flex justify-center py-12">
          <div class="text-gray-500">加载中...</div>
        </div>
        <div v-else class="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-3">
          <div v-for="plan in plans" :key="plan.id" :class="[
            'relative flex flex-col rounded-xl border-2 p-6 transition-all hover:shadow-lg',
            plan.popular
              ? 'border-teal-500 bg-gradient-to-b from-teal-50 to-white'
              : 'border-gray-200 bg-white hover:border-gray-300',
          ]">
            <!-- Badge -->
            <div v-if="plan.popular"
              class="absolute -top-3 right-4 rounded-full bg-gradient-to-r from-teal-500 to-teal-600 px-3 py-1 text-xs font-medium text-white">
              最划算
            </div>

            <!-- Plan Header -->
            <div class="mb-4">
              <div class="mb-2 flex items-center gap-2">
                <component :is="plan.icon" :size="20" class="text-gray-700" />
                <h4 class="text-base font-semibold text-gray-900">{{ plan.name }}</h4>
              </div>

              <div class="flex items-baseline gap-2">
                <div class="flex items-baseline gap-1">
                  <span class="text-sm text-gray-500">¥</span>
                  <span class="text-4xl font-bold text-gray-900">{{ plan.price }}</span>
                  <span class="ml-1 text-sm text-gray-500">{{ plan.monthlyPrice ? '/年' : '/月' }}</span>
                </div>
              </div>

              <div v-if="plan.monthlyPrice" class="mt-1 text-xs text-gray-500">约¥{{ plan.monthlyPrice }}/月</div>

              <div v-if="plan.pricePerCredit" class="mt-1 text-xs text-gray-500">{{ plan.pricePerCredit }}元/积分</div>

              <div v-if="plan.discount" class="mt-1 text-xs font-medium text-teal-600">
                {{ plan.discount }}
              </div>
            </div>
            <!-- Button -->
            <button @click="handlePurchase(plan.id)" :disabled="plan.isCurrentSubscription" :class="[
              'mb-6 w-full rounded-lg py-3 font-medium transition-all',
              plan.isCurrentSubscription
                ? 'cursor-not-allowed bg-gray-200 text-gray-500'
                : plan.popular
                  ? 'bg-gradient-to-r from-teal-400 to-teal-500 text-white hover:from-teal-500 hover:to-teal-600'
                  : 'bg-black text-white hover:bg-gray-800',
            ]">
              {{ plan.isCurrentSubscription ? '当前计划' : '购买' }}
            </button>

            <!-- Features -->
            <div class="flex-1 space-y-2.5">
              <div v-for="(feature, index) in plan.features" :key="index" class="flex items-start gap-2">
                <Check :size="16" class="mt-0.5 flex-shrink-0 text-teal-600" />
                <span class="text-sm leading-relaxed text-gray-700">{{ feature }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer Note -->
      <div class="px-4 pb-6 sm:px-6 sm:pb-8 md:px-8">
        <p class="text-center text-xs text-gray-500">
          购买即表示同意
          <a href="https://workspace.zerocut.cn/paid_service_agreement.html" target="_blank"
            class="text-teal-600 hover:underline">ZeroCut充值协议</a>
        </p>
      </div>
    </div>

    <!-- Payment Modal -->
    <MembershipPaymentModal v-model:open="showPaymentModal" :membership-plan="selectedPlan" :title="selectedPlanTitle"
      @success="handlePaymentSuccess" @cancel="handlePaymentCancel" />

    <!-- Signing Modal -->
    <MembershipSigningModal v-model:open="showSigningModal" :membership-plan="selectedPlan" :title="selectedPlanTitle"
      @success="handleSigningSuccess" @cancel="handleSigningCancel" />
  </div>
</template>
