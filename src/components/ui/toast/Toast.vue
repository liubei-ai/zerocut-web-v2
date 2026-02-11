<template>
  <div
    :class="cn(toastVariants({ variant }), 'toast-container', props.class)"
    @mouseenter="pauseTimer"
    @mouseleave="resumeTimer"
  >
    <div class="flex items-start gap-3 w-full">
      <!-- Icon based on variant -->
      <div class="flex-shrink-0 mt-0.5">
        <svg
          v-if="variant === 'success'"
          class="w-5 h-5 text-green-600"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fill-rule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
            clip-rule="evenodd"
          />
        </svg>
        <svg
          v-else-if="variant === 'destructive'"
          class="w-5 h-5 text-red-600"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fill-rule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
            clip-rule="evenodd"
          />
        </svg>
        <svg
          v-else-if="variant === 'warning'"
          class="w-5 h-5 text-yellow-600"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fill-rule="evenodd"
            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
            clip-rule="evenodd"
          />
        </svg>
        <svg
          v-else
          class="w-5 h-5 text-blue-600"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fill-rule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
            clip-rule="evenodd"
          />
        </svg>
      </div>
      
      <div class="flex-1 min-w-0">
        <div v-if="title" class="text-sm font-semibold mb-1">
          {{ title }}
        </div>
        <div class="text-sm opacity-90">
          {{ description }}
        </div>
      </div>
      
      <button
        @click="closeToast"
        class="flex-shrink-0 ml-4 p-1 rounded-full hover:bg-black/10 transition-colors duration-200 self-start"
      >
        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path
            fill-rule="evenodd"
            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
            clip-rule="evenodd"
          />
        </svg>
      </button>
    </div>
    
    <!-- Progress bar -->
    <div
      v-if="showProgress && duration && duration > 0"
      class="absolute bottom-0 left-0 h-1 bg-current opacity-30 transition-all duration-100 ease-linear"
      :style="{ width: `${progress}%` }"
    />
  </div>
</template>

<script setup lang="ts">
import { type HTMLAttributes, ref, onMounted, onUnmounted } from 'vue'
import { type VariantProps, cva } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const toastVariants = cva(
  'toast-container relative flex w-full items-start justify-between overflow-hidden rounded-lg border p-4 shadow-lg backdrop-blur-sm transition-all duration-300 hover:shadow-xl hover:scale-[1.02] cursor-pointer',
  {
    variants: {
      variant: {
        default: 'border-gray-200 bg-white/95 text-gray-900',
        destructive: 'border-red-200 bg-red-50/95 text-red-900',
        success: 'border-green-200 bg-green-50/95 text-green-900',
        warning: 'border-yellow-200 bg-yellow-50/95 text-yellow-900',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

interface ToastProps {
  class?: HTMLAttributes['class']
  variant?: VariantProps<typeof toastVariants>['variant']
  title?: string
  description: string
  duration?: number
  showProgress?: boolean
}

const props = withDefaults(defineProps<ToastProps>(), {
  variant: 'default',
  duration: 5000,
  showProgress: true,
})

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const progress = ref(100)
let timer: NodeJS.Timeout | null = null
let startTime: number = 0
let remainingTime: number = props.duration || 5000
let isPaused = false

const closeToast = () => {
  emit('update:open', false)
}

const pauseTimer = () => {
  if (timer && !isPaused) {
    clearInterval(timer)
    isPaused = true
    remainingTime = remainingTime - (Date.now() - startTime)
  }
}

const resumeTimer = () => {
  if (isPaused && props.duration && props.duration > 0) {
    isPaused = false
    startTimer(remainingTime)
  }
}

const startTimer = (duration: number) => {
  startTime = Date.now()
  const interval = 50 // Update every 50ms for smooth animation
  
  timer = setInterval(() => {
    const elapsed = Date.now() - startTime
    const remaining = Math.max(0, duration - elapsed)
    progress.value = (remaining / duration) * 100
    
    if (remaining <= 0) {
      clearInterval(timer!)
      closeToast()
    }
  }, interval)
}

onMounted(() => {
  if (props.duration && props.duration > 0) {
    startTimer(props.duration)
  }
})

onUnmounted(() => {
  if (timer) {
    clearInterval(timer)
  }
})
</script>

<style scoped>
.toast-container {
  animation: toast-slide-up 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

@keyframes toast-slide-up {
  from {
    opacity: 0;
    transform: translateY(100%) scale(0.8);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
</style>