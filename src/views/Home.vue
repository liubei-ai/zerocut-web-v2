<script setup lang="ts">
import { ref } from 'vue';
import MainLayout from '@/components/layout/MainLayout.vue';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Zap, Wand2, FileText, MoveUp } from 'lucide-vue-next';

const videoPrompt = ref('');
const aspectRatio = ref('16:9');
const videoType = ref('电影感');

const quickTemplates = [
  '制作一个产品宣传视频',
  '创建旅行Vlog剪辑',
  '午成教学演示视频',
  '制作婚礼回忆短片',
  '创建企业介绍视频',
  '午成品牌MV'
];

const handleGenerate = () => {
  console.log('Generating video with prompt:', videoPrompt.value);
};

const handleSubmit = () => {
  console.log('Submitting prompt:', videoPrompt.value);
};
</script>

<template>
  <MainLayout>
    <div class="min-h-[calc(100vh-200px)] bg-slate-50 py-12 dark:">
      <div class="container mx-auto px-4">
        <!-- Promo Banner -->
        <div class="mb-8 flex justify-center">
          <div
            class="inline-flex items-center gap-2 rounded-full bg-yellow-100 px-4 py-2 text-sm text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
            <span>🎁</span>
            <span>新用户注册送500积分~</span>
          </div>
        </div>

        <!-- Main Title -->
        <div class="mb-8 text-center">
          <div class="mb-4 flex items-center justify-center gap-3">
            <div class="flex h-12 w-12 items-center justify-center rounded-full  dark:bg-slate-100">
              <span class="text-xl font-bold text-white dark:text-slate-900">Z</span>
            </div>
            <h1 class="text-4xl font-bold text-slate-900 dark:text-slate-50">ZeroCut AI</h1>
          </div>
          <p class="text-lg text-slate-600 dark:text-slate-400">
            让视频创作更简单，用自然语言描述，一键生成专业视频
          </p>
        </div>

        <!-- Main Input Card -->
        <div class="mx-auto max-w-4xl">
          <Card class="border-2 shadow-lg">
            <div class="p-6">
              <Textarea v-model="videoPrompt" placeholder="让 ZeroCut 帮你一键创作视频..."
                class="min-h-[200px] resize-none border-0 text-base focus-visible:ring-0" />

              <div class="mt-4 flex items-center justify-between border-t pt-4">
                <div class="flex gap-4">
                  <Button variant="ghost" size="sm" class="gap-2">
                    <span>📐</span>
                    <span>{{ aspectRatio }}</span>
                  </Button>
                  <Button variant="ghost" size="sm" class="gap-2">
                    <span>🎬</span>
                    <span>{{ videoType }}</span>
                  </Button>
                </div>
                <Button 
                  size="sm" 
                  @click="videoPrompt ? handleSubmit() : null"
                  :class="videoPrompt ? 'bg-black text-white hover:bg-slate-800 cursor-pointer' : 'text-slate-400 cursor-not-allowed opacity-50'"
                  class="rounded-full w-10 h-10">
                  <MoveUp />
                </Button>
              </div>
            </div>
          </Card>

          <!-- Action Buttons -->
          <div class="mt-6 flex justify-center gap-4">
            <Button @click="handleGenerate" size="lg"
              class="gap-2  px-8 hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200">
              <Zap class="h-5 w-5" />
              一键成片
            </Button>
            <Button size="lg" variant="outline" class="gap-2 px-8">
              <Wand2 class="h-5 w-5" />
              自由创作
            </Button>
            <Button size="lg" variant="outline" class="gap-2 px-8">
              <FileText class="h-5 w-5" />
              分镜脚本
            </Button>
          </div>

          <!-- Quick Templates -->
          <div class="mt-12">
            <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <button v-for="template in quickTemplates" :key="template" @click="videoPrompt = template"
                class="rounded-lg border border-slate-200 bg-white px-4 py-3 text-left text-sm text-slate-700 transition-all hover:border-slate-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-slate-600">
                {{ template }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </MainLayout>
</template>
