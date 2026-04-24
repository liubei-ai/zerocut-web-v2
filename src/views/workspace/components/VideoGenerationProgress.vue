<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  status: 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED';
  progress?: number;
  resultUrl?: string;
  errorMessage?: string;
  workflowId?: number;
}

interface Emits {
  (e: 'cancel'): void;
  (e: 'retry'): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const isActive = computed(() => props.status === 'PENDING' || props.status === 'RUNNING');

const progressPercentage = computed(() => {
  if (props.status === 'SUCCESS') return 100;
  if (props.status === 'PENDING') return 5;
  return props.progress ?? 20;
});

const statusLabel = computed(() => {
  switch (props.status) {
    case 'PENDING': return '排队中';
    case 'RUNNING': return '生成中';
    case 'SUCCESS': return '生成完成';
    case 'FAILED': return '生成失败';
    default: return '';
  }
});

const statusSub = computed(() => {
  switch (props.status) {
    case 'PENDING': return '正在等待资源分配，请稍候...';
    case 'RUNNING': return 'AI 正在创作您的视频，请耐心等待...';
    case 'SUCCESS': return '您的视频已生成完毕，请在文件列表查看';
    case 'FAILED': return props.errorMessage || '生成过程中出现错误';
    default: return '';
  }
});
</script>

<template>
  <div class="flex h-full flex-col bg-white">

    <!-- Generating / Pending state -->
    <div v-if="isActive" class="flex h-full flex-col items-center justify-center gap-6 px-6 py-10">
      <!-- Animated ring -->
      <div class="relative flex h-24 w-24 items-center justify-center">
        <svg class="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 96 96">
          <circle cx="48" cy="48" r="40" fill="none" stroke="#f3f4f6" stroke-width="6" />
          <circle
            cx="48" cy="48" r="40" fill="none"
            stroke="#111827" stroke-width="6"
            stroke-linecap="round"
            stroke-dasharray="251.2"
            :stroke-dashoffset="251.2 * (1 - progressPercentage / 100)"
            class="transition-all duration-700"
          />
        </svg>
        <!-- Pulsing center dot -->
        <span class="relative flex h-8 w-8 items-center justify-center">
          <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-gray-300 opacity-60"></span>
          <span class="relative inline-flex h-4 w-4 rounded-full bg-gray-900"></span>
        </span>
      </div>

      <!-- Text -->
      <div class="text-center">
        <p class="text-base font-semibold text-gray-900">{{ statusLabel }}</p>
        <p class="mt-1 text-sm text-gray-500">{{ statusSub }}</p>
      </div>

      <!-- Progress bar -->
      <div class="w-full max-w-xs">
        <div class="flex justify-between text-xs text-gray-400 mb-1.5">
          <span>进度</span>
          <span>{{ Math.round(progressPercentage) }}%</span>
        </div>
        <div class="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
          <div
            class="h-full rounded-full bg-gray-900 transition-all duration-700"
            :style="{ width: `${progressPercentage}%` }"
          />
        </div>
      </div>

      <!-- Cancel Hide it for now -->
      <!-- <button
        @click="emit('cancel')"
        class="relative z-10 mt-2 rounded-lg border border-gray-200 px-5 py-2 text-sm text-gray-500 transition-colors hover:border-gray-400 hover:text-gray-700"
      >
        取消生成
      </button> -->
    </div>

    <!-- SUCCESS state -->
    <div v-else-if="status === 'SUCCESS'" class="flex h-full flex-col items-center justify-center gap-5 px-6 py-10">
      <div class="flex h-16 w-16 items-center justify-center rounded-full bg-green-50">
        <svg class="h-7 w-7 text-green-500" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 11.25-11.25" />
        </svg>
      </div>
      <div class="text-center">
        <p class="text-base font-semibold text-gray-900">{{ statusLabel }}</p>
        <p class="mt-1 max-w-xs text-sm text-gray-500">{{ statusSub }}</p>
      </div>
      <div class="flex gap-3">
        <a
          v-if="resultUrl"
          :href="resultUrl"
          download
          class="rounded-lg bg-gray-900 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-black"
          target="_blank"
        >
          下载视频
        </a>
        <button
          @click="emit('retry')"
          class="rounded-lg border border-gray-200 px-6 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:border-gray-400 hover:text-gray-900"
        >
          继续生成
        </button>
      </div>
    </div>

    <!-- Failed state -->
    <div v-else-if="status === 'FAILED'" class="flex h-full flex-col items-center justify-center gap-5 px-6 py-10">
      <div class="flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
        <svg class="h-7 w-7 text-red-500" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
      </div>
      <div class="text-center">
        <p class="text-base font-semibold text-gray-900">生成失败</p>
        <p class="mt-1 max-w-xs text-sm text-gray-500">{{ statusSub }}</p>
      </div>
      <button
        @click="emit('retry')"
        class="rounded-lg bg-gray-900 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-black"
      >
        重试
      </button>
    </div>

  </div>
</template>
