<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import MainLayout from '@/components/layout/MainLayout.vue';
import FileList from './components/FileList.vue';
import PreviewArea from './components/PreviewArea.vue';
import ChatBox from './components/ChatBox.vue';
import {
  createVideoProject,
  createVideo,
  getProjectDetails,
  getOssMapping,
  abortVideoCreation,
  updateVideoProject,
} from '@/api/videoProjectApi';
import { useChatMessages } from '@/composables';
import { useToast } from '@/composables/useToast';

interface WorkspaceFile {
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
const projectTitle = ref('');
const initialUserInput = ref<string>();
const isNewProject = ref(false);
const projectCreated = ref(false);
const pollingTimer = ref<NodeJS.Timeout | null>(null);
const isAborting = ref(false);
const isPolling = ref(false);
const projectId = ref<string>('');

const selectedFile = computed(() => {
  return files.value.find(f => f.id === selectedFileId.value);
});

onMounted(() => {
  projectId.value = route.params.projectId as string;

  // Handle new workspace creation
  if (projectId.value === 'new' || route.path === '/workspace/new') {
    isNewProject.value = true;
    initialUserInput.value = history.state?.chatMessage as string;
    loadProject();
    return;
  }

  if (!projectId.value) {
    router.push('/');
    return;
  }

  loadProject();
});

// Clean up timer when component is unmounted
onUnmounted(() => {
  stopPolling();
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

    // Handle status changes
    const currentStatus = projectData.status;

    // TODO: use Enum here
    if (currentStatus === 'RUNNING') {
      isRunning.value = true;
    }

    projectTitle.value = projectData.project_name;

    // Check if task has ended
    if (currentStatus && currentStatus !== 'RUNNING') {
      console.log('任务结束:', currentStatus);
      // 任务结束
      isRunning.value = false;
      stopPolling();

      /* // Find the latest assistant message and update its status
      const latestAssistantMsg = messages.value
        .filter(msg => msg.role === 'assistant')
        .pop();

      if (latestAssistantMsg) {
        if (currentStatus === 'SUCCESS') {
          latestAssistantMsg.message_type = 'text';
        } else if (currentStatus === 'FAILED') {
          latestAssistantMsg.message_type = 'error';
          latestAssistantMsg.content = '视频生成失败';
        } else if (currentStatus === 'CANCELLED') {
          latestAssistantMsg.message_type = 'text';
        }
      } */
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
  }
};

const handleFileSelect = (fileId: string) => {
  selectedFileId.value = fileId;
};

const handleProjectTitleChange = async (newTitle: string) => {
  if (!projectId.value || !newTitle.trim()) {
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

const handleDownloadAll = () => {
  files.value.forEach(file => {
    window.open(file.file_url, '_blank');
  });
};

const handleDownload = () => {
  if (selectedFile.value) {
    window.open(selectedFile.value.file_url, '_blank');
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
  if (!projectId.value || isAborting.value) return;

  try {
    isAborting.value = true;

    // Call abort API
    await abortVideoCreation({ projectId: projectId.value });

    console.log('任务中断请求已发送');

    // The polling will handle the status change to CANCELLED
  } catch (error) {
    console.error('❌ 中断任务失败:', error);
    isAborting.value = false;
  }
};
</script>

<template>
  <MainLayout :show-footer="false" :show-sidebar="false">
    <div class="flex h-[calc(100vh-64px)] overflow-hidden bg-white">
      <FileList
        :files="files"
        :selected-file-id="selectedFileId"
        :project-title="projectTitle"
        @file-select="handleFileSelect"
        @project-title-change="handleProjectTitleChange"
        @file-upload="handleFileUpload"
        @download-all="handleDownloadAll"
      />

      <PreviewArea
        :file-url="selectedFile?.file_url"
        :file-type="selectedFile?.file_type"
        :file-name="selectedFile?.file_name"
        @regenerate="handleRegenerate"
        @download="handleDownload"
        @modify="handleModify"
        @show-prompt="handleShowPrompt"
      />

      <ChatBox
        :messages="messages"
        :project-id="projectId"
        :is-running="isRunning"
        :initial-input="initialUserInput"
        @send-message="handleSendMessage"
        @abort-task="handleAbortTask"
      />
    </div>
  </MainLayout>
</template>
