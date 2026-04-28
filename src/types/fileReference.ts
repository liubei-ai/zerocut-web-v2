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
export const MIN_VIDEO_DURATION = 2;
export const MAX_VIDEO_DURATION = 15;
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

export interface ProcessFilesResult {
  filesToAdd: FilePreview[];
  duplicateCount: number;
  exceededCount: number;
  invalidDurationCount: number;
  invalidSizeCount: number;
  exceededVideoCount: number;
}

export async function processFiles(
  files: File[],
  existingFiles: FilePreview[],
  includeDurationCheck: boolean = true
): Promise<ProcessFilesResult> {
  const result: ProcessFilesResult = {
    filesToAdd: [],
    duplicateCount: 0,
    exceededCount: 0,
    invalidDurationCount: 0,
    invalidSizeCount: 0,
    exceededVideoCount: 0,
  };

  const remainingSlots = MAX_FILES - existingFiles.length;
  if (remainingSlots <= 0) {
    result.exceededCount = files.length;
    return result;
  }

  let currentVideoCount = existingFiles.filter(f => f.type === 'video').length;
  const imageCount = existingFiles.filter(f => f.type === 'image').length;
  const videoCount = existingFiles.filter(f => f.type === 'video').length;
  const audioCount = existingFiles.filter(f => f.type === 'audio').length;

  for (const file of files) {
    if (existingFiles.length + result.filesToAdd.length >= MAX_FILES) {
      result.exceededCount++;
      continue;
    }

    const isDuplicate = existingFiles.some(
      existingFile => existingFile.name === file.name && existingFile.file.size === file.size,
    );
    if (isDuplicate) {
      result.duplicateCount++;
      continue;
    }

    const fileType = getFileType(file);
    if (fileType === 'video' && currentVideoCount >= MAX_VIDEO_COUNT) {
      result.exceededVideoCount++;
      continue;
    }

    if (file.size > MAX_FILE_SIZE) {
      result.invalidSizeCount++;
      continue;
    }

    let duration: number | undefined;
    let roundedDuration: number | undefined;
    if (fileType === 'video' && includeDurationCheck) {
      duration = await checkVideoDuration(file);
      roundedDuration = Math.round(duration);
      if (roundedDuration < MIN_VIDEO_DURATION || roundedDuration > MAX_VIDEO_DURATION) {
        result.invalidDurationCount++;
        continue;
      }
    }

    let renamedName = file.name;
    if (fileType === 'image') {
      renamedName = generateFileName(file.name, fileType, imageCount + result.filesToAdd.filter(f => f.type === 'image').length);
    }

    const filePreview: FilePreview = {
      id: `file-${Date.now()}-${Math.random()}`,
      name: renamedName,
      type: fileType,
      url: URL.createObjectURL(file),
      file,
      duration: roundedDuration,
    };

    result.filesToAdd.push(filePreview);
    if (fileType === 'video') {
      currentVideoCount++;
    }
  }

  return result;
}
