import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { getSystemConfig, type TemplateItem } from '@/api/systemApi';
import { imageModels as defaultImageModels, videoModels as defaultVideoModels, type ImageModelItem, type VideoModelItem } from '@/config/videoGeneration';
import { useAuthStore } from './authStore';

export type DefaultMode = 'agent' | 'video_generation' | 'image_generation' | 'card';

export interface WebHeaderLink {
  href: string;
  text: string;
  color: string;
}

export interface SuggestionsByMode {
  one_click: TemplateItem[];
  free_creation: TemplateItem[];
  image_generation: TemplateItem[];
}

const isValidImageModelItem = (item: any): item is ImageModelItem => {
  return (
    typeof item === 'object' &&
    item !== null &&
    typeof item.id === 'string' &&
    item.id.length > 0 &&
    typeof item.label === 'string' &&
    item.label.length > 0
  );
};

const isValidVideoModelItem = (item: any): item is VideoModelItem => {
  return (
    typeof item === 'object' &&
    item !== null &&
    typeof item.id === 'string' &&
    item.id.length > 0 &&
    typeof item.label === 'string' &&
    item.label.length > 0 &&
    typeof item.description === 'string'
  );
};

const validateImageModelList = (list: any): list is ImageModelItem[] => {
  return Array.isArray(list) && list.length > 0 && list.every(isValidImageModelItem);
};

const validateVideoModelList = (list: any): list is VideoModelItem[] => {
  return Array.isArray(list) && list.length > 0 && list.every(isValidVideoModelItem);
};

export const useConfigStore = defineStore('config', () => {
  const loading = ref(false);
  const error = ref<string | null>(null);

  const homeTips = ref<string>('新用户注册送1000积分～');
  const suggestionsByMode = ref<SuggestionsByMode>({
    one_click: [
      { name: '制作一个产品宣传视频', placeholder: '制作一个产品宣传视频' },
      { name: '创建旅行Vlog剪辑', placeholder: '创建旅行Vlog剪辑' },
      { name: '生成教学演示视频', placeholder: '生成教学演示视频' },
      { name: '制作婚礼回忆短片', placeholder: '制作婚礼回忆短片' },
      { name: '创建企业介绍视频', placeholder: '创建企业介绍视频' },
      { name: '生成音乐MV', placeholder: '生成音乐MV' },
    ],
    free_creation: [
      { name: '生成一张未来科技风格的插画', placeholder: '生成一张未来科技风格的插画' },
      { name: '创作一个悬疑短片的剧本大纲', placeholder: '创作一个悬疑短片的剧本大纲' },
      { name: '制作一段产品介绍视频', placeholder: '制作一段产品介绍视频' },
      { name: '设计一组社交媒体配图', placeholder: '设计一组社交媒体配图' },
      { name: '编写一个广告文案脚本', placeholder: '编写一个广告文案脚本' },
      { name: '生成品牌宣传海报', placeholder: '生成品牌宣传海报' },
    ],
    image_generation: [
      { name: '赛博朋克城市夜景', placeholder: '赛博朋克风格的城市夜景，霓虹灯倒映在雨后的街道上，高楼林立，充满未来感' },
      { name: '水墨山水画', placeholder: '中国传统水墨风格的山水画，云雾缭绕的山峰，远处有一叶扁舟，意境悠远' },
      { name: '可爱动物插画', placeholder: '一只穿着宇航服的柴犬漂浮在太空中，背景是星云和行星，卡通插画风格' },
      { name: '梦幻森林场景', placeholder: '魔法森林中的精灵小屋，蘑菇发光，萤火虫飞舞，唯美奇幻风格' },
      { name: '产品概念海报', placeholder: '极简主义风格的香水广告海报，玻璃瓶在柔和光线下折射出彩虹光晕，高端质感' },
      { name: '复古胶片人像', placeholder: '复古胶片风格的街头人像摄影，暖色调，浅景深，充满年代感' },
    ],
  });

  const imageModelList = ref<ImageModelItem[]>([...defaultImageModels]);
  const videoModelList = ref<VideoModelItem[]>([...defaultVideoModels]);

  const imageModelDefault = ref<string>('banana2');
  const videoModelDefault = ref<string>('');
  const defaultMode = ref<DefaultMode>('agent');
  const webHeaderLink = ref<WebHeaderLink | null>(null);

  const effectiveImageModel = computed(() => {
    return imageModelDefault.value || imageModelList.value[0]?.id || '';
  });

  const effectiveVideoModel = computed(() => {
    return videoModelDefault.value || videoModelList.value[0]?.id || '';
  });

  const loadConfig = async () => {
    loading.value = true;
    error.value = null;

    try {
      const config = await getSystemConfig([
        'web_home_tips',
        'web_home_auto_recommend',
        'web_home_free_recommend',
        'web_home_image_models',
        'web_home_video_models',
        'web_home_image_model_default',
        'web_home_video_model_default',
        'web_home_default_mode',
        'web_vip_video_models',
        'web_header_link',
      ]);

      console.log('config store loaded config:', config);

      if (config.webHomeTips) {
        homeTips.value = config.webHomeTips;
      }

      const webHomeAutoRecommend = config.webHomeAutoRecommend;
      const webHomeFreeRecommend = config.webHomeFreeRecommend;
      if (webHomeAutoRecommend && webHomeAutoRecommend.length > 0) {
        suggestionsByMode.value.one_click = webHomeAutoRecommend;
      }
      if (webHomeFreeRecommend && webHomeFreeRecommend.length > 0) {
        suggestionsByMode.value.free_creation = webHomeFreeRecommend;
      }

      if (config.webHomeImageModels && validateImageModelList(config.webHomeImageModels)) {
        imageModelList.value = config.webHomeImageModels;
      }

      if (config.webHomeVideoModels && validateVideoModelList(config.webHomeVideoModels)) {
        videoModelList.value = config.webHomeVideoModels;
      }

      if (config.webVipVideoModels && config.webVipVideoModels.models && config.webVipVideoModels.phones) {
        const authStore = useAuthStore();
        const currentPhone = authStore.user?.phone;

        if (currentPhone && config.webVipVideoModels.phones.includes(currentPhone)) {
          const vipVideoModels = config.webVipVideoModels.models;
          if (validateVideoModelList(vipVideoModels)) {
            videoModelList.value = [...videoModelList.value, ...vipVideoModels];
            console.log('VIP video models added:', vipVideoModels);
          }
        }
      }

      if (config.webHomeImageModelDefault) {
        const defaultExists = imageModelList.value.some(m => m.id === config.webHomeImageModelDefault);
        if (defaultExists) {
          imageModelDefault.value = config.webHomeImageModelDefault;
        }
      }

      if (config.webHomeVideoModelDefault) {
        const defaultExists = videoModelList.value.some(m => m.id === config.webHomeVideoModelDefault);
        if (defaultExists) {
          videoModelDefault.value = config.webHomeVideoModelDefault;
        }
      }

      if (config.webHomeDefaultMode) {
        const validModes: DefaultMode[] = ['agent', 'video_generation', 'image_generation', 'card'];
        if (validModes.includes(config.webHomeDefaultMode)) {
          defaultMode.value = config.webHomeDefaultMode;
        }
      }

      if (config.webHeaderLink && typeof config.webHeaderLink === 'object') {
        const link = config.webHeaderLink;
        if (typeof link.href === 'string' && typeof link.text === 'string' && typeof link.color === 'string') {
          webHeaderLink.value = link as WebHeaderLink;
        }
      }

    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load config';
      console.error('Failed to load config:', err);
    } finally {
      loading.value = false;
    }
  };

  return {
    loading,
    error,
    homeTips,
    suggestionsByMode,
    imageModelList,
    videoModelList,
    imageModelDefault,
    videoModelDefault,
    defaultMode,
    effectiveImageModel,
    effectiveVideoModel,
    webHeaderLink,
    loadConfig,
  };
});
