<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch, nextTick } from 'vue';
import axios from 'axios';
import { useRoute, useRouter } from 'vue-router';
import MainLayout from '@/components/layout/MainLayout.vue';
import FileList from './components/FileList.vue';
import PreviewArea from './components/PreviewArea.vue';
import ChatBox from './components/ChatBox.vue';
import VideoGenerationForm from './components/VideoGenerationForm.vue';
import VideoGenerationProgress from './components/VideoGenerationProgress.vue';
import CanvasFlow from '@/components/workspace/CanvasFlow.vue';
import type { VideoGenerationParams } from './components/VideoGenerationForm.vue';
import type { OssMaterial } from '@/types/ossMaterial';
import {
  createVideoProject,
  createVideo,
  abortVideoCreation,
  updateVideoProject,
  deleteProjectMaterial,
} from '@/api/videoProjectApi';
import {
  type VideoWorkflowImage,
  type VideoWorkflowVideo,
  type VideoWorkflowAudio,
} from '@/api/videoWorkflowApi';
import { useChatMessages } from '@/composables';
import { useToast } from '@/composables/useToast';
import { useConfigStore } from '@/stores/configStore';
import { useWorkspaceData } from '@/composables/useWorkspaceData';
import { useVideoGeneration } from '@/composables/useVideoGeneration';
import { downloadFileWithProgress } from '@/utils/downloadUtils';
import { getReferencedFiles } from '@/utils/fileUtils';
import type { FilePreview } from '@/types/fileReference';

export interface WorkspaceFile {
  id: string;
  file_name: string;
  file_type: string;
  file_url: string;
  thumbnail_url?: string;
  file_size?: number;
  created_at: string;
  status?: string;
  prompt?: string;
  localFile?: string;
}

const route = useRoute();
const router = useRouter();
const configStore = useConfigStore();

const { messages, initMessages, addUserMessage, removeMessage, addAssistantMessage, loadChatHistory } =
  useChatMessages();
const { toast } = useToast();

// --- State ---
const projectId = ref<string>('');
const isUploading = ref(false);
const initialUserInput = ref<string>();
const initialFiles = ref<FilePreview[]>([]);
const isNewProject = ref(false);
const projectCreated = ref(false);
const activeTab = ref<'files' | 'preview' | 'chat'>('chat');
const workspaceView = ref<'list' | 'canvas'>('list');
const rightPanelCollapsed = ref(false);
const deletingFileId = ref<string>();
const selectedMaterialId = ref<string>();
const workspaceTab = ref<'agent' | 'video'>('agent');
const generationMode = ref<'agent' | 'video_generation'>('agent');

// Video params from home page
const initialPrompt = ref('');
const initialVideoModel = ref('seedance-2.0');
const initialVideoDuration = ref(15);
const initialVideoAspectRatio = ref<'16:9' | '9:16'>('9:16');
const initialVideoResolution = ref<'720p' | '1080p'>('720p');
const initialVideoReferenceMode = ref<'reference' | 'first_last_frame'>('reference');
const initialFirstFrameFileId = ref<string | undefined>(undefined);
const initialLastFrameFileId = ref<string | undefined>(undefined);

// Form refs (desktop + mobile)
const videoGenerationFormRefDesktop = ref();
const videoGenerationFormRefMobile = ref();

// Mobile tabs
const tabs = [
  { id: 'files' as const, label: '文件', icon: '📁' },
  { id: 'preview' as const, label: '预览', icon: '👁️' },
  { id: 'chat' as const, label: '对话', icon: '💬' },
];

// --- Composables ---
const {
  files,
  ossMaterials,
  selectedFileId,
  projectTitle,
  isOwner,
  isShared,
  isRunning,
  isCancelling,
  loadOssMapping,
  refreshWorkspaceData,
  startPolling,
  stopPolling,
  startOssPollingIfNeeded,
  stopOssPolling,
} = useWorkspaceData(projectId, loadChatHistory);

const {
  videoGenerationState,
  videoWorkflowId,
  videoWorkflowData,
  videoGenerationError,
  stopVideoPolling,
  startVideoPolling,
  submitOmniVideo,
  buildMediaFromParams,
  mergeOssMedia,
  handleVideoGenerationSubmit,
  handleCancelVideoGeneration,
  handleRetryVideoGeneration,
  handleBackToVideoForm,
} = useVideoGeneration(projectId, files, loadOssMapping, startOssPollingIfNeeded);

// --- Download ---
const isDownloading = ref(false);
const downloadProgress = ref(0);

// --- Computed ---
const selectedFile = computed(() => files.value.find(f => f.id === selectedFileId.value));

// Auto-collapse right panel in canvas mode
watch(workspaceView, (view) => {
  rightPanelCollapsed.value = view === 'canvas';
});

// --- Lifecycle ---
onMounted(async () => {
  projectId.value = route.params.projectId as string;

  const modeFromState = history.state?.generationMode as 'agent' | 'video_generation';
  if (modeFromState) {
    generationMode.value = modeFromState;
    workspaceTab.value = modeFromState === 'video_generation' ? 'video' : 'agent';
  }

  const promptFromState = history.state?.prompt as string;
  if (promptFromState) initialPrompt.value = promptFromState;

  if (history.state?.videoModel) initialVideoModel.value = history.state.videoModel;
  if (history.state?.videoDuration) initialVideoDuration.value = history.state.videoDuration;
  if (history.state?.videoAspectRatio) initialVideoAspectRatio.value = history.state.videoAspectRatio;
  if (history.state?.videoResolution) initialVideoResolution.value = history.state.videoResolution;
  if (history.state?.videoReferenceMode) initialVideoReferenceMode.value = history.state.videoReferenceMode;
  if (history.state?.firstFrameFileId) initialFirstFrameFileId.value = history.state.firstFrameFileId;
  if (history.state?.lastFrameFileId) initialLastFrameFileId.value = history.state.lastFrameFileId;

  if (projectId.value === 'new' || route.path === '/workspace/new') {
    isNewProject.value = true;
    initialUserInput.value = history.state?.chatMessage as string;

    if (history.state?.hasFiles) {
      const fileMetadata = JSON.parse(sessionStorage.getItem('pendingFiles') || '[]');
      const pendingFiles = (window as any).__pendingFiles || [];
      if (fileMetadata.length > 0 && pendingFiles.length > 0) {
        initialFiles.value = fileMetadata.map((meta: any, index: number) => ({
          ...meta,
          file: pendingFiles[index],
        }));
      }
      sessionStorage.removeItem('pendingFiles');
      delete (window as any).__pendingFiles;
    }

    await configStore.loadConfig();
    await loadProject();

    if (generationMode.value === 'video_generation') {
      await autoCreateProjectForVideoGeneration();
      return;
    }

    if (initialUserInput.value?.trim()) {
      await handleSendMessage(initialUserInput.value);
    }
    return;
  }

  if (!projectId.value) {
    router.push('/');
    return;
  }

  configStore.loadConfig();
  loadProject();
});

onUnmounted(() => {
  stopPolling();
  stopVideoPolling();
  stopOssPolling();
});

// --- Project loading ---
const loadProject = async () => {
  if (isNewProject.value) {
    initMessages();
    files.value = [];
    selectedFileId.value = undefined;
    projectTitle.value = '新项目';
    return;
  }
  if (!projectId.value) return;

  try {
    await refreshWorkspaceData();
    startPolling();
    startOssPollingIfNeeded();
  } catch (error) {
    console.error('❌ 加载项目失败:', error);
  }
};

// --- Agent message handling ---
const handleSendMessage = async (content: string) => {
  const needCreateProject = !projectCreated.value && isNewProject.value;
  isRunning.value = true;
  addUserMessage(content);

  if (needCreateProject) {
    try {
      const createMsg = addAssistantMessage('正在创建项目，请稍后...');
      const projectData = await createVideoProject({ prompt: content });
      const newProjectId = projectData.id.toString();
      await router.replace(`/workspace/${newProjectId}`);
      projectId.value = newProjectId;
      projectTitle.value = projectData.project_name;
      projectCreated.value = true;
      isNewProject.value = false;
      removeMessage(createMsg.id);

      // Upload referenced files
      const referencedFiles = getReferencedFiles(initialUserInput.value || '', initialFiles.value);
      if (referencedFiles.length > 0) {
        const uploadMsg = addAssistantMessage('正在上传文件...');
        isUploading.value = true;
        try {
          const { uploadMaterial } = await import('@/api/videoProjectApi');
          for (const fp of referencedFiles) {
            await uploadMaterial(projectId.value, fp.file, fp.name);
          }
          await loadOssMapping();
          removeMessage(uploadMsg.id);
          initialFiles.value = [];
        } catch (uploadError) {
          console.error('❌ 文件上传失败:', uploadError);
          removeMessage(uploadMsg.id);
          addAssistantMessage('文件上传失败，但项目已创建。您可以稍后手动上传文件。');
        } finally {
          isUploading.value = false;
        }
      } else {
        initialFiles.value = [];
      }
    } catch (error) {
      console.error('❌ 创建项目失败:', error);
      addAssistantMessage('抱歉，创建项目时出现错误，请稍后重试。');
      isRunning.value = false;
      return;
    }
  }

  addAssistantMessage('正在分析您的任务类型...');

  try {
    await createVideo({ projectId: projectId.value, prompt: content });
    setTimeout(() => startPolling(), 3000);
  } catch (videoError) {
    isRunning.value = false;
    console.error('❌ 创建视频失败:', videoError);
    addAssistantMessage('启动视频创建时出现错误。请稍后重试。');
    toast.error(`错误信息：${videoError}`, '创建视频失败');
  }
};

// --- Auto-create project for video generation mode ---
const autoCreateProjectForVideoGeneration = async () => {
  if (projectCreated.value || !isNewProject.value) return;

  videoGenerationState.value = 'generating';

  try {
    const projectData = await createVideoProject({ prompt: initialPrompt.value });
    const newProjectId = projectData.id.toString();
    await router.replace(`/workspace/${newProjectId}`);
    projectId.value = newProjectId;
    projectTitle.value = projectData.project_name;
    projectCreated.value = true;
    isNewProject.value = false;

    // Upload initial files
    const images: VideoWorkflowImage[] = [];
    const videos: VideoWorkflowVideo[] = [];
    const audios: VideoWorkflowAudio[] = [];

    const firstFrameFile = initialFirstFrameFileId.value
      ? initialFiles.value.find(f => f.id === initialFirstFrameFileId.value)
      : null;
    const lastFrameFile = initialLastFrameFileId.value
      ? initialFiles.value.find(f => f.id === initialLastFrameFileId.value)
      : null;
    const regularFiles = initialFiles.value.filter(
      f => f.id !== initialFirstFrameFileId.value && f.id !== initialLastFrameFileId.value
    );
    const filesToUpload = [
      ...(firstFrameFile ? [firstFrameFile] : []),
      ...(lastFrameFile ? [lastFrameFile] : []),
      ...regularFiles,
    ];

    if (filesToUpload.length > 0) {
      isUploading.value = true;
      const uploadMsg = addAssistantMessage('正在上传文件...');
      try {
        const { uploadMaterial } = await import('@/api/videoProjectApi');
        for (const fp of filesToUpload) {
          const response = await uploadMaterial(projectId.value, fp.file, fp.name);
          const uploadedUrl = encodeURI(response.url);
          if (fp.type === 'image') {
            let type: 'first_frame' | 'last_frame' | 'reference' = 'reference';
            if (initialVideoReferenceMode.value === 'first_last_frame') {
              if (fp.id === initialFirstFrameFileId.value) type = 'first_frame';
              else if (fp.id === initialLastFrameFileId.value) type = 'last_frame';
            }
            images.push({ type, name: fp.name.split('.')[0], url: uploadedUrl });
          } else if (fp.type === 'video') {
            videos.push({ type: 'ref', name: fp.name.split('.')[0], url: uploadedUrl });
          } else if (fp.type === 'audio') {
            audios.push({ type: 'reference', name: fp.name.split('.')[0], url: uploadedUrl });
          }
        }
        await loadOssMapping();
        removeMessage(uploadMsg.id);
        initialFiles.value = [];
      } catch (uploadError) {
        console.error('❌ 文件上传失败:', uploadError);
        removeMessage(uploadMsg.id);
        videoGenerationState.value = 'failed';
        videoGenerationError.value = uploadError instanceof Error ? uploadError.message : '文件上传失败';
        toast.error('文件上传失败，请重试');
        isUploading.value = false;
        return;
      } finally {
        isUploading.value = false;
      }
    }

    // Merge OSS media
    await mergeOssMedia(initialPrompt.value || '', initialVideoReferenceMode.value, images, videos, audios);

    videoGenerationError.value = '';
    await submitOmniVideo({
      projectId: Number(newProjectId),
      model: initialVideoModel.value,
      prompt: initialPrompt.value,
      aspect_ratio: initialVideoAspectRatio.value,
      resolution: initialVideoResolution.value,
      duration: initialVideoDuration.value,
      images: images.length > 0 ? images : undefined,
      videos: videos.length > 0 ? videos : undefined,
      audios: audios.length > 0 ? audios : undefined,
    });
  } catch (error) {
    if ((error instanceof Error && error.name === 'CanceledError') || axios.isCancel(error)) return;
    console.error('❌ 自动视频生成失败:', error);
    videoGenerationState.value = 'failed';
    videoGenerationError.value = error instanceof Error ? error.message : '启动视频生成失败';
    toast.error('启动视频生成失败');
  }
};

// --- File handling ---
const handleFileSelect = (fileId: string) => {
  selectedFileId.value = fileId;
};

const handleMobileFileSelect = (fileId: string) => {
  selectedFileId.value = fileId;
  activeTab.value = 'preview';
};

const handleFileUploaded = async () => {
  await loadOssMapping();
};

const handleFileDeleted = async (fileId: string) => {
  if (!projectId.value || deletingFileId.value) return;
  const targetFile = files.value.find(f => f.id === fileId);
  if (!targetFile?.localFile) {
    toast.error('无法删除该文件：缺少文件路径');
    return;
  }
  if (!confirm(`确定要删除文件「${targetFile.file_name}」吗？`)) return;

  try {
    deletingFileId.value = fileId;
    await deleteProjectMaterial(projectId.value, targetFile.localFile);
    files.value = files.value.filter(f => f.id !== fileId);
    ossMaterials.value = ossMaterials.value.filter(m => m.localFile !== targetFile.localFile);
    if (selectedFileId.value === fileId) {
      selectedFileId.value = files.value.find(f => !f.status || f.status === 'SUCCESS')?.id;
    }
    await loadOssMapping();
    toast.success('文件已删除');
  } catch (error: any) {
    console.error('❌ 删除文件失败:', error);
    toast.error(error?.message || '删除文件失败，请稍后重试');
  } finally {
    deletingFileId.value = undefined;
  }
};

const handleUploadStart = () => { isUploading.value = true; };
const handleUploadEnd = () => { isUploading.value = false; };

// --- Project title / share ---
const handleProjectTitleChange = async (newTitle: string) => {
  if (!projectId.value || !newTitle.trim() || newTitle.trim() === projectTitle.value) return;
  try {
    await updateVideoProject(projectId.value, { project_name: newTitle.trim() });
    projectTitle.value = newTitle;
    toast.success('项目标题更新成功');
  } catch (error) {
    console.error('❌ 更新项目标题失败:', error);
    toast.error('更新项目标题失败，请稍后重试');
  }
};

const handleShareToggle = async () => {
  if (!projectId.value) return;
  const newStatus = !isShared.value;
  try {
    await updateVideoProject(projectId.value, { is_shared: newStatus });
    isShared.value = newStatus;
    toast.success(newStatus ? '已开启分享，任何人都可以通过当前链接查看本项目' : '已关闭分享');
  } catch (error) {
    console.error('❌ 更新分享状态失败:', error);
    toast.error('更新分享状态失败，请稍后重试');
  }
};

// --- Abort agent task ---
const handleAbortTask = async () => {
  if (!projectId.value || isCancelling.value) return;
  try {
    isCancelling.value = true;
    await abortVideoCreation({ projectId: projectId.value });
  } catch (error) {
    console.error('❌ 中断任务失败:', error);
    isCancelling.value = false;
  }
};

// --- Download ---
const handleDownload = async () => {
  if (!selectedFile.value || isDownloading.value) return;
  try {
    isDownloading.value = true;
    downloadProgress.value = 0;
    await downloadFileWithProgress(
      selectedFile.value.file_url,
      selectedFile.value.file_name || 'download',
      (p) => { downloadProgress.value = p; }
    );
    setTimeout(() => {
      isDownloading.value = false;
      downloadProgress.value = 0;
    }, 800);
  } catch (error) {
    console.error('Download failed:', error);
    toast.error('下载失败，请稍后重试');
    isDownloading.value = false;
    downloadProgress.value = 0;
  }
};

// --- Canvas handlers ---
const handleCanvasSelect = (material: OssMaterial) => {
  selectedMaterialId.value = material.ossKey || material.localFile || undefined;
  const matchingFile = files.value.find(f =>
    (material.ossUrl && f.file_url === material.ossUrl) ||
    (material.localFile && f.file_name === material.localFile.split('/').pop())
  );
  if (matchingFile) selectedFileId.value = matchingFile.id;
};

const handleCanvasEdit = (material: OssMaterial) => {
  workspaceTab.value = 'video';
  videoGenerationState.value = 'idle';
  if (material.prompt) initialPrompt.value = material.prompt;
  if (material.inputParams?.duration) initialVideoDuration.value = material.inputParams.duration;
  if (material.inputParams?.aspect_ratio) initialVideoAspectRatio.value = material.inputParams.aspect_ratio as '16:9' | '9:16';
  if (material.inputParams?.resolution) initialVideoResolution.value = material.inputParams.resolution as '720p' | '1080p';
  if (material.model) initialVideoModel.value = material.model;
};

const fillFormFromMaterial = (material: OssMaterial) => {
  workspaceTab.value = 'video';
  videoGenerationState.value = 'idle';
  rightPanelCollapsed.value = false;
  nextTick(() => {
    const hasFirstFrame = material.inputParams?.images?.[0]?.type === 'first_frame';
    const referenceMode: 'reference' | 'first_last_frame' = hasFirstFrame ? 'first_last_frame' : 'reference';
    const formParams = {
      prompt: material.prompt || '',
      model: material.model,
      duration: material.inputParams?.duration,
      aspectRatio: material.inputParams?.aspect_ratio as '16:9' | '9:16' | undefined,
      resolution: material.inputParams?.resolution as '720p' | '1080p' | undefined,
      referenceMode,
    };
    videoGenerationFormRefDesktop.value?.fillForm(formParams);
    videoGenerationFormRefMobile.value?.fillForm(formParams);
  });
};

const handleCanvasRegenerate = (material: OssMaterial) => {
  fillFormFromMaterial(material);
};

// --- PreviewArea handlers ---
const handleRegenerate = () => {
  if (!selectedFile.value) return;
  const file = selectedFile.value;
  const material = ossMaterials.value.find(m =>
    (m.ossUrl && m.ossUrl === file.file_url) ||
    (m.localFile && m.localFile.split('/').pop() === file.file_name)
  );
  if (material) {
    fillFormFromMaterial(material);
  } else {
    fillFormFromMaterial({ prompt: file.prompt || '' } as OssMaterial);
  }
};

const handleModify = () => {};

const showPromptModal = ref(false);

const handleShowPrompt = () => {
  showPromptModal.value = true;
};
</script>

<template>
  <MainLayout :show-footer="false" :show-sidebar="false">
    <div class="flex h-[calc(100vh-64px)] overflow-hidden bg-white">
      <!-- Mobile Tab Navigation -->
      <div class="fixed right-0 bottom-0 left-0 z-50 flex border-t border-gray-200 bg-white md:hidden">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          @click="activeTab = tab.id"
          :class="[
            'flex flex-1 flex-col items-center justify-center gap-1 py-3 text-xs font-medium transition-colors',
            activeTab === tab.id ? 'text-blue-500' : 'text-gray-400',
          ]"
        >
          <span class="text-lg">{{ tab.icon }}</span>
          <span>{{ tab.label }}</span>
        </button>
      </div>

      <!-- Desktop Layout -->
      <div class="hidden h-full w-full md:flex">
        <!-- Left Panel: File List + Preview Area or Canvas Flow -->
        <div class="flex h-full flex-[2] flex-col border-r border-border">
          <!-- View Toggle -->
          <div class="flex items-center justify-between h-12 border-b border-border px-4 bg-card">
            <div class="flex items-center gap-2">
              <button
                @click="workspaceView = 'list'"
                class="rounded-lg px-4 py-1 text-sm font-medium transition-all shadow-sm"
                :class="[
                  workspaceView === 'list'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground hover:bg-accent',
                ]"
              >
                📁 列表
              </button>
              <button
                @click="workspaceView = 'canvas'"
                class="rounded-lg px-4 py-1 text-sm font-medium transition-all shadow-sm"
                :class="[
                  workspaceView === 'canvas'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground hover:bg-accent',
                ]"
              >
                🧩 画布
              </button>
            </div>
          </div>

          <!-- File List View -->
          <div v-show="workspaceView === 'list'" class="flex min-h-0 flex-1 overflow-hidden bg-background">
            <FileList
              :files="files"
              :selected-file-id="selectedFileId"
              :project-title="projectTitle"
              :project-id="projectId"
              :is-uploading="isUploading"
              :is-owner="isOwner"
              :is-shared="isShared"
              :deleting-file-id="deletingFileId"
              @file-select="handleFileSelect"
              @project-title-change="handleProjectTitleChange"
              @share-toggle="handleShareToggle"
              @file-uploaded="handleFileUploaded"
              @upload-start="handleUploadStart"
              @upload-end="handleUploadEnd"
              @file-delete="handleFileDeleted"
            />

            <PreviewArea
              :file-url="selectedFile?.file_url"
              :file-type="selectedFile?.file_type"
              :file-name="selectedFile?.file_name"
              :is-downloading="isDownloading"
              :download-progress="downloadProgress"
              :status="selectedFile?.status"
              :prompt="selectedFile?.prompt"
              @regenerate="handleRegenerate"
              @download="handleDownload"
              @modify="handleModify"
              @show-prompt="handleShowPrompt"
            />
          </div>

          <!-- Canvas Flow View -->
          <div v-show="workspaceView === 'canvas'" class="min-h-0 flex-1 overflow-hidden bg-background">
            <CanvasFlow
              :materials="ossMaterials"
              :selected-material-id="selectedMaterialId"
              @select="handleCanvasSelect"
              @edit="handleCanvasEdit"
              @regenerate="handleCanvasRegenerate"
            />
          </div>
        </div>

        <!-- Right Panel: Chat/Video Generation Area with Tabs (collapsible) -->
        <div
          class="relative h-full flex-col border-l border-border bg-card flex transition-all duration-300 ease-in-out overflow-hidden"
          :class="rightPanelCollapsed ? 'w-12' : 'w-[360px] lg:w-[420px] xl:w-[500px]'"
        >
          <!-- Collapsed: icon tab strip -->
          <div v-if="rightPanelCollapsed" class="flex h-full flex-col items-center pt-3 gap-3">
            <button
              @click="rightPanelCollapsed = false"
              class="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
              title="展开面板"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
            </button>
            <button
              @click="workspaceTab = 'video'; rightPanelCollapsed = false"
              class="flex items-center justify-center w-8 h-8 rounded-lg transition-colors"
              :class="workspaceTab === 'video' ? 'bg-primary/10 text-primary' : 'hover:bg-accent text-muted-foreground hover:text-foreground'"
              title="视频生成"
            >
              <span class="text-base leading-none">🎬</span>
            </button>
            <button
              @click="workspaceTab = 'agent'; rightPanelCollapsed = false"
              class="flex items-center justify-center w-8 h-8 rounded-lg transition-colors"
              :class="workspaceTab === 'agent' ? 'bg-primary/10 text-primary' : 'hover:bg-accent text-muted-foreground hover:text-foreground'"
              title="Agent模式"
            >
              <span class="text-base leading-none">🤖</span>
            </button>
          </div>

          <!-- Expanded: full panel content -->
          <template v-else>
            <!-- Tab Navigation -->
            <div class="flex items-center h-12 border-b border-border shrink-0">
              <button
                @click="workspaceTab = 'video'"
                class="flex flex-1 items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors"
                :class="[
                  workspaceTab === 'video'
                    ? 'border-b-2 border-primary text-primary bg-accent/50'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent/30',
                ]"
              >
                <span>🎬</span>
                <span>视频生成</span>
              </button>
              <button
                @click="workspaceTab = 'agent'"
                class="flex flex-1 items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors"
                :class="[
                  workspaceTab === 'agent'
                    ? 'border-b-2 border-primary text-primary bg-accent/50'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent/30',
                ]"
              >
                <span>🤖</span>
                <span>Agent模式</span>
              </button>
              <button
                @click="rightPanelCollapsed = true"
                class="flex items-center justify-center w-8 h-8 mr-1 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors shrink-0"
                title="折叠面板"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </button>
            </div>

            <!-- Tab Content -->
            <div class="flex-1 overflow-hidden">
              <!-- Video Generation Tab -->
              <div v-show="workspaceTab === 'video'" class="h-full">
                <VideoGenerationForm
                  v-show="videoGenerationState === 'idle'"
                  ref="videoGenerationFormRefDesktop"
                  :initial-prompt="initialPrompt"
                  :initial-model="initialVideoModel"
                  :initial-duration="initialVideoDuration"
                  :initial-aspect-ratio="initialVideoAspectRatio"
                  :initial-resolution="initialVideoResolution"
                  :initial-reference-mode="initialVideoReferenceMode"
                  :initial-first-frame-file-id="initialFirstFrameFileId"
                  :initial-last-frame-file-id="initialLastFrameFileId"
                  :initial-files="initialFiles"
                  :is-loading="isRunning"
                  :project-files="files"
                  :immediate-upload="!!(projectId && projectId !== 'new')"
                  :project-id="projectId"
                  :video-models="configStore.videoModelList"
                  @submit="handleVideoGenerationSubmit"
                  @file-uploaded="handleFileUploaded"
                />
                <VideoGenerationProgress
                  v-show="videoGenerationState !== 'idle'"
                  :status="videoGenerationState === 'failed' ? 'FAILED' : (videoWorkflowData?.status || 'PENDING')"
                  :progress="videoWorkflowData?.output?.progress"
                  :result-url="videoWorkflowData?.output?.videoUrl || videoWorkflowData?.output?.videoUrls?.[0]"
                  :error-message="videoGenerationError"
                  :workflow-id="Number(videoWorkflowId)"
                  @cancel="handleCancelVideoGeneration"
                  @retry="handleRetryVideoGeneration"
                  @back="handleBackToVideoForm"
                />
              </div>

              <!-- Agent Mode Tab -->
              <div v-show="workspaceTab === 'agent'" class="h-full">
                <ChatBox
                  :files="files"
                  :messages="messages"
                  :project-id="projectId"
                  :is-running="isRunning"
                  :is-uploading="isUploading"
                  :is-owner="isOwner"
                  :is-cancelling="isCancelling"
                  @send-message="handleSendMessage"
                  @abort-task="handleAbortTask"
                  @file-uploaded="handleFileUploaded"
                  @upload-start="handleUploadStart"
                  @upload-end="handleUploadEnd"
                />
              </div>
            </div>
          </template>
        </div>
      </div>

      <!-- Mobile Layout -->
      <div class="flex h-full w-full flex-col md:hidden">
        <div v-show="activeTab === 'files'" class="h-full overflow-hidden">
          <FileList
            :files="files"
            :selected-file-id="selectedFileId"
            :project-title="projectTitle"
            :project-id="projectId"
            :is-uploading="isUploading"
            :is-owner="isOwner"
            :is-shared="isShared"
            :deleting-file-id="deletingFileId"
            @file-select="handleMobileFileSelect"
            @project-title-change="handleProjectTitleChange"
            @share-toggle="handleShareToggle"
            @file-uploaded="handleFileUploaded"
            @upload-start="handleUploadStart"
            @upload-end="handleUploadEnd"
            @file-delete="handleFileDeleted"
          />
        </div>

        <div v-show="activeTab === 'preview'" class="h-full overflow-hidden">
          <PreviewArea
            :file-url="selectedFile?.file_url"
            :file-type="selectedFile?.file_type"
            :file-name="selectedFile?.file_name"
            :is-downloading="isDownloading"
            :download-progress="downloadProgress"
            :status="selectedFile?.status"
            :prompt="selectedFile?.prompt"
            @regenerate="handleRegenerate"
            @download="handleDownload"
            @modify="handleModify"
            @show-prompt="handleShowPrompt"
          />
        </div>

        <div v-show="activeTab === 'chat'" class="h-full overflow-hidden pb-16">
          <div class="flex h-full flex-col">
            <!-- Tab Navigation (Mobile) -->
            <div class="flex border-b border-gray-200 md:hidden">
              <button
                @click="workspaceTab = 'video'"
                class="flex flex-1 items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors"
                :class="[
                  workspaceTab === 'video'
                    ? 'border-b-2 border-gray-900 text-gray-900'
                    : 'text-gray-500 hover:text-gray-700',
                ]"
              >
                <span>🎬</span>
                <span>视频生成</span>
              </button>
              <button
                @click="workspaceTab = 'agent'"
                class="flex flex-1 items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors"
                :class="[
                  workspaceTab === 'agent'
                    ? 'border-b-2 border-gray-900 text-gray-900'
                    : 'text-gray-500 hover:text-gray-700',
                ]"
              >
                <span>🤖</span>
                <span>Agent模式</span>
              </button>
            </div>

            <!-- Mobile: Video Generation Tab -->
            <div v-show="workspaceTab === 'video'" class="flex-1 overflow-hidden pb-4 md:hidden">
              <VideoGenerationForm
                v-show="videoGenerationState === 'idle'"
                ref="videoGenerationFormRefMobile"
                :initial-prompt="initialPrompt"
                :initial-model="initialVideoModel"
                :initial-duration="initialVideoDuration"
                :initial-aspect-ratio="initialVideoAspectRatio"
                :initial-resolution="initialVideoResolution"
                :initial-reference-mode="initialVideoReferenceMode"
                :initial-first-frame-file-id="initialFirstFrameFileId"
                :initial-last-frame-file-id="initialLastFrameFileId"
                :initial-files="initialFiles"
                :is-loading="isRunning"
                :project-files="files"
                :immediate-upload="!!(projectId && projectId !== 'new')"
                :project-id="projectId"
                :video-models="configStore.videoModelList"
                @submit="handleVideoGenerationSubmit"
                @file-uploaded="handleFileUploaded"
              />
              <VideoGenerationProgress
                v-show="videoGenerationState !== 'idle'"
                :status="videoGenerationState === 'failed' ? 'FAILED' : (videoWorkflowData?.status || 'PENDING')"
                :progress="videoWorkflowData?.output?.progress"
                :result-url="videoWorkflowData?.output?.videoUrl || videoWorkflowData?.output?.videoUrls?.[0]"
                :error-message="videoGenerationError"
                :workflow-id="Number(videoWorkflowId)"
                @cancel="handleCancelVideoGeneration"
                @retry="handleRetryVideoGeneration"
                @back="handleBackToVideoForm"
              />
            </div>

            <!-- Mobile: Agent Mode Tab -->
            <div v-show="workspaceTab === 'agent'" class="h-full pb-16 md:hidden">
              <ChatBox
                :files="files"
                :messages="messages"
                :project-id="projectId"
                :is-running="isRunning"
                :is-uploading="isUploading"
                :is-owner="isOwner"
                :is-cancelling="isCancelling"
                @send-message="handleSendMessage"
                @abort-task="handleAbortTask"
                @file-uploaded="handleFileUploaded"
                @upload-start="handleUploadStart"
                @upload-end="handleUploadEnd"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Prompt Modal -->
    <div
      v-if="showPromptModal && selectedFile?.prompt"
      @click="showPromptModal = false"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <div @click.stop class="w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl">
        <div class="mb-4 flex items-center justify-between">
          <h3 class="m-0 text-lg font-semibold text-gray-900">生成提示词</h3>
          <button
            @click="showPromptModal = false"
            class="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            ✕
          </button>
        </div>
        <div class="rounded-lg bg-gray-50 p-4">
          <p class="m-0 whitespace-pre-wrap text-sm text-gray-700">{{ selectedFile.prompt }}</p>
        </div>
      </div>
    </div>
  </MainLayout>
</template>
