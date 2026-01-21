<template>
  <MainLayout>
    <div class="px-4 py-8 max-w-7xl mx-auto sm:px-6 lg:px-8">
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
            :disabled="isLoading"
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

      <!-- Filter and Sort -->
      <div class="flex justify-between items-center mb-6">
        <div class="flex gap-4">
          <select 
            v-model="statusFilter" 
            class="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">全部状态</option>
            <option value="draft">草稿</option>
            <option value="processing">处理中</option>
            <option value="completed">已完成</option>
            <option value="failed">失败</option>
          </select>
          <select 
            v-model="sortBy" 
            class="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="created_at">创建时间</option>
            <option value="updated_at">更新时间</option>
            <option value="project_name">项目名称</option>
          </select>
        </div>
        <div class="text-sm text-gray-500">
          共 {{ filteredProjects.length }} 个项目
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="isLoading" class="flex flex-col items-center justify-center py-20">
        <div class="w-8 h-8 border-3 border-gray-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
        <p class="text-gray-600">加载项目中...</p>
      </div>

      <!-- Empty State -->
      <div v-else-if="projects.length === 0" class="text-center py-20">
        <div class="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-6 text-gray-400">
          <Film :size="48" />
        </div>
        <h3 class="text-xl text-gray-900 font-semibold mb-2">还没有创作的项目</h3>
        <p class="text-gray-600 mb-6">开始创建您的第一个项目吧！</p>
        <button 
          class="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          @click="goToHome"
        >
          创建新项目
        </button>
      </div>

      <!-- Projects Grid -->
      <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <div 
          v-for="project in filteredProjects" 
          :key="project.id" 
          class="group rounded-2xl overflow-hidden bg-white border border-gray-200 cursor-pointer transition-all duration-300 ease-out relative hover:-translate-y-2 hover:shadow-xl hover:shadow-black/10 hover:border-gray-300" 
          @click="openProject(project)"
        >
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
            <div 
              v-if="project.status" 
              class="absolute top-4 left-4 px-3 py-1.5 text-xs font-semibold text-white rounded-full backdrop-blur-sm" 
              :style="{ backgroundColor: getStatusColor(project.status) }"
            >
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

            <!-- Delete Button -->
            <button 
              class="absolute top-5 right-5 w-8 h-8 border-0 bg-red-500/10 text-red-500 rounded-full cursor-pointer flex items-center justify-center opacity-0 transition-all duration-200 hover:bg-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed group-hover:opacity-100"
              @click.stop="handleDeleteProject(project.id)"
              :disabled="isDeleting === project.id"
            >
              <Trash2 :size="14" />
            </button>
          </div>
        </div>
      </div>

      <!-- Pagination -->
      <div v-if="totalPages > 1" class="flex justify-center items-center gap-2 mt-8">
        <button 
          class="px-3 py-2 border border-gray-200 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:border-gray-300 transition-colors"
          :disabled="currentPage === 1"
          @click="goToPage(currentPage - 1)"
        >
          上一页
        </button>
        <span class="px-4 py-2 text-sm text-gray-600">
          第 {{ currentPage }} 页，共 {{ totalPages }} 页
        </span>
        <button 
          class="px-3 py-2 border border-gray-200 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:border-gray-300 transition-colors"
          :disabled="currentPage === totalPages"
          @click="goToPage(currentPage + 1)"
        >
          下一页
        </button>
      </div>
    </div>
  </MainLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { Film, Trash2 } from 'lucide-vue-next';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';
import MainLayout from '@/components/layout/MainLayout.vue';
import { getUserVideoProjects, deleteVideoProject, type VideoProject } from '@/api/videoProjectApi';

// Configure dayjs
dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

const router = useRouter();

// State
const projects = ref<VideoProject[]>([]);
const isLoading = ref(false);
const isDeleting = ref<string | null>(null);
const statusFilter = ref('');
const sortBy = ref('created_at');
const currentPage = ref(1);
const pageSize = ref(20);
const totalProjects = ref(0);

// Computed
const filteredProjects = computed(() => {
  let filtered = projects.value;
  
  // Filter by status
  if (statusFilter.value) {
    filtered = filtered.filter(project => project.status === statusFilter.value);
  }
  
  // Sort
  filtered.sort((a, b) => {
    const aValue = a[sortBy.value as keyof VideoProject];
    const bValue = b[sortBy.value as keyof VideoProject];
    
    if (sortBy.value === 'project_name') {
      return String(aValue).localeCompare(String(bValue));
    }
    
    // For dates, sort newest first
    return new Date(String(bValue)).getTime() - new Date(String(aValue)).getTime();
  });
  
  return filtered;
});

const totalPages = computed(() => {
  return Math.ceil(totalProjects.value / pageSize.value);
});

// Methods
const loadProjects = async () => {
  isLoading.value = true;
  try {
    const data = await getUserVideoProjects({ 
      page: currentPage.value, 
      pageSize: pageSize.value 
    });
    projects.value = data.projects || [];
    totalProjects.value = data.pagination?.totalCount || 0;
  } catch (error) {
    console.error('加载项目失败:', error);
  } finally {
    isLoading.value = false;
  }
};

const refreshProjects = () => {
  loadProjects();
};

const goToPage = (page: number) => {
  currentPage.value = page;
  loadProjects();
};

const goToHome = () => {
  router.push('/');
};

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
      params: { projectId: project.id },
      query: { projectName: projectName }
    });
  } else {
    window.location.href = `${studioBaseUrl}/workspace/${project.id}?${queryParams.toString()}`;
  }
};

const handleDeleteProject = async (projectId: string) => {
  if (isDeleting.value) return;

  if (!confirm('确定要删除这个项目吗？此操作无法撤销。')) return;

  isDeleting.value = projectId;
  try {
    await deleteVideoProject(projectId);
    // Remove project from list
    projects.value = projects.value.filter(p => p.id !== projectId);
    totalProjects.value -= 1;
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
  return dayjs(dateString).format('YYYY-MM-DD HH:mm');
};

const isVideoUrl = (url: string) => {
  return url.endsWith('.mp4') || url.endsWith('.webm') || url.endsWith('.mov');
};

const getProjectPreview = (project: any) => {
  if (!project.oss_mapping || !Array.isArray(project.oss_mapping)) {
    return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMTkxOTE5Ii8+PGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoOTIsIDkyKSI+PHBhdGggZD0iTTYuMDAyIDUuNWExLjUgMS41IDAgMSAxLTMgMCAxLjUgMS41IDAgMCAxIDMgMCIgZmlsbD0iIzJhMmIyZSIvPjxwYXRoIGQ9Ik0yLjAwMiAxYTIgMiAwIDAgMC0yIDJ2MTBhMiAyIDAgMCAwIDIgMmgxMmEyIDIgMCAwIDAgMi0yVjNhMiAyIDAgMCAwLTItMnptMTIgMWExIDEgMCAwIDEgMSAxdjYuNWwtMy43NzctMS45NDdhLjUuNSAwIDAgMC0uNTc3LjA5M2wtMy43MSAzLjcxLTIuNjYtMS43NzJhLjUuNSAwIDAgMC0uNjMuMDYyTDEuMDAyIDEyVjNhMSAxIDAgMCAxIDEtMXoiIGZpbGw9IiMyYTJiMmUiLz48L2c+PC9zdmc+';
  }
  
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];
  
  const firstImage = project.oss_mapping.find((item: any) => {
    if (!item.localFile || !item.ossUrl) return false;
    const lowerFile = item.localFile.toLowerCase();
    return imageExtensions.some(ext => lowerFile.endsWith(ext));
  });
  
  if (firstImage && firstImage.ossUrl) {
    return firstImage.ossUrl;
  }
  
  return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMTkxOTE5Ii8+PGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoOTIsIDkyKSI+PHBhdGggZD0iTTYuMDAyIDUuNWExLjUgMS41IDAgMSAxLTMgMCAxLjUgMS41IDAgMCAxIDMgMCIgZmlsbD0iIzJhMmIyZSIvPjxwYXRoIGQ9Ik0yLjAwMiAxYTIgMiAwIDAgMC0yIDJ2MTBhMiAyIDAgMCAwIDIgMmgxMmEyIDIgMCAwIDAgMi0yVjNhMiAyIDAgMCAwLTItMnptMTIgMWExIDEgMCAwIDEgMSAxdjYuNWwtMy43NzctMS45NDdhLjUuNSAwIDAgMC0uNTc3LjA5M2wtMy43MSAzLjcxLTIuNjYtMS43NzJhLjUuNSAwIDAgMC0uNjMuMDYyTDEuMDAyIDEyVjNhMSAxIDAgMCAxIDEtMXoiIGZpbGw9IiMyYTJiMmUiLz48L2c+PC9zdmc+';
};

const handleImageError = (event: Event) => {
  const img = event.target as HTMLImageElement;
  if (img.src.startsWith('data:image/svg+xml')) return;
  img.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMTkxOTE5Ii8+PGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoOTIsIDkyKSI+PHBhdGggZD0iTTYuMDAyIDUuNWExLjUgMS41IDAgMSAxLTMgMCAxLjUgMS41IDAgMCAxIDMgMCIgZmlsbD0iIzJhMmIyZSIvPjxwYXRoIGQ9Ik0yLjAwMiAxYTIgMiAwIDAgMC0yIDJ2MTBhMiAyIDAgMCAwIDIgMmgxMmEyIDIgMCAwIDAgMi0yVjNhMiAyIDAgMCAwLTItMnptMTIgMWExIDEgMCAwIDEgMSAxdjYuNWwtMy43NzctMS45NDdhLjUuNSAwIDAgMC0uNTc3LjA5M2wtMy43MSAzLjcxLTIuNjYtMS43NzJhLjUuNSAwIDAgMC0uNjMuMDYyTDEuMDAyIDEyVjNhMSAxIDAgMCAxIDEtMXoiIGZpbGw9IiMyYTJiMmUiLz48L2c+PC9zdmc+';
};

// Load projects on mount
onMounted(() => {
  loadProjects();
});
</script>