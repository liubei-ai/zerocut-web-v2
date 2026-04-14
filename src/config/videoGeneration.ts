export interface VideoModelItem {
  id: string;
  label: string;
  description: string;
  priceId: string;
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
  { id: 'seedance-2.0', label: 'Seedance-2.0', description: '即梦 高质量生成', priceId: 'seedance-2.0' },
  { id: 'seedance-2.0-fast', label: 'Seedance-2.0-fast', description: '即梦 快速生成', priceId: 'seedance-2.0-fast' },
  { id: 'zerocut3.0', label: 'ZeroCut 3.0', description: 'ZeroCut 高质量生成', priceId: 'zerocut3.0' },
  { id: 'zerocut3.0-pro', label: 'ZeroCut 3.0 Pro', description: 'ZeroCut 专业版', priceId: 'zerocut3.0-pro' },
  { id: 'zerocut3.0-pro-fast', label: 'ZeroCut 3.0 Pro Fast', description: 'ZeroCut 专业快速', priceId: 'zerocut3.0-pro-fast' },
  { id: 'zerocut3.0-turbo', label: 'ZeroCut 3.0 Turbo', description: 'ZeroCut 性价比之王', priceId: 'zerocut3.0-turbo' },
];

export const videoDurations: VideoDurationItem[] = [
  { id: '5s', label: '5秒', description: '宫格分镜', seconds: 5 },
  { id: '10s', label: '10秒', description: '宫格分镜', seconds: 10 },
  { id: '15s', label: '15秒', description: '宫格分镜', seconds: 15 },
];

export const videoAspectRatios: VideoAspectRatioItem[] = [
  { id: '9:16', label: '9:16', description: '竖屏' },
  { id: '16:9', label: '16:9', description: '横屏' },
];

export const videoResolutions: VideoResolutionItem[] = [
  { id: '720p', label: '720p', description: '标清' },
  { id: '1080p', label: '1080p', description: '高清' },
];

export type VideoModelId = typeof videoModels[number]['id'];
export type VideoDurationId = typeof videoDurations[number]['id'];
export type VideoAspectRatioId = typeof videoAspectRatios[number]['id'];
export type VideoResolutionId = typeof videoResolutions[number]['id'];
