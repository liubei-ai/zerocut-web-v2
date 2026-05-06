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

export interface ProcessFilesResult {
  filesToAdd: FilePreview[];
  duplicateCount: number;
  exceededCount: number;
  invalidDurationCount: number;
  invalidSizeCount: number;
  exceededVideoCount: number;
}

export const MAX_FILES = 6;
export const MAX_VIDEO_TOTAL_DURATION = 15;
export const MAX_VIDEO_COUNT = 3;
export const MIN_VIDEO_DURATION = 2;
export const MAX_VIDEO_DURATION = 15;
export const MAX_FILE_SIZE = 200 * 1024 * 1024;
