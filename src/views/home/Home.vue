<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import MainLayout from '@/components/layout/MainLayout.vue';
import { Button } from '@/components/ui/button';
import FileReferenceInput from '@/components/workspace/FileReferenceInput.vue';
import ProjectGrid from '@/views/project/ProjectGrid.vue';
import { useAuthStore } from '@/stores/authStore';

interface FilePreview {
  id: string;
  name: string;
  type: string;
  url: string;
  file: File;
}

const authStore = useAuthStore();
const router = useRouter();

const videoPrompt = ref('');
const selectedMode = ref('one_click');
const aspectRatio = ref('9:16');
const videoType = ref('自动');
const showAspectRatioMenu = ref(false);
const showStyleMenu = ref(false);
const selectedFiles = ref<FilePreview[]>([]);

const aspectRatioMenuRef = ref<HTMLElement | null>(null);
const styleMenuRef = ref<HTMLElement | null>(null);

const modes = [
  { id: 'one_click', label: '一键成片', icon: '⚡' },
  { id: 'free_creation', label: '自由创作', icon: '🎨' },
  /*   { id: 'storyboard', label: '分镜脚本', icon: '📋' },
   */
];

const aspectRatios = [
  { id: '16:9', label: '16:9', description: '横屏' },
  { id: '9:16', label: '9:16', description: '竖屏' },
];

const styles = [
  { id: 'auto', label: '自动', icon: '🤖' },
  { id: 'guoman', label: '国漫', icon: '🐉' },
  { id: 'anime', label: '二次元', icon: '✨' },
  { id: 'realistic', label: '写实', icon: '📷' },
  { id: 'japanese', label: '日漫', icon: '🍭' },
  { id: 'american', label: '美漫', icon: '💥' },
  { id: 'cartoon', label: '卡通', icon: '🎪' },
  { id: 'cyberpunk', label: '赛博朋克', icon: '🌃' },
  { id: 'sketch', label: '简笔画', icon: '✏️' },
  { id: 'pixel', label: '像素风格', icon: '🎮' },
];

const suggestionsByMode: Record<string, string[]> = {
  one_click: [
    '制作一个产品宣传视频',
    '创建旅行Vlog剪辑',
    '生成教学演示视频',
    '制作婚礼回忆短片',
    '创建企业介绍视频',
    '生成音乐MV',
  ],
  free_creation: [
    '生成一张未来科技风格的插画',
    '创作一个悬疑短片的剧本大纲',
    '制作一段产品介绍视频',
    '设计一组社交媒体配图',
    '编写一个广告文案脚本',
    '生成品牌宣传海报',
  ],
  storyboard: [
    '一个咖啡店的温馨日常故事',
    '科幻题材的短片分镜',
    '产品发布会开场视频脚本',
    '旅行纪录片的叙事结构',
    '品牌故事微电影分镜',
    '教育类短视频脚本',
  ],
};

const placeholderByMode: Record<string, string> = {
  one_click: '输入视频创意主题、剧本或分镜，快速生成完整视频',
  free_creation: '输入创作需求，自由生成图片、视频等内容',
  storyboard: '输入剧本，智能生成专业分镜脚本',
};

const currentPlaceholder = computed(() => placeholderByMode[selectedMode.value]);

const handleFilesChange = (files: FilePreview[]) => {
  selectedFiles.value = files;
};

const handleSubmit = () => {
  // Check if user is authenticated before proceeding
  if (!authStore.isAuthenticated) {
    authStore.openLoginModal();
    return;
  }

  if (videoPrompt.value.trim()) {
    console.log('Submitting prompt:', videoPrompt.value);
    console.log('Selected files:', selectedFiles.value);

    let chatMessage = '';

    if (selectedMode.value === 'one_click') {
      chatMessage = `请使用一键成片技能为我创作视频，比例为${aspectRatio.value}，${videoType.value === '自动' ? '' : '风格为' + videoType.value + '，'}主题内容为：${videoPrompt.value}`;
    } else if (selectedMode.value === 'free_creation') {
      chatMessage = `${videoPrompt.value}`;
    } else if (selectedMode.value === 'storyboard') {
      chatMessage = `请根据内容撰写分镜脚本，内容为：${videoPrompt.value}`;
    }

    // Store files in sessionStorage since we can't pass File objects through router state
    if (selectedFiles.value.length > 0) {
      // Store file metadata (without the actual File object)
      const fileMetadata = selectedFiles.value.map(f => ({
        id: f.id,
        name: f.name,
        type: f.type,
        url: f.url,
      }));
      sessionStorage.setItem('pendingFiles', JSON.stringify(fileMetadata));

      // Store actual files in a temporary array that we'll access in Workspace
      (window as any).__pendingFiles = selectedFiles.value.map(f => f.file);
    }

    // Navigate to workspace/new and pass chatMessage via router state
    router.push({
      path: '/workspace/new',
      state: {
        chatMessage,
        hasFiles: selectedFiles.value.length > 0,
      },
    });
  }
};

const selectAspectRatio = (ratio: string) => {
  aspectRatio.value = ratio;
  showAspectRatioMenu.value = false;
};

const selectStyle = (style: string) => {
  videoType.value = styles.find(s => s.id === style)?.label || '电影感';
  showStyleMenu.value = false;
};

// Handle click outside to close menus
const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as Node;

  if (aspectRatioMenuRef.value && !aspectRatioMenuRef.value.contains(target)) {
    showAspectRatioMenu.value = false;
  }

  if (styleMenuRef.value && !styleMenuRef.value.contains(target)) {
    showStyleMenu.value = false;
  }
};

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});
</script>

<template>
  <MainLayout>
    <div class="bg-[#fafafa] px-2 py-20 sm:px-20">
      <div class="mx-auto max-w-[1000px]">
        <!-- Promo Banner & Title Section -->
        <div class="mb-14 flex flex-col items-center">
          <div
            v-if="!authStore.isAuthenticated"
            class="mb-6 inline-flex items-center gap-2 rounded-[20px] border border-[#fde68a] bg-[#fef3c7] px-5 py-2"
          >
            <span class="text-base">🎁</span>
            <span class="text-sm text-[#92400e]">新用户注册送1000积分～</span>
          </div>

          <div class="mb-5 flex items-center gap-3">
            <div
              class="flex h-10 w-10 items-center justify-center rounded-full bg-[#111827] text-xl font-bold text-white"
            >
              Z
            </div>
            <h1 class="m-0 text-[42px] font-bold tracking-tight text-[#111827]">ZeroCut AI</h1>
          </div>
          <p class="m-0 text-center text-lg font-normal text-[#6b7280]">
            让视频创作更简单，用自然语言描述，一键生成专业视频
          </p>
        </div>

        <!-- Main Input Card -->
        <div class="mb-10 w-full">
          <div
            class="relative mb-5 w-full rounded-2xl border border-[#e5e7eb] bg-white p-5 shadow-[0_4px_24px_rgba(0,0,0,0.08)]"
          >
            <FileReferenceInput
              v-model="videoPrompt"
              :placeholder="currentPlaceholder"
              :allow-file-pick="true"
              @files-change="handleFilesChange"
            >
              <template #actions="{ onMentionClick, onFilePickClick }">
                <div class="flex items-center justify-between border-t border-[#f3f4f6] pt-2">
                  <div class="flex items-center gap-2">
                    <!-- @ Mention Button -->
                    <button
                      @click="onMentionClick"
                      class="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border-none bg-transparent text-sm font-semibold text-gray-500 transition-all hover:bg-gray-50"
                      title="@大模型/文件"
                    >
                      @
                    </button>

                    <!-- File Pick Button -->
                    <button
                      @click="onFilePickClick"
                      class="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border-none bg-transparent text-base text-gray-500 transition-all hover:bg-gray-50"
                      title="选择文件"
                    >
                      📎
                    </button>

                    <div v-if="selectedMode === 'one_click'" class="ml-2 flex gap-2">
                      <!-- Aspect Ratio Selector -->
                      <div ref="aspectRatioMenuRef" class="relative">
                        <Button
                          variant="ghost"
                          size="sm"
                          @click="
                            showAspectRatioMenu = !showAspectRatioMenu;
                            showStyleMenu = false;
                          "
                          class="h-auto gap-1.5 rounded-lg border border-[#e5e7eb] bg-white px-3.5 py-2 text-[#6b7280] hover:bg-[#f9fafb]"
                        >
                          <span>📐</span>
                          <span>{{ aspectRatio }}</span>
                          <span class="text-xs">▼</span>
                        </Button>

                        <div
                          v-if="showAspectRatioMenu"
                          class="absolute bottom-full left-0 z-[1000] mb-2 min-w-[180px] rounded-xl border border-[#e5e7eb] bg-white p-2 shadow-[0_8px_24px_rgba(0,0,0,0.12)]"
                        >
                          <Button
                            v-for="ratio in aspectRatios"
                            :key="ratio.id"
                            variant="ghost"
                            @click="selectAspectRatio(ratio.id)"
                            :class="[
                              'h-auto w-full justify-between rounded-lg px-3 py-2.5 text-left',
                              aspectRatio === ratio.id ? 'bg-[#f3f4f6]' : 'hover:bg-[#f9fafb]',
                            ]"
                          >
                            <span class="text-sm font-medium text-[#111827]">{{ ratio.label }}</span>
                            <span class="text-xs text-[#9ca3af]">{{ ratio.description }}</span>
                          </Button>
                        </div>
                      </div>

                      <!-- Style Selector -->
                      <div ref="styleMenuRef" class="relative">
                        <Button
                          variant="ghost"
                          size="sm"
                          @click="
                            showStyleMenu = !showStyleMenu;
                            showAspectRatioMenu = false;
                          "
                          class="h-auto gap-1.5 rounded-lg border border-[#e5e7eb] bg-white px-3.5 py-2 text-[#6b7280] hover:bg-[#f9fafb]"
                        >
                          <span>{{ styles.find(s => s.label === videoType)?.icon || '🎬' }}</span>
                          <span>{{ videoType }}</span>
                          <span class="text-xs">▼</span>
                        </Button>

                        <div
                          v-if="showStyleMenu"
                          class="absolute bottom-full left-0 z-[1000] mb-2 min-w-[200px] rounded-xl border border-[#e5e7eb] bg-white p-2 shadow-[0_8px_24px_rgba(0,0,0,0.12)]"
                        >
                          <Button
                            v-for="style in styles"
                            :key="style.id"
                            variant="ghost"
                            @click="selectStyle(style.id)"
                            :class="[
                              'h-auto w-full justify-start gap-2.5 rounded-lg px-3 py-1.5 text-left',
                              videoType === style.label ? 'bg-[#f3f4f6]' : 'hover:bg-[#f9fafb]',
                            ]"
                          >
                            <span class="text-lg">{{ style.icon }}</span>
                            <span class="text-sm font-medium text-[#111827]">{{ style.label }}</span>
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Submit Button -->
                  <Button
                    @click="handleSubmit"
                    :disabled="!videoPrompt.trim()"
                    :class="[
                      'h-9 w-9 flex-shrink-0 rounded-full p-0 transition-all',
                      videoPrompt.trim()
                        ? 'bg-[#111827] hover:scale-105 hover:bg-black'
                        : 'cursor-not-allowed bg-[#e5e7eb]',
                    ]"
                  >
                    <span class="text-lg text-white">↑</span>
                  </Button>
                </div>
              </template>
            </FileReferenceInput>
          </div>

          <!-- Mode Selection Buttons -->
          <div class="mb-5 flex justify-center gap-3">
            <Button
              v-for="mode in modes"
              :key="mode.id"
              @click="selectedMode = mode.id"
              :variant="selectedMode === mode.id ? 'default' : 'outline'"
              :class="[
                'h-auto gap-2 rounded-3xl px-6 py-3 text-[15px] font-medium transition-all',
                selectedMode === mode.id
                  ? 'border-2 border-[#111827] bg-[#111827] text-white'
                  : 'border-2 border-[#e5e7eb] bg-white text-[#6b7280] hover:-translate-y-0.5 hover:border-[#d1d5db]',
              ]"
            >
              <span>{{ mode.icon }}</span>
              <span>{{ mode.label }}</span>
            </Button>
          </div>

          <!-- Quick Templates -->
          <div class="grid grid-cols-3 gap-3">
            <button
              v-for="template in suggestionsByMode[selectedMode]"
              :key="template"
              @click="videoPrompt = template"
              class="cursor-pointer rounded-xl border border-[#e5e7eb] bg-white p-4 text-left text-sm text-[#6b7280] transition-all hover:-translate-y-0.5 hover:border-[#d1d5db] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
            >
              {{ template }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Project Grid Section -->
    <ProjectGrid :is-in-home-page="true" v-if="authStore.isAuthenticated" />
  </MainLayout>
</template>
