<script setup lang="ts">
import { ref, nextTick, computed, watch } from 'vue';
import {
  DropdownMenuRoot,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
} from 'reka-ui';
import { useToast } from '@/composables/useToast';
import type { FilePreview, ProjectFileReference } from '@/types/fileReference';
import {
  MAX_FILES,
  MAX_VIDEO_TOTAL_DURATION,
  MAX_VIDEO_COUNT,
  MIN_VIDEO_DURATION,
  MAX_VIDEO_DURATION,
  MAX_FILE_SIZE,
  checkVideoDuration,
  getFileType,
  getFileIcon,
  generateFileName,
} from '@/types/fileReference';

interface Props {
  modelValue: string;
  placeholder?: string;
  disabled?: boolean;
  allowFilePick?: boolean;
  projectFiles?: ProjectFileReference[];
  textareaClass?: string;
  showModeSelector?: boolean;
  enableFirstLastFrame?: boolean;
  firstLastFrameMode?: 'reference' | 'first_last_frame';
  accept?: string;
  addButtonText?: string;
  addButtonSubtext?: string;
}

interface Slots {
  'before-files': () => any;
}

interface Emits {
  (e: 'update:modelValue', value: string): void;
  (e: 'files-change', files: FilePreview[]): void;
  (e: 'video-total-duration', duration: number): void;
}

const { toast } = useToast();

const props = withDefaults(defineProps<Props>(), {
  placeholder: '请输入你的设计需求...',
  disabled: false,
  allowFilePick: false,
  projectFiles: () => [],
  textareaClass: '',
  showModeSelector: false,
  enableFirstLastFrame: false,
  firstLastFrameMode: 'reference',
  accept: 'image/*,video/*,audio/*',
  addButtonText: '添加参考',
  addButtonSubtext: '图片/视频/音频',
});

interface Emits {
  (e: 'update:modelValue', value: string): void;
  (e: 'files-change', files: FilePreview[]): void;
  (e: 'video-total-duration', duration: number): void;
  (e: 'first-frame-change', file: FilePreview | null): void;
  (e: 'last-frame-change', file: FilePreview | null): void;
}

const emit = defineEmits<Emits>();

const textareaRef = ref<HTMLTextAreaElement>();
const fileInputRef = ref<HTMLInputElement>();
const firstFrameInputRef = ref<HTMLInputElement>();
const lastFrameInputRef = ref<HTMLInputElement>();
const dropdownOpen = ref(false);
const cursorPosition = ref({ top: 0, left: 0 });
const selectedFiles = ref<FilePreview[]>([]);
const firstFrameImage = ref<FilePreview | null>(null);
const lastFrameImage = ref<FilePreview | null>(null);

const reindexFiles = () => {
  let totalVideoDuration = 0;

  selectedFiles.value.forEach(file => {
    if (file.duration) {
      totalVideoDuration += file.duration;
    }
  });
  
  // Emit total duration back to parent
  emit('video-total-duration', totalVideoDuration);
};

const removeFile = (fileId: string) => {
  const index = selectedFiles.value.findIndex(f => f.id === fileId);
  if (index !== -1) {
    URL.revokeObjectURL(selectedFiles.value[index].url);
    selectedFiles.value.splice(index, 1);
    reindexFiles();
    emit('files-change', selectedFiles.value);
  }
  if (firstFrameImage.value?.id === fileId) {
    firstFrameImage.value = null;
    emit('first-frame-change', null);
  }
  if (lastFrameImage.value?.id === fileId) {
    lastFrameImage.value = null;
    emit('last-frame-change', null);
  }
};

const triggerFrameFileInput = (position: 'first' | 'last') => {
  if (position === 'first' && firstFrameInputRef.value) {
    firstFrameInputRef.value.click();
  } else if (position === 'last' && lastFrameInputRef.value) {
    lastFrameInputRef.value.click();
  }
};

const handleFrameImageChange = (position: 'first' | 'last', event: Event) => {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file || !file.type.startsWith('image/')) return;

  const imageCount = selectedFiles.value.filter(f => f.type === 'image').length +
    (firstFrameImage.value ? 1 : 0) + (lastFrameImage.value ? 1 : 0);
  const renamedName = generateFileName(file.name, 'image', imageCount);

  const filePreview: FilePreview = {
    id: `${position}_frame_${Date.now()}`,
    name: renamedName,
    type: 'image',
    url: URL.createObjectURL(file),
    file: file,
  };

  if (position === 'first') {
    if (firstFrameImage.value) {
      URL.revokeObjectURL(firstFrameImage.value.url);
      const existingIndex = selectedFiles.value.findIndex(f => f.id === firstFrameImage.value!.id);
      if (existingIndex !== -1) {
        selectedFiles.value.splice(existingIndex, 1);
      }
    }
    firstFrameImage.value = filePreview;
    emit('first-frame-change', filePreview);
  } else {
    if (lastFrameImage.value) {
      URL.revokeObjectURL(lastFrameImage.value.url);
      const existingIndex = selectedFiles.value.findIndex(f => f.id === lastFrameImage.value!.id);
      if (existingIndex !== -1) {
        selectedFiles.value.splice(existingIndex, 1);
      }
    }
    lastFrameImage.value = filePreview;
    emit('last-frame-change', filePreview);
  }

  if (props.firstLastFrameMode !== 'first_last_frame' && filePreview && !selectedFiles.value.find(f => f.id === filePreview.id)) {
    selectedFiles.value.push(filePreview);
    emit('files-change', selectedFiles.value);
  }

  input.value = '';
};

const removeFrameImage = (position: 'first' | 'last') => {
  const filePreview = position === 'first' ? firstFrameImage.value : lastFrameImage.value;
  if (filePreview) {
    if (props.firstLastFrameMode === 'first_last_frame') {
      URL.revokeObjectURL(filePreview.url);
      const existingIndex = selectedFiles.value.findIndex(f => f.id === filePreview.id);
      if (existingIndex !== -1) {
        selectedFiles.value.splice(existingIndex, 1);
        emit('files-change', selectedFiles.value);
      }
      if (position === 'first') {
        firstFrameImage.value = null;
        emit('first-frame-change', null);
      } else {
        lastFrameImage.value = null;
        emit('last-frame-change', null);
      }
    } else {
      removeFile(filePreview.id);
    }
  }
};


const inputValue = computed({
  get: () => props.modelValue,
  set: (value: string) => emit('update:modelValue', value),
});

const triggerStyle = computed(() => ({
  top: `${cursorPosition.value.top}px`,
  left: `${cursorPosition.value.left}px`,
}));

const getCursorCoordinates = (textarea: HTMLTextAreaElement, position: number) => {
  const div = document.createElement('div');
  const style = window.getComputedStyle(textarea);

  const properties = [
    'fontFamily',
    'fontSize',
    'fontWeight',
    'lineHeight',
    'letterSpacing',
    'paddingTop',
    'paddingRight',
    'paddingBottom',
    'paddingLeft',
    'borderTopWidth',
    'borderRightWidth',
    'borderBottomWidth',
    'borderLeftWidth',
    'boxSizing',
    'whiteSpace',
    'wordBreak',
    'overflowWrap',
  ];

  properties.forEach(prop => {
    div.style[prop as any] = style[prop as any];
  });

  div.style.position = 'absolute';
  div.style.visibility = 'hidden';
  div.style.top = '0';
  div.style.left = '0';
  div.style.width = `${textarea.clientWidth}px`;
  div.style.height = 'auto';
  div.style.overflow = 'auto';
  div.style.whiteSpace = 'pre-wrap';

  document.body.appendChild(div);

  const textBeforeCursor = textarea.value.substring(0, position);
  const textNode = document.createTextNode(textBeforeCursor);
  div.appendChild(textNode);

  const span = document.createElement('span');
  span.textContent = '\u200B';
  div.appendChild(span);

  const spanRect = span.getBoundingClientRect();
  const divRect = div.getBoundingClientRect();

  let top = spanRect.top - divRect.top;
  let left = spanRect.left - divRect.left;

  top -= textarea.scrollTop;
  left -= textarea.scrollLeft;

  document.body.removeChild(div);

  return { top, left };
};

const handleInput = (e: Event) => {
  const target = e.target as HTMLTextAreaElement;
  const value = target.value;
  const position = target.selectionStart || 0;

  if (value[position - 1] === '@') {
    const coords = getCursorCoordinates(target, position);
    cursorPosition.value = coords;

    nextTick(() => {
      dropdownOpen.value = true;
    });
  }
};

const insertMention = (name: string) => {
  if (!textareaRef.value) return;

  const position = textareaRef.value.selectionStart || 0;
  const textBeforeCursor = inputValue.value.substring(0, position);
  const lastAtIndex = textBeforeCursor.lastIndexOf('@');

  if (lastAtIndex !== -1) {
    const beforeAt = inputValue.value.substring(0, lastAtIndex);
    const afterCursor = inputValue.value.substring(position);
    inputValue.value = beforeAt + name + ' ' + afterCursor;

    nextTick(() => {
      if (textareaRef.value) {
        const newPosition = beforeAt.length + name.length + 1;
        textareaRef.value.selectionStart = newPosition;
        textareaRef.value.selectionEnd = newPosition;
        textareaRef.value.focus();
      }
    });
  } else {
    const beforeCursor = inputValue.value.substring(0, position);
    const afterCursor = inputValue.value.substring(position);
    inputValue.value = beforeCursor + name + ' ' + afterCursor;

    nextTick(() => {
      if (textareaRef.value) {
        const newPosition = beforeCursor.length + name.length + 1;
        textareaRef.value.selectionStart = newPosition;
        textareaRef.value.selectionEnd = newPosition;
        textareaRef.value.focus();
      }
    });
  }

  dropdownOpen.value = false;

  setTimeout(() => {
    textareaRef.value?.focus();
  }, 50);
};

const handleMentionButtonClick = () => {
  if (!textareaRef.value) return;

  const hasAtFiles = (props.projectFiles && props.projectFiles.length > 0) || selectedFiles.value.length > 0;

  if (!hasAtFiles) return;

  const position = textareaRef.value.selectionStart || 0;
  const coords = getCursorCoordinates(textareaRef.value, position);
  cursorPosition.value = coords;

  nextTick(() => {
    dropdownOpen.value = true;
  });

  textareaRef.value.focus();
};

const handleFilePickClick = () => {
  fileInputRef.value?.click();
};

const handleFileChange = async (e: Event) => {
  const target = e.target as HTMLInputElement;
  const files = target.files;

  if (!files || files.length === 0) return;

  const remainingSlots = MAX_FILES - selectedFiles.value.length;

  if (remainingSlots <= 0) {
    toast.warning(`最多只能上传 ${MAX_FILES} 个文件`);
    if (target) {
      target.value = '';
    }
    return;
  }

  const filesToAdd: FilePreview[] = [];
  let duplicateCount = 0;
  let exceededCount = 0;
  let invalidDurationCount = 0;
  let invalidSizeCount = 0;
  let exceededVideoCount = 0;
  let currentVideoCount = selectedFiles.value.filter(f => f.type === 'video').length;
  let totalVideoDuration = selectedFiles.value
    .filter(f => f.type === 'video')
    .reduce((sum, file) => sum + (file.duration || 0), 0);

  const imageCount = selectedFiles.value.filter(f => f.type === 'image').length;
  const videoCount = selectedFiles.value.filter(f => f.type === 'video').length;
  const audioCount = selectedFiles.value.filter(f => f.type === 'audio').length;

  for (const file of Array.from(files)) {
    if (selectedFiles.value.length + filesToAdd.length >= MAX_FILES) {
      exceededCount++;
      continue;
    }

    const isDuplicate = selectedFiles.value.some(
      existingFile => existingFile.name === file.name && existingFile.file.size === file.size,
    );

    if (isDuplicate) {
      duplicateCount++;
      continue;
    }

    const fileType = getFileType(file);

    if (fileType === 'video') {
      if (currentVideoCount + filesToAdd.filter(f => f.type === 'video').length >= MAX_VIDEO_COUNT) {
        toast.error(`最多支持 ${MAX_VIDEO_COUNT} 段视频`);
        exceededVideoCount++;
        continue;
      }

      if (file.size > MAX_FILE_SIZE) {
        const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
        toast.error(`视频文件 ${sizeMB}MB 超过限制，单个视频不能超过 200MB`);
        invalidSizeCount++;
        continue;
      }

      const duration = await checkVideoDuration(file);
      if (duration < MIN_VIDEO_DURATION || duration > MAX_VIDEO_DURATION) {
        console.log(duration, MAX_VIDEO_DURATION);
        toast.error(`视频时长 ${duration} 秒不符合要求，单个视频需要 ${MIN_VIDEO_DURATION}～${MAX_VIDEO_DURATION} 秒`);
        invalidDurationCount++;
        continue;
      }

      if (totalVideoDuration + duration > MAX_VIDEO_TOTAL_DURATION) {
        toast.error(`添加此视频后总时长 ${(totalVideoDuration + duration).toFixed(1)} 秒超过限制，总时长不能超过 ${MAX_VIDEO_TOTAL_DURATION} 秒`);
        invalidDurationCount++;
        continue;
      }

      currentVideoCount++;
      totalVideoDuration += duration;

      const renamedName = generateFileName(file.name, fileType, videoCount + filesToAdd.filter(f => f.type === 'video').length);

      const filePreview: FilePreview = {
        id: `file-${Date.now()}-${Math.random()}`,
        name: renamedName,
        type: fileType,
        url: URL.createObjectURL(file),
        file,
        duration,
      };

      filesToAdd.push(filePreview);
    } else if (fileType === 'audio') {
      if (file.size > MAX_FILE_SIZE) {
        const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
        toast.error(`音频文件 ${sizeMB}MB 超过限制，单个文件不能超过 200MB`);
        invalidSizeCount++;
        continue;
      }

      const duration = await checkVideoDuration(file);
      if (totalVideoDuration + duration > MAX_VIDEO_TOTAL_DURATION) {
        toast.error(`添加此音频后总时长 ${(totalVideoDuration + duration).toFixed(1)} 秒超过限制，总时长不能超过 ${MAX_VIDEO_TOTAL_DURATION} 秒`);
        invalidDurationCount++;
        continue;
      }

      totalVideoDuration += duration;

      const renamedName = generateFileName(file.name, fileType, audioCount + filesToAdd.filter(f => f.type === 'audio').length);

      const filePreview: FilePreview = {
        id: `file-${Date.now()}-${Math.random()}`,
        name: renamedName,
        type: fileType,
        url: URL.createObjectURL(file),
        file,
        duration,
      };

      filesToAdd.push(filePreview);
    } else {
      if (file.size > MAX_FILE_SIZE) {
        const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
        toast.error(`文件 ${sizeMB}MB 超过限制，单个文件不能超过 200MB`);
        invalidSizeCount++;
        continue;
      }

      let renamedName = file.name;
      if (fileType === 'image') {
        renamedName = generateFileName(file.name, fileType, imageCount + filesToAdd.filter(f => f.type === 'image').length);
      }

      const filePreview: FilePreview = {
        id: `file-${Date.now()}-${Math.random()}`,
        name: renamedName,
        type: fileType,
        url: URL.createObjectURL(file),
        file,
      };

      filesToAdd.push(filePreview);
    }
  }

  selectedFiles.value.push(...filesToAdd);
  emit('files-change', selectedFiles.value);

  // Show feedback messages
  if (duplicateCount > 0) {
    toast.warning(`已过滤 ${duplicateCount} 个重复文件`);
  }
  if (exceededCount > 0) {
    toast.warning(`已达到最大文件数量限制（${MAX_FILES}个），已忽略 ${exceededCount} 个文件`);
  }

  // Reset input
  if (target) {
    target.value = '';
  }

  reindexFiles();
};

const visibleFiles = computed(() => {
  if (props.enableFirstLastFrame && props.firstLastFrameMode === 'first_last_frame') {
    return selectedFiles.value.filter(file => 
      file.id === firstFrameImage.value?.id || file.id === lastFrameImage.value?.id
    );
  }
  return selectedFiles.value;
});

watch(() => props.firstLastFrameMode, (newMode) => {
  if (newMode === 'first_last_frame') {
    const toRemove: string[] = [];
    selectedFiles.value.forEach(file => {
      if (file.id !== firstFrameImage.value?.id && file.id !== lastFrameImage.value?.id) {
        toRemove.push(file.id);
        URL.revokeObjectURL(file.url);
      }
    });
    toRemove.forEach(id => {
      const index = selectedFiles.value.findIndex(f => f.id === id);
      if (index !== -1) {
        selectedFiles.value.splice(index, 1);
      }
    });
    if (toRemove.length > 0) {
      emit('files-change', selectedFiles.value);
      reindexFiles();
    }
  }
});

defineExpose({
  selectedFiles,
  firstFrameImage,
  lastFrameImage,
  focus: () => textareaRef.value?.focus(),
  handleFilePickClick,
});
</script>

<template>
  <div class="relative">
    <!-- Mode selector slot at the top -->
    <div v-if="showModeSelector" class="mb-4 pb-4 border-b border-[#f3f4f6]">
      <slot name="mode-selector" />
    </div>

    <textarea
      ref="textareaRef"
      v-model="inputValue"
      @input="handleInput"
      :placeholder="placeholder"
      :disabled="disabled"
      :class="[
        textareaClass ||
          'min-h-[100px] w-full resize-none border-0 p-0 text-base leading-[1.6] text-[#111827] outline-0 focus-visible:ring-0',
        { 'cursor-not-allowed opacity-50': disabled },
      ]"
    />

    <!-- File previews (only when allowFilePick is true) - always card mode -->
    <div v-if="allowFilePick && selectedFiles.length >= 0" class="mt-3 group relative min-h-[80px] px-2 py-2">
      <div class="flex items-center justify-start">
        <!-- Built-in first/last frame UI when enabled -->
        <template v-if="enableFirstLastFrame">
          <input
            ref="firstFrameInputRef"
            type="file"
            accept="image/*"
            class="hidden"
            @change="handleFrameImageChange('first', $event)"
          />
          <input
            ref="lastFrameInputRef"
            type="file"
            accept="image/*"
            class="hidden"
            @change="handleFrameImageChange('last', $event)"
          />

          <div class="flex items-center gap-3">
            <div
              v-if="firstFrameImage"
              class="relative h-20 w-16 transform transition-transform duration-300 ease-out hover:scale-105"
            >
              <div
                 class="absolute inset-0 rounded-xl border-2 border-white bg-gradient-to-br from-blue-50 to-indigo-100 shadow-lg overflow-hidden transition-all duration-300 group-hover:shadow-xl hover:shadow-2xl"
               >
                 <div class="absolute top-1 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[8px] font-medium z-10 flex items-center gap-0.5">
                   <span>▶️</span>
                   <span>首帧</span>
                 </div>
                 <img :src="firstFrameImage.url" class="w-full h-full object-cover pt-3" alt="首帧" />
                 <button
                   @click.stop="removeFrameImage('first')"
                   class="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black transition-colors text-[10px] opacity-0 group-hover:opacity-100"
                 >
                   ×
                 </button>
               </div>
            </div>

            <div
               v-if="!firstFrameImage && firstLastFrameMode === 'first_last_frame'"
               class="relative h-20 w-16 transform transition-transform duration-300 hover:scale-105 cursor-pointer"
               @click="triggerFrameFileInput('first')"
            >
              <div
                class="absolute inset-0 rounded-xl border-2 border-dashed border-gray-300 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-lg transition-all hover:border-blue-500 hover:shadow-xl"
              >
                <div class="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
                  <div class="text-xl mb-0.5">▶️</div>
                  <div class="text-[10px] font-medium">首帧</div>
                  <div class="text-[8px] mt-0.5">点击上传</div>
                </div>
              </div>
            </div>

            <div
              v-if="(firstLastFrameMode === 'first_last_frame') || (firstFrameImage && lastFrameImage)"
              class="flex items-center justify-center text-gray-400"
            >
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M5 12h14"></path>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            </div>

            <div
              v-if="lastFrameImage"
              class="relative h-20 w-16 transform transition-transform duration-300 ease-out hover:scale-105"
            >
              <div
                 class="absolute inset-0 rounded-xl border-2 border-white bg-gradient-to-br from-purple-50 to-pink-100 shadow-lg overflow-hidden transition-all duration-300 group-hover:shadow-xl hover:shadow-2xl"
               >
                 <div class="absolute top-1 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 text-white text-[8px] font-medium z-10 flex items-center gap-0.5">
                   <span>⏹️</span>
                   <span>尾帧</span>
                 </div>
                 <img :src="lastFrameImage.url" class="w-full h-full object-cover pt-3" alt="尾帧" />
                 <button
                   @click.stop="removeFrameImage('last')"
                   class="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black transition-colors text-[10px] opacity-0 group-hover:opacity-100"
                 >
                   ×
                 </button>
               </div>
            </div>

            <div
               v-if="!lastFrameImage && firstLastFrameMode === 'first_last_frame'"
               class="relative h-20 w-16 transform transition-transform duration-300 hover:scale-105 cursor-pointer"
               @click="triggerFrameFileInput('last')"
            >
              <div
                class="absolute inset-0 rounded-xl border-2 border-dashed border-gray-300 bg-gradient-to-br from-purple-50 to-pink-50 shadow-lg transition-all hover:border-purple-500 hover:shadow-xl"
              >
                <div class="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
                  <div class="text-xl mb-0.5">⏹️</div>
                  <div class="text-[10px] font-medium">尾帧</div>
                  <div class="text-[8px] mt-0.5">点击上传</div>
                </div>
              </div>
            </div>
          </div>
        </template>
        <slot name="before-files" />
        <!-- Existing files as stacked cards -->
        <div
          v-for="(file, index) in visibleFiles"
          :key="file.id"
          class="relative h-20 w-16 origin-bottom transform group-hover:translate-x-0 group-hover:rotate-0 hover:scale-105 transition-transform duration-300 ease-out"
          :class="[
            index === 0 ? '-rotate-6 -translate-x-0' :
            index === 1 ? '-rotate-3 -translate-x-2' :
            index === 2 ? 'rotate-0 -translate-x-4' :
            index === 3 ? 'rotate-3 -translate-x-6' :
            index === 4 ? 'rotate-6 -translate-x-8' :
            'rotate-6 -translate-x-10'
          ]"
          :style="{
            zIndex: visibleFiles.length - index
          }"
          @mouseenter="($event) => { const target = $event.currentTarget as HTMLElement | null; if (target) target.style.zIndex = '1000'; }"
          @mouseleave="($event) => { const target = $event.currentTarget as HTMLElement | null; if (target) target.style.zIndex = (visibleFiles.length - index).toString(); }"
        >
          <div
            class="absolute inset-0 rounded-xl border-2 border-white bg-gradient-to-br from-gray-50 to-gray-100 shadow-lg overflow-hidden transition-all duration-300 group-hover:shadow-xl hover:shadow-2xl"
          >
            <img
              v-if="file.type === 'image'"
              :src="file.url"
              class="w-full h-full object-cover"
              :alt="file.name"
            />
            <div v-else class="absolute inset-0 flex flex-col items-center justify-center bg-gray-100">
              <div class="text-2xl mb-1">{{ getFileIcon(file.type) }}</div>
              <div class="text-[8px] text-gray-500 text-center px-1 truncate w-full">{{ file.name }}</div>
            </div>
            <button
              @click.stop="removeFile(file.id)"
              class="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black transition-colors text-[10px] opacity-0 group-hover:opacity-100"
            >
              ×
            </button>
          </div>
        </div>

        <!-- Add card (only show when there's space and not in first_last_frame mode) -->
        <div
          v-if="selectedFiles.length < MAX_FILES && !(enableFirstLastFrame && firstLastFrameMode === 'first_last_frame')"
          class="relative h-20 w-16 origin-bottom transform -rotate-3 transition-transform duration-300 hover:scale-105 hover:rotate-0 cursor-pointer"
          :class="[selectedFiles.length > 0 ? '-translate-x-' + (selectedFiles.length * 2) : '']"
          :style="{ zIndex: selectedFiles.length + 1 }"
          @click="handleFilePickClick"
        >
          <div
            class="absolute inset-0 rounded-xl border-2 border-dashed border-gray-300 bg-gradient-to-br from-gray-50 to-gray-100 shadow-lg transition-all hover:border-gray-600 hover:shadow-xl"
          >
            <div class="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
              <div class="text-xl mb-0.5">➕</div>
              <div class="text-[10px] font-medium">{{ addButtonText }}</div>
              <div class="text-[8px] mt-0.5">{{ addButtonSubtext }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Invisible positioned container for dropdown trigger at cursor -->
    <div
      v-if="(projectFiles && projectFiles.length > 0) || (allowFilePick && (selectedFiles.length > 0 || (enableFirstLastFrame && (firstFrameImage || lastFrameImage))))"
      class="pointer-events-none absolute top-0 left-0 h-full w-full overflow-hidden"
    >
      <DropdownMenuRoot v-model:open="dropdownOpen">
        <DropdownMenuTrigger as-child>
          <div :style="triggerStyle" class="pointer-events-auto absolute h-5 w-0.5 opacity-0" />
        </DropdownMenuTrigger>

        <DropdownMenuPortal>
          <DropdownMenuContent
            class="z-[9999] max-h-[400px] max-w-[300px] min-w-[150px] overflow-y-auto rounded-lg border border-gray-200 bg-white p-1 shadow-lg outline-none"
            :side="'right'"
            :align="'start'"
            :side-offset="5"
            :align-offset="0"
            :collision-padding="10"
          >
            <!-- Project Files (for ChatBox.vue) -->
            <template v-if="projectFiles && projectFiles.length > 0">
              <DropdownMenuItem
                v-for="file in projectFiles"
                :key="file.id"
                @select="insertMention(file.file_name)"
                class="cursor-pointer rounded-md px-3 py-2 text-sm text-gray-700 outline-none select-none data-[highlighted]:bg-blue-500 data-[highlighted]:text-white"
              >
                <div class="flex items-center gap-2">
                  <img
                    v-if="file.file_type === 'image' && file.file_url"
                    :src="`${file.file_url}?x-tos-process=image/resize,w_100`"
                    :alt="file.file_name"
                    class="h-6 w-6 flex-shrink-0 rounded object-cover"
                  />
                  <div
                    v-else
                    class="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded bg-gray-100 text-sm"
                  >
                    {{ getFileIcon(file.file_type) }}
                  </div>
                  <div class="truncate" :title="file.file_name">
                    {{ file.file_name }}
                  </div>
                </div>
              </DropdownMenuItem>
            </template>

            <!-- Local Files (for Home.vue with allowFilePick) -->
            <template v-else-if="allowFilePick">
              <!-- First frame image -->
              <DropdownMenuItem
                v-if="firstFrameImage"
                :key="firstFrameImage.id"
                @select="insertMention(firstFrameImage.name)"
                class="cursor-pointer rounded-md px-3 py-2 text-sm text-gray-700 outline-none select-none data-[highlighted]:bg-blue-500 data-[highlighted]:text-white"
              >
                <div class="flex items-center gap-2">
                  <img
                    v-if="firstFrameImage.type === 'image'"
                    :src="firstFrameImage.url"
                    :alt="firstFrameImage.name"
                    class="h-6 w-6 flex-shrink-0 rounded object-cover"
                  />
                  <div
                    v-else
                    class="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded bg-gray-100 text-sm"
                  >
                    {{ getFileIcon(firstFrameImage.type) }}
                  </div>
                  <div class="truncate" :title="firstFrameImage.name">
                    {{ firstFrameImage.name }}
                  </div>
                </div>
              </DropdownMenuItem>
              <!-- Last frame image -->
              <DropdownMenuItem
                v-if="lastFrameImage"
                :key="lastFrameImage.id"
                @select="insertMention(lastFrameImage.name)"
                class="cursor-pointer rounded-md px-3 py-2 text-sm text-gray-700 outline-none select-none data-[highlighted]:bg-blue-500 data-[highlighted]:text-white"
              >
                <div class="flex items-center gap-2">
                  <img
                    v-if="lastFrameImage.type === 'image'"
                    :src="lastFrameImage.url"
                    :alt="lastFrameImage.name"
                    class="h-6 w-6 flex-shrink-0 rounded object-cover"
                  />
                  <div
                    v-else
                    class="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded bg-gray-100 text-sm"
                  >
                    {{ getFileIcon(lastFrameImage.type) }}
                  </div>
                  <div class="truncate" :title="lastFrameImage.name">
                    {{ lastFrameImage.name }}
                  </div>
                </div>
              </DropdownMenuItem>
              <!-- Regular selected files - only show when not in first_last_frame mode -->
              <DropdownMenuItem
                v-for="file in visibleFiles"
                :key="file.id"
                @select="insertMention(file.name)"
                class="cursor-pointer rounded-md px-3 py-2 text-sm text-gray-700 outline-none select-none data-[highlighted]:bg-blue-500 data-[highlighted]:text-white"
              >
                <div class="flex items-center gap-2">
                  <img
                    v-if="file.type === 'image'"
                    :src="file.url"
                    :alt="file.name"
                    class="h-6 w-6 flex-shrink-0 rounded object-cover"
                  />
                  <div
                    v-else
                    class="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded bg-gray-100 text-sm"
                  >
                    {{ getFileIcon(file.type) }}
                  </div>
                  <div class="truncate" :title="file.name">
                    {{ file.name }}
                  </div>
                </div>
              </DropdownMenuItem>
            </template>
          </DropdownMenuContent>
        </DropdownMenuPortal>
      </DropdownMenuRoot>
    </div>

    <!-- Hidden file input -->
    <input
      ref="fileInputRef"
      type="file"
      @change="handleFileChange"
      class="hidden"
      :accept="accept"
      multiple
    />

    <!-- Action buttons slot -->
    <slot
      name="actions"
      :on-mention-click="handleMentionButtonClick"
      :on-file-pick-click="handleFilePickClick"
      :textarea-ref="textareaRef"
    />
  </div>
</template>
