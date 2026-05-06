import { ref, type Ref } from 'vue';
import { uploadMaterial } from '@/api/videoProjectApi';
import { useToast } from '@/composables/useToast';
import { generateFileName, removeFileExtension } from '@/utils/fileUtils';

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
    existingFiles: Array<{ file_name: string; file_type?: string }> = [],
    onSuccess?: () => void
  ) => {
    const target = e.target as HTMLInputElement;
    const file = target.files?.[0];

    if (!file || !projectId) {
      return;
    }

    try {
      onUploadStart?.();

      const fileType = file.type.startsWith('image/') ? 'image' :
        file.type.startsWith('video/') ? 'video' :
        file.type.startsWith('audio/') ? 'audio' : 'other';

      const existingNames: string[] = [];
      existingFiles.forEach(f => {
        existingNames.push(f.file_name);
        existingNames.push(removeFileExtension(f.file_name));
      });

      const existingCount = existingFiles.filter(f => {
        if (fileType === 'image' && f.file_type === 'image') return true;
        if (fileType === 'video' && f.file_type === 'video') return true;
        if (fileType === 'audio' && f.file_type === 'audio') return true;
        return false;
      }).length;

      const renamedName = generateFileName(file.name, fileType, existingCount, existingNames);

      await uploadMaterial(projectId, file, renamedName);

      toast({
        title: '上传成功',
        description: `文件 ${renamedName} 已上传`,
      });

      onSuccess?.();

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