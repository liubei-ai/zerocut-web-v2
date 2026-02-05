<template>
  <div class="mx-auto max-w-7xl px-4 pb-15 sm:px-15 lg:px-30">
    <div v-if="isInHomePage" class="mb-8 flex items-center justify-between">
      <h2 class="text-3xl font-bold text-gray-900">我的创作</h2>
      <div class="flex gap-3">
        <button
          class="cursor-pointer rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-500 transition-all duration-200 hover:border-gray-300"
          @click="goToAllProjects"
        >
          全部项目
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="flex flex-col items-center justify-center px-10 py-25">
      <div class="mb-4 h-8 w-8 animate-spin rounded-full border-3 border-gray-100 border-t-blue-500"></div>
      <p class="m-0 text-sm text-gray-500">加载项目中...</p>
    </div>

    <!-- Empty State -->
    <div v-else-if="projects.length === 0" class="px-10 py-25 text-center">
      <div class="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-gray-100 text-gray-400">
        <Film :size="48" />
      </div>
      <h3 class="mb-2 text-xl font-semibold text-gray-900">还没有创作的视频</h3>
      <p v-if="isInHomePage" class="m-0 text-sm text-gray-500">在上方输入框中描述你的想法，开始创作第一个视频吧！</p>
    </div>

    <!-- Video Grid -->
    <div v-else class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      <div
        v-for="project in projects"
        :key="project.id"
        class="group relative cursor-pointer overflow-hidden rounded-2xl border border-gray-200 bg-white transition-all duration-300 ease-out hover:-translate-y-2 hover:border-gray-300 hover:shadow-xl hover:shadow-black/10"
        @click="openProject(project)"
      >
        <!-- Thumbnail Section -->
        <div class="relative overflow-hidden bg-gray-50 pt-[56.25%]">
          <video
            v-if="isVideoUrl(getProjectPreview(project))"
            :src="getProjectPreview(project)"
            class="absolute top-0 left-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            muted
            preload="metadata"
          ></video>
          <img
            v-else
            :src="getProjectPreview(project)"
            :alt="project.project_name"
            class="absolute top-0 left-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            @error="handleImageError"
          />

          <!-- Status Badge -->
          <div
            v-if="project.status"
            class="absolute top-4 left-4 rounded-full px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm"
            :style="{ backgroundColor: getStatusColor(project.status) }"
          >
            {{ getStatusLabel(project.status) }}
          </div>
        </div>

        <!-- Project Info -->
        <div class="relative p-5">
          <h3
            class="mb-2 overflow-hidden text-lg leading-tight font-semibold text-ellipsis whitespace-nowrap text-gray-900"
          >
            {{ project.project_name }}
          </h3>
          <div class="flex items-center justify-between border-t border-gray-100 pt-3">
            <span class="text-xs text-gray-400">
              {{ formatDate(project.created_at) }}
            </span>
          </div>

          <!-- Delete Button (conditionally shown) -->
          <button
            v-if="!isInHomePage"
            class="absolute bottom-3 right-3 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border-0 bg-red-500/10 text-red-500 opacity-0 transition-all duration-200 group-hover:opacity-100 hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
            @click.stop="handleDeleteProject(project.id)"
            :disabled="isDeleting === project.id"
          >
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
import { CANCELLED } from 'dns';

// Configure dayjs
dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

interface Props {
  isInHomePage?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  isInHomePage: false,
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
    console.log('projects', projects);
  } catch (error) {
    console.error('加载项目失败:', error);
  } finally {
    isLoading.value = false;
  }
};

// Open project
const openProject = (project: VideoProject) => {
  router.push({
    name: 'Workspace',
    params: {
      projectId: project.id,
    },
  });
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
    KILLED: '已关闭',
    CANCELLED: '已取消',
    RUNNING: '运行中',
    FAILED: '失败',
    SUCCESS: '成功',
  };
  return labels[status] || status;
};

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    KILLED: '#6b7280',
    CANCELLED: '#6b7280',
    RUNNING: '#f59e0b',
    FAILED: '#6b7280',
    SUCCESS: '#10b981',
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

const placeholderImage =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMTkxOTE5Ii8+PGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoOTIsIDkyKSI+PHBhdGggZD0iTTYuMDAyIDUuNWExLjUgMS41IDAgMSAxLTMgMCAxLjUgMS41IDAgMCAxIDMgMCIgZmlsbD0iIzJhMmIyZSIvPjxwYXRoIGQ9Ik0yLjAwMiAxYTIgMiAwIDAgMC0yIDJ2MTBhMiAyIDAgMCAwIDIgMmgxMmEyIDIgMCAwIDAgMi0yVjNhMiAyIDAgMCAwLTItMnptMTIgMWExIDEgMCAwIDEgMSAxdjYuNWwtMy43NzctMS45NDdhLjUuNSAwIDAgMC0uNTc3LjA5M2wtMy43MSAzLjcxLTIuNjYtMS43NzJhLjUuNSAwIDAgMC0uNjMuMDYyTDEuMDAyIDEyVjNhMSAxIDAgMCAxIDEtMXoiIGZpbGw9IiMyYTJiMmUiLz48L2c+PC9zdmc+';

// Get project preview image/video
const getProjectPreview = (project: any) => {
  if (!project.oss_mapping || !Array.isArray(project.oss_mapping)) {
    // If no oss_mapping data, return placeholder
    return placeholderImage;
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
  return placeholderImage;
};

const handleImageError = (event: Event) => {
  const img = event.target as HTMLImageElement;
  // If already a placeholder, don't process again to avoid loops
  if (img.src.startsWith('data:image/svg+xml')) return;
  // Show inline SVG placeholder
  img.src = placeholderImage;
};

// Load projects on mount
onMounted(() => {
  loadProjects();
});
</script>
