<script setup lang="ts">
import { ref, computed } from 'vue';

interface WorkspaceFile {
  id: string;
  file_name: string;
  file_type: string;
  file_url: string;
  thumbnail_url?: string;
  file_size?: number;
  created_at: string;
}

interface Props {
  files: WorkspaceFile[];
  selectedFileId?: string;
  projectTitle?: string;
}

interface Emits {
  (e: 'file-select', fileId: string): void;
  (e: 'project-title-change', newTitle: string): void;
  (e: 'file-upload', file: File): void;
  (e: 'download-all'): void;
}

const props = withDefaults(defineProps<Props>(), {
  projectTitle: '未命名项目'
});

const emit = defineEmits<Emits>();

const isEditingTitle = ref(false);
const editedTitle = ref(props.projectTitle);
const filterType = ref<string>('all');
const fileInputRef = ref<HTMLInputElement>();

const getFileIcon = (fileType: string) => {
  const icons: Record<string, string> = {
    image: '🖼️',
    video: '🎬',
    audio: '🎵',
    document: '📄',
  };
  return icons[fileType] || '📁';
};

const formatFileSize = (bytes?: number) => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const handleTitleSave = () => {
  if (editedTitle.value.trim()) {
    emit('project-title-change', editedTitle.value.trim());
  }
  isEditingTitle.value = false;
};

const handleFileUploadClick = () => {
  fileInputRef.value?.click();
};

const handleFileChange = (e: Event) => {
  const target = e.target as HTMLInputElement;
  const file = target.files?.[0];
  if (file) {
    emit('file-upload', file);
  }
};

const filteredFiles = computed(() => {
  return filterType.value === 'all'
    ? props.files
    : props.files.filter(f => f.file_type === filterType.value);
});

const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Enter') {
    handleTitleSave();
  } else if (e.key === 'Escape') {
    editedTitle.value = props.projectTitle;
    isEditingTitle.value = false;
  }
};
</script>

<template>
  <div class="w-[280px] h-full bg-white border-r border-gray-200 flex flex-col overflow-hidden">
    <div class="p-5 border-b border-gray-200">
      <div class="mb-4">
        <input
          v-if="isEditingTitle"
          v-model="editedTitle"
          @blur="handleTitleSave"
          @keydown="handleKeyDown"
          class="w-full text-base font-semibold text-gray-900 px-2 py-1 border border-blue-500 rounded-md outline-none"
          autofocus
        />
        <div
          v-else
          @click="isEditingTitle = true"
          class="text-base font-semibold text-gray-900 px-2 py-1 cursor-pointer rounded-md transition-all hover:bg-gray-50"
          title="点击编辑项目名称"
        >
          {{ projectTitle }}
        </div>
      </div>

      <div class="flex gap-1.5 mb-3 overflow-x-auto">
        <button
          @click="filterType = 'all'"
          :class="[
            'px-3 py-1.5 border border-gray-200 rounded-md text-xs font-medium cursor-pointer transition-all whitespace-nowrap',
            filterType === 'all' ? 'bg-gray-900 text-white' : 'bg-white text-gray-500'
          ]"
        >
          全部
        </button>
        <button
          @click="filterType = 'image'"
          :class="[
            'px-3 py-1.5 border border-gray-200 rounded-md text-xs font-medium cursor-pointer transition-all whitespace-nowrap',
            filterType === 'image' ? 'bg-gray-900 text-white' : 'bg-white text-gray-500'
          ]"
        >
          图片
        </button>
        <button
          @click="filterType = 'video'"
          :class="[
            'px-3 py-1.5 border border-gray-200 rounded-md text-xs font-medium cursor-pointer transition-all whitespace-nowrap',
            filterType === 'video' ? 'bg-gray-900 text-white' : 'bg-white text-gray-500'
          ]"
        >
          视频
        </button>
        <button
          @click="filterType = 'audio'"
          :class="[
            'px-3 py-1.5 border border-gray-200 rounded-md text-xs font-medium cursor-pointer transition-all whitespace-nowrap',
            filterType === 'audio' ? 'bg-gray-900 text-white' : 'bg-white text-gray-500'
          ]"
        >
          音频
        </button>
      </div>

      <div class="flex gap-1.5">
        <button
          @click="handleFileUploadClick"
          class="flex-1 px-3 py-2 border border-gray-200 rounded-lg bg-gray-900 text-white text-xs font-medium cursor-pointer transition-all flex items-center justify-center gap-1.5 hover:bg-black"
        >
          <span>📤</span>
          <span>上传</span>
        </button>
        <button
          @click="$emit('download-all')"
          :disabled="files.length === 0"
          :class="[
            'px-3 py-2 border border-gray-200 rounded-lg text-xs font-medium transition-all flex items-center gap-1',
            files.length > 0 
              ? 'bg-white text-gray-500 cursor-pointer hover:bg-gray-50' 
              : 'bg-gray-50 text-gray-300 cursor-not-allowed'
          ]"
          title="下载全部"
        >
          <span>⬇️</span>
        </button>
      </div>

      <input
        ref="fileInputRef"
        type="file"
        @change="handleFileChange"
        class="hidden"
        accept="image/*,video/*,audio/*"
      />
    </div>

    <div class="flex-1 overflow-y-auto p-2">
      <div v-if="filteredFiles.length === 0" class="text-center py-10">
        <div class="text-3xl mb-3">📁</div>
        <p class="text-xs text-gray-400 m-0 leading-relaxed">
          {{ filterType === 'all' ? '暂无文件' : `暂无${filterType === 'image' ? '图片' : filterType === 'video' ? '视频' : '音频'}文件` }}
        </p>
      </div>
      
      <div v-else class="flex flex-col gap-1">
        <div
          v-for="file in filteredFiles"
          :key="file.id"
          @click="$emit('file-select', file.id)"
          :class="[
            'p-2.5 rounded-lg cursor-pointer transition-all border flex items-start gap-2.5',
            selectedFileId === file.id 
              ? 'bg-gray-50 border-gray-200' 
              : 'border-transparent hover:bg-gray-50'
          ]"
        >
          <img
            v-if="file.thumbnail_url"
            :src="file.thumbnail_url"
            :alt="file.file_name"
            class="w-10 h-10 rounded-md object-cover flex-shrink-0"
          />
          <div
            v-else
            class="w-10 h-10 rounded-md bg-gray-50 flex items-center justify-center text-xl flex-shrink-0"
          >
            {{ getFileIcon(file.file_type) }}
          </div>
          
          <div class="flex-1 min-w-0">
            <div class="text-xs font-medium text-gray-900 mb-0.5 overflow-hidden text-ellipsis whitespace-nowrap">
              {{ file.file_name }}
            </div>
            <div class="text-[11px] text-gray-400">
              {{ formatFileSize(file.file_size) }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>