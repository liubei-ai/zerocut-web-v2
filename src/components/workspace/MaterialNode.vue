<script setup lang="ts">
import { computed } from 'vue';
import { Handle, Position, type NodeProps } from '@vue-flow/core';
import type { OssMaterial, MaterialNodeData } from '@/types/ossMaterial';

interface Props extends NodeProps<MaterialNodeData> {
  data: MaterialNodeData;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  edit: [material: OssMaterial];
  regenerate: [material: OssMaterial];
  select: [material: OssMaterial];
}>();

const material = computed(() => props.data.material);

const fileName = computed(() => {
  if (material.value.localFile) {
    return material.value.localFile.split('/').pop() || '未命名文件';
  }
  return material.value.prompt || '生成中...';
});

const fileTypeIcon = computed(() => {
  const icons: Record<string, string> = {
    image: '🖼️',
    video: '🎬',
    audio: '🎵',
    document: '📄',
  };
  return icons[material.value.fileType] || '📁';
});

const statusBorderColor = computed(() => {
  const status = material.value.status;
  if (status === 'SUCCESS') return 'border-child-emerald';
  if (status === 'FAILED') return 'border-destructive';
  if (status === 'RUNNING') return 'border-primary';
  return 'border-border';
});

const isGenerated = computed(() => {
  return material.value.prompt !== null || material.value.source === 'omni';
});

const hasReferences = computed(() => {
  const params = material.value.inputParams;
  if (!params) return false;
  return (params.images && params.images.length > 0) ||
    (params.videos && params.videos.length > 0) ||
    (params.audios && params.audios.length > 0);
});

const handleEdit = () => {
  emit('edit', material.value);
};

const handleRegenerate = () => {
  emit('regenerate', material.value);
};

const handleSelect = () => {
  emit('select', material.value);
};

const formatFileSize = (bytes?: number) => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const getStatusBadgeClass = () => {
  const status = material.value.status;
  if (status === 'SUCCESS') return 'bg-child-emerald/10 text-child-emerald border-child-emerald/30';
  if (status === 'FAILED') return 'bg-destructive/10 text-destructive border-destructive/30';
  if (status === 'RUNNING') return 'bg-primary/10 text-primary border-primary/30 animate-pulse';
  return 'bg-muted text-muted-foreground border-border';
};

const getStatusText = () => {
  const status = material.value.status;
  if (status === 'SUCCESS') return '已完成';
  if (status === 'FAILED') return '失败';
  if (status === 'RUNNING') return '生成中';
  return '等待中';
};

const referenceImages = computed(() => {
  const params = material.value.inputParams;
  if (!params?.images) return [];
  return params.images;
});

const referenceVideos = computed(() => {
  const params = material.value.inputParams;
  if (!params?.videos) return [];
  return params.videos;
});
</script>

<template>
  <Handle
    v-if="hasReferences"
    type="target"
    :position="Position.Top"
    class="!h-4 !w-4 !border-2 !border-primary !bg-card !shadow-md !rounded-full"
  />

  <div
    class="w-64 rounded-xl border-2 bg-card shadow-lg transition-all duration-300 hover:shadow-xl overflow-hidden"
    :class="[
      statusBorderColor,
      data.isSelected ? 'ring-2 ring-primary ring-offset-2 ring-offset-background scale-[1.02]' : '',
    ]"
    @click="handleSelect"
  >
    <!-- 头部区域 -->
    <div class="border-b border-border bg-card/80 px-4 py-3">
      <div class="flex items-start gap-3">
        <div class="text-2xl shrink-0">
          {{ fileTypeIcon }}
        </div>
        <div class="min-w-0 flex-1">
          <div class="truncate text-sm font-semibold text-foreground" :title="fileName">
            {{ fileName }}
          </div>
          <div class="flex flex-wrap items-center gap-2 mt-1">
            <span class="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
              {{ material.fileType }}
            </span>
            <span v-if="material.fileSize" class="text-xs text-muted-foreground">
              {{ formatFileSize(material.fileSize) }}
            </span>
            <span v-if="material.model" class="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
              {{ material.model }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- 预览区域 -->
    <div v-if="material.ossUrl && material.fileType === 'image'" class="relative bg-muted/30">
      <img
        :src="material.ossUrl"
        :alt="fileName"
        class="h-40 w-full object-cover"
      />
    </div>
    <div v-else-if="material.ossUrl && material.fileType === 'video'" class="relative bg-muted/30">
      <video
        :src="material.ossUrl"
        :title="fileName"
        class="h-40 w-full object-cover"
        muted
        playsinline
      />
      <div class="absolute inset-0 flex items-center justify-center">
        <div class="rounded-full bg-black/60 p-3 backdrop-blur-sm">
          <svg class="h-6 w-6 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z"/>
          </svg>
        </div>
      </div>
    </div>
    <div v-else class="flex h-40 items-center justify-center bg-muted/30">
      <span class="text-5xl opacity-40">{{ fileTypeIcon }}</span>
    </div>

    <!-- 状态徽章 -->
    <div v-if="material.status" class="px-4 py-2 border-t border-border">
      <div class="flex items-center justify-center">
        <span :class="['inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full border', getStatusBadgeClass()]">
          <svg v-if="material.status === 'RUNNING'" class="h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
          </svg>
          <span v-else-if="material.status === 'SUCCESS'" class="i-lucide-check h-3 w-3"></span>
          <span v-else-if="material.status === 'FAILED'" class="i-lucide-x h-3 w-3"></span>
          {{ getStatusText() }}
        </span>
      </div>
    </div>

    <!-- 参考素材展示区域 -->
    <div v-if="(referenceImages.length > 0 || referenceVideos.length > 0)" class="border-t border-border p-3 bg-muted/20">
      <div class="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
        <span class="i-lucide-git-branch h-3.5 w-3.5"></span>
        参考素材
      </div>
      <div class="flex flex-wrap gap-1.5">
        <div 
          v-for="(img, index) in referenceImages" 
          :key="`img-${index}`"
          class="relative group reference-thumb"
          :title="img.name"
        >
          <img 
            :src="img.url" 
            :alt="img.name"
            class="w-12 h-12 rounded-lg object-cover border-2 border-primary/30 group-hover:border-primary transition-all shadow-sm"
          />
          <div class="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-bold shadow">
            🖼️
          </div>
        </div>
        <div 
          v-for="(vid, index) in referenceVideos" 
          :key="`vid-${index}`"
          class="relative group"
          :title="vid.name"
        >
          <video 
            :src="vid.url" 
            :alt="vid.name"
            class="w-12 h-12 rounded-lg object-cover border-2 border-primary/30 group-hover:border-primary transition-all shadow-sm"
            muted
            playsinline
          />
          <div class="absolute inset-0 flex items-center justify-center bg-black/30 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
            <svg class="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z"/>
            </svg>
          </div>
          <div class="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-bold shadow">
            📹
          </div>
        </div>
      </div>
    </div>
    <div v-if="isGenerated" class="border-t border-border p-4">
      <div v-if="material.prompt" class="mb-3">
        <div class="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
          <span class="i-lucide-message-square h-3 w-3"></span>
          Prompt
        </div>
        <div class="line-clamp-2 text-xs text-foreground/80 bg-muted/50 rounded-lg p-2" :title="material.prompt">
          {{ material.prompt }}
        </div>
      </div>

      <div v-if="material.inputParams" class="space-y-2">
        <div v-if="material.inputParams.duration" class="flex items-center justify-between text-xs">
          <span class="text-muted-foreground flex items-center gap-1">
            <span class="i-lucide-clock h-3 w-3"></span>
            时长
          </span>
          <span class="font-medium text-foreground">{{ material.inputParams.duration }}s</span>
        </div>
        <div v-if="material.inputParams.resolution" class="flex items-center justify-between text-xs">
          <span class="text-muted-foreground flex items-center gap-1">
            <span class="i-lucide-monitor h-3 w-3"></span>
            分辨率
          </span>
          <span class="font-medium text-foreground">{{ material.inputParams.resolution }}</span>
        </div>
        <div v-if="material.inputParams.aspect_ratio" class="flex items-center justify-between text-xs">
          <span class="text-muted-foreground flex items-center gap-1">
            <span class="i-lucide-crop h-3 w-3"></span>
            宽高比
          </span>
          <span class="font-medium text-foreground">{{ material.inputParams.aspect_ratio }}</span>
        </div>
      </div>
    </div>

    <!-- 操作按钮 -->
    <div v-if="material.fileType === 'video' && isGenerated && material.status === 'SUCCESS'" class="flex gap-2 border-t border-border p-3 bg-muted/20">
      <button
        @click.stop="handleEdit"
        class="flex-1 rounded-lg bg-card px-3 py-2 text-xs font-medium text-foreground shadow-sm border border-border hover:bg-accent hover:border-primary transition-all duration-200 flex items-center justify-center gap-1.5"
      >
        <span class="i-lucide-edit-2 h-3.5 w-3.5"></span>
        重新编辑
      </button>
      <button
        @click.stop="handleRegenerate"
        class="flex-1 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-all duration-200 flex items-center justify-center gap-1.5"
      >
        <span class="i-lucide-refresh-cw h-3.5 w-3.5"></span>
        再次生成
      </button>
    </div>
  </div>

  <Handle
    type="source"
    :position="Position.Bottom"
    class="!h-4 !w-4 !border-2 !border-primary !bg-card !shadow-md !rounded-full"
  />
</template>

<style scoped>
.reference-thumb {
  transition: all 0.2s ease;
}

.reference-thumb:hover {
  transform: scale(1.1);
  z-index: 10;
}
</style>
