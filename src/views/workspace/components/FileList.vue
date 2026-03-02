<script setup lang="ts">
import { ref, computed, watch, toRef } from 'vue';
import { exportProject } from '@/api/videoProjectApi';
import { useToast } from '@/composables/useToast';
import { useFileUpload } from '@/composables/useFileUpload';
import { type WorkspaceFile } from '../Workspace.vue';

interface Props {
  files: WorkspaceFile[];
  selectedFileId?: string;
  projectTitle?: string;
  projectId?: string | number;
  isUploading?: boolean;
  isOwner?: boolean;
}

interface Emits {
  (e: 'file-select', fileId: string): void;
  (e: 'project-title-change', newTitle: string): void;
  (e: 'file-uploaded'): void;
  (e: 'upload-start'): void;
  (e: 'upload-end'): void;
}

const props = withDefaults(defineProps<Props>(), {
  projectTitle: '未命名项目',
  isUploading: false,
  isOwner: true,
});

const emit = defineEmits<Emits>();
const { toast, removeToast } = useToast();
const isUploadingRef = toRef(props, 'isUploading');
const { fileInputRef, handleFileUploadClick, handleFileChange } = useFileUpload(
  isUploadingRef,
  () => emit('upload-start'),
  () => emit('upload-end')
);

const isEditingTitle = ref(false);
const editedTitle = ref(props.projectTitle);
const filterType = ref<string>('all');
const isDownloading = ref(false);

// Watch for changes in props.projectTitle and update editedTitle
watch(
  () => props.projectTitle,
  newTitle => {
    editedTitle.value = newTitle;
  },
);

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

const handleFileUpload = () => {
  handleFileUploadClick(props.projectId);
};

const onFileChange = (e: Event) => {
  if (!props.projectId) return;
  
  handleFileChange(e, props.projectId, () => {
    // Notify parent to refresh the file list
    emit('file-uploaded');
  });
};

const filteredFiles = computed(() => {
  return filterType.value === 'all' ? props.files : props.files.filter(f => f.file_type === filterType.value);
});

const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Enter') {
    handleTitleSave();
  } else if (e.key === 'Escape') {
    editedTitle.value = props.projectTitle;
    isEditingTitle.value = false;
  }
};

const handleDownloadAll = async () => {
  if (!props.projectId || props.files.length === 0 || isDownloading.value) {
    return;
  }

  let loadingToastId: string | undefined;

  try {
    isDownloading.value = true;
    loadingToastId = toast({
      title: '正在导出...',
      description: '正在打包项目文件，请稍候',
      duration: 10000,
    });

    const blob = await exportProject(props.projectId);

    // Create a blob URL and trigger download
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `project_${props.projectId}_export.zip`;
    document.body.appendChild(link);
    link.click();

    // Cleanup
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    toast({
      title: '导出成功',
      description: '项目文件已下载',
    });
  } catch (error: any) {
    console.error('Export failed:', error);
    toast({
      title: '导出失败',
      description: error.message || '下载项目文件时出错',
      variant: 'destructive',
    });
  } finally {
    // Close the loading toast
    if (loadingToastId) {
      removeToast(loadingToastId);
    }
    isDownloading.value = false;
  }
};
</script>

<template>
  <div class="flex h-full w-full flex-col overflow-hidden border-r border-gray-200 bg-white md:w-[200px] lg:w-[240px] xl:w-[280px]">
    <div class="border-b border-gray-200 p-4 md:p-5">
      <div class="mb-3 md:mb-4">
        <input
          v-if="isEditingTitle"
          v-model="editedTitle"
          @blur="handleTitleSave"
          @keydown="handleKeyDown"
          class="w-full rounded-md border border-blue-500 px-2 py-1 text-sm font-semibold text-gray-900 outline-none md:text-base"
          autofocus
        />
        <div
          v-else
          @click="isEditingTitle = true"
          class="cursor-pointer rounded-md px-2 py-1 text-sm font-semibold text-gray-900 transition-all hover:bg-gray-50 md:text-base"
          title="点击编辑项目名称"
        >
          {{ projectTitle }}
        </div>
      </div>

      <div class="mb-2.5 flex gap-1.5 overflow-x-auto md:mb-3">
        <button
          @click="filterType = 'all'"
          :class="[
            'cursor-pointer rounded-md border border-gray-200 px-2.5 py-1.5 text-xs font-medium whitespace-nowrap transition-all md:px-3',
            filterType === 'all' ? 'bg-gray-900 text-white' : 'bg-white text-gray-500',
          ]"
        >
          全部
        </button>
        <button
          @click="filterType = 'image'"
          :class="[
            'cursor-pointer rounded-md border border-gray-200 px-2.5 py-1.5 text-xs font-medium whitespace-nowrap transition-all md:px-3',
            filterType === 'image' ? 'bg-gray-900 text-white' : 'bg-white text-gray-500',
          ]"
        >
          图片
        </button>
        <button
          @click="filterType = 'video'"
          :class="[
            'cursor-pointer rounded-md border border-gray-200 px-2.5 py-1.5 text-xs font-medium whitespace-nowrap transition-all md:px-3',
            filterType === 'video' ? 'bg-gray-900 text-white' : 'bg-white text-gray-500',
          ]"
        >
          视频
        </button>
        <button
          @click="filterType = 'audio'"
          :class="[
            'cursor-pointer rounded-md border border-gray-200 px-2.5 py-1.5 text-xs font-medium whitespace-nowrap transition-all md:px-3',
            filterType === 'audio' ? 'bg-gray-900 text-white' : 'bg-white text-gray-500',
          ]"
        >
          音频
        </button>
      </div>

      <div class="flex gap-1.5">
        <button
          v-if="props.isOwner"
          @click="handleFileUpload"
          :disabled="!projectId || props.isUploading"
          :class="[
            'flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium transition-all',
            projectId && !props.isUploading
              ? 'bg-gray-900 text-white hover:bg-black'
              : 'cursor-not-allowed bg-gray-300 text-gray-500',
          ]"
        >
          <span v-if="!props.isUploading">📤</span>
          <span v-else class="animate-spin">⏳</span>
          <span>{{ props.isUploading ? '上传中...' : '上传' }}</span>
        </button>
        <button
          v-if="props.isOwner"
          @click="handleDownloadAll"
          :disabled="files.length === 0 || isDownloading"
          :class="[
            'flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium transition-all',
            files.length > 0 && !isDownloading
              ? 'cursor-pointer bg-white text-gray-500 hover:bg-gray-50'
              : 'cursor-not-allowed bg-gray-50 text-gray-300',
          ]"
          title="下载全部"
        >
          <span v-if="!isDownloading">⬇️</span>
          <span v-else class="animate-spin">⏳</span>
        </button>
      </div>

      <input
        ref="fileInputRef"
        type="file"
        @change="onFileChange"
        class="hidden"
        accept="image/*,video/*,audio/*"
      />
    </div>

    <div class="flex-1 overflow-y-auto p-2 pb-20 md:pb-2">
      <div v-if="filteredFiles.length === 0" class="py-10 text-center">
        <div class="mb-3 text-3xl">📁</div>
        <p class="m-0 text-xs leading-relaxed text-gray-400">
          {{
            filterType === 'all'
              ? '暂无文件'
              : `暂无${filterType === 'image' ? '图片' : filterType === 'video' ? '视频' : '音频'}文件`
          }}
        </p>
      </div>

      <div v-else class="flex flex-col gap-1">
        <div
          v-for="file in filteredFiles"
          :key="file.id"
          @click="$emit('file-select', file.id)"
          :class="[
            'flex cursor-pointer items-start gap-2.5 rounded-lg border p-2.5 transition-all active:scale-[0.98]',
            selectedFileId === file.id ? 'border-gray-200 bg-gray-50' : 'border-transparent hover:bg-gray-50',
          ]"
        >
          <img
            v-if="file.file_type === 'image'"
            :src="`${file.file_url}?x-tos-process=image/resize,w_100`"
            :alt="file.file_name"
            class="h-10 w-10 flex-shrink-0 rounded-md object-cover"
          />
          <div v-else class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md bg-gray-50 text-xl">
            {{ getFileIcon(file.file_type) }}
          </div>

          <div class="min-w-0 flex-1">
            <div class="mb-0.5 overflow-hidden text-xs font-medium text-ellipsis whitespace-nowrap text-gray-900">
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
