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
  <div class="flex-1 flex flex-col bg-gray-50 overflow-hidden">
    <div class="px-6 py-4 bg-white border-b border-gray-200 flex items-center justify-between">
      <h3 class="text-[15px] font-semibold text-gray-900 m-0">
        {{ fileName || '预览区' }}
      </h3>
    </div>

    <div class="flex-1 flex items-center justify-center p-10 overflow-auto">
      <!-- No file selected -->
      <div v-if="!fileUrl" class="flex flex-col items-center justify-center h-full gap-4">
        <div class="w-20 h-20 rounded-full bg-gray-50 flex items-center justify-center text-4xl">
          👁️
        </div>
        <div class="text-center">
          <h3 class="text-lg font-semibold text-gray-900 m-0 mb-2">
            选择文件预览
          </h3>
          <p class="text-sm text-gray-500 m-0">
            从左侧选择一个文件，或在右侧与AI对话生成新内容
          </p>
        </div>
      </div>

      <!-- Image preview -->
      <div v-else-if="fileType === 'image'" class="flex flex-col items-center gap-5 w-full max-w-[900px]">
        <img
          :src="fileUrl"
          :alt="fileName"
          class="w-full max-h-[calc(100vh-200px)] object-contain rounded-xl shadow-lg"
        />

        <div class="flex gap-2.5 px-5 py-3 bg-white rounded-xl shadow-sm">
          <button
            @click="$emit('regenerate')"
            class="px-4 py-2.5 border border-gray-200 rounded-lg bg-white text-gray-500 text-xs font-medium cursor-pointer transition-all flex items-center gap-1.5 hover:bg-gray-50"
          >
            <span>🔄</span>
            <span>重新生成</span>
          </button>

          <button
            @click="$emit('modify')"
            class="px-4 py-2.5 border border-gray-200 rounded-lg bg-white text-gray-500 text-xs font-medium cursor-pointer transition-all flex items-center gap-1.5 hover:bg-gray-50"
          >
            <span>✏️</span>
            <span>修改</span>
          </button>

          <button
            @click="$emit('show-prompt')"
            class="px-4 py-2.5 border border-gray-200 rounded-lg bg-white text-gray-500 text-xs font-medium cursor-pointer transition-all flex items-center gap-1.5 hover:bg-gray-50"
          >
            <span>💡</span>
            <span>提示词</span>
          </button>

          <button
            @click="$emit('download')"
            class="px-4 py-2.5 border border-gray-200 rounded-lg bg-white text-gray-500 text-xs font-medium cursor-pointer transition-all flex items-center gap-1.5 hover:bg-gray-50"
          >
            <span>⬇️</span>
            <span>下载</span>
          </button>
        </div>
      </div>

      <!-- Video preview -->
      <video
        v-else-if="fileType === 'video'"
        :src="fileUrl"
        controls
        class="max-w-full max-h-full rounded-lg"
      />

      <!-- Audio preview -->
      <div v-else-if="fileType === 'audio'" class="w-full max-w-[600px]">
        <audio
          :src="fileUrl"
          controls
          class="w-full"
        />
      </div>

      <!-- Document preview -->
      <div v-else class="text-center py-10">
        <div class="text-5xl mb-4">📄</div>
        <p class="text-sm text-gray-500">{{ fileName }}</p>
      </div>
    </div>
  </div>
</template>