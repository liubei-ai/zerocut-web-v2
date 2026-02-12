import { ref, type Ref } from 'vue';
import { uploadMaterial } from '@/api/videoProjectApi';
import { useToast } from '@/composables/useToast';

export function useFileUpload(
  isUploading: Ref<boolean>,
  onUploadStart?: () => void,
  onUploadEnd?: () => void
) {
  const { toast } = useToast();
  const fileInputRef = ref<HTMLInputElement>();

  const handleFileUploadClick = (projectId?: string | number) => {
    if (!projectId || isUploading.value) {
      if (!projectId) {
        toast({
          title: '无法上传',
          description: '请先创建项目',
          variant: 'destructive',
        });
      }
      return;
    }
    fileInputRef.value?.click();
  };

  const handleFileChange = async (
    e: Event,
    projectId: string | number,
    onSuccess?: () => void
  ) => {
    const target = e.target as HTMLInputElement;
    const file = target.files?.[0];

    if (!file || !projectId) {
      return;
    }

    try {
      onUploadStart?.();

      await uploadMaterial(projectId, file);

      toast({
        title: '上传成功',
        description: `文件 ${file.name} 已上传`,
      });

      // Call success callback if provided
      onSuccess?.();

      // Clear the input so the same file can be uploaded again if needed
      if (target) {
        target.value = '';
      }
    } catch (error: any) {
      console.error('Upload failed:', error);
      toast({
        title: '上传失败',
        description: error.message || '上传文件时出错',
        variant: 'destructive',
      });
    } finally {
      onUploadEnd?.();
    }
  };

  return {
    fileInputRef,
    handleFileUploadClick,
    handleFileChange,
  };
}