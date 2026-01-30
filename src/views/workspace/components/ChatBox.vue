<script setup lang="ts">
import { ref, nextTick, watch, computed } from 'vue';
import { abortVideoCreation } from '@/api/videoProjectApi';
import { type ChatMessage } from '@/types/workspace';


interface Props {
  messages: ChatMessage[];
  isRuning?: boolean;
  initialMessage?: string;
  projectId?: string | number;
}

interface Emits {
  (e: 'send-message', message: string): void;
  (e: 'cancel-task'): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const input = ref('');
const messagesEndRef = ref<HTMLDivElement>();

// Pre-process messages to add displayContent and shouldDisplay
const processedMessages = computed(() => {
  return props.messages.map(message => {
    const processed = { ...message };

    if (message.role === 'assistant') {
      try {
        const parsed = message.content;
        if (Array.isArray(parsed)) {
          // Extract userResponse content from different message types
          console.log('parsed:', parsed)

          const userResponses: string[] = [];

          parsed.forEach(item => {
            console.log('item', item)
            if (item.type === 'toolCall' && item.toolCall?.userResponse) {
              userResponses.push(item.toolCall.userResponse);
            } else if (item.type === 'toolCallResponse' && item.toolCallResponse?.userResponse) {
              userResponses.push(item.toolCallResponse.userResponse);
            } else if (item.type === 'text' && item.userResponse) {
              userResponses.push(item.userResponse);
            }
          });

          if (userResponses.length > 0) {
            processed.userResponses = userResponses;
            processed.displayContent = undefined; // Don't use displayContent for arrays
          } else {
            processed.displayContent = message.content || message.chatContent;
          }

          console.log('userResponses:', userResponses)
          processed.shouldDisplay = true;
        } else {
          // If it's not an array, don't display this assistant message
          processed.shouldDisplay = true;
        }
      } catch (e) {
        processed.displayContent = message.content || message.chatContent;

        // If JSON parsing fails, don't display this assistant message
        //processed.shouldDisplay = false;
      }
    } else {
      // For user messages, always display original content
      processed.displayContent = message.content || message.chatContent || message.toolCall?.reasoning || message.toolCall?.userResponse || message.toolCallResponse?.userResponse;
      processed.shouldDisplay = true;
    }

    return processed;
  });
});

// Set initial message when prop changes
watch(() => props.initialMessage, (newMessage) => {
  if (newMessage && !input.value) {
    input.value = newMessage;
  }
}, { immediate: true });

// todo if user scrolled manualy while running,then stop auto scroll.
const scrollToBottom = () => {
  nextTick(() => {
    messagesEndRef.value?.scrollIntoView({ behavior: 'smooth' });
  });
};

watch(() => processedMessages.value, scrollToBottom, { deep: true });

const handleSubmit = () => {
  if (input.value.trim() && !props.isRuning) {
    emit('send-message', input.value);
    input.value = '';
  }
};

const handleCancel = async () => {
  if (props.isRuning && props.projectId) {
    try {
      await abortVideoCreation({ projectId: props.projectId });
      emit('cancel-task');
    } catch (error) {
      console.error('Failed to cancel task:', error);
    }
  }
};

const handleButtonClick = () => {
  if (props.isRuning) {
    handleCancel();
  } else {
    handleSubmit();
  }
};

const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Enter' && !e.shiftKey && !props.isRuning) {
    e.preventDefault();
    handleSubmit();
  }
};

const formatTime = (dateString: string) => {
  return new Date(dateString).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit'
  });
};

const buttonDisabled = computed(() => {
  return (!input.value.trim() && !props.isRuning) || (props.isRuning && !props.projectId);
});
</script>

<template>
  <div class="w-[480px] h-full bg-white border-l border-gray-200 flex flex-col overflow-hidden">
    <div class="flex-1 overflow-y-auto p-5 flex flex-col gap-5 bg-gray-50">
      <!-- Empty state -->
      <div v-if="processedMessages.length === 0"
        class="flex flex-col items-center justify-center h-full px-5 py-10 gap-6">
        <div class="w-20 h-20 rounded-full bg-gray-50 flex items-center justify-center text-4xl">
          🤖
        </div>
        <div class="text-center flex flex-col gap-2">
          <h3 class="text-lg font-semibold text-gray-900 m-0">开始创作</h3>
          <p class="text-sm text-gray-500 m-0 leading-relaxed">
            描述你的想法，AI 助手将帮你实现
          </p>
        </div>
        <div class="flex flex-col gap-2 w-full max-w-[320px]">
          <div class="px-4 py-3 bg-gray-50 rounded-xl text-xs text-gray-500 border border-gray-200">
            💡 尝试：制作一个城市日落的视频
          </div>
          <div class="px-4 py-3 bg-gray-50 rounded-xl text-xs text-gray-500 border border-gray-200">
            🎨 尝试：创建一个产品展示动画
          </div>
        </div>
      </div>

      <!-- Messages -->
      <template v-else>
        <div v-for="message in processedMessages" :key="message.id">

          <!-- System message,these kind of messages are generated in the browser,only use to show a system tip,not by the server Agent,so it will be coverd while loaded the server's messages -->
          <template v-if="message.role === 'system'">
            <!-- Thinking message -->
            <div v-if="message.message_type === 'thinking'" class="flex gap-3 items-start">
              <div class="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center text-base flex-shrink-0">
                🤔
              </div>
              <div class="flex-1 px-4 py-3 bg-yellow-100 rounded-2xl text-xs text-yellow-800 italic">
                {{ message.content }}
              </div>
            </div>

            <!-- Error message -->
            <div v-else-if="message.message_type === 'error'" class="flex gap-3 items-start">
              <div class="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-base flex-shrink-0">
                ⚠️
              </div>
              <div class="flex-1 px-4 py-3 bg-red-100 rounded-2xl text-xs text-red-800">
                {{ message.content }}
              </div>
            </div>
          </template>


          <!-- Regular message -->
          <div v-else :class="['flex gap-3 items-start', message.role === 'user' ? 'flex-row-reverse' : '']">
            <div :class="[
              'w-9 h-9 rounded-full flex items-center justify-center text-base font-semibold text-white flex-shrink-0',
              message.role === 'user' ? 'bg-blue-500' : 'bg-gray-900'
            ]">
              {{ message.role === 'user' ? '👤' : '🤖' }}
            </div>

            <div :class="['flex-1 flex flex-col gap-1.5 max-w-[75%]']">
              <div :class="['flex items-center gap-2', message.role === 'user' ? 'flex-row-reverse' : '']">
                <span class="text-xs font-semibold text-gray-900">
                  {{ message.role === 'user' ? '你' : 'AI 助手' }}
                </span>
                <span class="text-[11px] text-gray-400">
                  {{ formatTime(message.timestamp) }}
                </span>
              </div>

              <!-- File references -->
              <div v-if="message.file_references && message.file_references.length > 0"
                :class="['flex flex-wrap gap-1.5', message.role === 'user' ? 'justify-end' : 'justify-start']">
                <div v-for="file in message.file_references" :key="file.id"
                  class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-600">
                  <span class="text-sm">📄</span>
                  <span class="font-medium">{{ file.file_name }}</span>
                </div>
              </div>

              <!-- Message content -->
              <div :class="[
                'px-4 py-3.5 text-sm leading-relaxed shadow-sm',
                message.role === 'user'
                  ? 'bg-blue-500 text-white rounded-2xl rounded-tr-sm'
                  : 'bg-gray-50 text-gray-900 rounded-2xl rounded-tl-sm'
              ]">
                <!-- Display userResponses as styled list for assistant messages -->
                <div v-if="message.userResponses && message.userResponses.length > 0" class="space-y-3">
                  <div v-for="(response, index) in message.userResponses" :key="index"
                    class="p-3 bg-white rounded-lg border border-gray-200 shadow-sm">
                    <div class="flex items-start gap-2">
                      <div class="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0"></div>
                      <div class="whitespace-pre-wrap break-words break-all">{{ response }}</div>

                    </div>

                  </div>

                  <div
                    class="mt-3 px-4 py-3.5 bg-gray-50 rounded-2xl rounded-tl-sm text-sm shadow-sm flex items-center gap-1.5">
                    <div class="w-2 h-2 rounded-full bg-gray-500 animate-pulse"></div>
                    <div class="w-2 h-2 rounded-full bg-gray-500 animate-pulse" style="animation-delay: 0.2s;"></div>
                    <div class="w-2 h-2 rounded-full bg-gray-500 animate-pulse" style="animation-delay: 0.4s;"></div>
                  </div>
                </div>


                <!-- Display regular content for other cases -->
                <div v-else class="whitespace-pre-wrap break-words break-all">
                  {{ message.displayContent }}
                </div>


              </div>
            </div>
          </div>

          <!-- Loading indicator -->
          <div v-if="isRuning" class="flex gap-3 items-start">
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
          </div>



        </div>
      </template>

      <div ref="messagesEndRef" />
    </div>

    <!-- Input area -->
    <div class="p-4 border-t border-gray-200">
      <div class="relative">
        <textarea v-model="input" @keydown="handleKeyDown" placeholder="请输入你的设计需求..." :disabled="isRuning" :class="[
          'w-full min-h-[120px] max-h-[200px] px-3 py-3 pb-12 text-sm border border-gray-200 rounded-xl resize-y outline-none leading-relaxed',
          isRuning ? 'bg-gray-50' : 'bg-white focus:border-gray-900'
        ]" />

        <div class="absolute bottom-2.5 left-3 right-3 flex items-center justify-between">
          <div class="flex gap-1">
            <button
              class="w-7 h-7 rounded-md border-none bg-transparent cursor-pointer flex items-center justify-center text-base text-gray-500 transition-all hover:bg-gray-50"
              title="上传附件">
              📎
            </button>
            <button
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
            </button>
          </div>

          <button @click="handleButtonClick" :disabled="buttonDisabled" :class="[
            'w-8 h-8 rounded-lg border-none cursor-pointer flex items-center justify-center text-base transition-all flex-shrink-0',
            buttonDisabled ? 'bg-gray-200 cursor-not-allowed' :
              isRuning
                ? 'bg-red-500 hover:bg-red-600'
                : 'bg-gray-900 hover:bg-black'
          ]" :title="isRuning ? '取消任务' : '发送消息'">
            <span class="text-white">{{ isRuning ? '✕' : '↑' }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>