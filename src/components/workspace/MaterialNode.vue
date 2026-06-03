<script setup lang="ts">
import { computed } from 'vue';
import { useNode } from '@vue-flow/core';
import type { NodeProps } from '@vue-flow/core';
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

// 使用 useNode 获取节点的选中状态
const { node } = useNode();

const material = computed(() => props.data.material);

const isSelected = computed(() => node.selected);

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

const borderColor = computed(() => {
  // 选中状态优先显示 primary 颜色
  if (isSelected.value) return 'border-primary';
  
  const status = material.value.status;
  if (status === 'SUCCESS') return 'border-emerald-500';
  if (status === 'FAILED') return 'border-destructive';
  if (status === 'RUNNING') return 'border-primary';
  return 'border-border';
});

const isGenerated = computed(() => {
  return material.value.prompt !== null || material.value.source === 'omni';
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
</script>

<template>
  <div
    class="w-96 rounded-xl border-2 bg-card shadow-lg transition-shadow duration-300 hover:shadow-xl overflow-hidden"
    :class="borderColor"
    @click="handleSelect"
  >
    <!-- Prompt和参数区域 -->
    <div v-if="isGenerated && (material.prompt || material.inputParams)" class="border-b border-border bg-gradient-to-br from-primary/5 to-muted/30">
      <!-- Prompt展示 -->
      <div v-if="material.prompt" class="px-4 pt-4 pb-2">
        <div class="line-clamp-2 text-xs text-foreground/80 leading-relaxed" :title="material.prompt">
          {{ material.prompt }}
        </div>
      </div>

      <!-- 参数横向展示（不换行） -->
      <div v-if="material.inputParams && (material.inputParams.duration || material.inputParams.resolution || material.inputParams.aspect_ratio || material.model)" class="px-4 pb-3">
        <div class="flex items-center gap-2 overflow-x-auto">
          <span v-if="material.model" class="text-xs px-2.5 py-1 rounded-full bg-primary/15 text-primary font-medium border border-primary/20 shrink-0">
            {{ material.model }}
          </span>
          <span v-if="material.inputParams.aspect_ratio" class="text-xs px-2.5 py-1 rounded-full bg-secondary/20 text-secondary-foreground font-medium border border-secondary/30 shrink-0">
            {{ material.inputParams.aspect_ratio }}
          </span>
          <span v-if="material.inputParams.duration" class="text-xs px-2.5 py-1 rounded-full bg-muted text-muted-foreground font-medium shrink-0">
            {{ material.inputParams.duration }}s
          </span>
          <span v-if="material.inputParams.resolution" class="text-xs px-2.5 py-1 rounded-full bg-muted text-muted-foreground font-medium shrink-0">
            {{ material.inputParams.resolution }}
          </span>
        </div>
      </div>
    </div>

    <!-- 头部区域 -->
    <div v-if="!material.model" class="border-b border-border bg-card/80 px-4 py-3">
      <div class="flex items-start gap-3">
        <div class="text-2xl shrink-0">
          {{ fileTypeIcon }}
        </div>
        <div class="min-w-0 flex-1">
          <div class="truncate text-sm font-semibold text-foreground" :title="fileName">
            {{ fileName }}
          </div>
          <div class="flex items-center gap-2 mt-1">
            <span class="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
              {{ material.fileType }}
            </span>
            <span v-if="material.fileSize" class="text-xs text-muted-foreground">
              {{ formatFileSize(material.fileSize) }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- 预览区域 -->
    <div v-if="material.ossUrl && material.fileType === 'image'" class="relative bg-muted/30">
      <img
        :src="`${material.ossUrl}?x-tos-process=image/resize,w_400`"
        :alt="fileName"
        class="h-40 w-full object-contain"
      />
    </div>
    <div v-else-if="material.ossUrl && material.fileType === 'video'" class="relative bg-muted/30 flex items-center justify-center">
      <video
        :src="material.ossUrl"
        :title="fileName"
        class="h-40 w-full object-contain"
        playsinline
        controls
      />
    </div>
    <div v-else class="flex h-40 items-center justify-center bg-muted/30">
      <span class="text-5xl opacity-40">{{ fileTypeIcon }}</span>
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
</template>
