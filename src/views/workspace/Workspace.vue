<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';
import axios from 'axios';
import { useRoute, useRouter } from 'vue-router';
import MainLayout from '@/components/layout/MainLayout.vue';
import FileList from './components/FileList.vue';
import PreviewArea from './components/PreviewArea.vue';
import ChatBox from './components/ChatBox.vue';
import VideoGenerationForm from './components/VideoGenerationForm.vue';
import VideoGenerationProgress from './components/VideoGenerationProgress.vue';
import type { VideoGenerationParams } from './components/VideoGenerationForm.vue';
import {
  createVideoProject,
  createVideo,
  getProjectDetails,
  getOssMapping,
  getStoryBoard,
  abortVideoCreation,
  updateVideoProject,
} from '@/api/videoProjectApi';
import { cancelRequest } from '@/api/client';
import {
  createOmniVideo,
  getVideoWorkflow,
  deleteVideoWorkflow,
  type VideoWorkflowResponse,
  type VideoWorkflowImage,
  type VideoWorkflowVideo,
  type VideoWorkflowAudio,
} from '@/api/videoWorkflowApi';
import { useChatMessages } from '@/composables';
import { useToast } from '@/composables/useToast';
import { getSystemConfig } from '@/api/systemApi';
import { videoModels } from '@/config/videoGeneration';
import type { FilePreview } from '@/types/fileReference';
import { getReferencedFiles } from '@/utils/fileUtils';

export interface WorkspaceFile {
  id: string;
  file_name: string;
  file_type: string;
  file_url: string;
  thumbnail_url?: string;
  file_size?: number;
  created_at: string;
}

const route = useRoute();
const router = useRouter();

// Use chat messages composable
const { messages, initMessages, addUserMessage, removeMessage, addAssistantMessage, loadChatHistory } =
  useChatMessages();
const { toast } = useToast();

const files = ref<WorkspaceFile[]>([]);
const selectedFileId = ref<string>();
const isRunning = ref(false);
const isUploading = ref(false);
const projectTitle = ref('');
const initialUserInput = ref<string>();
const initialFiles = ref<FilePreview[]>([]);
const isNewProject = ref(false);
const projectCreated = ref(false);
const pollingTimer = ref<NodeJS.Timeout | null>(null);
const isAborting = ref(false);
const isPolling = ref(false);
const isVideoPolling = ref(false);
const projectId = ref<string>('');
const activeTab = ref<'files' | 'preview' | 'chat'>('chat');
const isOwner = ref<boolean>(true);
const isShared = ref<boolean>(false);
const isCancelling = ref(false);

// Video generation mode (passed from home page)
const generationMode = ref<'agent' | 'video_generation'>('agent');

// Workspace tabs
const workspaceTab = ref<'agent' | 'video'>('agent');

// Video generation state
const videoGenerationState = ref<'idle' | 'generating' | 'completed' | 'failed'>('idle');
const videoWorkflowId = ref<string | number>('');
const videoWorkflowData = ref<VideoWorkflowResponse | null>(null);
const videoGenerationError = ref('');
const initialPrompt = ref('');
import type { ICommonResponse } from '@/api/client';
import type { CreateOmniVideoResponse } from '@/api/videoWorkflowApi';
let createOmniVideoRequest: Promise<ICommonResponse<CreateOmniVideoResponse>> | null = null;

// Video params passed from home page
const initialVideoModel = ref('seedance-2.0');
const initialVideoDuration = ref(15);
const initialVideoAspectRatio = ref<'16:9' | '9:16'>('9:16');
const initialVideoResolution = ref<'720p' | '1080p'>('720p');
const initialVideoReferenceMode = ref<'reference' | 'first_last_frame'>('reference');

// Price configuration from system config
const priceConfig = ref<any>(null);

// Load system config for pricing
const loadSystemConfig = async () => {
  try {
    const config = await getSystemConfig(['web_price']);
    if (config.webPrice) {
      priceConfig.value = config.webPrice;
    }
  } catch (error) {
    console.error('Failed to load system config:', error);
  }
};

// Video generation polling
let videoPollingTimer: NodeJS.Timeout | null = null;

const tabs = [
  { id: 'files' as const, label: '文件', icon: '📁' },
  { id: 'preview' as const, label: '预览', icon: '👁️' },
  { id: 'chat' as const, label: '对话', icon: '💬' },
];

const selectedFile = computed(() => {
  return files.value.find(f => f.id === selectedFileId.value);
});

onMounted(async () => {
  projectId.value = route.params.projectId as string;

  // Check generation mode from router state
  const modeFromState = history.state?.generationMode as 'agent' | 'video_generation';
  if (modeFromState) {
    generationMode.value = modeFromState;
    workspaceTab.value = modeFromState === 'video_generation' ? 'video' : 'agent';
  }

  // Get initial prompt from state
  const promptFromState = history.state?.prompt as string;
  if (promptFromState) {
    initialPrompt.value = promptFromState;
  }

  // Get video params from state (passed from home page)
  if (history.state?.videoModel) initialVideoModel.value = history.state.videoModel;
  if (history.state?.videoDuration) initialVideoDuration.value = history.state.videoDuration;
  if (history.state?.videoAspectRatio) initialVideoAspectRatio.value = history.state.videoAspectRatio;
  if (history.state?.videoResolution) initialVideoResolution.value = history.state.videoResolution;
  if (history.state?.videoReferenceMode) initialVideoReferenceMode.value = history.state.videoReferenceMode;

  // Handle new workspace creation
  if (projectId.value === 'new' || route.path === '/workspace/new') {
    isNewProject.value = true;
    initialUserInput.value = history.state?.chatMessage as string;

    // Retrieve files from sessionStorage and window object
    if (history.state?.hasFiles) {
      const fileMetadata = JSON.parse(sessionStorage.getItem('pendingFiles') || '[]');
      const files = (window as any).__pendingFiles || [];

      if (fileMetadata.length > 0 && files.length > 0) {
        initialFiles.value = fileMetadata.map((meta: any, index: number) => ({
          ...meta,
          file: files[index],
        }));
      }

      // Clean up
      sessionStorage.removeItem('pendingFiles');
      delete (window as any).__pendingFiles;
    }

    await loadSystemConfig();
    await loadProject();

    // If in video generation mode, auto-create project then let user submit the form
    if (generationMode.value === 'video_generation') {
      await autoCreateProjectForVideoGeneration();
      return;
    }

    // Auto-send initial message if it exists
    if (initialUserInput.value && initialUserInput.value.trim()) {
      await handleSendMessage(initialUserInput.value);
    }
    return;
  }

  if (!projectId.value) {
    router.push('/');
    return;
  }

  loadSystemConfig();
  loadProject();
});

// Clean up timer when component is unmounted
onUnmounted(() => {
  stopPolling();
  stopVideoPolling();
});

const loadProject = async () => {
  // For new workspace, start with empty data
  if (isNewProject.value) {
    initMessages();
    files.value = [];
    selectedFileId.value = undefined;
    projectTitle.value = '新项目';
    return;
  }

  // Load real project data from API
  if (!projectId.value) return;

  try {
    await refreshWorkspaceData();

    // Start polling for project updates every 5 seconds
    startPolling();
  } catch (error) {
    console.error('❌ 加载项目失败:', error);
  }
};

// Load chat history independently
const loadChatHistoryData = async () => {
  try {
    await loadChatHistory(projectId.value);
  } catch (error) {
    console.error('❌ 加载聊天记录失败:', error);
  }
};

// Load OSS mapping independently
const loadOssMapping = async () => {
  try {
    const ossData = await getOssMapping(projectId.value);

    // Convert OSS mapping to file list
    if (ossData.ossMapping && Array.isArray(ossData.ossMapping)) {
      files.value = ossData.ossMapping.map((item, index) => ({
        id: `file-${index}`,
        file_name: item.localFile.split('/').pop() || item.localFile,
        file_type: getFileTypeFromExtension(item.localFile) || item.fileType,
        file_url: item.ossUrl,
        thumbnail_url: item.fileType === 'image' ? item.ossUrl : undefined,
        file_size: item.fileSize,
        created_at: item.uploadTime,
      }));

      // Select first file if none selected
      if (files.value.length > 0 && !selectedFileId.value) {
        selectedFileId.value = files.value[0].id;
      }
    }
  } catch (error) {
    console.error('❌ 加载OSS映射失败:', error);
    // If OSS mapping fails to load, keep existing files or set empty array
    if (!files.value.length) {
      files.value = [];
    }
  }
};

const loadOssAndMessages = async () => {
  return Promise.all([loadOssMapping(), loadChatHistoryData()]);
};

const refreshWorkspaceData = async () => {
  console.log('refreshWorkspaceData projectId', projectId.value);
  try {
    const projectData = await getProjectDetails(projectId.value);

    // Update is_owner status
    isOwner.value = projectData.is_owner !== false;

    // Update is_shared status
    isShared.value = projectData.is_shared === true;

    // Handle status changes
    const currentStatus = projectData.status;

    projectTitle.value = projectData.project_name;

    if (currentStatus === 'RUNNING' || currentStatus === 'KILLED') {
      isRunning.value = true;
    }

    // Reset isCancelling when status is not KILLED
    if (currentStatus !== 'KILLED') {
      isCancelling.value = false;
    }

    // when currentStatus is null,we should not change the isRunning
    if (currentStatus && currentStatus !== 'RUNNING' && currentStatus !== 'KILLED') {
      console.log('任务结束:', currentStatus);
      // 任务结束
      isRunning.value = false;
      stopPolling();
    }

    // no matter what's the project's status,load Oss and Messages
    await loadOssAndMessages();
  } catch (error) {
    console.error('❌ 刷新工作区数据失败:', error);
  }
};

const stopPolling = () => {
  if (pollingTimer.value) {
    clearTimeout(pollingTimer.value);
    pollingTimer.value = null;
  }
  isPolling.value = false;
};

const scheduleNextPoll = (delay: number = 5000) => {
  if (isPolling.value) {
    pollingTimer.value = setTimeout(async () => {
      if (!isPolling.value) return; // Check if polling was stopped

      try {
        await refreshWorkspaceData();
        // Schedule next poll only if current one completed and polling is still active
        if (isPolling.value) {
          scheduleNextPoll(delay);
        }
      } catch (error) {
        console.error('❌ 轮询刷新数据失败:', error);
        // Continue polling even if one request fails
        if (isPolling.value) {
          scheduleNextPoll(delay);
        }
      }
    }, delay);
  }
};

const startPolling = () => {
  // Clear existing timer
  stopPolling();

  // Start polling
  isPolling.value = true;
  scheduleNextPoll();
};

const getFileTypeFromExtension = (filename: string): string => {
  const ext = filename.split('.').pop()?.toLowerCase();
  if (!ext) return 'document';

  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) {
    return 'image';
  } else if (['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm'].includes(ext)) {
    return 'video';
  } else if (['mp3', 'wav', 'flac', 'aac', 'ogg'].includes(ext)) {
    return 'audio';
  } else {
    return 'document';
  }
};

const handleSendMessage = async (content: string) => {
  // If this is a new project and we haven't created it yet, create it first
  const needCreateProject = !projectCreated.value && isNewProject.value;

  isRunning.value = true;

  // Create a new user message and add it to the chat,after we loaded this message from the server,this message will be coverd.
  addUserMessage(content);

  if (needCreateProject) {
    try {
      // Add a creating message
      const createProjectMessage = addAssistantMessage('正在创建项目，请稍后...');

      // Create the project using the first message as prompt
      const projectData = await createVideoProject({
        prompt: content,
      });

      // Update the URL to use the new project ID
      const newProjectId = projectData.id.toString();
      await router.replace(`/workspace/${newProjectId}`);

      // Update the projectId ref
      projectId.value = newProjectId;

      // Update project title with the generated name
      projectTitle.value = projectData.project_name;

      // Mark project as created
      projectCreated.value = true;
      isNewProject.value = false;

      removeMessage(createProjectMessage.id);

      console.log('✅ 项目创建成功:', projectData);

      // Upload referenced files if any
      const referencedFiles = getReferencedFiles(initialUserInput.value || '', initialFiles.value);
      if (referencedFiles.length > 0) {
        const uploadMessage = addAssistantMessage('正在上传文件...');
        isUploading.value = true;

        try {
          // Import the upload function
          const { uploadMaterial } = await import('@/api/videoProjectApi');

          // Upload each referenced file with renamed name
          for (const filePreview of referencedFiles) {
            await uploadMaterial(projectId.value, filePreview.file, filePreview.name);
          }

          // Refresh file list
          await loadOssMapping();

          removeMessage(uploadMessage.id);
          console.log('✅ 已引用的文件上传成功');

          // Clear initial files after upload
          initialFiles.value = [];
        } catch (uploadError) {
          console.error('❌ 文件上传失败:', uploadError);
          removeMessage(uploadMessage.id);
          addAssistantMessage('文件上传失败，但项目已创建。您可以稍后手动上传文件。');
        } finally {
          isUploading.value = false;
        }
      } else if (initialFiles.value.length > 0) {
        // No referenced files, just clear the initial files
        console.log('⚠️ 没有在prompt中引用的文件，跳过上传');
        initialFiles.value = [];
      }
    } catch (error) {
      console.error('❌ 创建项目失败:', error);

      // Add error message to chat
      addAssistantMessage('抱歉，创建项目时出现错误，请稍后重试。');
      isRunning.value = false;
      return;
    }
  }

  // The server can not generate assistant message immediately,
  // so we add a placeholder message to show the user that we're processing
  addAssistantMessage('正在分析您的任务类型...');

  // Create video (common logic for both new and existing projects)
  try {
    const videoCreationResult = await createVideo({
      projectId: projectId.value,
      prompt: content,
    });

    console.log('✅ 视频创建任务已启动:', videoCreationResult);

    // Start polling for updates
    setTimeout(() => {
      startPolling();
    }, 3000);
  } catch (videoError) {
    isRunning.value = false;

    console.error('❌ 创建视频失败:', videoError);

    // Add video creation error message to chat
    addAssistantMessage('启动视频创建时出现错误。请稍后重试。');
    toast.error(`错误信息：${videoError}`, '创建视频失败');
  }
};

const handleFileSelect = (fileId: string) => {
  selectedFileId.value = fileId;
};

const handleMobileFileSelect = (fileId: string) => {
  selectedFileId.value = fileId;
  activeTab.value = 'preview';
};

const handleProjectTitleChange = async (newTitle: string) => {
  if (!projectId.value || !newTitle.trim()) {
    return;
  }

  if (newTitle.trim() === projectTitle.value) {
    return;
  }

  try {
    await updateVideoProject(projectId.value, {
      project_name: newTitle.trim(),
    });

    projectTitle.value = newTitle;
    toast.success('项目标题更新成功');
    console.log('✅ 项目标题更新成功:', newTitle);
  } catch (error) {
    console.error('❌ 更新项目标题失败:', error);
    toast.error('更新项目标题失败，请稍后重试');
    // Note: The UI should handle reverting the title change if needed
  }
};

const handleShareToggle = async () => {
  if (!projectId.value) return;

  const newSharedStatus = !isShared.value;

  try {
    await updateVideoProject(projectId.value, {
      is_shared: newSharedStatus,
    });

    isShared.value = newSharedStatus;
    toast.success(newSharedStatus ? '已开启分享，任何人都可以通过当前链接查看本项目' : '已关闭分享');
  } catch (error) {
    console.error('❌ 更新分享状态失败:', error);
    toast.error('更新分享状态失败，请稍后重试');
  }
};

const handleFileUpload = (file: File) => {
  const fileType = file.type.startsWith('image/')
    ? 'image'
    : file.type.startsWith('video/')
      ? 'video'
      : file.type.startsWith('audio/')
        ? 'audio'
        : 'document';

  const newFile: WorkspaceFile = {
    id: `file-${Date.now()}`,
    file_name: file.name,
    file_type: fileType,
    file_url: URL.createObjectURL(file),
    file_size: file.size,
    created_at: new Date().toISOString(),
  };

  files.value.unshift(newFile);
  selectedFileId.value = newFile.id;
};

const handleFileUploaded = async () => {
  // Refresh OSS mapping to get the newly uploaded file
  await loadOssMapping();
};

const handleUploadStart = () => {
  isUploading.value = true;
};

const handleUploadEnd = () => {
  isUploading.value = false;
};

const isDownloading = ref(false);
const downloadProgress = ref(0);

const handleDownload = async () => {
  if (!selectedFile.value || isDownloading.value) return;

  try {
    isDownloading.value = true;
    downloadProgress.value = 0;

    // Fetch the file with progress tracking
    const response = await fetch(selectedFile.value.file_url);

    if (!response.ok) {
      throw new Error('Download failed');
    }

    const contentLength = response.headers.get('content-length');
    const total = contentLength ? parseInt(contentLength, 10) : 0;

    console.log('Download started - Content-Length:', total || 'unknown');

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Unable to read response');
    }

    const chunks: Uint8Array[] = [];
    let receivedLength = 0;

    // For unknown file size, simulate progress
    let simulatedProgress = 0;
    const progressInterval =
      total === 0
        ? setInterval(() => {
            if (simulatedProgress < 99) {
              simulatedProgress += Math.random() * 3;
              downloadProgress.value = Math.min(90, Math.round(simulatedProgress));
            }
          }, 200)
        : null;

    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      chunks.push(value);
      receivedLength += value.length;

      // Update progress based on actual size
      if (total > 0) {
        const progress = Math.round((receivedLength / total) * 100);
        downloadProgress.value = progress;
        console.log(`Download progress: ${progress}% (${receivedLength}/${total} bytes)`);
      }
    }

    // Clear simulated progress interval
    if (progressInterval) {
      clearInterval(progressInterval);
    }

    console.log('Download complete - Total bytes:', receivedLength);

    // Combine chunks into single array
    const blob = new Blob(chunks as BlobPart[]);
    const url = window.URL.createObjectURL(blob);

    // Show completion
    downloadProgress.value = 100;

    // Small delay to show 100% before triggering download
    await new Promise(resolve => setTimeout(resolve, 300));

    // Trigger download
    const link = document.createElement('a');
    link.href = url;
    link.download = selectedFile.value.file_name || 'download';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up
    window.URL.revokeObjectURL(url);

    // Keep success state visible briefly
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

const handleRegenerate = () => {
  console.log('Regenerate');
};

const handleModify = () => {
  console.log('Modify');
};

const handleShowPrompt = () => {
  console.log('Show prompt');
};

const handleAbortTask = async () => {
  if (!projectId.value || isCancelling.value) return;

  try {
    isCancelling.value = true;

    // Call abort API
    await abortVideoCreation({ projectId: projectId.value });

    console.log('任务中断请求已发送');

    // The polling will handle the status change and reset isCancelling
  } catch (error) {
    console.error('❌ 中断任务失败:', error);
    isCancelling.value = false;
  }
};

// Video generation functions
const autoCreateProjectForVideoGeneration = async () => {
  if (projectCreated.value || !isNewProject.value) return;

  // Immediately show the progress UI
  videoGenerationState.value = 'generating';

  try {
    // Step 1: create project
    const projectData = await createVideoProject({
      prompt: initialPrompt.value,
    });

    const newProjectId = projectData.id.toString();
    await router.replace(`/workspace/${newProjectId}`);

    projectId.value = newProjectId;
    projectTitle.value = projectData.project_name;
    projectCreated.value = true;
    isNewProject.value = false;

    console.log('✅ 视频生成项目创建成功:', projectData);

    // Step 2: upload referenced files if any and build params directly from upload response
    const images: VideoWorkflowImage[] = [];
    const videos: VideoWorkflowVideo[] = [];
    const audios: VideoWorkflowAudio[] = [];

    const referencedFiles = getReferencedFiles(initialPrompt.value || '', initialFiles.value);
    if (referencedFiles.length > 0) {
      isUploading.value = true;
      const uploadMessage = addAssistantMessage('正在上传文件...');

      try {
        // Import the upload function
        const { uploadMaterial } = await import('@/api/videoProjectApi');

        // Upload each referenced file with renamed name and build params directly from response
        for (const filePreview of referencedFiles) {
          const response = await uploadMaterial(projectId.value, filePreview.file, filePreview.name);
          const uploadedUrl = response.url;

          if (filePreview.type === 'image') {
            let type: 'first_frame' | 'last_frame' | 'reference' = 'reference';
            if (initialVideoReferenceMode.value === 'first_last_frame') {
              const imageIndex = images.length;
              if (imageIndex === 0) type = 'first_frame';
              else if (imageIndex === 1) type = 'last_frame';
            }
            images.push({
              type,
              name: filePreview.name.split('.')[0],
              url: encodeURI(uploadedUrl),
            });
          } else if (filePreview.type === 'video') {
            videos.push({
              type: 'ref',
              name: filePreview.name.split('.')[0],
              url: encodeURI(uploadedUrl),
            });
          } else if (filePreview.type === 'audio') {
            audios.push({
              type: 'reference',
              name: filePreview.name.split('.')[0],
              url: encodeURI(uploadedUrl),
            });
          }
        }

        // Refresh file list
        await loadOssMapping();

        removeMessage(uploadMessage.id);
        console.log('✅ 已引用的文件上传成功');

        // Clear initial files after upload
        initialFiles.value = [];
      } catch (uploadError) {
        console.error('❌ 文件上传失败:', uploadError);
        removeMessage(uploadMessage.id);
        videoGenerationState.value = 'failed';
        videoGenerationError.value = uploadError instanceof Error ? uploadError.message : '文件上传失败';
        toast.error('文件上传失败，请重试');
        isUploading.value = false;
        return;
      } finally {
        isUploading.value = false;
      }
    } else if (initialFiles.value.length > 0) {
      // No referenced files, just clear the initial files
      console.log('⚠️ 没有在prompt中引用的文件，跳过上传');
      initialFiles.value = [];
    }

    // Step 3: add referenced media from OSS files
    const { buildReferencedMediaFromProjectFiles } = await import('@/utils/fileUtils');
    const ossMedia = buildReferencedMediaFromProjectFiles(
      initialPrompt.value || '',
      files.value,
      initialVideoReferenceMode.value
    );

    // Get uploaded file URLs to avoid duplicates (more reliable than name)
    const uploadedUrls = new Set([
      ...images.map(img => img.url),
      ...videos.map(video => video.url),
      ...audios.map(audio => audio.url),
    ]);

    // Add OSS files that weren't just uploaded
    for (const img of ossMedia.images) {
      if (!uploadedUrls.has(img.url)) {
        images.push(img as VideoWorkflowImage);
      }
    }
    for (const video of ossMedia.videos) {
      if (!uploadedUrls.has(video.url)) {
        videos.push(video as VideoWorkflowVideo);
      }
    }
    for (const audio of ossMedia.audios) {
      if (!uploadedUrls.has(audio.url)) {
        audios.push(audio as VideoWorkflowAudio);
      }
    }

    // Step 4: call createOmniVideo with params from home
    videoGenerationError.value = '';
    try {
      createOmniVideoRequest = createOmniVideo({
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
      const response = await createOmniVideoRequest;
      videoWorkflowId.value = response.data.workflowId;
      console.log('✅ 视频生成任务已启动:', response.data);
      startVideoPolling();
    } finally {
      createOmniVideoRequest = null;
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'CanceledError' || axios.isCancel(error)) {
      console.log('🔄 createOmniVideo 请求已被取消');
      return;
    }
    console.error('❌ 自动视频生成失败:', error);
    videoGenerationState.value = 'failed';
    videoGenerationError.value = error instanceof Error ? error.message : '启动视频生成失败';
    toast.error('启动视频生成失败');
  } finally {
    createOmniVideoRequest = null;
  }
};

const handleVideoGenerationSubmit = async (params: VideoGenerationParams) => {
  if (!projectId.value || projectId.value === 'new') {
    toast.error('请先创建项目');
    return;
  }

  try {
    videoGenerationState.value = 'generating';
    videoGenerationError.value = '';

    const images: VideoWorkflowImage[] = [];
    const videos: VideoWorkflowVideo[] = [];
    const audios: VideoWorkflowAudio[] = [];

    // Filter files that are referenced in prompt
    const { isFileReferencedInPrompt, removeFileExtension } = await import('@/utils/fileUtils');

    const referencedImages = (params.images || []).filter(img => 
      !img.file || isFileReferencedInPrompt(params.prompt, img.name || '')
    );
    const referencedVideos = (params.videos || []).filter(video => 
      !video.file || isFileReferencedInPrompt(params.prompt, video.name || '')
    );
    const referencedAudios = (params.audios || []).filter(audio => 
      !audio.file || isFileReferencedInPrompt(params.prompt, audio.name || '')
    );

    let hasLocalFiles = false;
    if (referencedImages.some(img => img.file)) {
      hasLocalFiles = true;
    }
    if (referencedVideos.some(video => video.file)) {
      hasLocalFiles = true;
    }
    if (referencedAudios.some(audio => audio.file)) {
      hasLocalFiles = true;
    }

    let uploadMessage: { id: string } | null = null;
    if (hasLocalFiles) {
      isUploading.value = true;
      uploadMessage = addAssistantMessage('正在上传文件...');
    } else if ((params.images?.length || 0) > 0 || (params.videos?.length || 0) > 0 || (params.audios?.length || 0) > 0) {
      console.log('⚠️ 没有在prompt中引用的本地文件，跳过上传');
    }

    try {
      const { uploadMaterial } = await import('@/api/videoProjectApi');

      const getUniqueFileName = (originalName: string): string => {
        const existingNames = files.value.map(f => f.file_name);
        if (!existingNames.includes(originalName)) {
          return originalName;
        }

        const extIndex = originalName.lastIndexOf('.');
        const extension = extIndex > 0 ? originalName.substring(extIndex) : '';
        let baseName = extIndex > 0 ? originalName.substring(0, extIndex) : originalName;

        const numberMatch = baseName.match(/(\d+)$/);
        if (numberMatch) {
          const currentNumber = parseInt(numberMatch[1], 10);
          baseName = baseName.slice(0, -numberMatch[1].length);
          let nextNumber = currentNumber + 1;
          let newName = `${baseName}${nextNumber}${extension}`;
          while (existingNames.includes(newName)) {
            nextNumber++;
            newName = `${baseName}${nextNumber}${extension}`;
          }
          return newName;
        }

        let counter = 1;
        let newName = `${baseName}${counter}${extension}`;
        while (existingNames.includes(newName)) {
          counter++;
          newName = `${baseName}${counter}${extension}`;
        }
        return newName;
      };

      for (const img of referencedImages) {
        let type: 'first_frame' | 'last_frame' | 'reference' = 'reference';
        if (params.referenceMode === 'first_last_frame') {
          const imageIndex = images.length;
          if (imageIndex === 0) type = 'first_frame';
          else if (imageIndex === 1) type = 'last_frame';
        }
        if (img.file) {
          const fileName = img.name ? getUniqueFileName(img.name) : undefined;
          const response = await uploadMaterial(projectId.value, img.file, fileName);
          images.push({
            type,
            name: fileName ? removeFileExtension(fileName) : undefined,
            url: encodeURI(response.url),
          });
        } else if (img.url) {
          images.push({
            type,
            name: img.name ? removeFileExtension(img.name) : undefined,
            url: img.url,
          });
        }
      }

      for (const video of referencedVideos) {
        if (video.file) {
          const fileName = video.name ? getUniqueFileName(video.name) : undefined;
          const response = await uploadMaterial(projectId.value, video.file, fileName);
          videos.push({
            type: 'ref',
            name: fileName ? removeFileExtension(fileName) : undefined,
            url: encodeURI(response.url),
            duration: video.duration,
          });
        } else if (video.url) {
          videos.push({
            type: 'ref',
            name: video.name ? removeFileExtension(video.name) : undefined,
            url: video.url,
            duration: video.duration,
          });
        }
      }

      for (const audio of referencedAudios) {
        if (audio.file) {
          const fileName = audio.name ? getUniqueFileName(audio.name) : undefined;
          const response = await uploadMaterial(projectId.value, audio.file, fileName);
          audios.push({
            type: 'reference',
            name: fileName ? removeFileExtension(fileName) : undefined,
            url: encodeURI(response.url),
            duration: audio.duration,
          });
        } else if (audio.url) {
          audios.push({
            type: 'reference',
            name: audio.name ? removeFileExtension(audio.name) : undefined,
            url: audio.url,
            duration: audio.duration,
          });
        }
      }

      if (uploadMessage) {
        removeMessage(uploadMessage.id);
      }
      console.log('✅ 已引用的本地文件上传成功');

      await loadOssMapping();

      // Add referenced media from OSS files
      const { buildReferencedMediaFromProjectFiles } = await import('@/utils/fileUtils');
      const ossMedia = buildReferencedMediaFromProjectFiles(
        params.prompt,
        files.value,
        params.referenceMode
      );

      // Get uploaded file URLs to avoid duplicates (more reliable than name)
      const uploadedUrls = new Set([
        ...images.map(img => img.url),
        ...videos.map(video => video.url),
        ...audios.map(audio => audio.url),
      ]);

      // Add OSS files that weren't just uploaded
      for (const img of ossMedia.images) {
        if (!uploadedUrls.has(img.url)) {
          images.push(img as VideoWorkflowImage);
        }
      }
      for (const video of ossMedia.videos) {
        if (!uploadedUrls.has(video.url)) {
          videos.push(video as VideoWorkflowVideo);
        }
      }
      for (const audio of ossMedia.audios) {
        if (!uploadedUrls.has(audio.url)) {
          audios.push(audio as VideoWorkflowAudio);
        }
      }
    } catch (uploadError) {
      console.error('❌ 文件上传失败:', uploadError);
      if (uploadMessage) {
        removeMessage(uploadMessage.id);
      }
      videoGenerationState.value = 'failed';
      videoGenerationError.value = uploadError instanceof Error ? uploadError.message : '文件上传失败';
      toast.error('文件上传失败，请重试');
      isUploading.value = false;
      return;
    } finally {
      isUploading.value = false;
    }

    // Add referenced media from OSS files even if no upload happened
    if (!hasLocalFiles) {
      const { buildReferencedMediaFromProjectFiles } = await import('@/utils/fileUtils');
      const ossMedia = buildReferencedMediaFromProjectFiles(
        params.prompt,
        files.value,
        params.referenceMode
      );

      // Get existing file URLs to avoid duplicates
      const existingUrls = new Set([
        ...images.map(img => img.url),
        ...videos.map(video => video.url),
        ...audios.map(audio => audio.url),
      ]);

      for (const img of ossMedia.images) {
        if (!existingUrls.has(img.url)) {
          images.push(img as VideoWorkflowImage);
        }
      }
      for (const video of ossMedia.videos) {
        if (!existingUrls.has(video.url)) {
          videos.push(video as VideoWorkflowVideo);
        }
      }
      for (const audio of ossMedia.audios) {
        if (!existingUrls.has(audio.url)) {
          audios.push(audio as VideoWorkflowAudio);
        }
      }
    }

    try {
       createOmniVideoRequest = createOmniVideo({
         projectId: Number(projectId.value),
         model: params.model,
         prompt: params.prompt,
         aspect_ratio: params.aspectRatio,
         resolution: params.resolution,
         duration: params.duration,
         images: images.length > 0 ? images : undefined,
         videos: videos.length > 0 ? videos : undefined,
         audios: audios.length > 0 ? audios : undefined,
       });
       const response = await createOmniVideoRequest;
       videoWorkflowId.value = response.data.workflowId;
       console.log('✅ 视频生成任务已启动:', response.data);
       startVideoPolling();
     } finally {
       createOmniVideoRequest = null;
     }
   } catch (error) {
     if (error instanceof Error && error.name === 'CanceledError' || axios.isCancel(error)) {
       console.log('🔄 createOmniVideo 请求已被取消');
       return;
     }
     console.error('❌ 视频生成任务启动失败:', error);
     videoGenerationState.value = 'failed';
     videoGenerationError.value = error instanceof Error ? error.message : '启动视频生成失败';
     toast.error('启动视频生成失败');
   } finally {
     createOmniVideoRequest = null;
   }
};

const stopVideoPolling = () => {
  if (videoPollingTimer) {
    clearTimeout(videoPollingTimer);
    videoPollingTimer = null;
  }
  isVideoPolling.value = false;
};

const scheduleNextVideoPoll = (delay: number = 3000) => {
  if (isVideoPolling.value) {
    videoPollingTimer = setTimeout(async () => {
      if (!isVideoPolling.value) return;

      try {
        await pollVideoWorkflowStatus();
        if (isVideoPolling.value) {
          scheduleNextVideoPoll(delay);
        }
      } catch (error) {
        console.error('❌ 轮询视频生成状态失败:', error);
        if (isVideoPolling.value) {
          scheduleNextVideoPoll(delay);
        }
      }
    }, delay);
  }
};

const startVideoPolling = () => {
  stopVideoPolling();
  isVideoPolling.value = true;
  scheduleNextVideoPoll();
};

const pollVideoWorkflowStatus = async () => {
  if (!videoWorkflowId.value) return;

  try {
    const data = await getVideoWorkflow(videoWorkflowId.value);
    videoWorkflowData.value = data;

    if (data.status === 'SUCCESS') {
      videoGenerationState.value = 'completed';
      stopVideoPolling();
      // Refresh file list to show new video
      await loadOssMapping();
      toast.success('视频生成完成');
    } else if (data.status === 'FAILED') {
      videoGenerationState.value = 'failed';
      videoGenerationError.value = data.output?.errorMessage || data.output?.error || '视频生成失败';
      stopVideoPolling();
      toast.error(videoGenerationError.value);
    }
  } catch (error) {
    console.error('❌ 轮询视频生成状态失败:', error);
  }
};

const handleCancelVideoGeneration = async () => {
      console.log('createOmniVideoRequest: ', createOmniVideoRequest);

  try {
    if (createOmniVideoRequest) {
      cancelRequest(createOmniVideoRequest);
      createOmniVideoRequest = null;
    }
    if (videoWorkflowId.value) {
      await deleteVideoWorkflow(videoWorkflowId.value);
    }
    stopVideoPolling();
    videoGenerationState.value = 'idle';
    videoWorkflowId.value = '';
    videoWorkflowData.value = null;
    videoGenerationError.value = '';
    toast.success('已取消视频生成');
  } catch (error) {
    console.error('❌ 取消视频生成失败:', error);

    if (createOmniVideoRequest) {
      cancelRequest(createOmniVideoRequest);
      createOmniVideoRequest = null;
    }
    stopVideoPolling();
    videoGenerationState.value = 'idle';
    videoWorkflowId.value = '';
    videoWorkflowData.value = null;
    videoGenerationError.value = '';
    toast.error('取消视频生成失败，已返回表单');
  }
};

const handleRetryVideoGeneration = () => {
  videoGenerationState.value = 'idle';
  videoGenerationError.value = '';
  videoWorkflowId.value = '';
  videoWorkflowData.value = null;
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
        <FileList
          :files="files"
          :selected-file-id="selectedFileId"
          :project-title="projectTitle"
          :project-id="projectId"
          :is-uploading="isUploading"
          :is-owner="isOwner"
          :is-shared="isShared"
          @file-select="handleFileSelect"
          @project-title-change="handleProjectTitleChange"
          @share-toggle="handleShareToggle"
          @file-uploaded="handleFileUploaded"
          @upload-start="handleUploadStart"
          @upload-end="handleUploadEnd"
        />

        <PreviewArea
          :file-url="selectedFile?.file_url"
          :file-type="selectedFile?.file_type"
          :file-name="selectedFile?.file_name"
          :is-downloading="isDownloading"
          :download-progress="downloadProgress"
          @regenerate="handleRegenerate"
          @download="handleDownload"
          @modify="handleModify"
          @show-prompt="handleShowPrompt"
        />

        <!-- Desktop: Chat/Video Generation Area with Tabs -->
        <div class="hidden h-full w-[320px] flex-col border-l border-gray-200 bg-white lg:w-[400px] xl:w-[480px] md:flex">
          <!-- Tab Navigation -->
          <div class="flex border-b border-gray-200">
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

          <!-- Tab Content -->
          <div class="flex-1 overflow-hidden">
            <!-- Video Generation Tab -->
            <div v-show="workspaceTab === 'video'" class="h-full">
              <VideoGenerationForm
                v-if="videoGenerationState === 'idle'"
                :initial-prompt="initialPrompt"
                :initial-model="initialVideoModel"
                :initial-duration="initialVideoDuration"
                :initial-aspect-ratio="initialVideoAspectRatio"
                :initial-resolution="initialVideoResolution"
                :initial-reference-mode="initialVideoReferenceMode"
                :initial-files="initialFiles"
                :price-config="priceConfig"
                :is-loading="isRunning"
                :project-files="files"
                :immediate-upload="!!(projectId && projectId !== 'new')"
                :project-id="projectId"
                @submit="handleVideoGenerationSubmit"
                @file-uploaded="handleFileUploaded"
              />
              <VideoGenerationProgress
                v-else
                :status="videoGenerationState === 'failed' ? 'FAILED' : (videoWorkflowData?.status || 'PENDING')"
                :progress="videoWorkflowData?.output?.progress"
                :result-url="videoWorkflowData?.output?.videoUrl || videoWorkflowData?.output?.videoUrls?.[0]"
                :error-message="videoGenerationError"
                :workflow-id="Number(videoWorkflowId)"
                @cancel="handleCancelVideoGeneration"
                @retry="handleRetryVideoGeneration"
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
            @file-select="handleMobileFileSelect"
            @project-title-change="handleProjectTitleChange"
            @share-toggle="handleShareToggle"
            @file-uploaded="handleFileUploaded"
            @upload-start="handleUploadStart"
            @upload-end="handleUploadEnd"
          />
        </div>

        <div v-show="activeTab === 'preview'" class="h-full overflow-hidden">
          <PreviewArea
            :file-url="selectedFile?.file_url"
            :file-type="selectedFile?.file_type"
            :file-name="selectedFile?.file_name"
            :is-downloading="isDownloading"
            :download-progress="downloadProgress"
            @regenerate="handleRegenerate"
            @download="handleDownload"
            @modify="handleModify"
            @show-prompt="handleShowPrompt"
          />
        </div>

        <div v-show="activeTab === 'chat'" class="h-full overflow-hidden pb-16">
          <!-- Mobile: Show tabs inside chat tab -->
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
            <div v-show="workspaceTab === 'video'" class="flex-1 overflow-hidden pb-16 md:hidden">
              <VideoGenerationForm
                v-if="videoGenerationState === 'idle'"
                :initial-prompt="initialPrompt"
                :initial-model="initialVideoModel"
                :initial-duration="initialVideoDuration"
                :initial-aspect-ratio="initialVideoAspectRatio"
                :initial-resolution="initialVideoResolution"
                :initial-reference-mode="initialVideoReferenceMode"
                :initial-files="initialFiles"
                :price-config="priceConfig"
                :is-loading="isRunning"
                :project-files="files"
                :immediate-upload="!!(projectId && projectId !== 'new')"
                :project-id="projectId"
                @submit="handleVideoGenerationSubmit"
                @file-uploaded="handleFileUploaded"
              />
              <VideoGenerationProgress
                v-else
                :status="videoGenerationState === 'failed' ? 'FAILED' : (videoWorkflowData?.status || 'PENDING')"
                :progress="videoWorkflowData?.output?.progress"
                :result-url="videoWorkflowData?.output?.videoUrl || videoWorkflowData?.output?.videoUrls?.[0]"
                :error-message="videoGenerationError"
                :workflow-id="Number(videoWorkflowId)"
                @cancel="handleCancelVideoGeneration"
                @retry="handleRetryVideoGeneration"
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
  </MainLayout>
</template>
