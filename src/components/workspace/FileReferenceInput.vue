<script setup lang="ts">
import { ref, nextTick, computed } from 'vue';
import {
  DropdownMenuRoot,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
} from 'reka-ui';

interface FilePreview {
  id: string;
  name: string;
  type: string;
  url: string;
  file: File;
}

interface ProjectFile {
  id: string;
  file_name: string;
  file_type?: string;
  file_url?: string;
}

interface Props {
  modelValue: string;
  placeholder?: string;
  disabled?: boolean;
  // For Home.vue: allow file picking and show local file previews
  allowFilePick?: boolean;
  // For ChatBox.vue: show existing project files in dropdown
  projectFiles?: ProjectFile[];
  // Custom textarea class
  textareaClass?: string;
}

interface Emits {
  (e: 'update:modelValue', value: string): void;
  (e: 'files-change', files: FilePreview[]): void;
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: '请输入你的设计需求...',
  disabled: false,
  allowFilePick: false,
  projectFiles: () => [],
  textareaClass: '',
});

const emit = defineEmits<Emits>();

const textareaRef = ref<HTMLTextAreaElement>();
const fileInputRef = ref<HTMLInputElement>();
const dropdownOpen = ref(false);
const cursorPosition = ref({ top: 0, left: 0 });
const selectedFiles = ref<FilePreview[]>([]);

const inputValue = computed({
  get: () => props.modelValue,
  set: (value: string) => emit('update:modelValue', value),
});

// Available models
const models = [
  { id: 'zerocut3.0', name: 'zerocut3.0' },
  { id: 'pro', name: 'pro' },
  { id: 'vidu', name: 'vidu' },
  { id: 'kling', name: 'kling' },
  { id: 'hailuo', name: 'hailuo' },
  { id: 'sora', name: 'sora' },
];

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

const handleFileChange = (e: Event) => {
  const target = e.target as HTMLInputElement;
  const files = target.files;

  if (!files || files.length === 0) return;

  Array.from(files).forEach(file => {
    const fileType = file.type.startsWith('image/')
      ? 'image'
      : file.type.startsWith('video/')
        ? 'video'
        : file.type.startsWith('audio/')
          ? 'audio'
          : 'document';

    const filePreview: FilePreview = {
      id: `file-${Date.now()}-${Math.random()}`,
      name: file.name,
      type: fileType,
      url: URL.createObjectURL(file),
      file,
    };

    selectedFiles.value.push(filePreview);
  });

  emit('files-change', selectedFiles.value);

  // Reset input
  if (target) {
    target.value = '';
  }
};

const removeFile = (fileId: string) => {
  const index = selectedFiles.value.findIndex(f => f.id === fileId);
  if (index !== -1) {
    // Revoke object URL to free memory
    URL.revokeObjectURL(selectedFiles.value[index].url);
    selectedFiles.value.splice(index, 1);
    emit('files-change', selectedFiles.value);
  }
};

const getFileIcon = (fileType?: string) => {
  if (!fileType) return '📁';
  const icons: Record<string, string> = {
    image: '🖼️',
    video: '🎬',
    audio: '🎵',
    document: '📄',
  };
  return icons[fileType] || '📁';
};

defineExpose({
  selectedFiles,
  focus: () => textareaRef.value?.focus(),
});
</script>

<template>
  <div class="relative">
    <textarea
      ref="textareaRef"
      v-model="inputValue"
      @input="handleInput"
      :placeholder="placeholder"
      :disabled="disabled"
      :class="textareaClass || 'min-h-[100px] w-full resize-none border-0 p-0 text-base leading-[1.6] text-[#111827] outline-0 focus-visible:ring-0'"
    />

    <!-- File previews (only for Home.vue with allowFilePick) -->
    <div v-if="allowFilePick && selectedFiles.length > 0" class="mt-3 flex flex-wrap gap-2">
      <div
        v-for="file in selectedFiles"
        :key="file.id"
        class="group relative flex items-center gap-2 rounded-lg border border-[#e5e7eb] bg-white p-2 pr-8"
      >
        <img
          v-if="file.type === 'image'"
          :src="file.url"
          :alt="file.name"
          class="h-10 w-10 rounded object-cover"
        />
        <div v-else class="flex h-10 w-10 items-center justify-center rounded bg-gray-100 text-lg">
          {{ getFileIcon(file.type) }}
        </div>
        <div class="max-w-[150px] truncate text-sm text-gray-700" :title="file.name">
          {{ file.name }}
        </div>
        <button
          @click="removeFile(file.id)"
          class="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white opacity-0 transition-opacity hover:bg-red-600 group-hover:opacity-100"
        >
          ✕
        </button>
      </div>
    </div>

    <!-- Invisible positioned container for dropdown trigger at cursor -->
    <div class="pointer-events-none absolute left-0 top-0 h-full w-full overflow-hidden">
      <DropdownMenuRoot v-model:open="dropdownOpen">
        <DropdownMenuTrigger as-child>
          <div :style="triggerStyle" class="pointer-events-auto absolute h-5 w-0.5 opacity-0" />
        </DropdownMenuTrigger>

        <DropdownMenuPortal>
          <DropdownMenuContent
            class="z-[9999] max-h-[400px] min-w-[120px] max-w-[200px] overflow-y-auto rounded-lg border border-gray-200 bg-white p-1 shadow-lg outline-none"
            :side="'right'"
            :align="'start'"
            :side-offset="5"
            :align-offset="0"
            :collision-padding="10"
          >
            <!-- Project Files submenu (for ChatBox.vue) -->
            <DropdownMenuSub v-if="projectFiles && projectFiles.length > 0">
              <DropdownMenuSubTrigger
                class="flex cursor-pointer items-center justify-between rounded-md px-3 py-2 text-sm text-gray-700 outline-none select-none data-[highlighted]:bg-gray-100 data-[state=open]:bg-gray-100 data-[state=selected]:bg-gray-100"
              >
                <span>📁 文件</span>
                <span class="ml-auto text-xs text-gray-400">▶</span>
              </DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent
                  class="max-h-[400px] max-w-[200px] min-w-[150px] overflow-y-auto rounded-lg border border-gray-200 bg-white p-1 shadow-lg outline-none"
                  :side-offset="8"
                  :collision-padding="10"
                >
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
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>

            <!-- Local Files (for Home.vue with allowFilePick) -->
            <DropdownMenuSub v-else-if="allowFilePick && selectedFiles.length > 0">
              <DropdownMenuSubTrigger
                class="flex cursor-pointer items-center justify-between rounded-md px-3 py-2 text-sm text-gray-700 outline-none select-none data-[highlighted]:bg-gray-100 data-[state=open]:bg-gray-100 data-[state=selected]:bg-gray-100"
              >
                <span>📁 文件</span>
                <span class="ml-auto text-xs text-gray-400">▶</span>
              </DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent
                  class="max-h-[400px] max-w-[200px] min-w-[150px] overflow-y-auto rounded-lg border border-gray-200 bg-white p-1 shadow-lg outline-none"
                  :side-offset="8"
                  :collision-padding="10"
                >
                  <DropdownMenuItem
                    v-for="file in selectedFiles"
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
                      <div v-else class="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded bg-gray-100 text-sm">
                        {{ getFileIcon(file.type) }}
                      </div>
                      <div class="truncate" :title="file.name">
                        {{ file.name }}
                      </div>
                    </div>
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>

            <!-- Models submenu -->
            <DropdownMenuSub>
              <DropdownMenuSubTrigger
                class="flex cursor-pointer items-center justify-between rounded-md px-3 py-2 text-sm text-gray-700 outline-none select-none data-[highlighted]:bg-gray-100 data-[state=open]:bg-gray-100 data-[state=selected]:bg-gray-100"
              >
                <span>🤖 模型</span>
                <span class="ml-auto text-xs text-gray-400">▶</span>
              </DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent
                  class="min-w-[200px] rounded-lg border border-gray-200 bg-white p-1 shadow-lg outline-none"
                  :side-offset="8"
                  :collision-padding="10"
                >
                  <DropdownMenuItem
                    v-for="model in models"
                    :key="model.id"
                    @select="insertMention(model.name)"
                    class="cursor-pointer rounded-md px-3 py-2 text-sm text-gray-700 outline-none select-none data-[highlighted]:bg-blue-500 data-[highlighted]:text-white"
                  >
                    {{ model.name }}
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>
          </DropdownMenuContent>
        </DropdownMenuPortal>
      </DropdownMenuRoot>
    </div>

    <!-- Hidden file input (only for Home.vue with allowFilePick) -->
    <input
      v-if="allowFilePick"
      ref="fileInputRef"
      type="file"
      @change="handleFileChange"
      class="hidden"
      accept="image/*,video/*,audio/*"
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
