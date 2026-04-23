<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import MainLayout from '@/components/layout/MainLayout.vue';
import { Button } from '@/components/ui/button';
import FileReferenceInput from '@/components/workspace/FileReferenceInput.vue';
import ProjectGrid from '@/views/project/ProjectGrid.vue';
import { useAuthStore } from '@/stores/authStore';
import { useCreditsStore } from '@/stores/creditsStore';
import { useMembershipModalStore } from '@/stores/membershipModalStore';
import { useDebugStore } from '@/stores/debugStore';
import { getSystemConfig, type TemplateItem } from '@/api/systemApi';
import { useToast } from '@/composables/useToast';
import { videoModels, videoDurations, videoAspectRatios, videoResolutions } from '@/config/videoGeneration';
import { calculateVideoCredits } from '@/utils/videoPriceCalculator';
import { MAX_FILES } from '@/types/fileReference';
import type { FilePreview } from '@/types/fileReference';

const authStore = useAuthStore();
const creditsStore = useCreditsStore();
const membershipModalStore = useMembershipModalStore();
const debugStore = useDebugStore();
const router = useRouter();
const videoPrompt = ref('');
const selectedMode = ref('free_creation');
const aspectRatio = ref('9:16');
const videoType = ref('自动');
const showAspectRatioMenu = ref(false);
const showStyleMenu = ref(false);
const selectedFiles = ref<FilePreview[]>([]);
const homeTips = ref('新用户注册送1000积分～');
const priceConfig = ref<any>(null);
const { toast } = useToast();

// Free creation mode options
const freeCreationMode = ref('image_generation'); // 'agent' or 'video_generation' or 'image_generation'

// Video generation reference mode
const videoReferenceMode = ref<'reference' | 'first_last_frame'>('reference'); // 'reference' 全能参考, 'first_last_frame' 首尾帧

const videoModel = ref('seedance-2.0');

const videoDuration = ref('5s');
const videoAspectRatio = ref('9:16');
const videoResolution = ref<'720p' | '1080p'>('720p');
const showFreeCreationModeMenu = ref(false);
const showVideoModelMenu = ref(false);
const showVideoReferenceModeMenu = ref(false);
const showVideoDurationMenu = ref(false);
const showVideoAspectRatioMenu = ref(false);
const showVideoResolutionMenu = ref(false);

const aspectRatioMenuRef = ref<HTMLElement | null>(null);
const styleMenuRef = ref<HTMLElement | null>(null);
const freeCreationModeMenuRef = ref<HTMLElement | null>(null);
const videoModelMenuRef = ref<HTMLElement | null>(null);
const videoReferenceModeMenuRef = ref<HTMLElement | null>(null);
const videoDurationMenuRef = ref<HTMLElement | null>(null);
const videoAspectRatioMenuRef = ref<HTMLElement | null>(null);
const videoResolutionMenuRef = ref<HTMLElement | null>(null);

const firstFrameImage = ref<FilePreview | null>(null);
const lastFrameImage = ref<FilePreview | null>(null);

const getFirstFrameImage = computed(() => {
  if (videoReferenceMode.value === 'first_last_frame') {
    return firstFrameImage.value;
  }
  return null;
});

const getLastFrameImage = computed(() => {
  if (videoReferenceMode.value === 'first_last_frame') {
    return lastFrameImage.value;
  }
  return null;
});

const removeFile = (fileId: string) => {
  const file = selectedFiles.value.find(f => f.id === fileId);
  if (file) {
    URL.revokeObjectURL(file.url);
    selectedFiles.value = selectedFiles.value.filter(f => f.id !== fileId);
  }
  if (firstFrameImage.value?.id === fileId) {
    firstFrameImage.value = null;
  }
  if (lastFrameImage.value?.id === fileId) {
    lastFrameImage.value = null;
  }
};

const shouldShowAttachmentButton = computed(() => {
  if (selectedMode.value !== 'free_creation') {
    return true;
  }
  return freeCreationMode.value === 'agent' || freeCreationMode.value === 'image_generation';
});

const shouldAllowFilePick = computed(() => {
  if (selectedMode.value !== 'free_creation') {
    return true;
  }
  return freeCreationMode.value === 'video_generation' || freeCreationMode.value === 'agent' || freeCreationMode.value === 'image_generation';
});

const shouldShowAtButton = computed(() => {
  return true;
});

const acceptFileTypes = computed(() => {
  if (selectedMode.value === 'free_creation' && freeCreationMode.value === 'image_generation') {
    return 'image/*';
  }
  return 'image/*,video/*,audio/*';
});

const addButtonText = computed(() => {
  if (selectedMode.value === 'free_creation' && freeCreationMode.value === 'image_generation') {
    return '添加参考';
  }
  return '添加参考';
});

const addButtonSubtext = computed(() => {
  if (selectedMode.value === 'free_creation' && freeCreationMode.value === 'image_generation') {
    return '仅支持图片';
  }
  return '图片/视频/音频';
});

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
  { id: 'image_generation', label: '图片生成' },
  { id: 'agent', label: 'Agent模式' },
];

const imageModel = ref('gpt-image-2');
const showImageModelMenu = ref(false);
const imageModelMenuRef = ref<HTMLElement | null>(null);

const imageModels = [
  { id: 'gpt-image-2', label: 'GPT-image2' },
  { id: 'banana2', label: 'Banana 2' },
  { id: 'banana-pro', label: 'Banana Pro' },
  { id: 'seedream-pro', label: 'Seedream Pro' },
  { id: 'seedream-5.0-lite', label: 'Seedream 5.0 Lite' },
  { id: 'midjourney', label: 'Midjourney' },
  { id: 'midjourney-niji', label: 'Midjourney Niji' },
];

const selectImageModel = (model: string) => {
  imageModel.value = model;
  showImageModelMenu.value = false;
};

const availableImageAspectRatios = computed(() => {
  const baseAll = [
    { id: '1:1', label: '1:1', description: '正方形' },
    { id: '9:16', label: '9:16', description: '竖屏' },
    { id: '16:9', label: '16:9', description: '横屏' },
    { id: '3:4', label: '3:4', description: '竖屏' },
    { id: '4:3', label: '4:3', description: '横屏' },
    { id: '21:9', label: '21:9', description: '宽屏' },
  ];

  const extended = [
    { id: '1:4', label: '1:4', description: '超长竖屏' },
    { id: '4:1', label: '4:1', description: '超长横屏' },
    { id: '1:8', label: '1:8', description: '极长竖屏' },
    { id: '8:1', label: '8:1', description: '极长横屏' },
  ];

  if (imageModel.value === 'gpt-image-2') {
    return baseAll.slice(0, 3);
  }

  if (imageModel.value === 'banana2' || imageModel.value === 'seedream-5.0-lite') {
    return [...baseAll, ...extended];
  }

  return baseAll;
});

const availableVideoAspectRatios = computed(() => {
  const allRatios = [
    { id: '1:1', label: '1:1', description: '正方形' },
    { id: '9:16', label: '9:16', description: '竖屏' },
    { id: '16:9', label: '16:9', description: '横屏' },
    { id: '3:4', label: '3:4', description: '竖屏' },
    { id: '4:3', label: '4:3', description: '横屏' },
    { id: '21:9', label: '21:9', description: '宽屏' },
  ];

  if (videoModel.value.startsWith('zerocut3.0')) {
    return allRatios.filter(ratio => ['1:1', '16:9', '9:16'].includes(ratio.id));
  }

  return allRatios;
});

// Derive duration map from videoDurations array
const durationMap = videoDurations.reduce(
  (acc, item) => {
    acc[item.id] = `${item.label}`;
    return acc;
  },
  {} as Record<string, string>,
);

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
  image_generation: [
    { name: '赛博朋克城市夜景', placeholder: '赛博朋克风格的城市夜景，霓虹灯倒映在雨后的街道上，高楼林立，充满未来感' },
    { name: '水墨山水画', placeholder: '中国传统水墨风格的山水画，云雾缭绕的山峰，远处有一叶扁舟，意境悠远' },
    { name: '可爱动物插画', placeholder: '一只穿着宇航服的柴犬漂浮在太空中，背景是星云和行星，卡通插画风格' },
    { name: '梦幻森林场景', placeholder: '魔法森林中的精灵小屋，蘑菇发光，萤火虫飞舞，唯美奇幻风格' },
    { name: '产品概念海报', placeholder: '极简主义风格的香水广告海报，玻璃瓶在柔和光线下折射出彩虹光晕，高端质感' },
    { name: '复古胶片人像', placeholder: '复古胶片风格的街头人像摄影，暖色调，浅景深，充满年代感' },
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

const currentPlaceholder = computed(() => {
  if (selectedMode.value === 'free_creation' && freeCreationMode.value === 'image_generation') {
    return '描述你想生成的图片内容，例如：一只可爱的小猫在魔法世界中荡秋千';
  }
  if (selectedMode.value === 'free_creation' && freeCreationMode.value === 'video_generation') {
    if (videoReferenceMode.value === 'first_last_frame') {
      return `上传首帧和尾帧图片，描述视频内容。例如：${MAX_FILES > 2 ? '@图片1 作为首帧，@图片2 作为尾帧' : '@图片1 作为首帧，@图片2 作为尾帧'}`;
    }
    return `上传1-${MAX_FILES}个参考素材、输入文字，自由组合图、文、音、视频多元素，定义精彩创意。例如：@图片1 模仿 @视频1 的动作，音色参考 @音频1。`;
  }
  return placeholderByMode[selectedMode.value];
});

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
    selectedMode.value === 'free_creation' &&
    freeCreationMode.value === 'video_generation' &&
    creditsStore.creditsBalance !== null &&
    creditsNeeded.value !== null &&
    creditsNeeded.value > 0 &&
    creditsNeeded.value > creditsStore.creditsBalance.valueOf()
  ) {
    toast.error(`积分不足！需要 ${creditsNeeded.value} 积分，当前余额 ${creditsStore.creditsBalance} 积分`, '积分不足');
    if (debugStore.isDebugMode) {
      membershipModalStore.openMembershipModal();
    }
    return;
  }

  if (videoPrompt.value.trim()) {
    console.log('Submitting prompt:', videoPrompt.value);
    console.log('Selected files:', selectedFiles.value);
    console.log('First frame:', firstFrameImage.value);
    console.log('Last frame:', lastFrameImage.value);
    console.log('Selected mode:', selectedMode.value);
    console.log('Free creation mode:', freeCreationMode.value);

    // Check if we're in video generation mode
    const isVideoGenerationMode =
      selectedMode.value === 'free_creation' && freeCreationMode.value === 'video_generation';

    let chatMessage = '';

    if (selectedMode.value === 'one_click') {
      chatMessage = `请使用一键成片技能为我创作视频，比例为${aspectRatio.value}，${videoType.value === '自动' ? '' : '风格为' + videoType.value + '，'}主题内容为：${videoPrompt.value}`;
    } else if (selectedMode.value === 'free_creation') {
      if (freeCreationMode.value === 'agent') {
        chatMessage = `${videoPrompt.value}`;
      } else if (freeCreationMode.value === 'image_generation') {
        const aspectRatioMap: Record<string, string> = {
          '1:1': '正方形1:1',
          '9:16': '竖屏9:16',
          '16:9': '横屏16:9',
          '3:4': '竖屏3:4',
          '4:3': '横屏4:3',
          '21:9': '宽屏21:9',
          '1:4': '超长竖屏1:4',
          '4:1': '超长横屏4:1',
          '1:8': '极长竖屏1:8',
          '8:1': '极长横屏8:1',
        };
        chatMessage = `请使用${imageModels.find(m => m.id === imageModel.value)?.id || imageModel.value}模型生成图片，${aspectRatioMap[videoAspectRatio.value] || videoAspectRatio.value}，内容为：${videoPrompt.value}`;
      } else {
        // Video generation mode - use workflow API instead of chat
        chatMessage = videoPrompt.value;
      }
    } else if (selectedMode.value === 'storyboard') {
      chatMessage = `请根据内容撰写分镜脚本，内容为：${videoPrompt.value}`;
    }

    // In first_last_frame mode, add first and last frame images to selectedFiles for upload
    let filesToUpload = [...selectedFiles.value];
    if (videoReferenceMode.value === 'first_last_frame') {
      if (firstFrameImage.value) {
        filesToUpload.push(firstFrameImage.value);
      }
      if (lastFrameImage.value) {
        filesToUpload.push(lastFrameImage.value);
      }
    }

    // Store files in sessionStorage since we can't pass File objects through router state
    if (filesToUpload.length > 0) {
      // Store file metadata (without the actual File object)
      const fileMetadata = filesToUpload.map(f => ({
        id: f.id,
        name: f.name,
        type: f.type,
        url: f.url,
      }));
      sessionStorage.setItem('pendingFiles', JSON.stringify(fileMetadata));

      // Store actual files in a temporary array that we'll access in Workspace
      (window as any).__pendingFiles = filesToUpload.map(f => f.file);
    }

    // Navigate to workspace/new and pass chatMessage via router state
    console.log('chatMessage', chatMessage);
    console.log('isVideoGenerationMode', isVideoGenerationMode);

    router.push({
      path: '/workspace/new',
      state: {
        chatMessage,
        hasFiles: filesToUpload.length > 0,
        generationMode: isVideoGenerationMode ? 'video_generation' : 'agent',
        prompt: videoPrompt.value,
        videoModel: videoModel.value,
        videoDuration: parseInt(videoDuration.value),
        videoAspectRatio: videoAspectRatio.value,
        videoResolution: videoResolution.value,
        videoReferenceMode: videoReferenceMode.value,
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

const selectVideoResolution = (resolution: '720p' | '1080p') => {
  videoResolution.value = resolution;
  showVideoResolutionMenu.value = false;
};

const selectVideoReferenceMode = (mode: 'reference' | 'first_last_frame') => {
  videoReferenceMode.value = mode;
  showVideoReferenceModeMenu.value = false;
};

// Calculate credits needed for video generation
const creditsNeeded = ref<number | null>(null);
const creditsLoading = ref<boolean>(false);
const creditsError = ref<string | null>(null);

const updateCreditsNeeded = async () => {
  if (selectedMode.value !== 'free_creation' || freeCreationMode.value !== 'video_generation') {
    creditsNeeded.value = null;
    creditsLoading.value = false;
    creditsError.value = null;
    return;
  }

  creditsLoading.value = true;
  creditsError.value = null;
  creditsNeeded.value = null;

  try {
    const durationSeconds = parseInt(videoDuration.value);
    creditsNeeded.value = await calculateVideoCredits(videoModel.value, durationSeconds, videoResolution.value, priceConfig.value, videoModels);
  } catch (error) {
    creditsError.value = error instanceof Error ? error.message : '获取价格失败';
    creditsNeeded.value = null;
  } finally {
    creditsLoading.value = false;
  }
};

watch([videoModel, videoDuration, videoResolution, priceConfig, freeCreationMode], updateCreditsNeeded);

updateCreditsNeeded();

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

  if (videoResolutionMenuRef.value && !videoResolutionMenuRef.value.contains(target)) {
    showVideoResolutionMenu.value = false;
  }

  if (imageModelMenuRef.value && !imageModelMenuRef.value.contains(target)) {
    showImageModelMenu.value = false;
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
      'web_price',
      'web_home_auto_recommend',
      'web_home_free_recommend',
    ]);
    console.log('config', config);
    if (config.webHomeTips) {
      homeTips.value = config.webHomeTips;
    }

    // Store price config
    if (config.webPrice) {
      priceConfig.value = config.webPrice;
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
              :allow-file-pick="shouldAllowFilePick"
              :show-mode-selector="true"
              :enable-first-last-frame="shouldAllowFilePick"
              :first-last-frame-mode="videoReferenceMode"
              :accept="acceptFileTypes"
              :add-button-text="addButtonText"
              :add-button-subtext="addButtonSubtext"
              @files-change="handleFilesChange"
              @first-frame-change="firstFrameImage = $event"
              @last-frame-change="lastFrameImage = $event"
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
                  <div
                    class="relative flex min-h-[88px] flex-wrap content-start items-start gap-2 transition-all duration-200 sm:min-h-[44px]"
                  >
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

                        <!-- Reference Mode Selector -->
                        <div ref="videoReferenceModeMenuRef" class="relative">
                          <Button
                            variant="ghost"
                            size="sm"
                            @click="
                              showVideoReferenceModeMenu = !showVideoReferenceModeMenu;
                              showFreeCreationModeMenu = false;
                              showVideoModelMenu = false;
                              showVideoDurationMenu = false;
                              showVideoAspectRatioMenu = false;
                            "
                            class="h-auto gap-1.5 rounded-lg border border-[#e5e7eb] bg-white px-3.5 py-2 text-[#6b7280] hover:bg-[#f9fafb]"
                          >
                            <span>🎨</span>
                            <span>{{ videoReferenceMode === 'reference' ? '全能参考' : '首尾帧' }}</span>
                            <span class="text-xs">▼</span>
                          </Button>

                          <div
                            v-if="showVideoReferenceModeMenu"
                            class="absolute bottom-full left-0 z-[1000] mb-2 min-w-[160px] rounded-xl border border-[#e5e7eb] bg-white p-2 shadow-[0_8px_24px_rgba(0,0,0,0.12)]"
                          >
                            <Button
                              variant="ghost"
                              @click="selectVideoReferenceMode('reference'); showVideoReferenceModeMenu = false;"
                              :class="[
                                'h-auto w-full justify-start rounded-lg px-3 py-2.5 text-left',
                                videoReferenceMode === 'reference' ? 'bg-[#f3f4f6]' : 'hover:bg-[#f9fafb]',
                              ]"
                            >
                              <div class="text-left">
                                <div class="font-medium text-[#111827]">全能参考</div>
                                <div class="text-xs text-[#9ca3af]">多图参考，支持最多6张参考图</div>
                              </div>
                            </Button>
                            <Button
                              variant="ghost"
                              @click="selectVideoReferenceMode('first_last_frame'); showVideoReferenceModeMenu = false;"
                              :class="[
                                'h-auto w-full justify-start rounded-lg px-3 py-2.5 text-left',
                                videoReferenceMode === 'first_last_frame' ? 'bg-[#f3f4f6]' : 'hover:bg-[#f9fafb]',
                              ]"
                            >
                              <div class="text-left">
                                <div class="font-medium text-[#111827]">首尾帧</div>
                                <div class="text-xs text-[#9ca3af]">指定首帧和尾帧生成视频</div>
                              </div>
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
                              v-for="ratio in availableVideoAspectRatios"
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

                        <!-- Resolution Selector -->
                        <div ref="videoResolutionMenuRef" class="relative">
                          <Button
                            variant="ghost"
                            size="sm"
                            @click="
                              showVideoResolutionMenu = !showVideoResolutionMenu;
                              showFreeCreationModeMenu = false;
                              showVideoModelMenu = false;
                              showVideoDurationMenu = false;
                              showVideoAspectRatioMenu = false;
                            "
                            class="h-auto gap-1.5 rounded-lg border border-[#e5e7eb] bg-white px-3.5 py-2 text-[#6b7280] hover:bg-[#f9fafb]"
                          >
                            <span>📺</span>
                            <span>{{ videoResolution }}</span>
                            <span class="text-xs">▼</span>
                          </Button>

                          <div
                            v-if="showVideoResolutionMenu"
                            class="absolute bottom-full left-0 z-[1000] mb-2 min-w-[180px] rounded-xl border border-[#e5e7eb] bg-white p-2 shadow-[0_8px_24px_rgba(0,0,0,0.12)]"
                          >
                            <Button
                              v-for="res in videoResolutions"
                              :key="res.id"
                              variant="ghost"
                              @click="selectVideoResolution(res.id as '720p' | '1080p')"
                              :class="[
                                'h-auto w-full justify-between rounded-lg px-3 py-2.5 text-left',
                                videoResolution === res.id ? 'bg-[#f3f4f6]' : 'hover:bg-[#f9fafb]',
                              ]"
                            >
                              <span class="text-sm font-medium text-[#111827]">{{ res.label }}</span>
                              <span class="text-xs text-[#9ca3af]">{{ res.description }}</span>
                            </Button>
                          </div>
                        </div>
                      </template>
                      <!-- Image Generation Options (only show when image_generation mode is selected) -->
                      <template v-if="freeCreationMode === 'image_generation'">
                        <!-- Image Model Selector -->
                        <div ref="imageModelMenuRef" class="relative">
                          <Button
                            variant="ghost"
                            size="sm"
                            @click="
                              showImageModelMenu = !showImageModelMenu;
                              showFreeCreationModeMenu = false;
                              showVideoAspectRatioMenu = false;
                            "
                            class="h-auto gap-1.5 rounded-lg border border-[#e5e7eb] bg-white px-3.5 py-2 text-[#6b7280] hover:bg-[#f9fafb]"
                          >
                            <span>🎨</span>
                            <span>{{ imageModels.find(m => m.id === imageModel)?.label }}</span>
                            <span class="text-xs">▼</span>
                          </Button>

                          <div
                            v-if="showImageModelMenu"
                            class="absolute bottom-full left-0 z-[1000] mb-2 min-w-[200px] rounded-xl border border-[#e5e7eb] bg-white p-2 shadow-[0_8px_24px_rgba(0,0,0,0.12)]"
                          >
                            <Button
                              v-for="model in imageModels"
                              :key="model.id"
                              variant="ghost"
                              @click="selectImageModel(model.id)"
                              :class="[
                                'h-auto w-full justify-start rounded-lg px-3 py-2.5 text-left',
                                imageModel === model.id ? 'bg-[#f3f4f6]' : 'hover:bg-[#f9fafb]',
                              ]"
                            >
                              <span class="text-sm font-medium text-[#111827]">{{ model.label }}</span>
                            </Button>
                          </div>
                        </div>

                        <!-- Aspect Ratio Selector (dynamic based on model) -->
                        <div ref="videoAspectRatioMenuRef" class="relative">
                          <Button
                            variant="ghost"
                            size="sm"
                            @click="
                              showVideoAspectRatioMenu = !showVideoAspectRatioMenu;
                              showFreeCreationModeMenu = false;
                              showImageModelMenu = false;
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
                              v-for="ratio in availableImageAspectRatios"
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
                        v-show="shouldShowAtButton"
                        @click="onMentionClick"
                        class="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border-none bg-transparent text-sm font-semibold text-gray-500 transition-all hover:bg-gray-50"
                        title="@大模型/文件"
                      >
                        @
                      </button>

                      <!-- File Pick Button -->
                      <!-- <button
                        v-show="shouldShowAttachmentButton"
                        @click="onFilePickClick"
                        class="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border-none bg-transparent text-base text-gray-500 transition-all hover:bg-gray-50"
                        title="选择文件"
                      >
                        📎
                      </button> -->
                    </div>

                    <!-- Right side: Credits and Submit button -->
                    <div class="flex items-center gap-2">
                      <!-- Credits Display (only for video_generation mode) -->
                      <div
                        v-if="selectedMode === 'free_creation' && freeCreationMode === 'video_generation'"
                        class="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm"
                        :title="creditsError || (creditsLoading ? '获取价格中...' : '')"
                      >
                        <span class="text-base">💎</span>
                        <span class="font-medium text-[#6b7280]">
                          {{ creditsLoading || creditsError || creditsNeeded === null ? '-' : creditsNeeded }}
                        </span>
                      </div>

                      <!-- Submit Button -->
                      <Button
                        @click="handleSubmit"
                        :disabled="!videoPrompt.trim() || (selectedMode === 'free_creation' && freeCreationMode === 'video_generation' && videoReferenceMode === 'first_last_frame' && !firstFrameImage)"
                        :class="[
                          'h-9 w-9 flex-shrink-0 rounded-full p-0 transition-all',
                          videoPrompt.trim() && !(selectedMode === 'free_creation' && freeCreationMode === 'video_generation' && videoReferenceMode === 'first_last_frame' && !firstFrameImage)
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
              v-for="template in selectedMode === 'free_creation' && freeCreationMode === 'image_generation'
                ? suggestionsByMode['image_generation']
                : suggestionsByMode[selectedMode]"
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
