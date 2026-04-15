import apiClient from './client';

export interface VideoWorkflowImage {
  type: 'first_frame' | 'last_frame' | 'reference' | 'storyboard';
  name?: string;
  url?: string;
  file?: File;
}

export interface VideoWorkflowVideo {
  type: 'base' | 'ref';
  name?: string;
  url?: string;
  file?: File;
  duration?: number;
}

export interface VideoWorkflowAudio {
  type: 'speaker' | 'sound' | 'bgm' | 'lipsync' | 'reference';
  name?: string;
  url?: string;
  file?: File;
  duration?: number;
}

export interface CreateOmniVideoRequest {
  projectId?: number;
  model: string;
  prompt: string;
  images?: VideoWorkflowImage[];
  videos?: VideoWorkflowVideo[];
  audios?: VideoWorkflowAudio[];
  aspect_ratio?: '1:1' | '16:9' | '9:16';
  resolution?: '720p' | '1080p' | '2K' | '4K';
  duration?: number;
  referenceMode?: 'reference' | 'first_last_frame';
  mute?: boolean;
  bgm?: boolean;
  seed?: number;
  optimize_camera?: boolean;
  storyboard?: 4 | 6 | 9;
  template_id?: string;
  parameters?: Record<string, any>;
  callback_url?: string;
  trace_id?: string;
}

export interface CreateOmniVideoResponse {
  workflowId: number;
  status: string;
}

export interface VideoWorkflowOutput {
  url?: string;
  ratio?: string;
  duration?: number;
  resolution?: string;
  revised_prompt?: string;
  usage?: {
    credits: number;
  };
  videoUrl?: string;
  videoUrls?: string[];
  message?: string;
  errorMessage?: string;
  error?: string;
  progress?: number;
}

export interface VideoWorkflowResponse {
  id: number;
  type: string;
  status: 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED';
  param: {
    prompt?: string;
    duration?: number;
    projectId?: number;
    resolution?: string;
    aspect_ratio?: string;
    [key: string]: any;
  };
  output?: VideoWorkflowOutput;
  created_at: string;
  updated_at: string;
}

export interface VideoPricingRequest {
  model: string;
  duration: number;
  resolution: '720p' | '1080p' | '2K' | '4K';
  audio?: boolean;
  optimize_camera?: boolean;
  images?: VideoWorkflowImage[];
}

export interface VideoPricingResponse {
  model: string;
  duration: number;
  resolution: string;
  credits: number;
  details?: {
    basePrice: number;
    durationPrice: number;
    total: number;
  };
}

// Create Omni video workflow
export async function createOmniVideo(data: CreateOmniVideoRequest) {
  const response = await apiClient.post<CreateOmniVideoRequest, CreateOmniVideoResponse>(
    '/video-workflow/omni/create',
    data
  );
  return response.data;
}

// Get video workflow status
export async function getVideoWorkflow(workflowId: string | number) {
  const response = await apiClient.get<VideoWorkflowResponse>(`/video-workflow/${workflowId}`);
  return response.data;
}

// Delete video workflow
export async function deleteVideoWorkflow(workflowId: string | number) {
  const response = await apiClient.delete(`/video-workflow/${workflowId}`);
  return response.data;
}

// Get video pricing
export async function getVideoPricing(data: VideoPricingRequest) {
  const response = await apiClient.post<VideoPricingRequest, VideoPricingResponse>(
    '/video-workflow/pricing',
    data
  );
  return response.data;
}

// Get user's video workflows list
export interface VideoWorkflowListParams {
  page?: number;
  pageSize?: number;
  category?: string;
}

export interface VideoWorkflowListResponse {
  workflows: VideoWorkflowResponse[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export async function getUserVideoWorkflows(params: VideoWorkflowListParams = {}) {
  const { page = 1, pageSize = 10, category } = params;
  let url = `/video-workflows?page=${page}&pageSize=${pageSize}`;
  if (category) {
    url += `&category=${category}`;
  }
  const response = await apiClient.get<VideoWorkflowListResponse>(url);
  return response.data;
}

// Get video workflow by projectId
export async function getVideoWorkflowByProjectId(projectId: string | number) {
  const response = await apiClient.get<VideoWorkflowListResponse>(`/video-workflows?projectId=${projectId}`);
  return response.data;
}
