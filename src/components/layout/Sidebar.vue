<script setup lang="ts">
import { useRouter, useRoute } from 'vue-router';
import { computed } from 'vue';

const router = useRouter();
const route = useRoute();

const isHomeActive = computed(() => route.name === 'Home');
const isProjectsActive = computed(() => route.name === 'Projects');

const workspaceUrl = import.meta.env.VITE_WORKSPACE_URL;

const navigateToHome = () => {
  router.push('/');
};

const navigateToProjects = () => {
  router.push('/projects');
};
</script>

<template>
  <aside class="z-[1000] hidden md:fixed md:top-1/2 md:left-2 md:block md:-translate-y-1/2">
    <div class="flex flex-col gap-1 rounded-[50px] bg-white p-2 shadow-[0_8px_24px_rgba(0,0,0,0.12)]">
      <button
        title="回到主页"
        @click="navigateToHome"
        :class="[
          'flex h-12 w-12 items-center justify-center rounded-full text-xl transition-colors',
          isHomeActive ? 'bg-[#111827] text-white hover:bg-black' : 'text-[#6b7280] hover:bg-[#f3f4f6]',
        ]"
      >
        🏠
      </button>
      <button
        title="所有项目"
        @click="navigateToProjects"
        :class="[
          'flex h-12 w-12 items-center justify-center rounded-full text-xl transition-colors',
          isProjectsActive ? 'bg-[#111827] text-white hover:bg-black' : 'text-[#6b7280] hover:bg-[#f3f4f6]',
        ]"
      >
        📁
      </button>
      <a
        title="管理中心"
        :href="workspaceUrl + 'dashboard'"
        target="_blank"
        class="flex h-12 w-12 items-center justify-center rounded-full text-xl text-[#6b7280] transition-colors hover:bg-[#f3f4f6]"
      >
        👤
      </a>
      <a
        title="会员"
        :href="workspaceUrl + 'membership'"
        target="_blank"
        class="flex h-12 w-12 items-center justify-center rounded-full text-xl text-[#6b7280] transition-colors hover:bg-[#f3f4f6]"
      >
        👑
      </a>
    </div>
  </aside>
</template>
