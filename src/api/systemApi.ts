import apiClient from './client';

export interface SystemConfigRequest {
  keys: string[];
}

export interface TemplateItem {
  name: string;
  placeholder: string;
}

export interface SystemConfigResponse {
  webPriceV3?: any;
  webPrice?: any;
  webHomeTips?: string;
  webHomeAutoRecommend?: TemplateItem[];
  webHomeFreeRecommend?: TemplateItem[];
}

/**
 * Batch fetch system configuration
 */
export const getSystemConfig = async (
  keys: string[]
): Promise<SystemConfigResponse> => {
  const response = await apiClient.post<SystemConfigRequest, SystemConfigResponse>(
    '/studio/system-config/batch',
    { keys }, { noErrorAlert: true }
  );

  return response.data;
};
