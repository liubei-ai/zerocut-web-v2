import { ref } from 'vue';
import axios from 'axios';
import {
  createOmniVideo,
  getVideoWorkflow,
  deleteVideoWorkflow,
  type VideoWorkflowResponse,
  type VideoWorkflowImage,
  type VideoWorkflowVideo,
  type VideoWorkflowAudio,
} from '@/api/videoWorkflowApi';
import { cancelRequest } from '@/api/client';
import type { ICommonResponse } from '@/api/client';
import type { CreateOmniVideoResponse } from '@/api/videoWorkflowApi';
import { useToast } from '@/composables/useToast';
import { getUniqueFileName, removeFileExtension } from '@/utils/fileUtils';
import type { WorkspaceFile } from '@/views/workspace/Workspace.vue';
import type { VideoGenerationParams } from '@/views/workspace/components/VideoGenerationForm.vue';

export function useVideoGeneration(
  projectId: { value: string },
  files: { value: WorkspaceFile[] },
  loadOssMapping: () => Promise<void>,
  onSuccess?: () => void
) {
  const { toast } = useToast();

  const videoGenerationState = ref<'idle' | 'generating' | 'completed' | 'failed'>('idle');
  const videoWorkflowId = ref<string | number>('');
  const videoWorkflowData = ref<VideoWorkflowResponse | null>(null);
  const videoGenerationError = ref('');

  const isVideoPolling = ref(false);
  let videoPollingTimer: ReturnType<typeof setTimeout> | null = null;
  let createOmniVideoRequest: Promise<ICommonResponse<CreateOmniVideoResponse>> | null = null;

  const stopVideoPolling = () => {
    if (videoPollingTimer) {
      clearTimeout(videoPollingTimer);
      videoPollingTimer = null;
    }
    isVideoPolling.value = false;
  };

  const pollVideoWorkflowStatus = async () => {
    if (!videoWorkflowId.value) return;
    try {
      const data = await getVideoWorkflow(videoWorkflowId.value);
      videoWorkflowData.value = data;
      await loadOssMapping();

      if (data.status === 'SUCCESS') {
        videoGenerationState.value = 'completed';
        stopVideoPolling();
        toast.success('视频生成完成');
        onSuccess?.();
      } else if (data.status === 'FAILED') {
        videoGenerationState.value = 'failed';
        videoGenerationError.value = data.output?.errorMessage || data.output?.error || data.output?.message || '视频生成失败';
        stopVideoPolling();
        toast.error(videoGenerationError.value);
      }
    } catch (error) {
      console.error('❌ 轮询视频生成状态失败:', error);
    }
  };

  const scheduleNextVideoPoll = (delay = 3000) => {
    if (!isVideoPolling.value) return;
    videoPollingTimer = setTimeout(async () => {
      if (!isVideoPolling.value) return;
      try {
        await pollVideoWorkflowStatus();
        if (isVideoPolling.value) scheduleNextVideoPoll(delay);
      } catch {
        if (isVideoPolling.value) scheduleNextVideoPoll(delay);
      }
    }, delay);
  };

  const startVideoPolling = () => {
    stopVideoPolling();
    isVideoPolling.value = true;
    scheduleNextVideoPoll();
  };

  // Helper: upload a media file and return its URL
  const uploadAndGetUrl = async (
    file: File,
    name: string | undefined
  ): Promise<{ url: string; fileName: string | undefined }> => {
    const { uploadMaterial } = await import('@/api/videoProjectApi');
    const existingNames = files.value.map(f => f.file_name);
    const fileName = name ? getUniqueFileName(name, existingNames) : undefined;
    const response = await uploadMaterial(projectId.value, file, fileName);
    return { url: encodeURI(response.url), fileName };
  };

  // Build media arrays from VideoGenerationParams
  const buildMediaFromParams = async (params: VideoGenerationParams) => {
    const images: VideoWorkflowImage[] = [];
    const videos: VideoWorkflowVideo[] = [];
    const audios: VideoWorkflowAudio[] = [];

    for (const img of params.images || []) {
      const type: 'first_frame' | 'last_frame' | 'reference' =
        (img.type as 'first_frame' | 'last_frame' | 'reference') || 'reference';
      if (img.file && !img.url) {
        const { url, fileName } = await uploadAndGetUrl(img.file, img.name);
        images.push({ type, name: fileName ? removeFileExtension(fileName) : undefined, url });
      } else if (img.url) {
        images.push({ type, name: img.name ? removeFileExtension(img.name) : undefined, url: encodeURI(img.url) });
      }
    }

    for (const video of params.videos || []) {
      if (video.file && !video.url) {
        const { url, fileName } = await uploadAndGetUrl(video.file, video.name);
        videos.push({ type: 'ref', name: fileName ? removeFileExtension(fileName) : undefined, url });
      } else if (video.url) {
        videos.push({ type: 'ref', name: video.name ? removeFileExtension(video.name) : undefined, url: encodeURI(video.url) });
      }
    }

    for (const audio of params.audios || []) {
      if (audio.file && !audio.url) {
        const { url, fileName } = await uploadAndGetUrl(audio.file, audio.name);
        audios.push({ type: 'reference', name: fileName ? removeFileExtension(fileName) : undefined, url });
      } else if (audio.url) {
        audios.push({ type: 'reference', name: audio.name ? removeFileExtension(audio.name) : undefined, url: encodeURI(audio.url) });
      }
    }

    return { images, videos, audios };
  };

  // Merge OSS referenced media into existing media arrays (dedup by URL)
  const mergeOssMedia = async (
    prompt: string,
    referenceMode: 'reference' | 'first_last_frame',
    images: VideoWorkflowImage[],
    videos: VideoWorkflowVideo[],
    audios: VideoWorkflowAudio[]
  ) => {
    const { buildReferencedMediaFromProjectFiles } = await import('@/utils/fileUtils');
    const ossMedia = buildReferencedMediaFromProjectFiles(prompt, files.value, referenceMode);

    const uploadedUrls = new Set([
      ...images.map(i => decodeURI(i.url || '')),
      ...videos.map(v => decodeURI(v.url || '')),
      ...audios.map(a => decodeURI(a.url || '')),
    ]);

    for (const img of ossMedia.images) {
      if (img.url && !uploadedUrls.has(decodeURI(img.url))) images.push(img as VideoWorkflowImage);
    }
    for (const video of ossMedia.videos) {
      if (video.url && !uploadedUrls.has(decodeURI(video.url))) videos.push(video as VideoWorkflowVideo);
    }
    for (const audio of ossMedia.audios) {
      if (audio.url && !uploadedUrls.has(decodeURI(audio.url))) audios.push(audio as VideoWorkflowAudio);
    }
  };

  const submitOmniVideo = async (params: {
    projectId: number;
    model: string;
    prompt: string;
    aspect_ratio: string;
    resolution: string;
    duration: number;
    images?: VideoWorkflowImage[];
    videos?: VideoWorkflowVideo[];
    audios?: VideoWorkflowAudio[];
  }) => {
    createOmniVideoRequest = createOmniVideo(params as any);
    try {
      const response = await createOmniVideoRequest;
      videoWorkflowId.value = response.data.workflowId;
      console.log('✅ 视频生成任务已启动:', response.data);
      startVideoPolling();
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

      const { images, videos, audios } = await buildMediaFromParams(params);
      await loadOssMapping();
      await mergeOssMedia(params.prompt, params.referenceMode, images, videos, audios);

      await submitOmniVideo({
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
    } catch (error) {
      if ((error instanceof Error && error.name === 'CanceledError') || axios.isCancel(error)) return;
      console.error('❌ 视频生成任务启动失败:', error);
      videoGenerationState.value = 'failed';
      videoGenerationError.value = error instanceof Error ? error.message : '启动视频生成失败';
      toast.error('启动视频生成失败');
    }
  };

  const handleCancelVideoGeneration = async () => {
    try {
      if (createOmniVideoRequest) {
        cancelRequest(createOmniVideoRequest);
        createOmniVideoRequest = null;
      }
      if (videoWorkflowId.value) {
        await deleteVideoWorkflow(videoWorkflowId.value);
      }
    } catch (error) {
      console.error('❌ 取消视频生成失败:', error);
      if (createOmniVideoRequest) {
        cancelRequest(createOmniVideoRequest);
        createOmniVideoRequest = null;
      }
      toast.error('取消视频生成失败，已返回表单');
    } finally {
      stopVideoPolling();
      videoGenerationState.value = 'idle';
      videoWorkflowId.value = '';
      videoWorkflowData.value = null;
      videoGenerationError.value = '';
      toast.success('已取消视频生成');
    }
  };

  const handleRetryVideoGeneration = () => {
    videoGenerationState.value = 'idle';
    videoGenerationError.value = '';
    videoWorkflowId.value = '';
    videoWorkflowData.value = null;
  };

  const handleBackToVideoForm = () => {
    stopVideoPolling();
    videoGenerationState.value = 'idle';
    videoWorkflowId.value = '';
    videoWorkflowData.value = null;
  };

  return {
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
    getCreateOmniVideoRequest: () => createOmniVideoRequest,
    setCreateOmniVideoRequest: (v: Promise<ICommonResponse<CreateOmniVideoResponse>> | null) => {
      createOmniVideoRequest = v;
    },
  };
}
