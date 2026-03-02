<script setup lang="ts">
import { ref, nextTick, watch, computed, onUnmounted, toRef } from 'vue';
import { abortVideoCreation } from '@/api/videoProjectApi';
import { useFileUpload } from '@/composables/useFileUpload';
import { type ChatMessage, type AssistantMessage } from '@/types/workspace';
import FileReferenceInput from '@/components/workspace/FileReferenceInput.vue';

interface Props {
  messages: ChatMessage[];
  isRunning?: boolean;
  isUploading?: boolean;
  projectId?: string | number;
  files?: Array<{ id: string; file_name: string; file_type?: string; file_url?: string }>;
  isOwner?: boolean;
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
const fileReferenceInputRef = ref<InstanceType<typeof FileReferenceInput>>();

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
  if (e.key === 'Enter' && !e.shiftKey && !props.isRunning) {
    e.preventDefault();
    handleSubmit();
  }
};
</script>

<template>
  <div class="flex h-full w-full flex-col overflow-hidden border-l border-gray-200 bg-white md:w-[320px] lg:w-[400px] xl:w-[480px]">
    <div
      ref="messagesContainer"
      @scroll="handleScroll"
      class="flex flex-1 flex-col gap-4 overflow-y-auto bg-gray-50 p-3 md:gap-5 md:p-5"
    >
      <!-- Empty state -->
      <div
        v-if="processedMessages.length === 0"
        class="flex h-full flex-col items-center justify-center gap-4 px-4 py-8 md:gap-6 md:px-5 md:py-10"
      >
        <div class="flex h-16 w-16 items-center justify-center rounded-full bg-gray-50 text-3xl md:h-20 md:w-20 md:text-4xl">🤖</div>
        <div class="flex flex-col gap-1.5 text-center md:gap-2">
          <h3 class="m-0 text-base font-semibold text-gray-900 md:text-lg">开始创作</h3>
          <p class="m-0 text-xs leading-relaxed text-gray-500 md:text-sm">描述你的想法，AI 助手将帮你实现</p>
        </div>
        <div class="flex w-full max-w-[320px] flex-col gap-2">
          <div class="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-xs text-gray-500 md:px-4 md:py-3">
            💡 尝试：制作一个城市日落的视频
          </div>
          <div class="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-xs text-gray-500 md:px-4 md:py-3">
            🎨 尝试：创建一个产品展示动画
          </div>
        </div>
      </div>

      <!-- Messages -->
      <template v-else>
        <div v-for="(message, messageIndex) in processedMessages" :key="message.id">
          <!-- Regular message -->
          <div :class="['flex items-start gap-2.5 md:gap-3', message.role === 'user' ? 'flex-row-reverse' : '']">
            <div
              :class="[
                'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-base font-semibold text-white md:h-9 md:w-9',
                message.role === 'user' ? 'bg-blue-500' : 'bg-gray-900',
              ]"
            >
              {{ message.role === 'user' ? '👤' : '🤖' }}
            </div>

            <div :class="['flex max-w-[80%] flex-1 flex-col gap-1 md:max-w-[75%] md:gap-1.5']">
              <div :class="['flex items-center gap-1.5 md:gap-2', message.role === 'user' ? 'flex-row-reverse' : '']">
                <span class="text-xs font-semibold text-gray-900">
                  {{ message.role === 'user' ? '你' : 'AI 助手' }}
                </span>
                <span class="text-[10px] text-gray-400 md:text-[11px]">
                  {{ formatTime(message.timestamp) }}
                </span>
              </div>

              <!-- Message content -->
              <div
                :class="[
                  'px-3 py-3 text-xs leading-relaxed shadow-sm md:px-4 md:py-3.5 md:text-sm',
                  message.role === 'user'
                    ? 'rounded-2xl rounded-tr-sm bg-blue-500 text-white'
                    : 'rounded-2xl rounded-tl-sm bg-gray-50 text-gray-900',
                ]"
              >
                <!-- Display userResponses as styled list for assistant messages -->
                <div v-if="message.role === 'assistant'" class="space-y-2.5 md:space-y-3">
                  <div
                    v-for="(content, index) in message.content"
                    :key="index"
                    class="rounded-lg border border-gray-200 bg-white p-2.5 shadow-sm md:p-3"
                  >
                    <div class="flex items-start gap-1.5 md:gap-2">
                      <div class="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-blue-500 md:mt-2 md:h-2 md:w-2"></div>
                      <div class="break-words break-all whitespace-pre-wrap text-xs md:text-sm">
                        {{ content }}
                      </div>
                    </div>
                  </div>

                  <div
                    v-if="isRunning && messageIndex === processedMessages.length - 1"
                    class="mt-2.5 flex items-center gap-1.5 rounded-2xl rounded-tl-sm bg-gray-50 px-3 py-3 text-xs shadow-sm md:mt-3 md:px-4 md:py-3.5 md:text-sm"
                  >
                    <div class="h-1.5 w-1.5 animate-pulse rounded-full bg-gray-500 md:h-2 md:w-2"></div>
                    <div class="h-1.5 w-1.5 animate-pulse rounded-full bg-gray-500 md:h-2 md:w-2" style="animation-delay: 0.2s"></div>
                    <div class="h-1.5 w-1.5 animate-pulse rounded-full bg-gray-500 md:h-2 md:w-2" style="animation-delay: 0.4s"></div>
                  </div>
                </div>

                <!-- Display regular content for other cases -->
                <div v-else class="break-words break-all whitespace-pre-wrap text-xs md:text-sm">
                  {{ message.content }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>

      <div ref="messagesEndRef" />
    </div>

    <!-- Input area -->
    <div v-if="props.isOwner !== false" class="border-t border-gray-200 p-3 md:p-4">
      <div class="relative rounded-xl border border-gray-200 bg-white p-2.5 md:p-3">
        <FileReferenceInput
          ref="fileReferenceInputRef"
          v-model="input"
          placeholder="请输入你的设计需求..."
          :disabled="isRunning"
          :project-files="files"
          textarea-class="max-h-[60px] min-h-[60px] w-full resize-none border-none text-xs leading-relaxed outline-none md:max-h-[70px] md:min-h-[70px] md:text-sm"
          @keydown="handleKeyDown"
        >
          <template #actions="{ onMentionClick, textareaRef }">
            <!-- Button bar inside the border -->
            <div class="flex items-center justify-between">
              <div class="flex gap-0.5 md:gap-1">
                <button
                  @click="onMentionClick"
                  class="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border-none bg-transparent text-xs font-semibold text-gray-500 transition-all active:bg-gray-100 md:text-sm md:hover:bg-gray-50"
                  title="@大模型/文件"
                >
                  @
                </button>
                <button
                  @click="handleFileUpload"
                  :disabled="!projectId || props.isUploading"
                  :class="[
                    'flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border-none bg-transparent text-sm transition-all md:text-base',
                    projectId && !props.isUploading
                      ? 'text-gray-500 active:bg-gray-100 md:hover:bg-gray-50'
                      : 'cursor-not-allowed text-gray-300',
                  ]"
                  :title="props.isUploading ? '上传中...' : '上传附件'"
                >
                  <span v-if="!props.isUploading">📎</span>
                  <span v-else class="animate-spin" style="font-size: 0.65rem;">⏳</span>
                </button>
              </div>

              <button
                @click="handleButtonClick"
                :disabled="buttonDisabled"
                :class="[
                  'flex h-7 w-7 flex-shrink-0 cursor-pointer items-center justify-center rounded-lg border-none text-sm transition-all md:h-8 md:w-8 md:text-base',
                  buttonDisabled
                    ? 'cursor-not-allowed bg-gray-200'
                    : isRunning
                      ? 'bg-red-500 active:bg-red-700 md:hover:bg-red-600'
                      : 'bg-gray-900 active:bg-black md:hover:bg-black',
                ]"
                :title="isRunning ? '取消任务' : '发送消息'"
              >
                <span class="text-white">{{ isRunning ? '✕' : '↑' }}</span>
              </button>
            </div>
          </template>
        </FileReferenceInput>
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
