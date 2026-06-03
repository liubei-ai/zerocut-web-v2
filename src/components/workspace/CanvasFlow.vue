<script setup lang="ts">
import { computed, watch, onMounted, ref, markRaw } from 'vue';
import { VueFlow, useVueFlow, MarkerType, type Node, type Edge } from '@vue-flow/core';
import { Background } from '@vue-flow/background';
import { MiniMap } from '@vue-flow/minimap';
import MaterialNode from './MaterialNode.vue';
import type { OssMaterial } from '@/types/ossMaterial';

interface Props {
  materials: OssMaterial[];
  selectedMaterialId?: string;
}

interface Emits {
  (e: 'select', material: OssMaterial): void;
  (e: 'edit', material: OssMaterial): void;
  (e: 'regenerate', material: OssMaterial): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const { fitView, setNodes: setFlowNodes, setEdges: setFlowEdges } = useVueFlow();

const nodeTypes = markRaw({
  material: MaterialNode,
});

const isLayouted = ref(false);

const materialsMap = computed(() => {
  const map = new Map<string, OssMaterial>();
  props.materials.forEach(m => {
    if (m.ossUrl) {
      map.set(m.ossUrl, m);
    }
    if (m.localFile) {
      map.set(m.localFile, m);
    }
  });
  return map;
});

const normalizeUrl = (url: string): string => {
  try {
    return decodeURIComponent(url);
  } catch {
    return url;
  }
};

const getFileNameFromUrl = (url: string): string => {
  try {
    const decoded = decodeURIComponent(url);
    const parts = decoded.split('/');
    return parts[parts.length - 1] || '';
  } catch {
    const parts = url.split('/');
    return parts[parts.length - 1] || '';
  }
};

const getFileNameWithoutExt = (filename: string): string => {
  const dotIndex = filename.lastIndexOf('.');
  return dotIndex > 0 ? filename.substring(0, dotIndex) : filename;
};

const findMaterialByReference = (refUrl: string, refName?: string): OssMaterial | undefined => {
  const normalizedRefUrl = normalizeUrl(refUrl);
  const refFileName = getFileNameFromUrl(refUrl);
  const refFileNameNoExt = getFileNameWithoutExt(refFileName);

  return props.materials.find(m => {
    if (m.ossUrl) {
      const normalizedOssUrl = normalizeUrl(m.ossUrl);
      if (normalizedRefUrl === normalizedOssUrl) return true;
      if (normalizedRefUrl.includes(normalizedOssUrl)) return true;
      if (normalizedOssUrl.includes(normalizedRefUrl)) return true;
    }

    if (m.localFile) {
      const localFileName = m.localFile.split('/').pop() || '';
      const localFileNameNoExt = getFileNameWithoutExt(localFileName);

      if (refFileName && localFileName && refFileName === localFileName) return true;
      if (refFileNameNoExt && localFileNameNoExt && refFileNameNoExt === localFileNameNoExt) return true;

      if (normalizedRefUrl.includes(m.localFile)) return true;
      if (m.localFile.includes(refFileName)) return true;
    }

    if (refName && m.localFile) {
      const localFileName = m.localFile.split('/').pop() || '';
      const localFileNameNoExt = getFileNameWithoutExt(localFileName);
      if (refName === localFileNameNoExt) return true;
    }

    if (refName && m.ossUrl) {
      const ossFileNameNoExt = getFileNameWithoutExt(getFileNameFromUrl(m.ossUrl));
      if (refName === ossFileNameNoExt) return true;
    }

    return false;
  });
};

const getNodeId = (material: OssMaterial): string => {
  return material.ossKey || material.localFile || `material-${Math.random().toString(36).substr(2, 9)}`;
};

interface NodeSize {
  width: number;
  height: number;
}

const calculateNodeSize = (material: OssMaterial): NodeSize => {
  const baseWidth = 384;
  let height = 120;
  
  const isGenerated = material.prompt !== null || material.source === 'omni';
  const hasPrompt = !!material.prompt;
  const hasParams = material.inputParams && (
    material.inputParams.duration ||
    material.inputParams.resolution ||
    material.inputParams.aspect_ratio ||
    material.inputParams.model
  );
  const hasActionButtons = material.fileType === 'video' && isGenerated && material.status === 'SUCCESS';
  
  if (hasPrompt) {
    height += 60;
  }
  
  if (hasParams) {
    height += 45;
  }
  
  const isImageOrVideo = material.fileType === 'image' || material.fileType === 'video';
  if (isImageOrVideo && material.ossUrl) {
    height += 160;
  } else if (material.fileType === 'audio') {
    height += 60;
  } else {
    height += 80;
  }
  
  if (hasActionButtons) {
    height += 56;
  }
  
  return {
    width: baseWidth,
    height: Math.min(Math.max(height, 200), 600)
  };
};

const initialNodes = computed<Node[]>(() => {
  return props.materials.map(material => ({
    id: getNodeId(material),
    type: 'material',
    position: { x: 0, y: 0 },
    data: {
      material,
    },
  }));
});

const edges = computed<Edge[]>(() => {
  const edgeList: Edge[] = [];
  const edgeSet = new Set<string>();

  props.materials.forEach(material => {
    if (!material.inputParams) return;

    const targetId = getNodeId(material);

    const references = [
      ...(material.inputParams.images || []),
      ...(material.inputParams.videos || []),
      ...(material.inputParams.audios || []),
    ];

    references.forEach(ref => {
      const sourceMaterial = findMaterialByReference(ref.url, ref.name);
      if (sourceMaterial) {
        const sourceId = getNodeId(sourceMaterial);
        const edgeKey = `${sourceId}-${targetId}`;

        if (!edgeSet.has(edgeKey) && sourceId !== targetId) {
          edgeSet.add(edgeKey);

          const isVideoRef = material.inputParams?.videos?.some(v => v.url === ref.url);
          const edgeColor = isVideoRef ? 'hsl(var(--primary) / 0.5)' : 'hsl(142, 76%, 36% / 0.5)';
          const edgeLabel = isVideoRef ? '📹 参考视频' : '🖼️ 参考图片';

          edgeList.push({
            id: edgeKey,
            source: sourceId,
            target: targetId,
            type: 'smoothstep',
            animated: false,
            label: edgeLabel,
            labelStyle: {
              fill: 'hsl(var(--foreground))',
              fontWeight: 600,
              fontSize: '10px',
            },
            labelBgStyle: {
              fill: 'hsl(var(--card))',
              fillOpacity: 0.9,
            },
            style: {
              stroke: isVideoRef ? 'hsl(var(--primary) / 0.6)' : 'hsl(142, 76%, 36% / 0.6)',
              strokeWidth: 2.5,
            },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: isVideoRef ? 'hsl(var(--primary) / 0.8)' : 'hsl(142, 76%, 36% / 0.8)',
            },
          });
        }
      }
    });
  });

  return edgeList;
});

const runLayout = () => {
  if (props.materials.length === 0) {
    isLayouted.value = false;
    return;
  }

  const result = calculateSmartLayout(
    initialNodes.value,
    edges.value
  );

  setFlowNodes(result.nodes);
  setFlowEdges(result.edges);

  isLayouted.value = true;

  setTimeout(() => {
    fitView({ padding: 0.15, duration: 400 });
  }, 50);
};

interface LayoutNode extends Node {
  level?: number;
  componentIndex?: number;
  nodeWidth?: number;
  nodeHeight?: number;
}

interface GridCell {
  row: number;
  col: number;
  width: number;
  height: number;
  nodeIndex: number;
}

interface LayoutResult {
  nodes: LayoutNode[];
  edges: Edge[];
  canvasWidth: number;
  canvasHeight: number;
}

interface GraphComponent {
  nodes: Node[];
  edges: Edge[];
  nodeIds: Set<string>;
  layoutDirection?: 'horizontal' | 'vertical';
}

interface NodeDimensions {
  width: number;
  height: number;
}

type LayoutDirection = 'horizontal' | 'vertical';

const MAX_CANVAS_WIDTH = 2000;
const HORIZONTAL_GAP = 60;
const VERTICAL_GAP = 40;
const COMPONENT_GAP = 80;
const PADDING = 80;

const determineOptimalLayoutDirection = (
  component: GraphComponent,
  nodeDimensions: Map<string, NodeDimensions>
): LayoutDirection => {
  const { nodes, edges } = component;
  
  if (nodes.length <= 3) {
    return 'vertical';
  }
  
  const nodeDependencies = new Map<string, Set<string>>();
  nodes.forEach(node => {
    nodeDependencies.set(node.id, new Set());
  });
  
  edges.forEach(edge => {
    nodeDependencies.get(edge.target)?.add(edge.source);
  });
  
  let maxInDegree = 0;
  let maxOutDegree = 0;
  
  nodes.forEach(node => {
    const inDegree = nodeDependencies.get(node.id)?.size || 0;
    const outDegree = edges.filter(e => e.source === node.id).length;
    
    maxInDegree = Math.max(maxInDegree, inDegree);
    maxOutDegree = Math.max(maxOutDegree, outDegree);
  });
  
  const totalDeps = Array.from(nodeDependencies.values()).reduce((sum, deps) => sum + deps.size, 0);
  const avgDepsPerNode = totalDeps / nodes.length;
  
  const verticalDimension = nodes.reduce((sum, node) => {
    const dims = nodeDimensions.get(node.id) || { width: 384, height: 400 };
    return sum + dims.height;
  }, 0);
  
  const horizontalDimension = nodes.reduce((sum, node) => {
    const dims = nodeDimensions.get(node.id) || { width: 384, height: 400 };
    return sum + dims.width;
  }, 0);
  
  const aspectRatio = horizontalDimension / verticalDimension;
  
  if (nodes.length <= 4 && aspectRatio < 0.8) {
    return 'vertical';
  }
  
  if (nodes.length > 6 && maxOutDegree > 2) {
    return 'horizontal';
  }
  
  if (nodes.length > 8 || aspectRatio > 1.5) {
    return 'horizontal';
  }
  
  return 'vertical';
};

const calculateSmartLayout = (
  nodes: Node[],
  edgeList: Edge[]
): LayoutResult => {
  const nodeDimensions = new Map<string, NodeDimensions>();
  
  nodes.forEach(node => {
    const material = (node.data as any)?.material;
    if (material) {
      nodeDimensions.set(node.id, calculateNodeSize(material));
    } else {
      nodeDimensions.set(node.id, { width: 384, height: 400 });
    }
  });

  const components = findConnectedComponents(nodes, edgeList);
  
  const layoutedComponents: Array<{
    nodes: LayoutNode[];
    width: number;
    height: number;
    sourceEdges: Edge[];
  }> = [];

  components.forEach((component, componentIndex) => {
    const { nodes: layoutedNodes, edges: componentEdges, width, height } = 
      layoutComponentWithDimensions(component, componentIndex, nodeDimensions);
    
    const resolvedNodes = resolveOverlaps(layoutedNodes, nodeDimensions);
    const recalcHeight = Math.max(...resolvedNodes.map(n => {
      const dims = nodeDimensions.get(n.id) || { width: 384, height: 400 };
      return n.position.y + dims.height;
    })) + PADDING;
    
    layoutedComponents.push({
      nodes: resolvedNodes,
      width,
      height: recalcHeight,
      sourceEdges: componentEdges,
    });
  });

  const { gridLayout, totalWidth, totalHeight } = calculateGridLayout(layoutedComponents);
  const offsets = calculateGridLayoutOffsets(gridLayout);
  
  const finalNodes: LayoutNode[] = [];
  const finalEdges: Edge[] = [];
  
  gridLayout.forEach((cell, index) => {
    const component = layoutedComponents[cell.nodeIndex];
    const offset = offsets.get(cell.nodeIndex)!;
    
    component.nodes.forEach(layoutedNode => {
      finalNodes.push({
        ...layoutedNode,
        position: {
          x: layoutedNode.position.x + offset.offsetX,
          y: layoutedNode.position.y + offset.offsetY,
        },
        componentIndex: index,
      });
    });
    
    component.sourceEdges.forEach(edge => {
      finalEdges.push(edge);
    });
  });

  const canvasWidth = Math.max(totalWidth, MAX_CANVAS_WIDTH);
  const canvasHeight = totalHeight + PADDING * 2;
  
  const optimizedEdges = optimizeEdgeRouting(finalNodes, finalEdges);

  return {
    nodes: finalNodes,
    edges: optimizedEdges,
    canvasWidth,
    canvasHeight,
  };
};

const calculateGridLayout = (components: Array<{
  nodes: LayoutNode[];
  width: number;
  height: number;
  sourceEdges: Edge[];
}>): { gridLayout: GridCell[]; totalWidth: number; totalHeight: number } => {
  if (components.length === 0) {
    return { gridLayout: [], totalWidth: 0, totalHeight: 0 };
  }

  const gridLayout: GridCell[] = [];
  let currentRow = 0;
  let currentCol = 0;
  let rowHeights: number[] = [];
  let colWidths: number[] = [];
  let currentRowWidth = 0;
  
  components.forEach((component, index) => {
    const cellWidth = component.width;
    const cellHeight = component.height;
    
    const availableWidth = MAX_CANVAS_WIDTH - PADDING * 2 - currentRowWidth;
    
    if (currentCol > 0 && currentRowWidth + COMPONENT_GAP + cellWidth > MAX_CANVAS_WIDTH - PADDING * 2) {
      currentRow++;
      currentCol = 0;
      currentRowWidth = 0;
    }
    
    gridLayout.push({
      row: currentRow,
      col: currentCol,
      width: cellWidth,
      height: cellHeight,
      nodeIndex: index,
    });
    
    if (!rowHeights[currentRow]) {
      rowHeights[currentRow] = 0;
    }
    rowHeights[currentRow] = Math.max(rowHeights[currentRow], cellHeight);
    
    if (!colWidths[currentCol]) {
      colWidths[currentCol] = 0;
    }
    colWidths[currentCol] = Math.max(colWidths[currentCol], cellWidth);
    
    currentRowWidth += cellWidth + (currentCol > 0 ? COMPONENT_GAP : 0);
    currentCol++;
  });

  const totalHeight = rowHeights.reduce((sum, h) => sum + h + COMPONENT_GAP, 0);
  const totalWidth = colWidths.reduce((sum, w) => sum + w + COMPONENT_GAP, 0);

  return {
    gridLayout,
    totalWidth: totalWidth + PADDING * 2,
    totalHeight: totalHeight + PADDING * 2,
  };
};

const calculateGridLayoutOffsets = (gridLayout: GridCell[]): Map<number, { offsetX: number; offsetY: number }> => {
  const offsets = new Map<number, { offsetX: number; offsetY: number }>();
  const rowHeightMap = new Map<number, number>();
  const colWidthMap = new Map<number, number>();
  
  gridLayout.forEach(cell => {
    if (!rowHeightMap.has(cell.row)) {
      rowHeightMap.set(cell.row, 0);
    }
    rowHeightMap.set(cell.row, Math.max(rowHeightMap.get(cell.row)!, cell.height));
    
    if (!colWidthMap.has(cell.col)) {
      colWidthMap.set(cell.col, 0);
    }
    colWidthMap.set(cell.col, Math.max(colWidthMap.get(cell.col)!, cell.width));
  });
  
  const rowOffsets = new Map<number, number>();
  let cumulativeY = PADDING;
  const sortedRows = Array.from(rowHeightMap.keys()).sort((a, b) => a - b);
  sortedRows.forEach(row => {
    rowOffsets.set(row, cumulativeY);
    cumulativeY += rowHeightMap.get(row)! + COMPONENT_GAP;
  });
  
  const colOffsets = new Map<number, number>();
  let cumulativeX = PADDING;
  const sortedCols = Array.from(colWidthMap.keys()).sort((a, b) => a - b);
  sortedCols.forEach(col => {
    colOffsets.set(col, cumulativeX);
    cumulativeX += colWidthMap.get(col)! + COMPONENT_GAP;
  });
  
  gridLayout.forEach(cell => {
    offsets.set(cell.nodeIndex, {
      offsetX: colOffsets.get(cell.col)!,
      offsetY: rowOffsets.get(cell.row)!,
    });
  });
  
  return offsets;
};

const findConnectedComponents = (
  nodes: Node[],
  edges: Edge[]
): GraphComponent[] => {
  const adjacency = new Map<string, Set<string>>();
  nodes.forEach(node => adjacency.set(node.id, new Set()));
  
  edges.forEach(edge => {
    adjacency.get(edge.source)?.add(edge.target);
    adjacency.get(edge.target)?.add(edge.source);
  });

  const visited = new Set<string>();
  const components: GraphComponent[] = [];

  const dfs = (nodeId: string, component: GraphComponent) => {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);

    const node = nodes.find(n => n.id === nodeId);
    if (node) {
      component.nodes.push(node);
      component.nodeIds.add(nodeId);
    }

    adjacency.get(nodeId)?.forEach(neighbor => {
      dfs(neighbor, component);
    });
  };

  nodes.forEach(node => {
    if (!visited.has(node.id)) {
      const component: GraphComponent = {
        nodes: [],
        edges: [],
        nodeIds: new Set(),
      };
      dfs(node.id, component);

      component.edges = edges.filter(
        edge => component.nodeIds.has(edge.source) && component.nodeIds.has(edge.target)
      );

      components.push(component);
    }
  });

  components.sort((a, b) => b.nodes.length - a.nodes.length);

  return components;
};

const layoutComponentWithDimensions = (
  component: GraphComponent,
  componentIndex: number,
  nodeDimensions: Map<string, NodeDimensions>
): { nodes: LayoutNode[]; edges: Edge[]; width: number; height: number } => {
  const { nodes: componentNodes, edges: componentEdges } = component;

  if (componentNodes.length === 0) {
    return { nodes: [], edges: [], width: 0, height: 0 };
  }

  if (componentNodes.length === 1) {
    const nodeId = componentNodes[0].id;
    const dims = nodeDimensions.get(nodeId) || { width: 384, height: 400 };
    return {
      nodes: [{
        ...componentNodes[0],
        position: { x: 0, y: 0 },
        componentIndex,
        nodeWidth: dims.width,
        nodeHeight: dims.height,
      }],
      edges: componentEdges,
      width: dims.width,
      height: dims.height,
    };
  }

  const layoutDirection = determineOptimalLayoutDirection(component, nodeDimensions);

  if (layoutDirection === 'horizontal') {
    return layoutComponentHorizontal(componentNodes, componentEdges, componentIndex, nodeDimensions);
  } else {
    return layoutComponentVertical(componentNodes, componentEdges, componentIndex, nodeDimensions);
  }
};

const layoutComponentVertical = (
  componentNodes: Node[],
  componentEdges: Edge[],
  componentIndex: number,
  nodeDimensions: Map<string, NodeDimensions>
): { nodes: LayoutNode[]; edges: Edge[]; width: number; height: number } => {
  const nodeDependencies = new Map<string, Set<string>>();
  const nodeReferencedBy = new Map<string, Set<string>>();

  componentNodes.forEach(node => {
    nodeDependencies.set(node.id, new Set());
    nodeReferencedBy.set(node.id, new Set());
  });

  componentEdges.forEach(edge => {
    nodeDependencies.get(edge.target)?.add(edge.source);
    nodeReferencedBy.get(edge.source)?.add(edge.target);
  });

  const levels = new Map<string, number>();
  
  const calculateLevels = () => {
    const sources: string[] = [];
    componentNodes.forEach(node => {
      if (nodeDependencies.get(node.id)?.size === 0) {
        sources.push(node.id);
      }
    });

    if (sources.length === 0) {
      componentNodes.forEach((node, index) => {
        levels.set(node.id, Math.floor(index / 3));
      });
      return;
    }

    const visited = new Set<string>();
    const queue = sources.map(id => ({ id, level: 0 }));
    
    while (queue.length > 0) {
      const current = queue.shift()!;
      
      if (visited.has(current.id)) continue;
      visited.add(current.id);
      
      const existingLevel = levels.get(current.id);
      if (existingLevel !== undefined) {
        levels.set(current.id, Math.min(existingLevel, current.level));
      } else {
        levels.set(current.id, current.level);
      }
      
      nodeReferencedBy.get(current.id)?.forEach(targetId => {
        if (!visited.has(targetId)) {
          queue.push({ id: targetId, level: current.level + 1 });
        }
      });
    }

    componentNodes.forEach(node => {
      if (!levels.has(node.id)) {
        const deps = nodeDependencies.get(node.id);
        if (deps && deps.size > 0) {
          const maxDepLevel = Math.max(...Array.from(deps).map(d => levels.get(d) || 0));
          levels.set(node.id, maxDepLevel + 1);
        } else {
          levels.set(node.id, 0);
        }
      }
    });
  };

  calculateLevels();

  const levelGroups = new Map<number, string[]>();
  levels.forEach((level, nodeId) => {
    if (!levelGroups.has(level)) {
      levelGroups.set(level, []);
    }
    levelGroups.get(level)!.push(nodeId);
  });

  const levelCount = Math.max(...Array.from(levelGroups.keys())) + 1;
  
  const layoutedNodes: LayoutNode[] = [];
  const nodePositions = new Map<string, { x: number; y: number }>();
  
  const assignPositionsToLevel = (level: number, nodeIds: string[]) => {
    const sortedNodes = [...nodeIds].sort((a, b) => {
      const aDeps = nodeDependencies.get(a)?.size || 0;
      const bDeps = nodeDependencies.get(b)?.size || 0;
      return aDeps - bDeps;
    });
    
    const levelWidth = sortedNodes.reduce((sum, nodeId) => {
      const dims = nodeDimensions.get(nodeId) || { width: 384, height: 400 };
      return sum + dims.width + HORIZONTAL_GAP;
    }, -HORIZONTAL_GAP);
    
    let currentX = 0;
    
    sortedNodes.forEach((nodeId, index) => {
      const node = componentNodes.find(n => n.id === nodeId);
      const dims = nodeDimensions.get(nodeId) || { width: 384, height: 400 };
      
      const position = { x: currentX, y: 0 };
      nodePositions.set(nodeId, position);
      
      if (node) {
        layoutedNodes.push({
          ...node,
          position,
          level,
          componentIndex,
          nodeWidth: dims.width,
          nodeHeight: dims.height,
        });
      }
      
      currentX += dims.width + HORIZONTAL_GAP;
    });
    
    return levelWidth;
  };
  
  let currentY = 0;
  let maxLevelWidth = 0;
  const levelHeights: number[] = [];
  
  const sortedLevels = Array.from(levelGroups.keys()).sort((a, b) => a - b);
  
  sortedLevels.forEach((level, levelIndex) => {
    const nodeIds = levelGroups.get(level)!;
    const levelWidth = assignPositionsToLevel(level, nodeIds);
    
    maxLevelWidth = Math.max(maxLevelWidth, levelWidth);
    
    const levelHeight = Math.max(...nodeIds.map(nodeId => {
      const dims = nodeDimensions.get(nodeId) || { width: 384, height: 400 };
      return dims.height;
    }));
    
    levelHeights.push(levelHeight);
    
    nodeIds.forEach(nodeId => {
      const position = nodePositions.get(nodeId)!;
      const centerOffset = (maxLevelWidth - levelWidth) / 2;
      position.x += centerOffset;
      position.y = currentY;
    });
    
    currentY += levelHeight + VERTICAL_GAP;
  });

  const totalHeight = currentY - VERTICAL_GAP;
  
  const centerAllNodes = (totalWidth: number) => {
    layoutedNodes.forEach(node => {
      const centerOffset = (totalWidth - maxLevelWidth) / 2;
      node.position.x += centerOffset;
    });
  };
  
  centerAllNodes(maxLevelWidth);

  return {
    nodes: layoutedNodes,
    edges: componentEdges,
    width: maxLevelWidth,
    height: totalHeight,
  };
};

const layoutComponentHorizontal = (
  componentNodes: Node[],
  componentEdges: Edge[],
  componentIndex: number,
  nodeDimensions: Map<string, NodeDimensions>
): { nodes: LayoutNode[]; edges: Edge[]; width: number; height: number } => {
  const nodeDependencies = new Map<string, Set<string>>();
  const nodeReferencedBy = new Map<string, Set<string>>();

  componentNodes.forEach(node => {
    nodeDependencies.set(node.id, new Set());
    nodeReferencedBy.set(node.id, new Set());
  });

  componentEdges.forEach(edge => {
    nodeDependencies.get(edge.target)?.add(edge.source);
    nodeReferencedBy.get(edge.source)?.add(edge.target);
  });

  const levels = new Map<string, number>();
  
  const calculateLevels = () => {
    const sources: string[] = [];
    componentNodes.forEach(node => {
      if (nodeDependencies.get(node.id)?.size === 0) {
        sources.push(node.id);
      }
    });

    if (sources.length === 0) {
      componentNodes.forEach((node, index) => {
        levels.set(node.id, Math.floor(index / 3));
      });
      return;
    }

    const visited = new Set<string>();
    const queue = sources.map(id => ({ id, level: 0 }));
    
    while (queue.length > 0) {
      const current = queue.shift()!;
      
      if (visited.has(current.id)) continue;
      visited.add(current.id);
      
      const existingLevel = levels.get(current.id);
      if (existingLevel !== undefined) {
        levels.set(current.id, Math.min(existingLevel, current.level));
      } else {
        levels.set(current.id, current.level);
      }
      
      nodeReferencedBy.get(current.id)?.forEach(targetId => {
        if (!visited.has(targetId)) {
          queue.push({ id: targetId, level: current.level + 1 });
        }
      });
    }

    componentNodes.forEach(node => {
      if (!levels.has(node.id)) {
        const deps = nodeDependencies.get(node.id);
        if (deps && deps.size > 0) {
          const maxDepLevel = Math.max(...Array.from(deps).map(d => levels.get(d) || 0));
          levels.set(node.id, maxDepLevel + 1);
        } else {
          levels.set(node.id, 0);
        }
      }
    });
  };

  calculateLevels();

  const levelGroups = new Map<number, string[]>();
  levels.forEach((level, nodeId) => {
    if (!levelGroups.has(level)) {
      levelGroups.set(level, []);
    }
    levelGroups.get(level)!.push(nodeId);
  });

  const layoutedNodes: LayoutNode[] = [];
  const nodePositions = new Map<string, { x: number; y: number }>();
  
  const assignPositionsToLevel = (level: number, nodeIds: string[]) => {
    const sortedNodes = [...nodeIds].sort((a, b) => {
      const aDeps = nodeDependencies.get(a)?.size || 0;
      const bDeps = nodeDependencies.get(b)?.size || 0;
      return aDeps - bDeps;
    });
    
    const levelHeight = sortedNodes.reduce((sum, nodeId) => {
      const dims = nodeDimensions.get(nodeId) || { width: 384, height: 400 };
      return sum + dims.height + VERTICAL_GAP;
    }, -VERTICAL_GAP);
    
    let currentY = 0;
    
    sortedNodes.forEach((nodeId, index) => {
      const node = componentNodes.find(n => n.id === nodeId);
      const dims = nodeDimensions.get(nodeId) || { width: 384, height: 400 };
      
      const position = { x: 0, y: currentY };
      nodePositions.set(nodeId, position);
      
      if (node) {
        layoutedNodes.push({
          ...node,
          position,
          level,
          componentIndex,
          nodeWidth: dims.width,
          nodeHeight: dims.height,
        });
      }
      
      currentY += dims.height + VERTICAL_GAP;
    });
    
    return levelHeight;
  };
  
  let currentX = 0;
  let maxLevelHeight = 0;
  const levelWidths: number[] = [];
  
  const sortedLevels = Array.from(levelGroups.keys()).sort((a, b) => a - b);
  
  sortedLevels.forEach((level, levelIndex) => {
    const nodeIds = levelGroups.get(level)!;
    const levelHeight = assignPositionsToLevel(level, nodeIds);
    
    maxLevelHeight = Math.max(maxLevelHeight, levelHeight);
    
    const levelWidth = Math.max(...nodeIds.map(nodeId => {
      const dims = nodeDimensions.get(nodeId) || { width: 384, height: 400 };
      return dims.width;
    }));
    
    levelWidths.push(levelWidth);
    
    nodeIds.forEach(nodeId => {
      const position = nodePositions.get(nodeId)!;
      const centerOffset = (maxLevelHeight - levelHeight) / 2;
      position.y += centerOffset;
      position.x = currentX;
    });
    
    currentX += levelWidth + HORIZONTAL_GAP;
  });

  const totalWidth = currentX - HORIZONTAL_GAP;
  
  const centerAllNodes = (totalHeight: number) => {
    layoutedNodes.forEach(node => {
      const centerOffset = (totalHeight - maxLevelHeight) / 2;
      node.position.y += centerOffset;
    });
  };
  
  centerAllNodes(maxLevelHeight);

  return {
    nodes: layoutedNodes,
    edges: componentEdges,
    width: totalWidth,
    height: maxLevelHeight,
  };
};

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const checkOverlap = (rect1: Rect, rect2: Rect, padding: number = 10): boolean => {
  return !(
    rect1.x + rect1.width + padding < rect2.x ||
    rect2.x + rect2.width + padding < rect1.x ||
    rect1.y + rect1.height + padding < rect2.y ||
    rect2.y + rect2.height + padding < rect1.y
  );
};

const resolveOverlaps = (nodes: LayoutNode[], nodeDimensions: Map<string, NodeDimensions>): LayoutNode[] => {
  const resolutionPasses = 3;
  const minSpacing = 20;
  
  for (let pass = 0; pass < resolutionPasses; pass++) {
    let hasOverlaps = false;
    
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const nodeA = nodes[i];
        const nodeB = nodes[j];
        
        const dimsA = nodeDimensions.get(nodeA.id) || { width: 384, height: 400 };
        const dimsB = nodeDimensions.get(nodeB.id) || { width: 384, height: 400 };
        
        const rectA: Rect = {
          x: nodeA.position.x,
          y: nodeA.position.y,
          width: dimsA.width,
          height: dimsA.height,
        };
        
        const rectB: Rect = {
          x: nodeB.position.x,
          y: nodeB.position.y,
          width: dimsB.width,
          height: dimsB.height,
        };
        
        if (checkOverlap(rectA, rectB, minSpacing)) {
          hasOverlaps = true;
          
          const overlapX = Math.max(0, Math.min(
            rectA.x + rectA.width - rectB.x,
            rectB.x + rectB.width - rectA.x
          ));
          
          const overlapY = Math.max(0, Math.min(
            rectA.y + rectA.height - rectB.y,
            rectB.y + rectB.height - rectA.y
          ));
          
          if (overlapX > 0 || overlapY > 0) {
            if (overlapY >= overlapX) {
              if (nodeA.position.y < nodeB.position.y) {
                nodeB.position.y = nodeA.position.y + rectA.height + minSpacing;
              } else {
                nodeA.position.y = nodeB.position.y + rectB.height + minSpacing;
              }
            } else {
              if (nodeA.position.x < nodeB.position.x) {
                nodeB.position.x = nodeA.position.x + rectA.width + minSpacing;
              } else {
                nodeA.position.x = nodeB.position.x + rectB.width + minSpacing;
              }
            }
          }
        }
      }
    }
    
    if (!hasOverlaps) break;
  }
  
  return nodes;
};

const optimizeEdgeRouting = (nodes: LayoutNode[], edges: Edge[]): Edge[] => {
  return edges.map(edge => {
    const sourceNode = nodes.find(n => n.id === edge.source);
    const targetNode = nodes.find(n => n.id === edge.target);
    
    if (!sourceNode || !targetNode) return edge;
    
    const sourceDims = { width: sourceNode.nodeWidth || 384, height: sourceNode.nodeHeight || 400 };
    const targetDims = { width: targetNode.nodeWidth || 384, height: targetNode.nodeHeight || 400 };
    
    const sourceY = sourceNode.position.y + sourceDims.height / 2;
    const targetY = targetNode.position.y + targetDims.height / 2;
    const sourceX = sourceNode.position.x + sourceDims.width / 2;
    const targetX = targetNode.position.x + targetDims.width / 2;
    
    const verticalDiff = Math.abs(targetY - sourceY);
    const horizontalDiff = Math.abs(targetX - sourceX);
    
    let edgeType = 'smoothstep';
    let pathType: 'straight' | 'vertical' | 'horizontal' | 'default' = 'default';
    
    if (verticalDiff > horizontalDiff * 2 && verticalDiff > 200) {
      pathType = 'straight';
    } else if (horizontalDiff > verticalDiff * 2 && horizontalDiff > 200) {
      pathType = 'horizontal';
    } else if (verticalDiff > 150) {
      pathType = 'vertical';
    }
    
    if (pathType !== 'default') {
      return {
        ...edge,
        type: pathType === 'straight' ? 'default' : pathType,
        style: {
          ...edge.style,
        },
      };
    }
    
    return edge;
  });
};

watch([() => props.materials, edges], () => {
  runLayout();
}, { deep: true });

onMounted(() => {
  if (props.materials.length > 0) {
    runLayout();
  }
});

const handleNodeSelect = (material: OssMaterial) => {
  emit('select', material);
};

const handleNodeEdit = (material: OssMaterial) => {
  emit('edit', material);
};

const handleNodeRegenerate = (material: OssMaterial) => {
  emit('regenerate', material);
};
</script>

<template>
  <div class="h-full w-full relative">
    <VueFlow :nodes="initialNodes" :edges="edges" :node-types="nodeTypes" :default-viewport="{ x: 0, y: 0, zoom: 0.8 }"
      :min-zoom="0.1" :max-zoom="2" :fit-view-on-init="false" class="vue-flow-canvas"
      @node-click="(nodeEvent: any) => handleNodeSelect(nodeEvent.node.data.material)">
      <Background :gap="24" :size="1.5" variant="dots" color="hsl(var(--border) / 0.6)" />

      <MiniMap position="bottom-left" :node-color="(node: any) => {
        const material = node.data?.material;
        if (!material) return 'hsl(var(--muted-foreground))';
        if (material.status === 'SUCCESS') return '#10b981';
        if (material.status === 'FAILED') return 'hsl(var(--destructive))';
        if (material.status === 'RUNNING') return 'hsl(var(--primary))';
        return 'hsl(var(--muted))';
      }" :mask-color="'hsl(var(--muted) / 0.7)'"
        class="!bg-card/95 !border-border !shadow-xl !rounded-xl backdrop-blur-sm" :pannable="true" :zoomable="true" />

      <!-- 空状态 - 优化版 -->
      <div v-if="materials.length === 0"
        class="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
        <div class="text-center p-8 rounded-2xl bg-card/80 backdrop-blur-sm border border-border shadow-xl">
          <div class="relative mb-6">
            <div
              class="w-24 h-24 mx-auto rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/20">
              <span class="text-5xl">🎨</span>
            </div>
            <div
              class="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-card border border-border flex items-center justify-center shadow-md">
              <span class="text-sm">➕</span>
            </div>
          </div>
          <div class="text-xl font-semibold text-foreground mb-2">画布为空</div>
          <div class="text-sm text-muted-foreground mb-4 max-w-xs">
            上传图片或视频素材，或通过 AI 生成内容，素材将自动显示在画布上
          </div>
          <div class="flex items-center justify-center gap-2 text-xs text-muted-foreground/70">
            <span class="i-lucide-info h-3 w-3"></span>
            <span>支持拖拽排序、查看依赖关系</span>
          </div>
        </div>
      </div>
    </VueFlow>
  </div>
</template>

<style>
@import '@vue-flow/core/dist/style.css';
@import '@vue-flow/core/dist/theme-default.css';

.vue-flow-canvas {
  background: linear-gradient(135deg, hsl(var(--muted) / 0.3) 0%, hsl(var(--background)) 50%, hsl(var(--accent) / 0.1) 100%);
}

.vue-flow__background {
  background: transparent !important;
}

.vue-flow__controls {
  background-color: hsl(var(--card) / 0.95);
  border-color: hsl(var(--border));
  box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
  border-radius: 0.75rem;
  overflow: hidden;
  backdrop-filter: blur(8px);
}

.vue-flow__controls-button {
  background-color: transparent;
  color: hsl(var(--foreground));
  border-color: hsl(var(--border));
  border-bottom: 1px solid hsl(var(--border) / 0.5);
  width: 36px;
  height: 36px;
  transition: all 0.2s ease;
}

.vue-flow__controls-button:last-child {
  border-bottom: none;
}

.vue-flow__controls-button:hover {
  background-color: hsl(var(--accent));
  color: hsl(var(--primary));
}

.vue-flow__controls-button svg {
  fill: currentColor;
}

.vue-flow__minimap {
  background-color: hsl(var(--card) / 0.95);
  border-color: hsl(var(--border));
  box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
  border-radius: 0.75rem;
  overflow: hidden;
  backdrop-filter: blur(8px);
}

.vue-flow__minimap-mask {
  fill: hsl(var(--muted) / 0.4);
}

.vue-flow__node {
  cursor: pointer;
  transition: filter 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.vue-flow__node:hover {
  filter: drop-shadow(0 10px 20px rgb(0 0 0 / 0.15));
}

.vue-flow__edge {
  transition: all 0.3s ease;
}

.vue-flow__edge-path {
  transition: all 0.3s ease;
}

.vue-flow__edge:hover .vue-flow__edge-path {
  stroke-width: 3.5 !important;
  filter: drop-shadow(0 2px 4px rgb(0 0 0 / 0.2));
}

.vue-flow__attribution {
  display: none;
}

.vue-flow__edge.animated .vue-flow__edge-path {
  stroke-dasharray: 5;
  animation: dashdraw 0.5s linear infinite;
}

@keyframes dashdraw {
  from {
    stroke-dashoffset: 10;
  }

  to {
    stroke-dashoffset: 0;
  }
}
</style>
