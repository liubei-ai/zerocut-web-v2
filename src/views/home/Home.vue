<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import MainLayout from '@/components/layout/MainLayout.vue';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import ProjectGrid from '@/views/project/ProjectGrid.vue';
import { useAuthStore } from '@/stores/authStore';

const authStore = useAuthStore();
const router = useRouter();

const videoPrompt = ref('');
const selectedMode = ref('one_click');
const aspectRatio = ref('16:9');
const videoType = ref('电影感');
const showAspectRatioMenu = ref(false);
const showStyleMenu = ref(false);

const modes = [
  { id: 'one_click', label: '一键成片', icon: '⚡' },
  { id: 'free_creation', label: '自由创作', icon: '🎨' },
  { id: 'storyboard', label: '分镜脚本', icon: '📋' },
];

const aspectRatios = [
  { id: '16:9', label: '16:9', description: '横屏' },
  { id: '9:16', label: '9:16', description: '竖屏' },
  { id: '1:1', label: '1:1', description: '方形' },
  { id: '4:3', label: '4:3', description: '标准' },
];

const styles = [
  { id: 'cinematic', label: '电影感', icon: '🎬' },
  { id: 'documentary', label: '纪录片', icon: '📹' },
  { id: 'vlog', label: 'Vlog', icon: '✨' },
  { id: 'commercial', label: '广告片', icon: '🎯' },
  { id: 'animation', label: '动画', icon: '🎨' },
  { id: 'minimal', label: '极简', icon: '⚪' },
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

const handleSubmit = () => {
  if (videoPrompt.value.trim()) {
    console.log('Submitting prompt:', videoPrompt.value);
    
    let chatMessage = '';
    
    if (selectedMode.value === 'one_click') {
      chatMessage = `请为我创作视频，比例为${aspectRatio.value}，风格为${videoType.value}，主题内容为：${videoPrompt.value}`;
    } else if (selectedMode.value === 'free_creation') {
      chatMessage = `请为我创作视频，主题内容为：${videoPrompt.value}`;
    } else if (selectedMode.value === 'storyboard') {
      chatMessage = `请为我创建一个分镜，内容为：${videoPrompt.value}`;
    }
    
    // Navigate to workspace/new and pass chatMessage via router state
    router.push({
      path: '/workspace/new',
      state: { chatMessage }
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
</script>

<template>
  <MainLayout>
    <div class="bg-[#fafafa] py-20 px-10">
      <div class="max-w-[1000px] mx-auto">
        <!-- Promo Banner & Title Section -->
        <div class="flex flex-col items-center mb-14">
          <div v-if="!authStore.isAuthenticated" class="inline-flex items-center gap-2 bg-[#fef3c7] px-5 py-2 rounded-[20px] border border-[#fde68a] mb-6">
            <span class="text-base">🎁</span>
            <span class="text-sm text-[#92400e]">新用户注册送500积分～</span>
          </div>

          <div class="flex items-center gap-3 mb-5">
            <div class="w-10 h-10 rounded-full bg-[#111827] flex items-center justify-center text-xl font-bold text-white">
              Z
            </div>
            <h1 class="text-[42px] font-bold text-[#111827] m-0 tracking-tight">
              ZeroCut AI
            </h1>
          </div>
          <p class="text-lg text-[#6b7280] font-normal m-0 text-center">
            让视频创作更简单，用自然语言描述，一键生成专业视频
          </p>
        </div>

        <!-- Main Input Card -->
        <div class="w-full mb-10">
          <div class="relative w-full bg-white rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.08)] border border-[#e5e7eb] p-5 mb-5">
            <Textarea
              v-model="videoPrompt"
              placeholder="让 ZeroCut 帮你一键创作视频..."
              class="min-h-[100px] resize-none border-0 text-base focus-visible:ring-0 p-0 leading-[1.6] text-[#111827]"
            />

            <div class="flex justify-between items-center pt-2 border-t border-[#f3f4f6]">
              <div v-if="selectedMode === 'one_click'" class="flex gap-2">
                <!-- Aspect Ratio Selector -->
                <div class="relative">
                  <Button
                    variant="ghost"
                    size="sm"
                    @click="showAspectRatioMenu = !showAspectRatioMenu; showStyleMenu = false"
                    class="px-3.5 py-2 border border-[#e5e7eb] rounded-lg bg-white hover:bg-[#f9fafb] text-[#6b7280] gap-1.5 h-auto"
                  >
                    <span>📐</span>
                    <span>{{ aspectRatio }}</span>
                    <span class="text-xs">▼</span>
                  </Button>

                  <div v-if="showAspectRatioMenu" class="absolute bottom-full left-0 mb-2 bg-white border border-[#e5e7eb] rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.12)] p-2 min-w-[180px] z-[1000]">
                    <Button
                      v-for="ratio in aspectRatios"
                      :key="ratio.id"
                      variant="ghost"
                      @click="selectAspectRatio(ratio.id)"
                      :class="['w-full justify-between px-3 py-2.5 rounded-lg text-left h-auto', aspectRatio === ratio.id ? 'bg-[#f3f4f6]' : 'hover:bg-[#f9fafb]']"
                    >
                      <span class="text-sm font-medium text-[#111827]">{{ ratio.label }}</span>
                      <span class="text-xs text-[#9ca3af]">{{ ratio.description }}</span>
                    </Button>
                  </div>
                </div>

                <!-- Style Selector -->
                <div class="relative">
                  <Button
                    variant="ghost"
                    size="sm"
                    @click="showStyleMenu = !showStyleMenu; showAspectRatioMenu = false"
                    class="px-3.5 py-2 border border-[#e5e7eb] rounded-lg bg-white hover:bg-[#f9fafb] text-[#6b7280] gap-1.5 h-auto"
                  >
                    <span>{{ styles.find(s => s.label === videoType)?.icon || '🎬' }}</span>
                    <span>{{ videoType }}</span>
                    <span class="text-xs">▼</span>
                  </Button>

                  <div v-if="showStyleMenu" class="absolute bottom-full left-0 mb-2 bg-white border border-[#e5e7eb] rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.12)] p-2 min-w-[200px] z-[1000]">
                    <Button
                      v-for="style in styles"
                      :key="style.id"
                      variant="ghost"
                      @click="selectStyle(style.id)"
                      :class="['w-full justify-start gap-2.5 px-3 py-2.5 rounded-lg text-left h-auto', videoType === style.label ? 'bg-[#f3f4f6]' : 'hover:bg-[#f9fafb]']"
                    >
                      <span class="text-lg">{{ style.icon }}</span>
                      <span class="text-sm font-medium text-[#111827]">{{ style.label }}</span>
                    </Button>
                  </div>
                </div>
              </div>
              <div v-else></div>

              <!-- Submit Button -->
              <Button
                @click="handleSubmit"
                :disabled="!videoPrompt.trim()"
                :class="[
                  'w-9 h-9 rounded-full p-0 flex-shrink-0 transition-all',
                  videoPrompt.trim() 
                    ? 'bg-[#111827] hover:bg-black hover:scale-105' 
                    : 'bg-[#e5e7eb] cursor-not-allowed'
                ]"
              >
                <span class="text-lg text-white">↑</span>
              </Button>
            </div>
          </div>

          <!-- Mode Selection Buttons -->
          <div class="flex gap-3 mb-5 justify-center">
            <Button
              v-for="mode in modes"
              :key="mode.id"
              @click="selectedMode = mode.id"
              :variant="selectedMode === mode.id ? 'default' : 'outline'"
              :class="[
                'px-6 py-3 rounded-3xl gap-2 text-[15px] font-medium h-auto transition-all',
                selectedMode === mode.id 
                  ? 'bg-[#111827] text-white border-2 border-[#111827]' 
                  : 'bg-white text-[#6b7280] border-2 border-[#e5e7eb] hover:border-[#d1d5db] hover:-translate-y-0.5'
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
              class="p-4 border border-[#e5e7eb] rounded-xl bg-white cursor-pointer transition-all text-left text-sm text-[#6b7280] hover:border-[#d1d5db] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] hover:-translate-y-0.5"
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