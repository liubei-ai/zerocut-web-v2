import type { FilePreview, ProcessFilesResult } from '@/types/fileReference';
import {
  MAX_FILES,
  MAX_VIDEO_TOTAL_DURATION,
  MAX_VIDEO_COUNT,
  MIN_VIDEO_DURATION,
  MAX_VIDEO_DURATION,
  MAX_FILE_SIZE,
} from '@/types/fileReference';

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

export function removeFileExtension(fileName: string): string {
  const lastDotIndex = fileName.lastIndexOf('.');
  if (lastDotIndex === -1) return fileName;
  return fileName.substring(0, lastDotIndex);
}

export function generateFileName(
  fileName: string,
  fileType: string,
  existingCount: number,
  existingFileNames: string[] = []
): string {
  if (fileType !== 'image' && fileType !== 'video' && fileType !== 'audio') {
    return getUniqueFileName(fileName, existingFileNames);
  }

  const lastDotIndex = fileName.lastIndexOf('.');
  const extension = lastDotIndex !== -1 ? fileName.substring(lastDotIndex) : '';

  const typeNames: Record<string, string> = {
    image: '图片',
    video: '视频',
    audio: '音频',
  };

  const typePrefix = typeNames[fileType];
  
  let maxCounter = 0;
  const numberPattern = new RegExp(`^${typePrefix}(\\d+)$`);
  for (const existingName of existingFileNames) {
    const nameWithoutExt = removeFileExtension(existingName);
    if (nameWithoutExt.startsWith(typePrefix)) {
      const numberMatch = nameWithoutExt.match(numberPattern);
      if (numberMatch) {
        const counter = parseInt(numberMatch[1], 10);
        if (counter > maxCounter) {
          maxCounter = counter;
        }
      }
    }
  }

  let counter = Math.max(existingCount + 1, maxCounter + 1);
  let candidateName = `${typePrefix}${counter}${extension}`;

  while (existingFileNames.includes(candidateName)) {
    counter++;
    candidateName = `${typePrefix}${counter}${extension}`;
  }

  return candidateName;
}

export function isFileReferencedInPrompt(prompt: string, fileName: string): boolean {
  if (!prompt || !fileName) return false;

  const cleanFileName = removeFileExtension(fileName);
  const trimmedPrompt = prompt.trim();

  return trimmedPrompt.includes(cleanFileName);
}

export function getReferencedFiles<T extends { name: string }>(
  prompt: string,
  files: T[]
): T[] {
  return files.filter(file => isFileReferencedInPrompt(prompt, file.name));
}

export interface ProjectFileForMedia {
  file_name: string;
  file_type: string;
  file_url: string;
}

export interface MediaParams {
  images: Array<{
    type: string;
    name?: string;
    url?: string;
  }>;
  videos: Array<{
    type: string;
    name?: string;
    url?: string;
    duration?: number;
  }>;
  audios: Array<{
    type: string;
    name?: string;
    url?: string;
    duration?: number;
  }>;
}

export function buildReferencedMediaFromProjectFiles(
  prompt: string,
  projectFiles: ProjectFileForMedia[],
  referenceMode: 'reference' | 'first_last_frame' = 'reference'
): MediaParams {
  const images: MediaParams['images'] = [];
  const videos: MediaParams['videos'] = [];
  const audios: MediaParams['audios'] = [];

  let imageCount = 0;

  for (const file of projectFiles) {
    if (!isFileReferencedInPrompt(prompt, file.file_name)) continue;

    const cleanName = removeFileExtension(file.file_name);

    if (file.file_type === 'image') {
      let type: 'first_frame' | 'last_frame' | 'reference' = 'reference';
      if (referenceMode === 'first_last_frame') {
        if (imageCount === 0) type = 'first_frame';
        else if (imageCount === 1) type = 'last_frame';
        imageCount++;
      }
      images.push({
        type,
        name: cleanName,
        url: encodeURI(file.file_url),
      });
    } else if (file.file_type === 'video') {
      videos.push({
        type: 'ref',
        name: cleanName,
        url: encodeURI(file.file_url),
      });
    } else if (file.file_type === 'audio') {
      audios.push({
        type: 'reference',
        name: cleanName,
        url: encodeURI(file.file_url),
      });
    }
  }

  return { images, videos, audios };
}

export function getUniqueFileName(fileName: string, existingFileNames: string[]): string {
  if (!existingFileNames.includes(fileName)) {
    return fileName;
  }

  const extIndex = fileName.lastIndexOf('.');
  const extension = extIndex > 0 ? fileName.substring(extIndex) : '';
  let baseName = extIndex > 0 ? fileName.substring(0, extIndex) : fileName;

  const numberMatch = baseName.match(/(\d+)$/);
  if (numberMatch) {
    const currentNumber = parseInt(numberMatch[1], 10);
    baseName = baseName.slice(0, -numberMatch[1].length);
    let nextNumber = currentNumber + 1;
    let newName = `${baseName}${nextNumber}${extension}`;
    while (existingFileNames.includes(newName)) {
      nextNumber++;
      newName = `${baseName}${nextNumber}${extension}`;
    }
    return newName;
  }

  let counter = 1;
  let newName = `${baseName}${counter}${extension}`;
  while (existingFileNames.includes(newName)) {
    counter++;
    newName = `${baseName}${counter}${extension}`;
  }
  return newName;
}

export async function processFiles(
  files: File[],
  existingFiles: FilePreview[],
  includeDurationCheck: boolean = true,
  existingProjectFileNames: string[] = []
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
    if (fileType === 'image' || fileType === 'video' || fileType === 'audio') {
      const allExistingNames = [...existingProjectFileNames, ...existingFiles.map(f => f.name), ...result.filesToAdd.map(f => f.name)];
      const typeCount = fileType === 'image' 
        ? imageCount + result.filesToAdd.filter(f => f.type === 'image').length
        : fileType === 'video'
        ? videoCount + result.filesToAdd.filter(f => f.type === 'video').length
        : audioCount + result.filesToAdd.filter(f => f.type === 'audio').length;
      renamedName = generateFileName(file.name, fileType, typeCount, allExistingNames);
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
