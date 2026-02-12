<script setup lang="ts">
import { ref, nextTick, watch, computed, onUnmounted, toRef } from 'vue';
import { abortVideoCreation } from '@/api/videoProjectApi';
import { useFileUpload } from '@/composables/useFileUpload';
import { type ChatMessage, type AssistantMessage } from '@/types/workspace';
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

interface Props {
  messages: ChatMessage[];
  isRunning?: boolean;
  isUploading?: boolean;
  initialInput?: string;
  projectId?: string | number;
  files?: Array<{ id: string; file_name: string; file_type?: string; file_url?: string }>;
}

interface Emits {
  (e: 'send-message', message: string): void;
  (e: 'cancel-task'): void;
  (e: 'file-uploaded'): void;
  (e: 'upload-start'): void;
  (e: 'upload-end'): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();
const isUploadingRef = toRef(props, 'isUploading');
const { fileInputRef, handleFileUploadClick, handleFileChange } = useFileUpload(
  isUploadingRef,
  () => emit('upload-start'),
  () => emit('upload-end')
);

const input = ref('');
const messagesEndRef = ref<HTMLDivElement>();
const messagesContainer = ref<HTMLDivElement>();
const isUserScrolling = ref(false);
const scrollTimeout = ref<NodeJS.Timeout>();
const textareaRef = ref<HTMLTextAreaElement>();
const dropdownOpen = ref(false);
const cursorPosition = ref({ top: 0, left: 0 });
const dropdownTriggerRef = ref<HTMLDivElement>();

// Computed style for trigger positioning
const triggerStyle = computed(() => ({
  top: `${cursorPosition.value.top}px`,
  left: `${cursorPosition.value.left}px`,
}));

// Available models
const models = [
  { id: 'pro', name: 'pro' },
  { id: 'vidu', name: 'vidu' },
  { id: 'kling', name: 'kling' },
  { id: 'hailuo', name: 'hailuo' },
  { id: 'sora', name: 'sora' },
];

const getUserResponseOfAssistant = (assistantMessage: AssistantMessage) => {
  if (assistantMessage.type === 'toolCall' && assistantMessage.toolCall?.userResponse) {
    return assistantMessage.toolCall.userResponse;
  } else if (assistantMessage.type === 'toolCallResponse' && assistantMessage.toolCallResponse?.userResponse) {
    return assistantMessage.toolCallResponse.userResponse;
  } else if (assistantMessage.type === 'text' && assistantMessage.userResponse) {
    return assistantMessage.userResponse;
  }
  return '';
};

// Filter out empty content from assistant messages and transform to strings
const processedMessages = computed(() => {
  return props.messages.map(message => {
    if (message.role === 'assistant' && Array.isArray(message.content)) {
      return {
        ...message,
        content: message.content.map(content => getUserResponseOfAssistant(content)).filter(text => text.trim() !== ''),
      };
    }
    return message;
  });
});

// Set initial message when prop changes
watch(
  () => props.initialInput,
  newMessage => {
    if (newMessage && !input.value) {
      input.value = newMessage;
    }
  },
  { immediate: true },
);

// Reset user scrolling state when task starts running
watch(
  () => props.isRunning,
  (newIsRunning, oldIsRunning) => {
    if (newIsRunning && !oldIsRunning) {
      // Task just started, reset user scrolling state to allow auto-scroll
      isUserScrolling.value = false;
      if (scrollTimeout.value) {
        clearTimeout(scrollTimeout.value);
        scrollTimeout.value = undefined;
      }
    }
  },
);

// Auto-scroll management with user scroll detection
const isNearBottom = () => {
  if (!messagesContainer.value) return false;
  const { scrollTop, scrollHeight, clientHeight } = messagesContainer.value;
  return scrollHeight - scrollTop - clientHeight < 100; // 100px threshold
};

const handleScroll = () => {
  if (!messagesContainer.value) return;

  // Clear existing timeout
  if (scrollTimeout.value) {
    clearTimeout(scrollTimeout.value);
  }

  // Set user scrolling flag
  isUserScrolling.value = true;

  // Reset flag 5 minutes later after user stops scrolling
  scrollTimeout.value = setTimeout(
    () => {
      isUserScrolling.value = false;
    },
    5 * 60 * 1000,
  );

  // If user scrolled near bottom, allow auto-scroll again
  if (isNearBottom()) {
    isUserScrolling.value = false;
  }
};

const scrollToBottom = () => {
  // Only auto-scroll if user hasn't manually scrolled or is near bottom
  if (!isUserScrolling.value || isNearBottom()) {
    nextTick(() => {
      messagesEndRef.value?.scrollIntoView({ behavior: 'smooth' });
    });
  }
};

watch(() => processedMessages.value, scrollToBottom, { deep: true });

const handleSubmit = () => {
  if (input.value.trim() && !props.isRunning) {
    emit('send-message', input.value);
    input.value = '';
  }
};

const handleCancel = async () => {
  if (props.isRunning && props.projectId) {
    try {
      await abortVideoCreation({ projectId: props.projectId });
      emit('cancel-task');
    } catch (error) {
      console.error('Failed to cancel task:', error);
    }
  }
};

const handleButtonClick = () => {
  if (props.isRunning) {
    handleCancel();
  } else {
    handleSubmit();
  }
};

const handleKeyDown = (e: KeyboardEvent) => {
  // Only handle Enter for sending messages, let reka-ui handle arrow keys
  if (e.key === 'Enter' && !e.shiftKey && !props.isRunning && !dropdownOpen.value) {
    e.preventDefault();
    handleSubmit();
  }
};

const getCursorCoordinates = (textarea: HTMLTextAreaElement, position: number) => {
  // Create a mirror div to calculate cursor position
  const div = document.createElement('div');
  const style = window.getComputedStyle(textarea);

  // Copy all relevant textarea styles to mirror div
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
    'wordWrap',
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
  div.style.wordWrap = 'break-word';

  document.body.appendChild(div);

  // Get text before cursor (not including the character at cursor position)
  const textBeforeCursor = textarea.value.substring(0, position);

  // Split into text nodes to measure
  const textNode = document.createTextNode(textBeforeCursor);
  div.appendChild(textNode);

  // Create a span for the cursor position marker
  const span = document.createElement('span');
  span.textContent = '\u200B'; // Zero-width space for accurate positioning
  div.appendChild(span);

  // Get the span's position
  const spanRect = span.getBoundingClientRect();
  const divRect = div.getBoundingClientRect();

  // Calculate position relative to the div
  let top = spanRect.top - divRect.top;
  let left = spanRect.left - divRect.left;

  // Account for textarea scroll
  top -= textarea.scrollTop;
  left -= textarea.scrollLeft;

  document.body.removeChild(div);

  // Return position (already includes padding from copied styles)
  return { top, left };
};

const handleInput = (e: Event) => {
  const target = e.target as HTMLTextAreaElement;
  const value = target.value;
  const position = target.selectionStart || 0;

  // Check if user typed @ character
  if (value[position - 1] === '@') {
    // Calculate cursor position
    const coords = getCursorCoordinates(target, position);
    cursorPosition.value = coords;

    // Trigger dropdown open after positioning
    nextTick(() => {
      dropdownOpen.value = true;
    });
  }
};

const insertMention = (name: string) => {
  if (!textareaRef.value) return;

  const position = textareaRef.value.selectionStart || 0;
  const textBeforeCursor = input.value.substring(0, position);
  const lastAtIndex = textBeforeCursor.lastIndexOf('@');

  if (lastAtIndex !== -1) {
    // Replace from @ to cursor (remove the @ that was typed)
    const beforeAt = input.value.substring(0, lastAtIndex);
    const afterCursor = input.value.substring(position);
    input.value = beforeAt + name + ' ' + afterCursor;

    nextTick(() => {
      if (textareaRef.value) {
        const newPosition = beforeAt.length + name.length + 1;
        textareaRef.value.selectionStart = newPosition;
        textareaRef.value.selectionEnd = newPosition;
        textareaRef.value.focus();
      }
    });
  } else {
    // Just insert at cursor (no @ to replace)
    const beforeCursor = input.value.substring(0, position);
    const afterCursor = input.value.substring(position);
    input.value = beforeCursor + name + ' ' + afterCursor;

    nextTick(() => {
      if (textareaRef.value) {
        const newPosition = beforeCursor.length + name.length + 1;
        textareaRef.value.selectionStart = newPosition;
        textareaRef.value.selectionEnd = newPosition;
        textareaRef.value.focus();
      }
    });
  }

  // Close dropdown and ensure focus returns to textarea
  dropdownOpen.value = false;

  // Additional focus call with slight delay to ensure dropdown is fully closed
  setTimeout(() => {
    textareaRef.value?.focus();
  }, 50);
};

const handleMentionButtonClick = () => {
  if (!textareaRef.value) return;

  // Get current cursor position
  const position = textareaRef.value.selectionStart || 0;

  // Calculate cursor coordinates
  const coords = getCursorCoordinates(textareaRef.value, position);
  cursorPosition.value = coords;

  // Open dropdown after positioning
  nextTick(() => {
    dropdownOpen.value = true;
  });

  // Focus the textarea
  textareaRef.value.focus();
};

const formatTime = (dateString: string) => {
  return new Date(dateString).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

// Cleanup timeout on unmount
onUnmounted(() => {
  if (scrollTimeout.value) {
    clearTimeout(scrollTimeout.value);
  }
});

const buttonDisabled = computed(() => {
  return (!input.value.trim() && !props.isRunning) || (props.isRunning && !props.projectId);
});

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
</script>

<template>
  <div class="flex h-full w-[480px] flex-col overflow-hidden border-l border-gray-200 bg-white">
    <div
      ref="messagesContainer"
      @scroll="handleScroll"
      class="flex flex-1 flex-col gap-5 overflow-y-auto bg-gray-50 p-5"
    >
      <!-- Empty state -->
      <div
        v-if="processedMessages.length === 0"
        class="flex h-full flex-col items-center justify-center gap-6 px-5 py-10"
      >
        <div class="flex h-20 w-20 items-center justify-center rounded-full bg-gray-50 text-4xl">🤖</div>
        <div class="flex flex-col gap-2 text-center">
          <h3 class="m-0 text-lg font-semibold text-gray-900">开始创作</h3>
          <p class="m-0 text-sm leading-relaxed text-gray-500">描述你的想法，AI 助手将帮你实现</p>
        </div>
        <div class="flex w-full max-w-[320px] flex-col gap-2">
          <div class="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-xs text-gray-500">
            💡 尝试：制作一个城市日落的视频
          </div>
          <div class="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-xs text-gray-500">
            🎨 尝试：创建一个产品展示动画
          </div>
        </div>
      </div>

      <!-- Messages -->
      <template v-else>
        <div v-for="(message, messageIndex) in processedMessages" :key="message.id">
          <!-- System message,these kind of messages are generated in the browser,only use to show a system tip,not by the server Agent,so it will be coverd while loaded the server's messages -->
          <!-- <template v-if="message.role === 'system'">
            <div v-if="message.message_type === 'thinking'" class="flex items-start gap-3">
              <div class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-yellow-100 text-base">
                🤔
              </div>
              <div class="flex-1 rounded-2xl bg-yellow-100 px-4 py-3 text-xs text-yellow-800 italic">
                {{ message.content }}
              </div>
            </div>

            <div v-else-if="message.message_type === 'error'" class="flex items-start gap-3">
              <div class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-red-100 text-base">
                ⚠️
              </div>
              <div class="flex-1 rounded-2xl bg-red-100 px-4 py-3 text-xs text-red-800">
                {{ message.content }}
              </div>
            </div>
          </template> -->

          <!-- Regular message -->
          <div :class="['flex items-start gap-3', message.role === 'user' ? 'flex-row-reverse' : '']">
            <div
              :class="[
                'flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-base font-semibold text-white',
                message.role === 'user' ? 'bg-blue-500' : 'bg-gray-900',
              ]"
            >
              {{ message.role === 'user' ? '👤' : '🤖' }}
            </div>

            <div :class="['flex max-w-[75%] flex-1 flex-col gap-1.5']">
              <div :class="['flex items-center gap-2', message.role === 'user' ? 'flex-row-reverse' : '']">
                <span class="text-xs font-semibold text-gray-900">
                  {{ message.role === 'user' ? '你' : 'AI 助手' }}
                </span>
                <span class="text-[11px] text-gray-400">
                  {{ formatTime(message.timestamp) }}
                </span>
              </div>

              <!-- Message content -->
              <div
                :class="[
                  'px-4 py-3.5 text-sm leading-relaxed shadow-sm',
                  message.role === 'user'
                    ? 'rounded-2xl rounded-tr-sm bg-blue-500 text-white'
                    : 'rounded-2xl rounded-tl-sm bg-gray-50 text-gray-900',
                ]"
              >
                <!-- Display userResponses as styled list for assistant messages -->
                <div v-if="message.role === 'assistant'" class="space-y-3">
                  <div
                    v-for="(content, index) in message.content"
                    :key="index"
                    class="rounded-lg border border-gray-200 bg-white p-3 shadow-sm"
                  >
                    <div class="flex items-start gap-2">
                      <div class="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-blue-500"></div>
                      <div class="break-words break-all whitespace-pre-wrap">
                        {{ content }}
                      </div>
                    </div>
                  </div>

                  <div
                    v-if="isRunning && messageIndex === processedMessages.length - 1"
                    class="mt-3 flex items-center gap-1.5 rounded-2xl rounded-tl-sm bg-gray-50 px-4 py-3.5 text-sm shadow-sm"
                  >
                    <div class="h-2 w-2 animate-pulse rounded-full bg-gray-500"></div>
                    <div class="h-2 w-2 animate-pulse rounded-full bg-gray-500" style="animation-delay: 0.2s"></div>
                    <div class="h-2 w-2 animate-pulse rounded-full bg-gray-500" style="animation-delay: 0.4s"></div>
                  </div>
                </div>

                <!-- Display regular content for other cases -->
                <div v-else class="break-words break-all whitespace-pre-wrap">
                  {{ message.content }}
                </div>
              </div>
            </div>
          </div>

          <!-- Loading indicator -->
          <!-- <div v-if="isRunning" class="flex gap-3 items-start">
            <div
              class="w-9 h-9 rounded-full bg-gray-900 flex items-center justify-center text-base font-semibold text-white flex-shrink-0">
              🤖
            </div>

            <div class="flex-1 flex flex-col gap-1.5 max-w-[75%]">
              <div class="flex items-center gap-2">
                <span class="text-xs font-semibold text-gray-900">AI 助手</span>
              </div>

              <div class="px-4 py-3.5 bg-gray-50 rounded-2xl rounded-tl-sm text-sm shadow-sm flex items-center gap-1.5">
                <div class="w-2 h-2 rounded-full bg-gray-500 animate-pulse"></div>
                <div class="w-2 h-2 rounded-full bg-gray-500 animate-pulse" style="animation-delay: 0.2s;"></div>
                <div class="w-2 h-2 rounded-full bg-gray-500 animate-pulse" style="animation-delay: 0.4s;"></div>
              </div>
            </div>
          </div> -->
        </div>
      </template>

      <div ref="messagesEndRef" />
    </div>

    <!-- Input area -->
    <div class="border-t border-gray-200 p-4">
      <div class="relative rounded-xl border border-gray-200 bg-white p-3">
        <textarea
          ref="textareaRef"
          v-model="input"
          @keydown="handleKeyDown"
          @input="handleInput"
          placeholder="请输入你的设计需求..."
          :disabled="isRunning"
          :class="[
            'max-h-[70px] min-h-[70px] w-full resize-none border-none text-sm leading-relaxed outline-none',
            isRunning ? 'bg-gray-50' : 'bg-white',
          ]"
        />

        <!-- Invisible positioned container for dropdown trigger at cursor -->
        <div class="pointer-events-none absolute top-0 left-0 h-full w-full overflow-hidden">
          <DropdownMenuRoot v-model:open="dropdownOpen">
            <DropdownMenuTrigger as-child>
              <div
                ref="dropdownTriggerRef"
                :style="triggerStyle"
                class="pointer-events-auto absolute h-5 w-0.5 opacity-0"
              />
            </DropdownMenuTrigger>

            <DropdownMenuPortal>
              <DropdownMenuContent
                class="z-[9999] max-h-[400px] max-w-[200px] min-w-[120px] overflow-y-auto rounded-lg border border-gray-200 bg-white p-1 shadow-lg outline-none"
                :side="'right'"
                :align="'start'"
                :side-offset="5"
                :align-offset="0"
                :collision-padding="10"
              >
                <!-- Files submenu -->
                <DropdownMenuSub v-if="files && files.length > 0">
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
                        v-for="file in files"
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

        <!-- Button bar inside the border -->
        <div class="flex items-center justify-between">
          <div class="flex gap-1">
            <button
              @click="handleMentionButtonClick"
              class="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border-none bg-transparent text-sm font-semibold text-gray-500 transition-all hover:bg-gray-50"
              title="@大模型/文件"
            >
              @
            </button>
            <button
              @click="handleFileUpload"
              :disabled="!projectId || props.isUploading"
              :class="[
                'flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border-none bg-transparent text-base transition-all',
                projectId && !props.isUploading
                  ? 'text-gray-500 hover:bg-gray-50'
                  : 'cursor-not-allowed text-gray-300',
              ]"
              :title="props.isUploading ? '上传中...' : '上传附件'"
            >
              <span v-if="!props.isUploading">📎</span>
              <span v-else class="animate-spin" style="font-size: 0.65rem;">⏳</span>
            </button>
            <!-- <button
              class="w-7 h-7 rounded-md border-none bg-transparent cursor-pointer flex items-center justify-center text-sm font-semibold text-gray-500 transition-all hover:bg-gray-50"
              title="@大模型">
              @
            </button>
            <button
              class="w-7 h-7 rounded-md border-none bg-transparent cursor-pointer flex items-center justify-center text-base text-gray-500 transition-all hover:bg-gray-50"
              title="风格">
              🎨
            </button>
            <button
              class="w-7 h-7 rounded-md border-none bg-transparent cursor-pointer flex items-center justify-center text-base text-gray-500 transition-all hover:bg-gray-50"
              title="运镜">
              🎥
            </button> -->
          </div>

          <button
            @click="handleButtonClick"
            :disabled="buttonDisabled"
            :class="[
              'flex h-8 w-8 flex-shrink-0 cursor-pointer items-center justify-center rounded-lg border-none text-base transition-all',
              buttonDisabled
                ? 'cursor-not-allowed bg-gray-200'
                : isRunning
                  ? 'bg-red-500 hover:bg-red-600'
                  : 'bg-gray-900 hover:bg-black',
            ]"
            :title="isRunning ? '取消任务' : '发送消息'"
          >
            <span class="text-white">{{ isRunning ? '✕' : '↑' }}</span>
          </button>
        </div>
      </div>

      <!-- Hidden file input -->
      <input
        ref="fileInputRef"
        type="file"
        @change="onFileChange"
        class="hidden"
        accept="image/*,video/*,audio/*"
      />
    </div>
  </div>
</template>
