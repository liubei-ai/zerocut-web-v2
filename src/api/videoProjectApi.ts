import apiClient from './client';
import { type ChatMessage } from '@/types/workspace';

export interface VideoProject {
  id: string;
  title?: string; // Keep for backward compatibility
  project_name: string; // Actual property name from API
  prompt?: string;
  creation_mode?: string;
  status: string;
  thumbnail_url?: string;
  duration?: number;
  created_at: string;
  oss_mapping?: Array<{
    localFile: string;
    ossUrl: string;
  }>;
}

export interface VideoProjectListResponse {
  projects: VideoProject[];
  pagination?: {
    page: number;
    pageSize: number;
    totalPages: number;
    totalCount: number;
    hasNext: boolean;
  };
}

export interface VideoProjectListParams {
  page?: number;
  pageSize?: number;
}

export interface CreateVideoProjectRequest {
  project_name?: string;
  prompt?: string;
}

export interface CreateVideoProjectResponse {
  id: number;
  uid: number;
  project_name: string;
  created_at: string;
  updated_at: string;
}

// Create video project
export async function createVideoProject(data: CreateVideoProjectRequest) {
  const response = await apiClient.post<CreateVideoProjectRequest, CreateVideoProjectResponse>('/video-project/prompt', data);
  return response.data;
}

// Get user's video projects
export async function getUserVideoProjects(params: VideoProjectListParams = {}) {
  const { page = 1, pageSize = 6 } = params;

  const response = await apiClient.get<VideoProjectListResponse>(
    `/video-project/user?page=${page}&pageSize=${pageSize}`
  );

  return response.data;
}

// Delete video project
export async function deleteVideoProject(projectId: string) {
  const response = await apiClient.delete(`/video-project/${projectId}`);
  return response.data;
}

// Update video project
export interface UpdateVideoProjectRequest {
  project_name: string;
}

export interface UpdateVideoProjectResponse {
  id: number;
  uid: number;
  project_name: string;
  created_at: string;
  updated_at: string;
}

export async function updateVideoProject(projectId: string | number, data: UpdateVideoProjectRequest) {
  const response = await apiClient.put<UpdateVideoProjectRequest, UpdateVideoProjectResponse>(`/video-project/${projectId}`, data);
  return response.data;
}

// Create video for a project
export interface CreateVideoRequest {
  projectId: number | string;
  prompt: string;
}

export interface CreateVideoResponse {
  projectId: number;
  prompt: string;
  taskId: string;
  status: string;
  message: string;
}

export async function createVideo(data: CreateVideoRequest) {
  const response = await apiClient.post<CreateVideoRequest, CreateVideoResponse>('/video-creation/create', data);
  return response.data;
}

// Get project details by ID
export interface ProjectDetailsResponse {
  id: number;
  uid: number;
  project_name: string;
  storyboard?: {
    scenes?: Array<{
      seed?: number;
      start_frame?: string;
      camera_count?: number;
      video_prompt?: string;
      video_duration?: number;
      use_video_model?: string;
    }>;
    bgm_prompt?: string;
    video_type?: string;
    voice_type?: string;
    orientation?: string;
    outline_sheet?: string;
  };
  draft_content?: any;
  oss_mapping?: Array<{
    ossKey: string;
    ossUrl: string;
    fileSize: number;
    fileType: string;
    localFile: string;
    uploadTime: string;
  }>;
  llm_chat_all?: {
    messages: Array<{
      id: number;
      role: 'user' | 'assistant';
      content: string;
      timestamp: string;
    }>;
    timestamp: string;
    totalMessages: number;
  };
  llm_chat_tool?: {
    messages: Array<{
      id: number;
      json?: any;
      role: string;
      tool?: string;
      type?: string;
      content: string;
      timestamp: string;
    }>;
    timestamp: string;
    totalMessages: number;
  };
  status: string;
  created_at: string;
  updated_at: string;
  is_owner?: boolean;
}

export async function getProjectDetails(projectId: string | number) {
  const response = await apiClient.get<ProjectDetailsResponse>(`/video-project/${projectId}`);
  return response.data;
}

// Abort video creation task
export interface AbortTaskRequest {
  projectId: number | string;
}

export async function abortVideoCreation(data: AbortTaskRequest) {
  const response = await apiClient.post('/video-creation/abort', data);
  return response.data;
}

export interface ChatHistoryResponse {
  projectId: number;
  type: string;
  chatHistory: ChatMessage[];
  count: number;
}

export async function getChatHistory(projectId: string | number, type: 'all' | 'tool' = 'all') {
  const response = await apiClient.get<ChatHistoryResponse>(`/video-creation/chat-history/${projectId}?type=${type}`);
  return response.data;
}

// Get OSS mapping for a project
export interface OssMapping {
  ossKey: string;
  ossUrl: string;
  fileSize: number;
  fileType: string;
  localFile: string;
  uploadTime: string;
}

export interface OssMappingResponse {
  projectId: number;
  ossMapping: OssMapping[];
  exists: boolean;
}

export async function getOssMapping(projectId: string | number) {
  const response = await apiClient.get<OssMappingResponse>(`/video-creation/oss-mapping/${projectId}`);
  return response.data;
}

export async function getStoryBoard(projectId: string | number) {
  const response = await apiClient.get<any>(`/video-creation/storyboard/'${projectId}`);
  return response.data;
}

// Export project files
export async function exportProject(projectId: string | number) {
  // Use a direct axios call for blob response since the client wrapper doesn't handle it well
  const baseUrl = import.meta.env.VITE_API_AGENT_URL;
  const url = `${baseUrl}/video-creation/export/${projectId}`;

  const response = await fetch(url, {
    method: 'GET',
    credentials: 'include',
    headers: {
      'Accept': 'application/zip, application/octet-stream',
    },
  });

  if (!response.ok) {
    throw new Error(`Export failed: ${response.statusText}`);
  }

  return response.blob();
}

// Upload material to project
export interface UploadMaterialResponse {
  projectId: number;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  fileType: string;
  uploadTime: string;
}

export async function uploadMaterial(projectId: string | number, file: File) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await apiClient.upload<UploadMaterialResponse>(
    `/video-creation/upload/${projectId}`,
    formData, { noErrorAlert: true }
  );
  return response.data;
}