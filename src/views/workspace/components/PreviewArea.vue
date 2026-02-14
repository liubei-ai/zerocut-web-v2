<script setup lang="ts">
interface Props {
  fileUrl?: string;
  fileType?: string;
  fileName?: string;
}

interface Emits {
  (e: 'regenerate'): void;
  (e: 'download'): void;
  (e: 'modify'): void;
  (e: 'show-prompt'): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();
</script>

<template>
  <div class="flex flex-1 flex-col overflow-hidden bg-gray-50">
    <div class="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 md:px-6 md:py-4">
      <h3 class="m-0 truncate text-sm font-semibold text-gray-900 md:text-[15px]">
        {{ fileName || '预览区' }}
      </h3>
    </div>

    <div class="flex flex-1 items-center justify-center overflow-auto p-4 md:p-10">
      <!-- No file selected -->
      <div v-if="!fileUrl" class="flex h-full flex-col items-center justify-center gap-3 px-4 md:gap-4">
        <div class="flex h-16 w-16 items-center justify-center rounded-full bg-gray-50 text-3xl md:h-20 md:w-20 md:text-4xl">👁️</div>
        <div class="text-center">
          <h3 class="m-0 mb-1.5 text-base font-semibold text-gray-900 md:mb-2 md:text-lg">选择文件预览</h3>
          <p class="m-0 text-xs text-gray-500 md:text-sm">从左侧选择一个文件，或在右侧与AI对话生成新内容</p>
        </div>
      </div>

      <!-- Image preview -->
      <div v-else-if="fileType === 'image'" class="flex w-full max-w-[900px] flex-col items-center gap-4 md:gap-5">
        <img
          :src="fileUrl"
          :alt="fileName"
          class="max-h-[calc(100vh-200px)] w-full rounded-lg object-contain shadow-lg md:rounded-xl"
        />

        <div class="flex hidden gap-2.5 rounded-xl bg-white px-5 py-3 shadow-sm">
          <button
            @click="$emit('regenerate')"
            class="flex cursor-pointer items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-xs font-medium text-gray-500 transition-all hover:bg-gray-50"
          >
            <span>🔄</span>
            <span>重新生成</span>
          </button>

          <button
            @click="$emit('modify')"
            class="flex cursor-pointer items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-xs font-medium text-gray-500 transition-all hover:bg-gray-50"
          >
            <span>✏️</span>
            <span>修改</span>
          </button>

          <button
            @click="$emit('show-prompt')"
            class="flex cursor-pointer items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-xs font-medium text-gray-500 transition-all hover:bg-gray-50"
          >
            <span>💡</span>
            <span>提示词</span>
          </button>

          <button
            @click="$emit('download')"
            class="flex cursor-pointer items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-xs font-medium text-gray-500 transition-all hover:bg-gray-50"
          >
            <span>⬇️</span>
            <span>下载</span>
          </button>
        </div>
      </div>

      <!-- Video preview -->
      <video v-else-if="fileType === 'video'" :src="fileUrl" controls class="max-h-full max-w-full rounded-lg" />

      <!-- Audio preview -->
      <div v-else-if="fileType === 'audio'" class="w-full max-w-[600px] px-4">
        <audio :src="fileUrl" controls class="w-full" />
      </div>

      <!-- Document preview -->
      <div v-else class="py-10 text-center">
        <div class="mb-4 text-4xl md:text-5xl">📄</div>
        <p class="text-xs text-gray-500 md:text-sm">{{ fileName }}</p>
      </div>
    </div>
  </div>
</template>
