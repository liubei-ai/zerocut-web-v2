<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { Button } from '@/components/ui/button';
import { videoModels, videoDurations, videoAspectRatios, videoResolutions } from '@/config/videoGeneration';
import { calculateVideoCredits } from '@/utils/videoPriceCalculator';
import { useAuthStore } from '@/stores/authStore';
import { useCreditsStore } from '@/stores/creditsStore';
import FileReferenceInput from '@/components/workspace/FileReferenceInput.vue';
import type { VideoWorkflowImage, VideoWorkflowVideo, VideoWorkflowAudio } from '@/api/videoWorkflowApi';
import type { FilePreview } from '@/types/fileReference';
import { MAX_FILES } from '@/types/fileReference';

export interface VideoGenerationParams {
  model: string;
  prompt: string;
  resolution: '720p' | '1080p';
  aspectRatio: '16:9' | '9:16';
  duration: number;
  images?: VideoWorkflowImage[];
  videos?: VideoWorkflowVideo[];
  audios?: VideoWorkflowAudio[];
}

interface Props {
  initialPrompt?: string;
  isLoading?: boolean;
  initialModel?: string;
  initialDuration?: number;
  initialAspectRatio?: '16:9' | '9:16';
  initialResolution?: '720p' | '1080p';
  initialReferenceMode?: 'reference' | 'first_last_frame';
  priceConfig?: any;
  initialFiles?: FilePreview[];
}

interface Emits {
  (e: 'submit', params: VideoGenerationParams): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const prompt = ref(props.initialPrompt || '');
const model = ref(props.initialModel || 'seedance-2.0');
const resolution = ref<'720p' | '1080p'>(props.initialResolution || '720p');
const aspectRatio = ref<'16:9' | '9:16'>(props.initialAspectRatio || '9:16');
const duration = ref(props.initialDuration || 5);
const referenceMode = ref<'reference' | 'first_last_frame'>(props.initialReferenceMode || 'reference');
const selectedFiles = ref<FilePreview[]>(props.initialFiles || []);

const openMenu = ref<string | null>(null);

const firstFrameInput = ref<HTMLInputElement | null>(null);
const lastFrameInput = ref<HTMLInputElement | null>(null);

const firstFrameImage = ref<FilePreview | null>(null);
const lastFrameImage = ref<FilePreview | null>(null);

const getFirstFrameImage = computed(() => {
  if (referenceMode.value === 'first_last_frame') {
    return firstFrameImage.value;
  }
  return null;
});

const getLastFrameImage = computed(() => {
  if (referenceMode.value === 'first_last_frame') {
    return lastFrameImage.value;
  }
  return null;
});

const triggerFileInput = (position: 'first' | 'last') => {
  if (position === 'first' && firstFrameInput.value) {
    firstFrameInput.value.click();
  } else if (position === 'last' && lastFrameInput.value) {
    lastFrameInput.value.click();
  }
};

const handleFrameImageChange = (position: 'first' | 'last', event: Event) => {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file || !file.type.startsWith('image/')) return;

  const filePreview: FilePreview = {
    id: `${position}_frame_${Date.now()}`,
    name: file.name,
    type: 'image',
    url: URL.createObjectURL(file),
    file: file,
  };

  if (position === 'first') {
    firstFrameImage.value = filePreview;
  } else {
    lastFrameImage.value = filePreview;
  }

  if (filePreview && !selectedFiles.value.find(f => f.id === filePreview.id)) {
    selectedFiles.value.push(filePreview);
  }

  input.value = '';
};

const removeFrameImage = (position: 'first' | 'last') => {
  const filePreview = position === 'first' ? firstFrameImage.value : lastFrameImage.value;
  if (filePreview) {
    selectedFiles.value = selectedFiles.value.filter(f => f.id !== filePreview.id);
    if (position === 'first') {
      firstFrameImage.value = null;
    } else {
      lastFrameImage.value = null;
    }
  }
};

const shouldShowAtButton = computed(() => {
  return true;
});

const toggleMenu = (id: string) => { openMenu.value = openMenu.value === id ? null : id; };
const closeMenus = () => { openMenu.value = null; };

const showAspectRatioMenu = () => toggleMenu('aspectRatio');
const showDurationMenu = () => toggleMenu('duration');
const showResolutionMenu = () => toggleMenu('resolution');

const selectAspectRatio = (ratio: '16:9' | '9:16') => {
  aspectRatio.value = ratio;
  closeMenus();
};

const selectDuration = (seconds: number) => {
  duration.value = seconds;
  closeMenus();
};

const selectResolution = (res: '720p' | '1080p') => {
  resolution.value = res;
  closeMenus();
};

const handleFilesChange = (files: FilePreview[]) => {
  selectedFiles.value = files;
};

const placeholderText = computed(() => {
  if (referenceMode.value === 'first_last_frame') {
    return `上传首帧和尾帧图片，描述视频内容。例如：${MAX_FILES > 2 ? '@图片1 作为首帧，@图片2 作为尾帧' : '@图片1 作为首帧，@图片2 作为尾帧'}`;
  }
  return `上传1-${MAX_FILES}个参考素材、输入文字，自由组合图、文、音、视频多元素，定义精彩创意。例如：@图片1 模仿 @视频1 的动作，音色参考 @音频1。`;
});

const creditsNeeded = computed(() => {
  return calculateVideoCredits(model.value, duration.value, resolution.value, props.priceConfig || null, videoModels);
});
const canSubmit = computed(() => prompt.value.trim().length > 0 && !props.isLoading);

const convertFilesToWorkflow = () => {
  const images: VideoWorkflowImage[] = [];
  const videos: VideoWorkflowVideo[] = [];
  const audios: VideoWorkflowAudio[] = [];

  if (referenceMode.value === 'first_last_frame') {
    if (firstFrameImage.value) {
      images.push({
        type: 'first_frame',
        name: firstFrameImage.value.name,
        file: firstFrameImage.value.file,
      });
    }
    if (lastFrameImage.value) {
      images.push({
        type: 'last_frame',
        name: lastFrameImage.value.name,
        file: lastFrameImage.value.file,
      });
    }
  }

  selectedFiles.value.forEach(file => {
    if (file.type === 'image') {
      if (referenceMode.value === 'first_last_frame') {
        const isFirstOrLast = file.id === firstFrameImage.value?.id || file.id === lastFrameImage.value?.id;
        if (!isFirstOrLast) {
          images.push({
            type: 'reference',
            name: file.name,
            file: file.file,
          });
        }
      } else {
        images.push({
          type: 'reference',
          name: file.name,
          file: file.file,
        });
      }
    } else if (file.type === 'video') {
      videos.push({
        type: 'ref',
        name: file.name,
        file: file.file,
        duration: file.duration || 0,
      });
    } else if (file.type === 'audio') {
      audios.push({
        type: 'reference',
        name: file.name,
        file: file.file,
        duration: file.duration || 0,
      });
    }
  });

  return { images, videos, audios };
};

const handleSubmit = () => {
  if (!canSubmit.value) return;

  const { images, videos, audios } = convertFilesToWorkflow();

  emit('submit', {
    model: model.value,
    prompt: prompt.value,
    resolution: resolution.value,
    aspectRatio: aspectRatio.value,
    duration: duration.value,
    referenceMode: referenceMode.value,
    images: images.length > 0 ? images : undefined,
    videos: videos.length > 0 ? videos : undefined,
    audios: audios.length > 0 ? audios : undefined,
  });
};

const handleClickOutside = (e: MouseEvent) => {
  const target = e.target as HTMLElement;
  if (!target.closest('[data-menu]')) closeMenus();
};

onMounted(() => document.addEventListener('click', handleClickOutside));
onUnmounted(() => document.removeEventListener('click', handleClickOutside));
</script>

<template>
  <div class="flex h-full flex-col overflow-hidden bg-white">

    <!-- Scrollable body -->
    <div class="flex-1 overflow-y-auto px-4 py-5 space-y-5">

      <!-- Prompt -->
      <div>
        <label class="mb-1.5 block text-xs font-medium uppercase tracking-wide text-gray-400">视频描述</label>
        <div class="rounded-xl border border-gray-200 bg-gray-50 p-3 transition focus-within:border-gray-900 focus-within:bg-white focus-within:ring-1 focus-within:ring-gray-900">
          <FileReferenceInput
            v-model="prompt"
            :placeholder="placeholderText"
            :allow-file-pick="true"
            :textarea-class="'w-full min-h-[100px] text-sm leading-[1.6] bg-transparent border-0 outline-0 focus-visible:ring-0'"
            @files-change="handleFilesChange"
          >
            <template #before-files>
              <input
                ref="firstFrameInput"
                type="file"
                accept="image/*"
                class="hidden"
                @change="handleFrameImageChange('first', $event)"
              />
              <input
                ref="lastFrameInput"
                type="file"
                accept="image/*"
                class="hidden"
                @change="handleFrameImageChange('last', $event)"
              />

              <div
                v-if="firstFrameImage"
                class="relative h-28 w-20 origin-bottom transform -rotate-6 transition-transform duration-300 ease-out hover:scale-105 hover:translate-x-0 hover:rotate-0"
                :style="{ zIndex: 100 }"
                @mouseenter="($event) => ($event.currentTarget.style.zIndex = '1000')"
                @mouseleave="($event) => ($event.currentTarget.style.zIndex = '100')"
              >
                <div
                  class="absolute inset-0 rounded-xl border-2 border-white bg-gradient-to-br from-gray-50 to-gray-100 shadow-lg overflow-hidden transition-all duration-300 group-hover:shadow-xl hover:shadow-2xl"
                >
                  <img :src="firstFrameImage.url" class="w-full h-full object-cover" alt="首帧" />
                  <button
                    @click.stop="removeFrameImage('first')"
                    class="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black transition-colors text-[10px] opacity-0 group-hover:opacity-100"
                  >
                    ×
                  </button>
                </div>
              </div>

              <div
                v-if="lastFrameImage"
                class="relative h-28 w-20 origin-bottom transform -rotate-3 transition-transform duration-300 ease-out hover:scale-105 hover:translate-x-0 hover:rotate-0"
                :style="{ zIndex: 99 }"
                @mouseenter="($event) => ($event.currentTarget.style.zIndex = '1000')"
                @mouseleave="($event) => ($event.currentTarget.style.zIndex = '99')"
              >
                <div
                  class="absolute inset-0 rounded-xl border-2 border-white bg-gradient-to-br from-gray-50 to-gray-100 shadow-lg overflow-hidden transition-all duration-300 group-hover:shadow-xl hover:shadow-2xl"
                >
                  <img :src="lastFrameImage.url" class="w-full h-full object-cover" alt="尾帧" />
                  <button
                    @click.stop="removeFrameImage('last')"
                    class="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black transition-colors text-[10px] opacity-0 group-hover:opacity-100"
                  >
                    ×
                  </button>
                </div>
              </div>

              <div
                v-if="!firstFrameImage && referenceMode === 'first_last_frame'"
                class="relative h-28 w-20 origin-bottom transform -rotate-6 transition-transform duration-300 hover:scale-105 hover:rotate-0 cursor-pointer"
                :style="{ zIndex: 100 }"
                @click="triggerFileInput('first')"
              >
                <div
                  class="absolute inset-0 rounded-xl border-2 border-dashed border-gray-300 bg-gradient-to-br from-gray-50 to-gray-100 shadow-lg transition-all hover:border-gray-600 hover:shadow-xl"
                >
                  <div class="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
                    <div class="text-xl mb-0.5">首帧</div>
                    <div class="text-[10px] font-medium">点击上传</div>
                  </div>
                </div>
              </div>

              <div
                v-if="!lastFrameImage && referenceMode === 'first_last_frame'"
                class="relative h-28 w-20 origin-bottom transform -rotate-3 -translate-x-2 transition-transform duration-300 hover:scale-105 hover:rotate-0 cursor-pointer"
                :style="{ zIndex: 99 }"
                @click="triggerFileInput('last')"
              >
                <div
                  class="absolute inset-0 rounded-xl border-2 border-dashed border-gray-300 bg-gradient-to-br from-gray-50 to-gray-100 shadow-lg transition-all hover:border-gray-600 hover:shadow-xl"
                >
                  <div class="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
                    <div class="text-xl mb-0.5">尾帧</div>
                    <div class="text-[10px] font-medium">点击上传</div>
                  </div>
                </div>
              </div>
            </template>
            <template #actions="{ onMentionClick, onFilePickClick }">
              <div class="mt-3 flex flex-col gap-3 border-t border-[#f3f4f6] pt-2 sm:flex-row sm:items-start sm:justify-between sm:gap-2">
                <div class="relative flex min-h-[44px] flex-wrap content-start items-start gap-2 transition-all duration-200">
                  <div class="flex items-center gap-2">
                    <button
                      v-show="shouldShowAtButton"
                      @click="onMentionClick"
                      class="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border-none bg-transparent text-sm font-semibold text-gray-500 transition-all hover:bg-gray-50"
                      title="@提及文件"
                    >
                      @
                    </button>
                    <button
                      v-show="shouldShowAttachmentButton"
                      @click="onFilePickClick"
                      class="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border-none bg-transparent text-base text-gray-500 transition-all hover:bg-gray-50"
                      title="添加文件"
                    >
                      📎
                    </button>
                  </div>
                </div>
              </div>
            </template>
          </FileReferenceInput>
          <div class="mt-1 text-right">
            <span class="text-xs text-gray-300">{{ prompt.length }}/500</span>
          </div>
        </div>
      </div>

      <!-- Reference Mode -->
      <div data-menu>
        <label class="mb-1.5 block text-xs font-medium uppercase tracking-wide text-gray-400">参考模式</label>
        <div class="relative" data-menu>
          <button
            @click.stop="toggleMenu('referenceMode')"
            data-menu
            class="flex h-[60px] w-full items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm transition hover:border-gray-400"
            :class="{ 'border-gray-900 bg-white ring-1 ring-gray-900': openMenu === 'referenceMode' }"
          >
            <div class="flex items-center gap-2.5">
              <span class="flex h-6 w-6 items-center justify-center rounded-md bg-gray-900 text-xs text-white font-bold">🎨</span>
              <div class="text-left">
                <div class="font-medium text-gray-900 leading-tight">{{ referenceMode === 'reference' ? '全能参考' : '首尾帧' }}</div>
              </div>
            </div>
            <svg class="h-4 w-4 text-gray-400 transition-transform" :class="{ 'rotate-180': openMenu === 'referenceMode' }" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          <div
            v-if="openMenu === 'referenceMode'"
            data-menu
            class="absolute bottom-full left-0 z-50 mb-1.5 w-full rounded-xl border border-gray-200 bg-white py-1.5 shadow-lg"
          >
            <button
              @click.stop="referenceMode = 'reference'; closeMenus()"
              data-menu
              class="flex w-full items-center gap-3 px-3.5 py-2 text-left transition-colors hover:bg-gray-50"
              :class="{ 'bg-gray-50': referenceMode === 'reference' }"
            >
              <div>
                <div class="text-sm font-medium text-gray-900">全能参考</div>
                <div class="text-xs text-gray-400">多图参考，支持最多6张参考图</div>
              </div>
            </button>
            <button
              @click.stop="referenceMode = 'first_last_frame'; closeMenus()"
              data-menu
              class="flex w-full items-center gap-3 px-3.5 py-2 text-left transition-colors hover:bg-gray-50"
              :class="{ 'bg-gray-50': referenceMode === 'first_last_frame' }"
            >
              <div>
                <div class="text-sm font-medium text-gray-900">首尾帧</div>
                <div class="text-xs text-gray-400">指定首帧和尾帧生成视频</div>
              </div>
            </button>
          </div>
        </div>
      </div>

      <!-- Aspect Ratio + Duration + Resolution in one row -->
      <div class="grid grid-cols-3 gap-3">
        <!-- Aspect Ratio -->
        <div data-menu>
          <label class="mb-1.5 block text-xs font-medium uppercase tracking-wide text-gray-400">画面比例</label>
          <div class="relative" data-menu>
            <button
              @click.stop="showAspectRatioMenu"
              data-menu
              class="flex h-[60px] w-full items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm transition hover:border-gray-400"
              :class="{ 'border-gray-900 bg-white ring-1 ring-gray-900': openMenu === 'aspectRatio' }"
            >
              <div class="flex items-center gap-2.5">
                <span class="flex h-6 w-6 items-center justify-center rounded-md bg-gray-900 text-xs text-white font-bold">📐</span>
                <div class="text-left">
                  <div class="font-medium text-gray-900 leading-tight">{{ aspectRatio }}</div>
                  <div class="text-xs text-gray-400">{{ videoAspectRatios.find(r => r.id === aspectRatio)?.description }}</div>
                </div>
              </div>
              <svg class="h-4 w-4 text-gray-400 transition-transform" :class="{ 'rotate-180': openMenu === 'aspectRatio' }" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <div
              v-if="openMenu === 'aspectRatio'"
              data-menu
              class="absolute bottom-full left-0 z-50 mb-1.5 w-full rounded-xl border border-gray-200 bg-white py-1.5 shadow-lg"
            >
              <button
                v-for="r in videoAspectRatios"
                :key="r.id"
                @click.stop="selectAspectRatio(r.id as '16:9' | '9:16')"
                data-menu
                class="flex w-full items-center gap-3 px-3.5 py-2 text-left transition-colors hover:bg-gray-50"
                :class="{ 'bg-gray-50': aspectRatio === r.id }"
              >
                <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs font-bold"
                  :class="aspectRatio === r.id ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500'">📐</span>
                <div>
                  <div class="text-sm font-medium text-gray-900">{{ r.label }}</div>
                  <div class="text-xs text-gray-400">{{ r.description }}</div>
                </div>
                <svg v-if="aspectRatio === r.id" class="ml-auto h-4 w-4 text-gray-900" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <!-- Duration -->
        <div data-menu>
          <label class="mb-1.5 block text-xs font-medium uppercase tracking-wide text-gray-400">视频时长</label>
          <div class="relative" data-menu>
            <button
              @click.stop="showDurationMenu"
              data-menu
              class="flex h-[60px] w-full items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm transition hover:border-gray-400"
              :class="{ 'border-gray-900 bg-white ring-1 ring-gray-900': openMenu === 'duration' }"
            >
              <div class="flex items-center gap-2.5">
                <span class="flex h-6 w-6 items-center justify-center rounded-md bg-gray-900 text-xs text-white font-bold">⏱️</span>
                <div class="text-left">
                  <div class="font-medium text-gray-900 leading-tight">{{ videoDurations.find(d => d.seconds === duration)?.label }}</div>
                </div>
              </div>
              <svg class="h-4 w-4 text-gray-400 transition-transform" :class="{ 'rotate-180': openMenu === 'duration' }" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <div
               v-if="openMenu === 'duration'"
               data-menu
               class="absolute bottom-full left-0 z-50 mb-1.5 w-full rounded-xl border border-gray-200 bg-white py-1.5 shadow-lg"
             >
              <button
                v-for="d in videoDurations"
                :key="d.id"
                @click.stop="selectDuration(d.seconds)"
                data-menu
                class="flex w-full items-center gap-3 px-3.5 py-2 text-left transition-colors hover:bg-gray-50"
                :class="{ 'bg-gray-50': duration === d.seconds }"
              >
                <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs font-bold"
                  :class="duration === d.seconds ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500'">⏱️</span>
                <div>
                  <div class="text-sm font-medium text-gray-900">{{ d.label }}</div>
                </div>
                <svg v-if="duration === d.seconds" class="ml-auto h-4 w-4 text-gray-900" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <!-- Resolution -->
        <div data-menu>
          <label class="mb-1.5 block text-xs font-medium uppercase tracking-wide text-gray-400">分辨率</label>
          <div class="relative" data-menu>
            <button
              @click.stop="showResolutionMenu"
              data-menu
              class="flex h-[60px] w-full items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm transition hover:border-gray-400"
              :class="{ 'border-gray-900 bg-white ring-1 ring-gray-900': openMenu === 'resolution' }"
            >
              <div class="flex items-center gap-2.5">
                <span class="flex h-6 w-6 items-center justify-center rounded-md bg-gray-900 text-xs text-white font-bold">📺</span>
                <div class="text-left">
                  <div class="font-medium text-gray-900 leading-tight">{{ resolution }}</div>
                  <div class="text-xs text-gray-400">{{ videoResolutions.find(r => r.id === resolution)?.description }}</div>
                </div>
              </div>
              <svg class="h-4 w-4 text-gray-400 transition-transform" :class="{ 'rotate-180': openMenu === 'resolution' }" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <div
               v-if="openMenu === 'resolution'"
               data-menu
               class="absolute bottom-full left-0 z-50 mb-1.5 w-full rounded-xl border border-gray-200 bg-white py-1.5 shadow-lg"
             >
              <button
                v-for="r in videoResolutions"
                :key="r.id"
                @click.stop="selectResolution(r.id as '720p' | '1080p')"
                data-menu
                class="flex w-full items-center gap-3 px-3.5 py-2 text-left transition-colors hover:bg-gray-50"
                :class="{ 'bg-gray-50': resolution === r.id }"
              >
                <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs font-bold"
                  :class="resolution === r.id ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500'">📺</span>
                <div>
                  <div class="text-sm font-medium text-gray-900">{{ r.label }}</div>
                  <div class="text-xs text-gray-400">{{ r.description }}</div>
                </div>
                <svg v-if="resolution === r.id" class="ml-auto h-4 w-4 text-gray-900" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Model -->
      <div data-menu>
        <label class="mb-1.5 block text-xs font-medium uppercase tracking-wide text-gray-400">生成模型</label>
        <div class="relative" data-menu>
          <button
            @click.stop="toggleMenu('model')"
            data-menu
            class="flex w-full items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm transition hover:border-gray-400"
            :class="{ 'border-gray-900 bg-white ring-1 ring-gray-900': openMenu === 'model' }"
          >
            <div class="flex items-center gap-2.5">
              <span class="flex h-6 w-6 items-center justify-center rounded-md bg-gray-900 text-xs text-white font-bold">AI</span>
              <div class="text-left">
                <div class="font-medium text-gray-900 leading-tight">{{ videoModels.find(m => m.id === model)?.label }}</div>
                <div class="text-xs text-gray-400">{{ videoModels.find(m => m.id === model)?.description }}</div>
              </div>
            </div>
            <svg class="h-4 w-4 text-gray-400 transition-transform" :class="{ 'rotate-180': openMenu === 'model' }" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          <div
            v-if="openMenu === 'model'"
            data-menu
            class="absolute bottom-full left-0 z-50 mb-1.5 w-full rounded-xl border border-gray-200 bg-white py-1.5 shadow-lg"
          >
            <button
              v-for="m in videoModels"
              :key="m.id"
              @click.stop="model = m.id; closeMenus()"
              data-menu
              class="flex w-full items-center gap-3 px-3.5 py-2 text-left transition-colors hover:bg-gray-50"
              :class="{ 'bg-gray-50': model === m.id }"
            >
              <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs font-bold"
                :class="model === m.id ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500'">AI</span>
              <div>
                <div class="text-sm font-medium text-gray-900">{{ m.label }}</div>
                <div class="text-xs text-gray-400">{{ m.description }}</div>
              </div>
              <svg v-if="model === m.id" class="ml-auto h-4 w-4 text-gray-900" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>



      <!-- Reference Mode -->
      <div data-menu>
        <label class="mb-1.5 block text-xs font-medium uppercase tracking-wide text-gray-400">参考模式</label>
        <div class="relative" data-menu>
          <button
            @click.stop="toggleMenu('referenceMode')"
            data-menu
            class="flex w-full items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm transition hover:border-gray-400"
            :class="{ 'border-gray-900 bg-white ring-1 ring-gray-900': openMenu === 'referenceMode' }"
          >
            <div class="flex items-center gap-2.5">
              <span class="flex h-6 w-6 items-center justify-center rounded-md bg-gray-900 text-xs text-white font-bold">🎨</span>
              <div class="text-left">
                <div class="font-medium text-gray-900 leading-tight">
                  {{ referenceMode === 'reference' ? '全能参考' : '首尾帧' }}
                </div>
                <div class="text-xs text-gray-400">
                  {{ referenceMode === 'reference' ? '多图参考，支持最多7张' : '指定首帧和尾帧' }}
                </div>
              </div>
            </div>
            <svg class="h-4 w-4 text-gray-400 transition-transform" :class="{ 'rotate-180': openMenu === 'referenceMode' }" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          <div
            v-if="openMenu === 'referenceMode'"
            data-menu
            class="absolute bottom-full left-0 z-50 mb-1.5 w-full rounded-xl border border-gray-200 bg-white py-1.5 shadow-lg"
          >
            <button
              @click.stop="referenceMode = 'reference'; closeMenus()"
              data-menu
              class="flex w-full items-center gap-3 px-3.5 py-2 text-left transition-colors hover:bg-gray-50"
              :class="{ 'bg-gray-50': referenceMode === 'reference' }"
            >
              <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs font-bold"
                :class="referenceMode === 'reference' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500'">🎨</span>
              <div>
                <div class="text-sm font-medium text-gray-900">全能参考</div>
                <div class="text-xs text-gray-400">多图参考，支持最多7张参考图</div>
              </div>
              <svg v-if="referenceMode === 'reference'" class="ml-auto h-4 w-4 text-gray-900" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </button>
            <button
              @click.stop="referenceMode = 'first_last_frame'; closeMenus()"
              data-menu
              class="flex w-full items-center gap-3 px-3.5 py-2 text-left transition-colors hover:bg-gray-50"
              :class="{ 'bg-gray-50': referenceMode === 'first_last_frame' }"
            >
              <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs font-bold"
                :class="referenceMode === 'first_last_frame' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500'">🎨</span>
              <div>
                <div class="text-sm font-medium text-gray-900">首尾帧</div>
                <div class="text-xs text-gray-400">指定首帧和尾帧生成视频</div>
              </div>
              <svg v-if="referenceMode === 'first_last_frame'" class="ml-auto h-4 w-4 text-gray-900" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>

    </div>

    <!-- Footer -->
    <div class="border-t border-gray-100 px-4 py-4">
      <!-- Credits -->
      <div class="mb-3 flex items-center justify-between rounded-lg bg-gray-50 px-3.5 py-2.5">
        <span class="text-xs text-gray-500">预计消耗积分</span>
        <div class="flex items-center gap-1">
          <span class="text-base">💎</span>
          <span class="text-sm font-semibold text-gray-900">{{ creditsNeeded }}</span>
        </div>
      </div>

      <button
        @click="handleSubmit"
        :disabled="!canSubmit"
        class="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-medium transition-colors"
        :class="canSubmit
          ? 'bg-gray-900 text-white hover:bg-black'
          : 'cursor-not-allowed bg-gray-100 text-gray-400'"
      >
        <svg v-if="!isLoading" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 010 1.972l-11.54 6.347a1.125 1.125 0 01-1.667-.986V5.653z" />
        </svg>
        <svg v-else class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
        </svg>
        {{ isLoading ? '提交中...' : '开始生成' }}
      </button>
    </div>

  </div>
</template>
