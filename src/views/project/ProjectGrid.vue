<template>
  <div class="px-4 pb-15 max-w-7xl mx-auto sm:px-15 lg:px-30">
    <div class="flex justify-between items-center mb-8">
      <h2 class="text-3xl font-bold text-gray-900">我的创作</h2>
      <div class="flex gap-3">
        <button class="px-5 py-2.5 border border-gray-200 rounded-xl bg-white text-gray-500 text-sm font-medium cursor-pointer transition-all duration-200 hover:border-gray-300" @click="goToAllProjects">
          全部项目
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="flex flex-col items-center justify-center py-25 px-10">
      <div class="w-8 h-8 border-3 border-gray-100 border-t-blue-500 rounded-full animate-spin mb-4"></div>
      <p class="text-sm text-gray-500 m-0">加载项目中...</p>
    </div>

    <!-- Empty State -->
    <div v-else-if="projects.length === 0" class="text-center py-25 px-10">
      <div class="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-5 text-gray-400">
        <Film :size="48" />
      </div>
      <h3 class="text-xl text-gray-900 font-semibold mb-2">还没有创作的视频</h3>
      <p v-if="isInHomePage" class="text-sm text-gray-500 m-0">
        在上方输入框中描述你的想法，开始创作第一个视频吧！
      </p>
    </div>

    <!-- Video Grid -->
    <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      <div v-for="project in projects" :key="project.id" 
           class="group rounded-2xl overflow-hidden bg-white border border-gray-200 cursor-pointer transition-all duration-300 ease-out relative hover:-translate-y-2 hover:shadow-xl hover:shadow-black/10 hover:border-gray-300" 
           @click="openProject(project)">
        <!-- Thumbnail Section -->
        <div class="relative pt-[56.25%] bg-gray-50 overflow-hidden">
          <video 
            v-if="isVideoUrl(getProjectPreview(project))"
            :src="getProjectPreview(project)"
            class="absolute top-0 left-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            muted
            preload="metadata"
          ></video>
          <img 
            v-else
            :src="getProjectPreview(project)" 
            :alt="project.project_name"
            class="absolute top-0 left-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            @error="handleImageError"
          />

          <!-- Status Badge -->
          <div v-if="project.status" 
               class="absolute top-4 left-4 px-3 py-1.5 text-xs font-semibold text-white rounded-full backdrop-blur-sm" 
               :style="{ backgroundColor: getStatusColor(project.status) }">
            {{ getStatusLabel(project.status) }}
          </div>
        </div>

        <!-- Project Info -->
        <div class="p-5 relative">
          <h3 class="text-lg font-semibold text-gray-900 mb-2 overflow-hidden text-ellipsis whitespace-nowrap leading-tight">
            {{ project.project_name }}
          </h3>
          <div class="flex justify-between items-center pt-3 border-t border-gray-100">
            <span class="text-xs text-gray-400">
              {{ formatDate(project.created_at) }}
            </span>
          </div>

          <!-- Delete Button (conditionally shown) -->
          <button v-if="!isInHomePage" 
                  class="absolute top-5 right-5 w-8 h-8 border-0 bg-red-500/10 text-red-500 rounded-full cursor-pointer flex items-center justify-center opacity-0 transition-all duration-200 hover:bg-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed group-hover:opacity-100"
                  @click.stop="handleDeleteProject(project.id)"
                  :disabled="isDeleting === project.id">
            <Trash2 :size="14" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { Film, Trash2 } from 'lucide-vue-next';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';
import { getUserVideoProjects, deleteVideoProject, type VideoProject } from '@/api/videoProjectApi';

// Configure dayjs
dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

interface Props {
  isInHomePage?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  isInHomePage: false
});

const router = useRouter();

// State
const projects = ref<VideoProject[]>([]);
const isLoading = ref(false);
const isDeleting = ref<string | null>(null);

// Load projects from API
const loadProjects = async () => {
  isLoading.value = true;
  try {
    const data = await getUserVideoProjects({ page: 1, pageSize: 12 });
    projects.value = data.projects || [];
    console.log('projects', projects)
  } catch (error) {
    console.error('加载项目失败:', error);
  } finally {
    isLoading.value = false;
  }
};

// Open project
const openProject = (project: VideoProject) => {
  const studioBaseUrl = import.meta.env.VITE_STUDIO_BASE_URL || 'https://studio.zerocut.cn';
  const hostname = window.location.hostname;
  const isStudio = hostname === 'studio.zerocut.cn' || hostname.includes('studio.');
  const projectName = project.project_name || project.title || '';
  const queryParams = new URLSearchParams({
    projectId: project.id,
    projectName: projectName
  });

  if (isStudio || hostname === 'localhost' || hostname === '127.0.0.1') {
    router.push({
      name: 'Workspace',
      params: {
        projectId: project.id
      }
    });
  } else {
    window.location.href = `${studioBaseUrl}/workspace?${queryParams.toString()}`;
  }
};

// Navigate to all projects page
const goToAllProjects = () => {
  router.push({ name: 'Projects' });
};

// Delete project
const handleDeleteProject = async (projectId: string) => {
  if (isDeleting.value) return;

  if (!confirm('确定要删除这个视频项目吗？')) return;

  isDeleting.value = projectId;
  try {
    await deleteVideoProject(projectId);
    // Remove project from list
    projects.value = projects.value.filter(p => p.id !== projectId);
  } catch (error) {
    console.error('删除项目失败:', error);
    alert('删除项目失败，请重试');
  } finally {
    isDeleting.value = null;
  }
};

// Utility functions
const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    draft: '草稿',
    processing: '处理中',
    completed: '已完成',
    failed: '失败',
    RUNNING: '运行中',
  };
  return labels[status] || status;
};

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    draft: '#6b7280',
    processing: '#3b82f6',
    completed: '#10b981',
    failed: '#ef4444',
    RUNNING: '#f59e0b',
  };
  return colors[status] || '#6b7280';
};

const formatDate = (dateString: string) => {
  return dayjs(dateString).format('MM-DD');
};

// Check if URL is a video
const isVideoUrl = (url: string) => {
  return url.endsWith('.mp4') || url.endsWith('.webm') || url.endsWith('.mov');
};

// Get project preview image/video
const getProjectPreview = (project: any) => {
  if (!project.oss_mapping || !Array.isArray(project.oss_mapping)) {
    // If no oss_mapping data, return placeholder
    return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMTkxOTE5Ii8+PGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoOTIsIDkyKSI+PHBhdGggZD0iTTYuMDAyIDUuNWExLjUgMS41IDAgMSAxLTMgMCAxLjUgMS41IDAgMCAxIDMgMCIgZmlsbD0iIzJhMmIyZSIvPjxwYXRoIGQ9Ik0yLjAwMiAxYTIgMiAwIDAgMC0yIDJ2MTBhMiAyIDAgMCAwIDIgMmgxMmEyIDIgMCAwIDAgMi0yVjNhMiAyIDAgMCAwLTItMnptMTIgMWExIDEgMCAwIDEgMSAxdjYuNWwtMy43NzctMS45NDdhLjUuNSAwIDAgMC0uNTc3LjA5M2wtMy43MSAzLjcxLTIuNjYtMS43NzJhLjUuNSAwIDAgMC0uNjMuMDYyTDEuMDAyIDEyVjNhMSAxIDAgMCAxIDEtMXoiIGZpbGw9IiMyYTJiMmUiLz48L2c+PC9zdmc+';
  }
  
  // Use first image from oss_mapping as cover
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];
  
  // Find first image
  const firstImage = project.oss_mapping.find((item: any) => {
    if (!item.localFile || !item.ossUrl) return false;
    const lowerFile = item.localFile.toLowerCase();
    return imageExtensions.some(ext => lowerFile.endsWith(ext));
  });
  
  if (firstImage && firstImage.ossUrl) {
    return firstImage.ossUrl;
  }
  
  // If no image found, return inline SVG placeholder
  return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMTkxOTE5Ii8+PGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoOTIsIDkyKSI+PHBhdGggZD0iTTYuMDAyIDUuNWExLjUgMS41IDAgMSAxLTMgMCAxLjUgMS41IDAgMCAxIDMgMCIgZmlsbD0iIzJhMmIyZSIvPjxwYXRoIGQ9Ik0yLjAwMiAxYTIgMiAwIDAgMC0yIDJ2MTBhMiAyIDAgMCAwIDIgMmgxMmEyIDIgMCAwIDAgMi0yVjNhMiAyIDAgMCAwLTItMnptMTIgMWExIDEgMCAwIDEgMSAxdjYuNWwtMy43NzctMS45NDdhLjUuNSAwIDAgMC0uNTc3LjA5M2wtMy43MSAzLjcxLTIuNjYtMS43NzJhLjUuNSAwIDAgMC0uNjMuMDYyTDEuMDAyIDEyVjNhMSAxIDAgMCAxIDEtMXoiIGZpbGw9IiMyYTJiMmUiLz48L2c+PC9zdmc+';
};

const handleImageError = (event: Event) => {
  const img = event.target as HTMLImageElement;
  // If already a placeholder, don't process again to avoid loops
  if (img.src.startsWith('data:image/svg+xml')) return;
  // Show inline SVG placeholder
  img.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMTkxOTE5Ci8+PGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoOTIsIDkyKSI+PHBhdGggZD0iTTYuMDAyIDUuNWExLjUgMS41IDAgMSAxLTMgMCAxLjUgMS41IDAgMCAxIDMgMCIgZmlsbD0iIzJhMmIyZSIvPjxwYXRoIGQ9Ik0yLjAwMiAxYTIgMiAwIDAgMC0yIDJ2MTBhMiAyIDAgMCAwIDIgMmgxMmEyIDIgMCAwIDAgMi0yVjNhMiAyIDAgMCAwLTItMnptMTIgMWExIDEgMCAwIDEgMSAxdjYuNWwtMy43NzctMS45NDdhLjUuNSAwIDAgMC0uNTc3LjA5M2wtMy43MSAzLjcxLTIuNjYtMS43NzJhLjUuNSAwIDAgMC0uNjMuMDYyTDEuMDAyIDEyVjNhMSAxIDAgMCAxIDEtMXoiIGZpbGw9IiMyYTJiMmUiLz48L2c+PC9zdmc+';
};

// Load projects on mount
onMounted(() => {
  loadProjects();
});
</script>