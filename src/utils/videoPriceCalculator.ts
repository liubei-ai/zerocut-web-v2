import type { VideoModelItem } from '@/config/videoGeneration';

export interface PriceConfigItem {
  id: string;
  resolutions: Array<{
    name: string;
    min_price: number;
    additional_price_per_second: number;
    time_range: {
      min: number;
      max: number;
    };
  }>;
}

export interface PricingResponse {
  success: boolean;
  data: {
    credits: number;
    audio: boolean;
    optimize_camera: boolean;
  };
}

export async function calculateVideoCredits(
  modelId: string,
  durationSeconds: number,
  resolution: string,
  priceConfig: PriceConfigItem[] | null,
  videoModels: VideoModelItem[],
  inputVideoDuration?: number,
): Promise<number> {
  const currentModelInfo = videoModels.find(m => m.id === modelId);
  const targetPriceId = currentModelInfo?.priceId || 'zerocut3.0';
  
  let apiUrl = `https://sd2mfo025ni4n75n9r5p0.apigateway-cn-beijing.volceapi.com/models/pricing?model=${encodeURIComponent(targetPriceId)}&duration=${durationSeconds}&resolution=${encodeURIComponent(resolution)}`;
  
  if (modelId === 'seedance-2.0' && inputVideoDuration !== undefined && inputVideoDuration > 0) {
    apiUrl += `&input_video_duration=${inputVideoDuration}`;
  }

  const response = await fetch(apiUrl);
  if (!response.ok) {
    throw new Error(`API request failed with status ${response.status}`);
  }

  const data = await response.json() as PricingResponse;
  if (!data.success || !data.data) {
    throw new Error('API returned unsuccessful response');
  }

  return data.data.credits;
}
