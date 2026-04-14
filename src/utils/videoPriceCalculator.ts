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

export function calculateVideoCredits(
  modelId: string,
  durationSeconds: number,
  resolution: string,
  priceConfig: PriceConfigItem[] | null,
  videoModels: VideoModelItem[],
): number {
  if (priceConfig && Array.isArray(priceConfig)) {
    const currentModelInfo = videoModels.find(m => m.id === modelId);
    const targetPriceId = currentModelInfo?.priceId || 'zerocut3.0';
    const modelPriceInfo = priceConfig.find(c => c.id === targetPriceId);

    if (modelPriceInfo) {
      const resolutionInfo = modelPriceInfo.resolutions?.find(r => r.name === resolution);
      if (resolutionInfo) {
        const { min_price, additional_price_per_second, time_range } = resolutionInfo;
        return min_price + (durationSeconds - time_range.min) * additional_price_per_second;
      }
    }
  }

  return 30 + 24 * durationSeconds;
}
