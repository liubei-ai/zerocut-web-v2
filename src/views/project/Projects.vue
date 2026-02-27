<template>
  <MainLayout>
    <div class="px-4 py-8 mx-auto sm:px-6 lg:px-20">
      <!-- Header -->
      <div class="flex justify-between items-center mb-8">
        <div>
          <h1 class="text-3xl font-bold text-gray-900">全部项目</h1>
          <p class="text-gray-600 mt-2">管理和查看您的所有创作项目</p>
        </div>
        <div class="flex gap-3">
          <button 
            class="px-4 py-2 border border-gray-200 rounded-lg bg-white text-gray-600 text-sm font-medium hover:border-gray-300 transition-colors"
            @click="refreshProjects"
          >
            刷新
          </button>
          <button 
            class="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            @click="goToHome"
          >
            创建新项目
          </button>
        </div>
      </div>

      <!-- Use ProjectGrid Component -->
      <ProjectGrid :is-in-home-page="false" />
    </div>
  </MainLayout>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import MainLayout from '@/components/layout/MainLayout.vue';
import ProjectGrid from '@/views/project/ProjectGrid.vue';

const router = useRouter();

// Reset scroll position when component mounts
onMounted(() => {
  window.scrollTo(0, 0);
});

// Methods
const refreshProjects = () => {
  // Refresh the page to reload projects
  window.location.reload();
};

const goToHome = () => {
  router.push('/');
};
</script>