export interface FilePreview {
  id: string;
  name: string;
  type: string;
  url: string;
  file: File;
  duration?: number;
}

export interface ProjectFileReference {
  id: string;
  file_name: string;
  file_type?: string;
  file_url?: string;
  thumbnail_url?: string;
}

export const MAX_FILES = 6;
export const MAX_VIDEO_TOTAL_DURATION = 15;
export const MAX_VIDEO_COUNT = 3;
export const MIN_VIDEO_DURATION = 3;
export const MAX_VIDEO_DURATION = 10;
export const MAX_FILE_SIZE = 200 * 1024 * 1024;

export function checkVideoDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      window.URL.revokeObjectURL(video.src);
      resolve(video.duration);
    };
    video.onerror = () => {
      window.URL.revokeObjectURL(video.src);
      resolve(0);
    };
    video.src = URL.createObjectURL(file);
  });
}

export function getFileType(file: File): string {
  if (file.type.startsWith('image/')) {
    return 'image';
  } else if (file.type.startsWith('video/')) {
    return 'video';
  } else if (file.type.startsWith('audio/')) {
    return 'audio';
  }
  return 'document';
}

export function getFileIcon(fileType: string | undefined): string {
  if (!fileType) return '📁';
  const icons: Record<string, string> = {
    image: '🖼️',
    video: '🎬',
    audio: '🎵',
    document: '📄',
  };
  return icons[fileType] || '📁';
}

export function generateFileName(
  fileName: string,
  fileType: string,
  existingCount: number
): string {
  if (fileType !== 'image' && fileType !== 'video' && fileType !== 'audio') {
    return fileName;
  }

  const ext = fileName.split('.').pop() || '';
  const typeNames: Record<string, string> = {
    image: '图片',
    video: '视频',
    audio: '音频',
  };
  const baseName = `${typeNames[fileType]}${existingCount + 1}`;
  return ext ? `${baseName}.${ext}` : baseName;
}
