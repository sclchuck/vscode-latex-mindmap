import { create } from 'zustand';
import { MindmapDocument, MindmapNode, LayoutDirection, ThemeConfig, themes, defaultLayoutConfig } from '../types';
import { 
  MindmapOperationManager, 
  MindmapOpChangeContent, 
  MindmapOpSwitchFoldNode,
  MindmapOpAddNode,
  MindmapOpRemoveNode,
  MindmapOpMoveNode,
  MindmapOpBatchMove
} from './MindmapOperations';

// 放置预览状态
export interface DropPreview {
  targetParentId: string;
  insertIndex: number;
  isValid: boolean;
}

interface MindmapState {
  // 文档
  document: MindmapDocument | null;
  setDocument: (doc: MindmapDocument) => void;
  
  // 待保存标记
  isDirty: boolean;
  markDirty: () => void;
  markClean: () => void;
  
  // 操作管理器
  operationManager: MindmapOperationManager;
  canUndo: () => boolean;
  canRedo: () => boolean;
  undo: () => void;
  redo: () => void;
  
  // 选中节点
  selectedNodeIds: Set<string>;
  setSelectedNodeId: (id: string) => void;
  addNodeToSelection: (nodeId: string) => void;
  removeNodeFromSelection: (nodeId: string) => void;
  toggleNodeSelection: (nodeId: string) => void;
  selectNodes: (nodeIds: string[]) => void;
  clearAllSelection: () => void;
  isNodeSelected: (nodeId: string) => boolean;
  getSelectedNodeIds: () => string[];
  
  // 选择框
  selectionBox: { startX: number; startY: number; endX: number; endY: number } | null;
  setSelectionBox: (box: { startX: number; startY: number; endX: number; endY: number } | null) => void;
  
  // 放置预览
  dropPreview: DropPreview | null;
  setDropPreview: (preview: DropPreview | null) => void;
  
  // 编辑中的节点
  editingNodeId: string | null;
  setEditingNodeId: (id: string | null) => void;
  
  // 布局方向
  layoutDirection: LayoutDirection;
  setLayoutDirection: (direction: LayoutDirection) => void;
  
  // 主题
  currentTheme: ThemeConfig;
  setTheme: (themeName: string) => void;
  
  // 缩放级别
  zoom: number;
  setZoom: (zoom: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  
  // 平移偏移
  panOffset: { x: number; y: number };
  setPanOffset: (offset: { x: number; y: number }) => void;
  
  // 搜索
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  
  // 布局配置
  layoutConfig: typeof defaultLayoutConfig;
  setLayoutConfig: (config: Partial<typeof defaultLayoutConfig>) => void;
  
  // 工具函数
  findNode: (id: string) => MindmapNode | null;
  isRootNode: (id: string) => boolean;
  getNodeDepth: (id: string) => number;
  getParentNode: (nodeId: string) => { parent: MindmapNode; index: number } | null;
  getAllDescendantIds: (nodeId: string) => string[];
  
  // 操作相关
  changeNodeContent: (nodeId: string, oldText: string, newText: string) => void;
  switchNodeFold: (nodeId: string, oldState: 'expand' | 'collapse', newState: 'expand' | 'collapse') => void;
  addNode: (parentId: string, text: string, insertIndex?: number) => MindmapNode | null;
  removeNode: (nodeId: string) => boolean;
  moveNodes: (moves: Array<{ nodeId: string; newParentId: string; newIndex: number }>) => boolean;
  
  // 节点尺寸测量
  updateNodeDimensions: (nodeId: string, width: number, height: number) => void;
  batchUpdateNodeDimensions: (updates: Array<{ nodeId: string; width: number; height: number }>) => void;
  requestRelayout: () => void;
  getNodeDimensions: (nodeId: string) => { width: number; height: number } | undefined;
  
  // 重新布局计数器
  relayoutVersion: number;
  
  // 节点尺寸缓存（用于布局计算）
  nodeDimensions: Map<string, { width: number; height: number }>;
}

// 创建操作管理器实例
const operationManager = new MindmapOperationManager();

// 生成唯一 ID
function generateNodeId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).substr(2, 9)}`;
}

export const useMindmapStore = create<MindmapState>((set, get) => ({
  // 初始状态
  document: null,
  setDocument: (doc) => {
    // 加载新文档时清空操作栈，防止 undo 历史混乱
    operationManager.clear();
    set({ document: doc });
  },
  
  // 待保存标记
  isDirty: false,
  markDirty: () => set({ isDirty: true }),
  markClean: () => set({ isDirty: false }),
  
  // 操作管理器
  operationManager,
  canUndo: () => operationManager.canUndo(),
  canRedo: () => operationManager.canRedo(),
  undo: () => {
    const { document, relayoutVersion } = get();
    if (document && operationManager.canUndo()) {
      operationManager.undo(document);
      set({ 
        document: { ...document }, 
        isDirty: true,
        relayoutVersion: relayoutVersion + 1  // 强制重新布局
      });
      console.log(`[Store] 撤销完成`);
    }
  },
  redo: () => {
    const { document, relayoutVersion } = get();
    if (document && operationManager.canRedo()) {
      operationManager.redo(document);
      set({ 
        document: { ...document }, 
        isDirty: true,
        relayoutVersion: relayoutVersion + 1  // 强制重新布局
      });
      console.log(`[Store] 重做完成`);
    }
  },
  
  // 选中节点
  selectedNodeIds: new Set<string>(),
  setSelectedNodeId: (nodeId) => set({ selectedNodeIds: new Set([nodeId]) }),
  addNodeToSelection: (nodeId) => {
    const { selectedNodeIds } = get();
    const newSet = new Set(selectedNodeIds);
    newSet.add(nodeId);
    set({ selectedNodeIds: newSet });
  },
  removeNodeFromSelection: (nodeId) => {
    const { selectedNodeIds } = get();
    const newSet = new Set(selectedNodeIds);
    newSet.delete(nodeId);
    set({ selectedNodeIds: newSet });
  },
  toggleNodeSelection: (nodeId) => {
    const { selectedNodeIds, addNodeToSelection, removeNodeFromSelection } = get();
    if (selectedNodeIds.has(nodeId)) {
      removeNodeFromSelection(nodeId);
    } else {
      addNodeToSelection(nodeId);
    }
  },
  selectNodes: (nodeIds) => {
    set({ selectedNodeIds: new Set(nodeIds) });
  },
  clearAllSelection: () => {
    set({ selectedNodeIds: new Set<string>() });
  },
  isNodeSelected: (nodeId) => {
    return get().selectedNodeIds.has(nodeId);
  },
  getSelectedNodeIds: () => {
    return Array.from(get().selectedNodeIds);
  },
  
  // 选择框
  selectionBox: null,
  setSelectionBox: (box) => set({ selectionBox: box }),
  
  // 放置预览
  dropPreview: null,
  setDropPreview: (preview) => set({ dropPreview: preview }),
  
  editingNodeId: null,
  setEditingNodeId: (id) => set({ editingNodeId: id }),
  
  layoutDirection: 'right',
  setLayoutDirection: (direction) => set({ layoutDirection: direction }),
  
  currentTheme: themes['fresh-blue'],
  setTheme: (themeName) => {
    const theme = themes[themeName] || themes['fresh-blue'];
    set({ currentTheme: theme });
  },
  
  zoom: 1,
  setZoom: (zoom) => set({ zoom: Math.max(0.1, Math.min(3, zoom)) }),
  zoomIn: () => set((state) => ({ zoom: Math.min(3, state.zoom + 0.1) })),
  zoomOut: () => set((state) => ({ zoom: Math.max(0.1, state.zoom - 0.1) })),
  resetZoom: () => set({ zoom: 1 }),
  
  panOffset: { x: 0, y: 0 },
  setPanOffset: (offset) => set({ panOffset: offset }),
  
  searchQuery: '',
  setSearchQuery: (query) => set({ searchQuery: query }),
  
  layoutConfig: defaultLayoutConfig,
  setLayoutConfig: (config) => set((state) => ({
    layoutConfig: { ...state.layoutConfig, ...config }
  })),
  
  // 工具函数
  findNode: (id) => {
    const { document } = get();
    if (!document) return null;
    return findNodeRecursive(document.root, id);
  },
  
  isRootNode: (id) => {
    const { document } = get();
    return document?.root.data.id === id;
  },
  
  getNodeDepth: (_id) => {
    return 0;
  },
  
  // 查找父节点和索引
  getParentNode: (nodeId) => {
    const { document } = get();
    if (!document) return null;
    return findParentNode(document.root, nodeId);
  },
  
  // 获取所有后代节点 ID
  getAllDescendantIds: (nodeId) => {
    const { document } = get();
    if (!document) return [];
    const node = findNodeRecursive(document.root, nodeId);
    if (!node) return [];
    const descendants: string[] = [];
    collectDescendantIds(node, descendants);
    return descendants;
  },
  
  // 操作相关
  changeNodeContent: (nodeId, oldText, newText) => {
    console.log(`[Store] changeNodeContent: ${nodeId}`);
    const { document } = get();
    if (document) {
      const op = new MindmapOpChangeContent(nodeId, oldText, newText);
      operationManager.execute(document, op);
      set({ document: { ...document }, isDirty: true });
    }
  },
  
  switchNodeFold: (nodeId, oldState, newState) => {
    console.log(`[Store] switchNodeFold: ${nodeId}, ${oldState} -> ${newState}`);
    const { document, nodeDimensions, relayoutVersion } = get();
    if (!document) return;
  
    const op = new MindmapOpSwitchFoldNode(nodeId, oldState, newState);
    operationManager.execute(document, op);
  
    const visibleIds = collectVisibleNodeIds(document.root);
    const newDimensions = new Map<string, { width: number; height: number }>();
  
    nodeDimensions.forEach((size, id) => {
      if (visibleIds.has(id)) {
        newDimensions.set(id, size);
      }
    });
  
    console.log(`[Store] 清理尺寸缓存: ${nodeDimensions.size} -> ${newDimensions.size}`);
    console.log(`[Store] 可见节点数: ${visibleIds.size}`);
  
    set({ 
      document: { ...document }, 
      nodeDimensions: newDimensions,
      isDirty: true,
      relayoutVersion: relayoutVersion + 1  // 强制重新布局
    });
  
    // 展开时延迟触发二次布局，等待新节点测量完成
    if (newState === 'expand') {
      setTimeout(() => {
        const state = get();
        console.log(`[Store] 展开后二次布局，当前尺寸数: ${state.nodeDimensions.size}`);
        set({ relayoutVersion: state.relayoutVersion + 1 });
      }, 50);
    }
  },
  
  // 添加节点
  addNode: (parentId, text, insertIndex) => {
    console.log(`[Store] addNode: parent=${parentId}, text="${text}"`);
    const { document } = get();
    if (!document) return null;
    
    // 查找父节点
    const parent = findNodeRecursive(document.root, parentId);
    if (!parent) {
      console.log(`[Store] addNode: 父节点不存在 ${parentId}`);
      return null;
    }
    
    // 创建新节点数据
    const newNodeData = {
      id: generateNodeId(),
      created: Date.now(),
      text: text,
      expandState: 'expand' as const
    };
    
    // 创建操作并执行
    const op = new MindmapOpAddNode(parentId, newNodeData, insertIndex);
    operationManager.execute(document, op);
    
    // 创建完整的节点对象用于返回
    const newNode: MindmapNode = {
      data: newNodeData,
      children: []
    };
    
    set({ document: { ...document }, isDirty: true });
    console.log(`[Store] addNode: 成功创建节点 ${newNodeData.id}`);
    
    return newNode;
  },
  
  // 删除节点
  removeNode: (nodeId) => {
    console.log(`[Store] removeNode: ${nodeId}`);
    const { document } = get();
    if (!document) return false;
    
    // 不能删除根节点
    if (document.root.data.id === nodeId) {
      console.log(`[Store] removeNode: 不能删除根节点`);
      return false;
    }
    
    // 查找父节点和索引
    const parentInfo = findParentNode(document.root, nodeId);
    if (!parentInfo) {
      console.log(`[Store] removeNode: 找不到父节点 ${nodeId}`);
      return false;
    }
    
    // 创建操作并执行
    const op = new MindmapOpRemoveNode(
      nodeId,
      parentInfo.parent.data.id,
      parentInfo.parent.children[parentInfo.index],
      parentInfo.index
    );
    operationManager.execute(document, op);
    
    set({ document: { ...document }, isDirty: true });
    console.log(`[Store] removeNode: 成功删除节点 ${nodeId}`);
    
    return true;
  },
  
  // 批量移动节点 - 验证已由 DragDropService 完成，按文档顺序排序保持相对顺序
  moveNodes: (moves) => {
    console.log(`[Store] moveNodes: 移动 ${moves.length} 个节点`);
    const { document } = get();
    if (!document) return false;
    
    if (moves.length === 0) {
      console.log(`[Store] moveNodes: 没有需要移动的节点`);
      return false;
    }
    
    // 1. 按文档顺序排序（保持相对顺序）
    const sortedMoves = [...moves].sort((a, b) => {
      const orderA = getDocumentOrder(a.nodeId, document.root);
      const orderB = getDocumentOrder(b.nodeId, document.root);
      return orderA - orderB;
    });
    
    // 2. 准备移动信息（调整插入索引避免冲突）
    const moveInfos: Array<{
      nodeId: string;
      oldParentId: string;
      newParentId: string;
      oldIndex: number;
      newIndex: number;
    }> = [];
    
    for (let i = 0; i < sortedMoves.length; i++) {
      const move = sortedMoves[i];
      const oldParentInfo = findParentNode(document.root, move.nodeId);
      if (!oldParentInfo) continue;
      
      // 调整插入索引：后续节点需要考虑前面节点的插入位置
      // 如果在同一个父节点内向前移动，需要额外调整
      let adjustedIndex = move.newIndex;
      for (let j = 0; j < i; j++) {
        const prevMove = sortedMoves[j];
        // 如果前面的节点也移动到了同一个目标父节点
        if (prevMove.newParentId === move.newParentId) {
          adjustedIndex++;
        }
      }
      
      moveInfos.push({
        nodeId: move.nodeId,
        oldParentId: oldParentInfo.parent.data.id,
        newParentId: move.newParentId,
        oldIndex: oldParentInfo.index,
        newIndex: adjustedIndex,
      });
    }
    
    if (moveInfos.length === 0) {
      console.log(`[Store] moveNodes: 没有有效的移动`);
      return false;
    }
    
    // 3. 创建批量移动操作
    const op = new MindmapOpBatchMove(moveInfos);
    operationManager.execute(document, op);
    
    // 4. 深拷贝触发 React 重新渲染
    set({ 
      document: JSON.parse(JSON.stringify(document)),
      isDirty: true 
    });
    console.log(`[Store] moveNodes: 成功移动 ${moveInfos.length} 个节点`);
    
    return true;
  },
  
  // 节点尺寸测量
  relayoutVersion: 0,
  nodeDimensions: new Map(),
  
  updateNodeDimensions: (nodeId, width, height) => {
    const { nodeDimensions, relayoutVersion } = get();
    const existing = nodeDimensions.get(nodeId);

    // 只有尺寸真正变化（误差 >= 1）时才更新
    if (
      existing &&
      Math.abs(existing.width - width) < 1 &&
      Math.abs(existing.height - height) < 1
    ) {
      return;
    }

    const newDimensions = new Map(nodeDimensions);
    newDimensions.set(nodeId, { width, height });

    set({
      nodeDimensions: newDimensions,
      relayoutVersion: relayoutVersion + 1,
    });
    console.log(`[Store] 更新节点尺寸: ${nodeId} -> ${width}x${height}`);
  },
  
  requestRelayout: () => {
    set((state) => ({ relayoutVersion: state.relayoutVersion + 1 }));
    console.log(`[Store] 请求重新布局`);
  },
  
  getNodeDimensions: (nodeId) => {
    return get().nodeDimensions.get(nodeId);
  },
  
  // 批量更新尺寸（防止频繁重新布局）
  batchUpdateNodeDimensions: (updates: Array<{ nodeId: string; width: number; height: number }>) => {
    const { nodeDimensions, relayoutVersion } = get();
    const newDimensions = new Map(nodeDimensions);

    let hasChanges = false;
    updates.forEach(({ nodeId, width, height }) => {
      const existing = newDimensions.get(nodeId);
      // 只有尺寸真正变化（误差 >= 1）时才更新
      if (
        !existing ||
        Math.abs(existing.width - width) >= 1 ||
        Math.abs(existing.height - height) >= 1
      ) {
        newDimensions.set(nodeId, { width, height });
        hasChanges = true;
      }
    });

    if (hasChanges) {
      set({
        nodeDimensions: newDimensions,
        relayoutVersion: relayoutVersion + 1,
      });
      console.log(`[Store] 批量更新尺寸: ${updates.length} 个节点`);
    }
  },
}));

// 递归查找节点
function findNodeRecursive(node: MindmapNode, id: string): MindmapNode | null {
  if (node.data.id === id) {
    return node;
  }
  for (const child of node.children) {
    const found = findNodeRecursive(child, id);
    if (found) {
      return found;
    }
  }
  return null;
}

// 查找父节点
function findParentNode(node: MindmapNode, childId: string): { parent: MindmapNode; index: number } | null {
  for (let i = 0; i < node.children.length; i++) {
    const child = node.children[i];
    if (child.data.id === childId) {
      return { parent: node, index: i };
    }
    const found = findParentNode(child, childId);
    if (found) {
      return found;
    }
  }
  return null;
}

// 收集所有后代节点 ID
function collectDescendantIds(node: MindmapNode, result: string[]): void {
  for (const child of node.children) {
    result.push(child.data.id);
    collectDescendantIds(child, result);
  }
}

// 检查节点是否是某个节点的后代
function isDescendant(node: MindmapNode, descendantId: string): boolean {
  if (node.data.id === descendantId) {
    return true;
  }
  for (const child of node.children) {
    if (isDescendant(child, descendantId)) {
      return true;
    }
  }
  return false;
}

// 检查 nodeA 是否是 nodeB 的祖先
function isAncestor(nodeA: MindmapNode, nodeB: MindmapNode): boolean {
  if (nodeA.data.id === nodeB.data.id) return false;
  return isDescendant(nodeA, nodeB.data.id);
}

// 获取节点在文档树中的深度优先遍历顺序
function getDocumentOrder(nodeId: string, root: MindmapNode): number {
  let order = 0;

  function traverse(node: MindmapNode): boolean {
    if (node.data.id === nodeId) return true;
    order++;
    for (const child of node.children) {
      if (traverse(child)) return true;
    }
    return false;
  }

  traverse(root);
  return order;
}

/**
 * 收集可见节点 ID（递归）
 * 如果节点折叠，不遍历其子节点
 */
function collectVisibleNodeIds(node: MindmapNode, result: Set<string> = new Set()): Set<string> {
  result.add(node.data.id);
  
  // 如果节点折叠，不遍历子节点
  if (node.data.expandState === 'collapse') {
    return result;
  }
  
  node.children.forEach(child => collectVisibleNodeIds(child, result));
  return result;
}
