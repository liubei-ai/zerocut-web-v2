export interface VideoModelItem {
  id: string;
  label: string;
  description: string;
  isNew?: boolean;
}

export interface VideoDurationItem {
  id: string;
  label: string;
  description: string;
  seconds: number;
}

export interface VideoAspectRatioItem {
  id: string;
  label: string;
  description: string;
}

export interface VideoResolutionItem {
  id: string;
  label: string;
  description: string;
}

export const videoModels: VideoModelItem[] = [
  { id: 'seedance-2.0', label: 'Seedance-2.0', description: '即梦 高质量生成' },
  { id: 'seedance-2.0-fast', label: 'Seedance-2.0-fast', description: '即梦 快速生成' },
  { id: 'happyhorse', label: 'HappyHorse', description: '阿里快乐马', isNew: true },
];

export const videoDurations: VideoDurationItem[] = Array.from({ length: 16 }, (_, i) => ({
  id: `${i + 1}s`,
  label: `${i + 1}秒`,
  description: '宫格分镜',
  seconds: i + 1,
}));

export const videoAspectRatios: VideoAspectRatioItem[] = [
  { id: '1:1', label: '1:1', description: '正方形' },
  { id: '9:16', label: '9:16', description: '竖屏' },
  { id: '16:9', label: '16:9', description: '横屏' },
  { id: '3:4', label: '3:4', description: '竖屏' },
  { id: '4:3', label: '4:3', description: '横屏' },
  { id: '21:9', label: '21:9', description: '宽屏' },
];

export const videoResolutions: VideoResolutionItem[] = [
  { id: '720p', label: '720p', description: '标清' },
  { id: '1080p', label: '1080p', description: '高清' },
];

export type VideoModelId = typeof videoModels[number]['id'];
export type VideoDurationId = typeof videoDurations[number]['id'];
export type VideoAspectRatioId = typeof videoAspectRatios[number]['id'];
export type VideoResolutionId = typeof videoResolutions[number]['id'];

export interface ImageModelItem {
  id: string;
  label: string;
}

export const imageModels: ImageModelItem[] = [
  { id: 'gpt-image-2', label: 'GPT-image2' },
  { id: 'banana2', label: 'Banana 2' },
  { id: 'banana-pro', label: 'Banana Pro' },
  { id: 'seedream-pro', label: 'Seedream Pro' },
  { id: 'seedream-5l', label: 'Seedream 5.0 Lite' },
  { id: 'mj', label: 'Midjourney' },
  { id: 'mj-niji', label: 'Midjourney Niji' },
];

export type ImageModelId = typeof imageModels[number]['id'];
