<script setup lang="ts">
import { ref, nextTick, watch, computed, onUnmounted } from 'vue';
import { abortVideoCreation } from '@/api/videoProjectApi';
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
  initialInput?: string;
  projectId?: string | number;
  files?: Array<{ id: string; file_name: string }>;
}

interface Emits {
  (e: 'send-message', message: string): void;
  (e: 'cancel-task'): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const input = ref('');
const messagesEndRef = ref<HTMLDivElement>();
const messagesContainer = ref<HTMLDivElement>();
const isUserScrolling = ref(false);
const scrollTimeout = ref<NodeJS.Timeout>();
const textareaRef = ref<HTMLTextAreaElement>();
const dropdownOpen = ref(false);

// Available models
const models = [
  { id: 'vidu2', name: 'Vidu2' },
  { id: 'seeddance', name: 'SeedDance' },
  { id: 'sora2', name: 'Sora2' },
  { id: 'jimeng', name: 'Jimeng' },
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
        content: message.content
          .map(content => getUserResponseOfAssistant(content))
          .filter(text => text.trim() !== ''),
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

const handleInput = (e: Event) => {
  const target = e.target as HTMLTextAreaElement;
  const value = target.value;
  const position = target.selectionStart || 0;

  // Check if user typed @ character
  if (value[position - 1] === '@' && (position === 1 || value[position - 2] === ' ' || value[position - 2] === '\n')) {
    // Trigger dropdown open
    dropdownOpen.value = true;
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

  // Just focus the textarea, don't insert @
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
      <div class="relative">
        <textarea
          ref="textareaRef"
          v-model="input"
          @keydown="handleKeyDown"
          @input="handleInput"
          placeholder="请输入你的设计需求..."
          :disabled="isRunning"
          :class="[
            'max-h-[200px] min-h-[120px] w-full resize-y rounded-xl border border-gray-200 px-3 py-3 pb-12 text-sm leading-relaxed outline-none',
            isRunning ? 'bg-gray-50' : 'bg-white focus:border-gray-900',
          ]"
        />

        <div class="absolute right-3 bottom-2.5 left-3 flex items-center justify-between">
          <div class="flex gap-1">
            <DropdownMenuRoot v-model:open="dropdownOpen">
              <DropdownMenuTrigger as-child>
                <button
                  @click="handleMentionButtonClick"
                  class="w-7 h-7 rounded-md border-none bg-transparent cursor-pointer flex items-center justify-center text-sm font-semibold text-gray-500 transition-all hover:bg-gray-50"
                  title="@大模型/文件">
                  @
                </button>
              </DropdownMenuTrigger>

              <DropdownMenuPortal>
                <DropdownMenuContent
                  class="min-w-[200px] max-w-[300px] max-h-[400px] overflow-y-auto rounded-lg border border-gray-200 bg-white p-1 shadow-lg outline-none z-[9999]"
                  :side-offset="5"
                  :collision-padding="10"
                >
                  <!-- Files submenu -->
                  <DropdownMenuSub v-if="files && files.length > 0">
                    <DropdownMenuSubTrigger
                      class="flex cursor-pointer items-center justify-between rounded-md px-3 py-2 text-sm text-gray-700 outline-none select-none data-[state=open]:bg-gray-100 data-[highlighted]:bg-blue-500 data-[highlighted]:text-white"
                    >
                      <span>📁 文件</span>
                      <span class="ml-auto text-xs text-gray-400">▶</span>
                    </DropdownMenuSubTrigger>
                    <DropdownMenuPortal>
                      <DropdownMenuSubContent
                        class="min-w-[200px] max-w-[300px] max-h-[400px] overflow-y-auto rounded-lg border border-gray-200 bg-white p-1 shadow-lg outline-none"
                        :side-offset="8"
                        :collision-padding="10"
                      >
                        <DropdownMenuItem
                          v-for="file in files"
                          :key="file.id"
                          @select="insertMention(file.file_name)"
                          class="cursor-pointer rounded-md px-3 py-2 text-sm text-gray-700 outline-none select-none data-[highlighted]:bg-blue-500 data-[highlighted]:text-white"
                        >
                          <div class="truncate" :title="file.file_name">
                            {{ file.file_name }}
                          </div>
                        </DropdownMenuItem>
                      </DropdownMenuSubContent>
                    </DropdownMenuPortal>
                  </DropdownMenuSub>

                  <!-- Models submenu -->
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger
                      class="flex cursor-pointer items-center justify-between rounded-md px-3 py-2 text-sm text-gray-700 outline-none select-none data-[state=open]:bg-gray-100 data-[highlighted]:bg-blue-500 data-[highlighted]:text-white"
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
    </div>
  </div>
</template>
