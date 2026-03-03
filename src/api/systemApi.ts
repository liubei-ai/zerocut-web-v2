import apiClient from './client';

export interface SystemConfigRequest {
  keys: string[];
}

export interface TemplateItem {
  name: string;
  placeholder: string;
}

export interface SystemConfigResponse {
  webHomeTips?: {
    key: string;
  };
  webHomeAutoRecommend?: {
    data: TemplateItem[]
  };
  webHomeFreeRecommend?: {
    data: TemplateItem[]
  };
}

/**
 * Batch fetch system configuration
 */
export const getSystemConfig = async (
  keys: string[]
): Promise<SystemConfigResponse> => {
  const response = await apiClient.post<SystemConfigRequest, SystemConfigResponse>(
    '/studio/system-config/batch',
    { keys }
  );

  return response.data;
};
