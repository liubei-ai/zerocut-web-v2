import { ref } from 'vue';
import {
  getProjectDetails,
  getOssMapping,
} from '@/api/videoProjectApi';
import type { OssMaterial } from '@/types/ossMaterial';
import { getFileTypeFromExtension } from '@/utils/fileUtils';
import type { WorkspaceFile } from '@/views/workspace/Workspace.vue';

export function useWorkspaceData(
  projectId: { value: string },
  loadChatHistory: (id: string) => Promise<void>
) {
  const files = ref<WorkspaceFile[]>([]);
  const ossMaterials = ref<OssMaterial[]>([]);
  const selectedFileId = ref<string>();
  const projectTitle = ref('');
  const isOwner = ref(true);
  const isShared = ref(false);
  const isRunning = ref(false);
  const isCancelling = ref(false);

  // --- Polling ---
  const isPolling = ref(false);
  let pollingTimer: ReturnType<typeof setTimeout> | null = null;

  const stopPolling = () => {
    if (pollingTimer) {
      clearTimeout(pollingTimer);
      pollingTimer = null;
    }
    isPolling.value = false;
  };

  // --- OSS Polling ---
  const isOssPolling = ref(false);
  let ossPollingTimer: ReturnType<typeof setTimeout> | null = null;

  const stopOssPolling = () => {
    if (ossPollingTimer) {
      clearTimeout(ossPollingTimer);
      ossPollingTimer = null;
    }
    isOssPolling.value = false;
  };

  const loadOssMapping = async () => {
    try {
      const ossData = await getOssMapping(projectId.value);
      if (ossData.ossMapping && Array.isArray(ossData.ossMapping)) {
        const visible = ossData.ossMapping.filter((item: any) => item.deleted !== true);
        ossMaterials.value = visible.map((item: any) => ({
          ossKey: item.ossKey,
          ossUrl: item.ossUrl,
          source: item.source || 'manual',
          fileSize: item.fileSize || 0,
          fileType: item.fileType || (item.localFile ? getFileTypeFromExtension(item.localFile) : 'document'),
          localFile: item.localFile,
          uploadTime: item.uploadTime || new Date().toISOString(),
          prompt: item.prompt,
          model: item.model,
          inputParams: item.inputParams,
          status: item.status,
          workflowRef: item.workflowRef,
        }));

        files.value = visible
          .filter((item: any) => item.status !== 'FAILED')
          .map((item: any, index: number) => {
            const fileName = item.localFile
              ? (item.localFile.split('/').pop() || item.prompt || '未命名文件')
              : (item.prompt || '生成中...');
            const fileType = item.localFile
              ? getFileTypeFromExtension(item.localFile)
              : (item.fileType || 'video');
            return {
              id: `file-${index}`,
              file_name: fileName,
              file_type: fileType,
              file_url: item.ossUrl || '',
              thumbnail_url: item.fileType === 'image' && item.ossUrl ? item.ossUrl : undefined,
              file_size: item.fileSize || 0,
              created_at: item.uploadTime || new Date().toISOString(),
              status: item.status,
              prompt: item.prompt,
              localFile: item.localFile,
            };
          });

        if (files.value.length > 0 && !selectedFileId.value) {
          const first = files.value.find(f => !f.status || f.status === 'SUCCESS');
          if (first) selectedFileId.value = first.id;
        }
      }
    } catch (error) {
      console.error('❌ 加载OSS映射失败:', error);
      if (!files.value.length) files.value = [];
      ossMaterials.value = [];
    }
  };

  const scheduleNextOssPoll = (delay = 3000) => {
    if (!isOssPolling.value) return;
    ossPollingTimer = setTimeout(async () => {
      if (!isOssPolling.value) return;
      try {
        await loadOssMapping();
        const hasRunning = files.value.some(f => f.status === 'RUNNING');
        if (hasRunning) scheduleNextOssPoll(delay);
        else stopOssPolling();
      } catch {
        if (isOssPolling.value) scheduleNextOssPoll(delay);
      }
    }, delay);
  };

  const startOssPollingIfNeeded = () => {
    const hasRunning = files.value.some(f => f.status === 'RUNNING');
    if (hasRunning && !isOssPolling.value) {
      isOssPolling.value = true;
      scheduleNextOssPoll();
    }
  };

  // --- Project refresh ---
  const refreshWorkspaceData = async () => {
    try {
      const projectData = await getProjectDetails(projectId.value);
      isOwner.value = projectData.is_owner !== false;
      isShared.value = projectData.is_shared === true;
      projectTitle.value = projectData.project_name;

      const status = projectData.status;
      if (status === 'RUNNING' || status === 'KILLED') {
        isRunning.value = true;
      }
      if (status !== 'KILLED') {
        isCancelling.value = false;
      }
      if (status && status !== 'RUNNING' && status !== 'KILLED') {
        isRunning.value = false;
        stopPolling();
      }

      await Promise.all([loadOssMapping(), loadChatHistory(projectId.value)]);
    } catch (error) {
      console.error('❌ 刷新工作区数据失败:', error);
    }
  };

  const scheduleNextPoll = (delay = 5000) => {
    if (!isPolling.value) return;
    pollingTimer = setTimeout(async () => {
      if (!isPolling.value) return;
      try {
        await refreshWorkspaceData();
        if (isPolling.value) scheduleNextPoll(delay);
      } catch {
        if (isPolling.value) scheduleNextPoll(delay);
      }
    }, delay);
  };

  const startPolling = () => {
    stopPolling();
    isPolling.value = true;
    scheduleNextPoll();
  };

  return {
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
  };
}
