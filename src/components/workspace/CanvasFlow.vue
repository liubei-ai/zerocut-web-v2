<script setup lang="ts">
import { computed, watch, onMounted, ref } from 'vue';
import { VueFlow, useVueFlow, MarkerType, type Node, type Edge } from '@vue-flow/core';
import { Background } from '@vue-flow/background';
import { Controls } from '@vue-flow/controls';
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

const nodeTypes = {
  material: MaterialNode,
};

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

const initialNodes = computed<Node[]>(() => {
  return props.materials.map(material => ({
    id: getNodeId(material),
    type: 'material',
    position: { x: 0, y: 0 },
    data: {
      material,
      isSelected: props.selectedMaterialId === getNodeId(material),
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
          
          // 根据参考类型设置不同的连线样式
          const isVideoRef = material.inputParams?.videos?.some(v => v.url === ref.url);
          const edgeColor = isVideoRef ? 'hsl(var(--primary) / 0.5)' : 'hsl(142, 76%, 36% / 0.5)';
          const edgeLabel = isVideoRef ? '📹 参考视频' : '🖼️ 参考图片';
          
          edgeList.push({
            id: edgeKey,
            source: sourceId,
            target: targetId,
            type: 'smoothstep',
            animated: true,
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

  // 分析素材依赖关系，构建层级结构
  const { nodes: layoutedNodes } = calculateGridLayout(
    initialNodes.value,
    edges.value
  );

  setFlowNodes(layoutedNodes);
  setFlowEdges(edges.value);
  
  isLayouted.value = true;

  setTimeout(() => {
    fitView({ padding: 0.1, duration: 400 });
  }, 50);
};

interface LayoutNode extends Node {
  level?: number;
  groupIndex?: number;
}

const calculateGridLayout = (nodes: Node[], edgeList: Edge[]) => {
  const nodeWidth = 280;
  const nodeHeight = 340;
  const horizontalGap = 60;
  const verticalGap = 80;
  const padding = 100;
  
  // 构建依赖图，找出每个节点的引用者和被引用者
  const nodeDependencies = new Map<string, Set<string>>();
  const nodeReferencedBy = new Map<string, Set<string>>();
  
  nodes.forEach(node => {
    nodeDependencies.set(node.id, new Set());
    nodeReferencedBy.set(node.id, new Set());
  });
  
  edgeList.forEach(edge => {
    nodeDependencies.get(edge.target)?.add(edge.source);
    nodeReferencedBy.get(edge.source)?.add(edge.target);
  });
  
  // BFS计算层级（从源节点开始）
  const levels = new Map<string, number>();
  const visited = new Set<string>();
  
  const assignLevels = () => {
    // 找出所有没有依赖的节点（源节点）作为第0层
    const sources: string[] = [];
    nodes.forEach(node => {
      if (nodeDependencies.get(node.id)?.size === 0) {
        sources.push(node.id);
      }
    });
    
    // 如果所有节点都有依赖，则使用时间顺序
    if (sources.length === 0) {
      nodes.forEach((node, index) => {
        if (!visited.has(node.id)) {
          levels.set(node.id, Math.floor(index / 4));
          visited.add(node.id);
        }
      });
      return;
    }
    
    // BFS分配层级
    const queue = sources.map(id => ({ id, level: 0 }));
    while (queue.length > 0) {
      const { id, level } = queue.shift()!;
      
      if (visited.has(id)) {
        // 如果已经访问过，取最小层级
        if (levels.get(id)! > level) {
          levels.set(id, level);
        }
      } else {
        levels.set(id, level);
        visited.add(id);
      }
      
      // 将被引用者加入队列，层级+1
      nodeReferencedBy.get(id)?.forEach(targetId => {
        if (!visited.has(targetId)) {
          queue.push({ id: targetId, level: level + 1 });
        }
      });
    }
    
    // 处理未被访问的节点（形成闭环或有依赖关系）
    nodes.forEach(node => {
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
  
  assignLevels();
  
  // 按层级分组节点
  const levelGroups = new Map<number, string[]>();
  levels.forEach((level, nodeId) => {
    if (!levelGroups.has(level)) {
      levelGroups.set(level, []);
    }
    levelGroups.get(level)!.push(nodeId);
  });
  
  // 计算画布宽度（基于最大层级的节点数）
  const maxNodesInLevel = Math.max(...Array.from(levelGroups.values()).map(group => group.length));
  const canvasWidth = maxNodesInLevel * (nodeWidth + horizontalGap) + padding * 2;
  
  // 为每个层级计算节点位置
  const layoutedNodes: LayoutNode[] = [];
  
  levelGroups.forEach((nodeIds, level) => {
    const levelWidth = nodeIds.length * (nodeWidth + horizontalGap) - horizontalGap;
    const startX = (canvasWidth - levelWidth) / 2;
    
    nodeIds.forEach((nodeId, indexInLevel) => {
      const node = nodes.find(n => n.id === nodeId);
      if (node) {
        const x = startX + indexInLevel * (nodeWidth + horizontalGap);
        const y = padding + level * (nodeHeight + verticalGap);
        
        layoutedNodes.push({
          ...node,
          position: { x, y },
          level: level,
          groupIndex: indexInLevel,
        });
      }
    });
  });
  
  return { nodes: layoutedNodes, canvasWidth };
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
    <VueFlow
      :nodes="initialNodes"
      :edges="edges"
      :node-types="nodeTypes"
      :default-viewport="{ x: 0, y: 0, zoom: 0.8 }"
      :min-zoom="0.1"
      :max-zoom="2"
      :fit-view-on-init="false"
      class="vue-flow-canvas"
      @node-click="(nodeEvent: any) => handleNodeSelect(nodeEvent.node.data.material)"
    >
      <Background :gap="24" :size="1.5" variant="dots" color="hsl(var(--border) / 0.6)" />
      
      <Controls 
        position="bottom-right"
        class="!bg-card/95 !border-border !shadow-xl !rounded-xl overflow-hidden backdrop-blur-sm"
        :show-fit-view="true"
        :show-interactive="true"
      />
      
      <MiniMap
        position="bottom-left"
        :node-color="(node: any) => {
          const material = node.data?.material;
          if (!material) return 'hsl(var(--muted-foreground))';
          if (material.status === 'SUCCESS') return '#10b981';
          if (material.status === 'FAILED') return 'hsl(var(--destructive))';
          if (material.status === 'RUNNING') return 'hsl(var(--primary))';
          return 'hsl(var(--muted))';
        }"
        :mask-color="'hsl(var(--muted) / 0.7)'"
        class="!bg-card/95 !border-border !shadow-xl !rounded-xl backdrop-blur-sm"
        :pannable="true"
        :zoomable="true"
      />

      <!-- 空状态 - 优化版 -->
      <div v-if="materials.length === 0" class="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
        <div class="text-center p-8 rounded-2xl bg-card/80 backdrop-blur-sm border border-border shadow-xl">
          <div class="relative mb-6">
            <div class="w-24 h-24 mx-auto rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/20">
              <span class="text-5xl">🎨</span>
            </div>
            <div class="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-card border border-border flex items-center justify-center shadow-md">
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
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
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
