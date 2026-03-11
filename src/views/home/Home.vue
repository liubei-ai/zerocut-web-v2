<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import MainLayout from '@/components/layout/MainLayout.vue';
import { Button } from '@/components/ui/button';
import FileReferenceInput from '@/components/workspace/FileReferenceInput.vue';
import ProjectGrid from '@/views/project/ProjectGrid.vue';
import { useAuthStore } from '@/stores/authStore';
import { useCreditsStore } from '@/stores/creditsStore';
import { useMembershipModalStore } from '@/stores/membershipModalStore';
import { getSystemConfig, type TemplateItem } from '@/api/systemApi';
import { useToast } from '@/composables/useToast';

interface FilePreview {
  id: string;
  name: string;
  type: string;
  url: string;
  file: File;
}

const authStore = useAuthStore();
const creditsStore = useCreditsStore();
const membershipModalStore = useMembershipModalStore();
const router = useRouter();
const { toast } = useToast();

const videoPrompt = ref('');
const selectedMode = ref('free_creation');
const aspectRatio = ref('9:16');
const videoType = ref('自动');
const showAspectRatioMenu = ref(false);
const showStyleMenu = ref(false);
const selectedFiles = ref<FilePreview[]>([]);
const homeTips = ref('新用户注册送1000积分～');
const priceConfig = ref<any>(null);

// Free creation mode options
const freeCreationMode = ref('video_generation'); // 'agent' or 'video_generation'
const videoModel = ref('zerocut3.0');
const videoDuration = ref('15s');
const videoAspectRatio = ref('9:16');
const showFreeCreationModeMenu = ref(false);
const showVideoModelMenu = ref(false);
const showVideoDurationMenu = ref(false);
const showVideoAspectRatioMenu = ref(false);

const aspectRatioMenuRef = ref<HTMLElement | null>(null);
const styleMenuRef = ref<HTMLElement | null>(null);
const freeCreationModeMenuRef = ref<HTMLElement | null>(null);
const videoModelMenuRef = ref<HTMLElement | null>(null);
const videoDurationMenuRef = ref<HTMLElement | null>(null);
const videoAspectRatioMenuRef = ref<HTMLElement | null>(null);

const modes = [
  { id: 'free_creation', label: '自由创作', icon: '🎨' },
  { id: 'one_click', label: '一键成片', icon: '⚡' },
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

const freeCreationModes = [
  { id: 'video_generation', label: '视频生成' },
  { id: 'agent', label: 'Agent模式' },
];

const videoModels = [{ id: 'zerocut3.0', label: 'ZeroCut 3.0', description: '默认' }];

const videoDurations = [
  { id: '5s', label: '5秒', description: '宫格分镜' },
  { id: '10s', label: '10秒', description: '宫格分镜' },
  { id: '15s', label: '15秒', description: '宫格分镜' },
];

// Derive duration map from videoDurations array
const durationMap = videoDurations.reduce(
  (acc, item) => {
    acc[item.id] = `${item.label}`;
    return acc;
  },
  {} as Record<string, string>,
);

const videoAspectRatios = [
  { id: '9:16', label: '9:16', description: '竖屏' },
  { id: '16:9', label: '16:9', description: '横屏' },
];

const suggestionsByMode = ref<Record<string, TemplateItem[]>>({
  one_click: [
    { name: '制作一个产品宣传视频', placeholder: '制作一个产品宣传视频' },
    { name: '创建旅行Vlog剪辑', placeholder: '创建旅行Vlog剪辑' },
    { name: '生成教学演示视频', placeholder: '生成教学演示视频' },
    { name: '制作婚礼回忆短片', placeholder: '制作婚礼回忆短片' },
    { name: '创建企业介绍视频', placeholder: '创建企业介绍视频' },
    { name: '生成音乐MV', placeholder: '生成音乐MV' },
  ],
  free_creation: [
    { name: '生成一张未来科技风格的插画', placeholder: '生成一张未来科技风格的插画' },
    { name: '创作一个悬疑短片的剧本大纲', placeholder: '创作一个悬疑短片的剧本大纲' },
    { name: '制作一段产品介绍视频', placeholder: '制作一段产品介绍视频' },
    { name: '设计一组社交媒体配图', placeholder: '设计一组社交媒体配图' },
    { name: '编写一个广告文案脚本', placeholder: '编写一个广告文案脚本' },
    { name: '生成品牌宣传海报', placeholder: '生成品牌宣传海报' },
  ],
  /* storyboard: [
    '一个咖啡店的温馨日常故事',
    '科幻题材的短片分镜',
    '产品发布会开场视频脚本',
    '旅行纪录片的叙事结构',
    '品牌故事微电影分镜',
    '教育类短视频脚本',
  ], */
});

const placeholderByMode: Record<string, string> = {
  one_click: '输入视频创意主题、剧本或分镜，快速生成完整视频',
  free_creation: '最多支持上传6张参考图，可自由组合图片等元素，描述视频的创意内容。例如参考 @图片 输入具体的创意内容。',
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

  // Check if user has enough credits for video generation
  if (
    creditsStore.creditsBalance !== null &&
    creditsNeeded.value > 0 &&
    creditsNeeded.value > creditsStore.creditsBalance
  ) {
    toast.error(
      `积分不足！需要 ${creditsNeeded.value} 积分，当前余额 ${creditsStore.creditsBalance} 积分`,
      '积分不足',
    );
    membershipModalStore.openMembershipModal();
    return;
  }

  if (videoPrompt.value.trim()) {
    console.log('Submitting prompt:', videoPrompt.value);
    console.log('Selected files:', selectedFiles.value);

    let chatMessage = '';

    if (selectedMode.value === 'one_click') {
      chatMessage = `请使用一键成片技能为我创作视频，比例为${aspectRatio.value}，${videoType.value === '自动' ? '' : '风格为' + videoType.value + '，'}主题内容为：${videoPrompt.value}`;
    } else if (selectedMode.value === 'free_creation') {
      if (freeCreationMode.value === 'agent') {
        chatMessage = `${videoPrompt.value}`;
      } else {
        // Video generation mode
        const aspectRatioMap: Record<string, string> = {
          '9:16': '9:16竖屏',
          '16:9': '16:9横屏',
        };

        // Build prompt for unmentioned files
        let filePrompt = '';
        if (selectedFiles.value.length > 0) {
          const unmentionedFiles = selectedFiles.value.filter(file => !videoPrompt.value.includes(file.name));

          if (selectedFiles.value.length > 0) {
            const fileNames = selectedFiles.value.map(f => f.name).join(',');
            filePrompt = `(${fileNames})`;
          }
        }

        chatMessage = `根据以下内容使用素材创作技能，参考生视频${filePrompt}，模型使用${videoModel.value}，${aspectRatioMap[videoAspectRatio.value]}，${durationMap[videoDuration.value]}。内容：${videoPrompt.value}`;
      }
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
    console.log('chatMessage', chatMessage);
    //return;
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

const selectFreeCreationMode = (mode: string) => {
  freeCreationMode.value = mode;
  showFreeCreationModeMenu.value = false;
};

const selectVideoModel = (model: string) => {
  videoModel.value = model;
  showVideoModelMenu.value = false;
};

const selectVideoDuration = (duration: string) => {
  videoDuration.value = duration;
  showVideoDurationMenu.value = false;
};

const selectVideoAspectRatio = (ratio: string) => {
  videoAspectRatio.value = ratio;
  showVideoAspectRatioMenu.value = false;
};

// Calculate credits needed for video generation
const creditsNeeded = computed(() => {
  if (selectedMode.value !== 'free_creation' || freeCreationMode.value !== 'video_generation') {
    return 0;
  }

  const durationSeconds = parseInt(videoDuration.value);

  // Use web_price_v3 config if available
  if (priceConfig.value) {
    const resolution720p = priceConfig.value.resolutions?.find((r: any) => r.name === '720p');
    if (resolution720p) {
      const { min_price, additional_price_per_second, time_range } = resolution720p;
      return min_price + (durationSeconds - time_range.min) * additional_price_per_second;
    }
  }

  // Fallback to old calculation
  return 30 + 24 * durationSeconds;
});

// Handle click outside to close menus
const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as Node;

  if (aspectRatioMenuRef.value && !aspectRatioMenuRef.value.contains(target)) {
    showAspectRatioMenu.value = false;
  }

  if (styleMenuRef.value && !styleMenuRef.value.contains(target)) {
    showStyleMenu.value = false;
  }

  if (freeCreationModeMenuRef.value && !freeCreationModeMenuRef.value.contains(target)) {
    showFreeCreationModeMenu.value = false;
  }

  if (videoModelMenuRef.value && !videoModelMenuRef.value.contains(target)) {
    showVideoModelMenu.value = false;
  }

  if (videoDurationMenuRef.value && !videoDurationMenuRef.value.contains(target)) {
    showVideoDurationMenu.value = false;
  }

  if (videoAspectRatioMenuRef.value && !videoAspectRatioMenuRef.value.contains(target)) {
    showVideoAspectRatioMenu.value = false;
  }
};

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
  loadSystemConfig();
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});

const loadSystemConfig = async () => {
  try {
    const config = await getSystemConfig([
      'web_home_tips',
      'web_price_v3',
      'web_home_auto_recommend',
      'web_home_free_recommend',
    ]);
    if (config.webHomeTips?.key) {
      homeTips.value = config.webHomeTips.key;
    }

    // Store price config
    if (config.webPriceV3) {
      priceConfig.value = config.webPriceV3;
    }

    const webHomeAutoRecommend = config.webHomeAutoRecommend;
    const webHomeFreeRecommend = config.webHomeFreeRecommend;
    if (webHomeAutoRecommend && webHomeAutoRecommend.length > 0) {
      suggestionsByMode.value.one_click = webHomeAutoRecommend;
    }
    if (webHomeFreeRecommend && webHomeFreeRecommend.length > 0) {
      suggestionsByMode.value.free_creation = webHomeFreeRecommend;
    }
  } catch (error) {
    console.error('Failed to load system config:', error);
  }
};
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
            <span class="text-sm text-[#92400e]">{{ homeTips }}</span>
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
            class="relative mb-5 w-full rounded-2xl border border-[#e5e7eb] bg-white p-5 shadow-[0_4px_24px_rgba(0,0,0,0.08)] transition-all duration-300"
          >
            <FileReferenceInput
              v-model="videoPrompt"
              :placeholder="currentPlaceholder"
              :allow-file-pick="true"
              :show-mode-selector="true"
              @files-change="handleFilesChange"
            >
              <!-- Mode Selection Buttons -->
              <template #mode-selector>
                <div class="flex justify-center gap-2.5">
                  <Button
                    v-for="mode in modes"
                    :key="mode.id"
                    @click="selectedMode = mode.id"
                    :variant="selectedMode === mode.id ? 'default' : 'outline'"
                    :class="[
                      'h-auto gap-2 rounded-2xl border-2 px-5 py-2.5 text-[14px] font-medium transition-colors',
                      selectedMode === mode.id
                        ? 'border-[#111827] bg-[#111827] text-white shadow-sm'
                        : 'border-[#e5e7eb] bg-white text-[#6b7280] hover:border-[#111827] hover:text-[#111827]',
                    ]"
                  >
                    <span>{{ mode.icon }}</span>
                    <span>{{ mode.label }}</span>
                  </Button>
                </div>
              </template>
              <template #actions="{ onMentionClick, onFilePickClick }">
                <div
                  class="flex flex-col gap-3 border-t border-[#f3f4f6] pt-2 sm:flex-row sm:items-start sm:justify-between sm:gap-2"
                >
                  <!-- Mode Options Row with fixed min-height to prevent layout shift -->
                  <div class="relative flex min-h-[88px] flex-wrap content-start items-start gap-2 transition-all duration-200 sm:min-h-[44px]">
                    <!-- One Click Mode Options -->
                    <div v-if="selectedMode === 'one_click'" class="ml-0 flex flex-wrap gap-2 sm:ml-2">
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

                    <!-- Free Creation Mode Options -->
                    <div v-if="selectedMode === 'free_creation'" class="ml-0 flex flex-wrap gap-2 sm:ml-2">
                      <!-- Mode Selector -->
                      <div ref="freeCreationModeMenuRef" class="relative">
                        <Button
                          variant="ghost"
                          size="sm"
                          @click="
                            showFreeCreationModeMenu = !showFreeCreationModeMenu;
                            showVideoModelMenu = false;
                            showVideoDurationMenu = false;
                            showVideoAspectRatioMenu = false;
                          "
                          class="h-auto gap-1.5 rounded-lg border border-[#e5e7eb] bg-white px-3.5 py-2 text-[#6b7280] hover:bg-[#f9fafb]"
                        >
                          <span>🤖</span>
                          <span>{{ freeCreationModes.find(m => m.id === freeCreationMode)?.label }}</span>
                          <span class="text-xs">▼</span>
                        </Button>

                        <div
                          v-if="showFreeCreationModeMenu"
                          class="absolute bottom-full left-0 z-[1000] mb-2 min-w-[160px] rounded-xl border border-[#e5e7eb] bg-white p-2 shadow-[0_8px_24px_rgba(0,0,0,0.12)]"
                        >
                          <Button
                            v-for="mode in freeCreationModes"
                            :key="mode.id"
                            variant="ghost"
                            @click="selectFreeCreationMode(mode.id)"
                            :class="[
                              'h-auto w-full justify-start rounded-lg px-3 py-2.5 text-left',
                              freeCreationMode === mode.id ? 'bg-[#f3f4f6]' : 'hover:bg-[#f9fafb]',
                            ]"
                          >
                            <span class="text-sm font-medium text-[#111827]">{{ mode.label }}</span>
                          </Button>
                        </div>
                      </div>

                      <!-- Video Generation Options (only show when video_generation mode is selected) -->
                      <template v-if="freeCreationMode === 'video_generation'">
                        <!-- Model Selector -->
                        <div ref="videoModelMenuRef" class="relative">
                          <Button
                            variant="ghost"
                            size="sm"
                            @click="
                              showVideoModelMenu = !showVideoModelMenu;
                              showFreeCreationModeMenu = false;
                              showVideoDurationMenu = false;
                              showVideoAspectRatioMenu = false;
                            "
                            class="h-auto gap-1.5 rounded-lg border border-[#e5e7eb] bg-white px-3.5 py-2 text-[#6b7280] hover:bg-[#f9fafb]"
                          >
                            <span>🎯</span>
                            <span>{{ videoModels.find(m => m.id === videoModel)?.label }}</span>
                            <span class="text-xs">▼</span>
                          </Button>

                          <div
                            v-if="showVideoModelMenu"
                            class="absolute bottom-full left-0 z-[1000] mb-2 min-w-[200px] rounded-xl border border-[#e5e7eb] bg-white p-2 shadow-[0_8px_24px_rgba(0,0,0,0.12)]"
                          >
                            <Button
                              v-for="model in videoModels"
                              :key="model.id"
                              variant="ghost"
                              @click="selectVideoModel(model.id)"
                              :class="[
                                'h-auto w-full justify-between rounded-lg px-3 py-2.5 text-left',
                                videoModel === model.id ? 'bg-[#f3f4f6]' : 'hover:bg-[#f9fafb]',
                              ]"
                            >
                              <span class="text-sm font-medium text-[#111827]">{{ model.label }}</span>
                              <span class="text-xs text-[#9ca3af]">{{ model.description }}</span>
                            </Button>
                          </div>
                        </div>

                        <!-- Duration Selector -->
                        <div ref="videoDurationMenuRef" class="relative">
                          <Button
                            variant="ghost"
                            size="sm"
                            @click="
                              showVideoDurationMenu = !showVideoDurationMenu;
                              showFreeCreationModeMenu = false;
                              showVideoModelMenu = false;
                              showVideoAspectRatioMenu = false;
                            "
                            class="h-auto gap-1.5 rounded-lg border border-[#e5e7eb] bg-white px-3.5 py-2 text-[#6b7280] hover:bg-[#f9fafb]"
                          >
                            <span>⏱️</span>
                            <span>{{ videoDurations.find(d => d.id === videoDuration)?.label }}</span>
                            <span class="text-xs">▼</span>
                          </Button>

                          <div
                            v-if="showVideoDurationMenu"
                            class="absolute bottom-full left-0 z-[1000] mb-2 min-w-[100px] rounded-xl border border-[#e5e7eb] bg-white p-2 shadow-[0_8px_24px_rgba(0,0,0,0.12)]"
                          >
                            <Button
                              v-for="duration in videoDurations"
                              :key="duration.id"
                              variant="ghost"
                              @click="selectVideoDuration(duration.id)"
                              :class="[
                                'h-auto w-full justify-between rounded-lg px-3 py-2.5 text-left',
                                videoDuration === duration.id ? 'bg-[#f3f4f6]' : 'hover:bg-[#f9fafb]',
                              ]"
                            >
                              <span class="text-sm font-medium text-[#111827]">{{ duration.label }}</span>
                              <!-- <span class="text-xs text-[#9ca3af]">{{ duration.description }}</span> -->
                            </Button>
                          </div>
                        </div>

                        <!-- Aspect Ratio Selector -->
                        <div ref="videoAspectRatioMenuRef" class="relative">
                          <Button
                            variant="ghost"
                            size="sm"
                            @click="
                              showVideoAspectRatioMenu = !showVideoAspectRatioMenu;
                              showFreeCreationModeMenu = false;
                              showVideoModelMenu = false;
                              showVideoDurationMenu = false;
                            "
                            class="h-auto gap-1.5 rounded-lg border border-[#e5e7eb] bg-white px-3.5 py-2 text-[#6b7280] hover:bg-[#f9fafb]"
                          >
                            <span>📐</span>
                            <span>{{ videoAspectRatio }}</span>
                            <span class="text-xs">▼</span>
                          </Button>

                          <div
                            v-if="showVideoAspectRatioMenu"
                            class="absolute bottom-full left-0 z-[1000] mb-2 min-w-[180px] rounded-xl border border-[#e5e7eb] bg-white p-2 shadow-[0_8px_24px_rgba(0,0,0,0.12)]"
                          >
                            <Button
                              v-for="ratio in videoAspectRatios"
                              :key="ratio.id"
                              variant="ghost"
                              @click="selectVideoAspectRatio(ratio.id)"
                              :class="[
                                'h-auto w-full justify-between rounded-lg px-3 py-2.5 text-left',
                                videoAspectRatio === ratio.id ? 'bg-[#f3f4f6]' : 'hover:bg-[#f9fafb]',
                              ]"
                            >
                              <span class="text-sm font-medium text-[#111827]">{{ ratio.label }}</span>
                              <span class="text-xs text-[#9ca3af]">{{ ratio.description }}</span>
                            </Button>
                          </div>
                        </div>
                      </template>
                    </div>
                  </div>

                  <!-- Action Buttons Row -->
                  <div class="flex w-full flex-1 items-center justify-between gap-2">
                    <!-- Left side: Mention and File Pick buttons -->
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
                    </div>

                    <!-- Right side: Credits and Submit button -->
                    <div class="flex items-center gap-2">
                      <!-- Credits Display (only for video_generation mode) -->
                      <div
                        v-if="selectedMode === 'free_creation' && freeCreationMode === 'video_generation'"
                        class="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm"
                      >
                        <span class="text-base">💎</span>
                        <span class="font-medium text-[#6b7280]">{{ creditsNeeded }}</span>
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
                  </div>
                </div>
              </template>
            </FileReferenceInput>
          </div>

          <!-- Quick Templates -->
          <div class="grid grid-cols-3 gap-3">
            <button
              v-for="template in suggestionsByMode[selectedMode]"
              :key="template.name"
              @click="videoPrompt = template.placeholder"
              class="cursor-pointer rounded-xl border border-[#e5e7eb] bg-white p-4 text-center text-sm text-[#6b7280] transition-all hover:-translate-y-0.5 hover:border-[#d1d5db] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
            >
              {{ template.name }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Project Grid Section -->
    <ProjectGrid :is-in-home-page="true" v-if="authStore.isAuthenticated" />
  </MainLayout>
</template>
