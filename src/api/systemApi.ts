import apiClient from './client';
import { ImageModelItem, VideoModelItem } from '@/config/videoGeneration';

export interface SystemConfigRequest {
  keys: string[];
}

export interface TemplateItem {
  name: string;
  placeholder: string;
}

export interface WebVipVideoModels {
  models: VideoModelItem[];
  phones: string[];
}

export interface SystemConfigResponse {
  webPriceV3?: any;
  webPrice?: any;
  webHomeTips?: string;
  webHomeAutoRecommend?: TemplateItem[];
  webHomeFreeRecommend?: TemplateItem[];
  webHomeImageModels?: ImageModelItem[];
  webHomeVideoModels?: VideoModelItem[];
  webHomeImageModelDefault?: string;
  webHomeVideoModelDefault?: string;
  webHomeDefaultMode?: 'agent' | 'video_generation' | 'image_generation' | 'card';
  webVipVideoModels?: WebVipVideoModels;
  webHeaderLink?: { href: string; text: string; color: string };
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
