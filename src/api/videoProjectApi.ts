import apiClient from './client';

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
  };
}

export interface VideoProjectListParams {
  page?: number;
  pageSize?: number;
}

// Get user's video projects
export async function getUserVideoProjects(params: VideoProjectListParams = {}) {
  const { page = 1, pageSize = 12 } = params;
  
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