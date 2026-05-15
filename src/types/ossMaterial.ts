// OSS 素材完整类型定义

export interface OssMaterialReference {
  url: string;
  name: string;
  type: string;
}

export interface OssMaterialInputParams {
  images?: OssMaterialReference[];
  videos?: OssMaterialReference[];
  audios?: OssMaterialReference[];
  duration?: number;
  projectId?: number;
  resolution?: string;
  aspect_ratio?: string;
  [key: string]: any;
}

export interface OssMaterial {
  ossKey: string;
  ossUrl: string | null;
  source: string;
  fileSize: number;
  fileType: 'image' | 'video' | 'audio' | 'document';
  localFile: string | null;
  uploadTime: string;
  prompt: string | null;
  model: string | null;
  inputParams: OssMaterialInputParams | null;
  status?: 'SUCCESS' | 'FAILED' | 'RUNNING' | 'PENDING';
  workflowRef?: string;
}

// 画布节点数据类型
export interface MaterialNodeData {
  material: OssMaterial;
  isSelected?: boolean;
  onEdit?: (material: OssMaterial) => void;
  onRegenerate?: (material: OssMaterial) => void;
}

// 素材关系类型（用于连线）
export interface MaterialRelation {
  sourceId: string;
  targetId: string;
  relationType: 'reference' | 'generated_from';
}
