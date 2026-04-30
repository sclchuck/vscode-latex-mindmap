import { MindmapDocument, MindmapNode, MindmapNodeData, generateId } from './types';

export class TexMindDocument {
  private document: MindmapDocument;

  constructor(document?: MindmapDocument) {
    this.document = document || this.createDefaultDocument();
  }

  // 创建默认文档
  private createDefaultDocument(): MindmapDocument {
    const rootId = generateId();
    return {
      root: {
        data: {
          id: rootId,
          created: Date.now(),
          text: "New Mindmap",
          expandState: "expand"
        },
        children: []
      },
      template: "right",
      theme: "fresh-blue",
      version: "1.0.0"
    };
  }

  // 获取文档
  getDocument(): MindmapDocument {
    return this.document;
  }

  // 设置文档
  setDocument(document: MindmapDocument): void {
    this.document = document;
  }

  // 解析 JSON 内容
  static parse(content: string): TexMindDocument {
    console.log('[DATA] 源数据解析开始');
    console.log('[DATA] 原始内容长度:', content.length);
    console.log('[DATA] 内容预览:', content.substring(0, 200) + (content.length > 200 ? '...' : ''));
    
    try {
      const data = JSON.parse(content);
      // 支持 .km 格式转换
      if (data.root) {
        const nodeCount = TexMindDocument.countNodes(data.root);
        console.log('[DATA] 解析成功! 根节点ID:', data.root.data.id);
        console.log('[DATA] 根节点文本:', data.root.data.text);
        console.log('[DATA] 总节点数:', nodeCount);
        return new TexMindDocument(data);
      }
      console.warn('[DATA] 无效的文档格式');
      throw new Error('Invalid document format');
    } catch (error) {
      console.error('[DATA] 解析失败:', error);
      // 返回默认文档
      return new TexMindDocument();
    }
  }

  // 统计节点数量（用于日志）
  private static countNodes(node: MindmapNode): number {
    let count = 1;
    for (const child of node.children) {
      count += TexMindDocument.countNodes(child);
    }
    return count;
  }

  // 序列化文档
  serialize(): string {
    return JSON.stringify(this.document, null, 2);
  }

  // 查找节点
  findNode(nodeId: string): MindmapNode | null {
    return this.findNodeRecursive(this.document.root, nodeId);
  }

  private findNodeRecursive(node: MindmapNode, nodeId: string): MindmapNode | null {
    if (node.data.id === nodeId) {
      return node;
    }
    for (const child of node.children) {
      const found = this.findNodeRecursive(child, nodeId);
      if (found) {
        return found;
      }
    }
    return null;
  }

  // 查找父节点
  findParent(nodeId: string): MindmapNode | null {
    return this.findParentRecursive(this.document.root, nodeId);
  }

  private findParentRecursive(node: MindmapNode, nodeId: string): MindmapNode | null {
    for (const child of node.children) {
      if (child.data.id === nodeId) {
        return node;
      }
      const found = this.findParentRecursive(child, nodeId);
      if (found) {
        return found;
      }
    }
    return null;
  }

  // 添加子节点
  addChildNode(parentId: string, text: string = "New Node"): MindmapNode | null {
    const parent = this.findNode(parentId);
    if (!parent) {
      return null;
    }

    const newNode: MindmapNode = {
      data: {
        id: generateId(),
        created: Date.now(),
        text: text,
        expandState: "expand"
      },
      children: []
    };

    parent.children.push(newNode);
    return newNode;
  }

  // 添加兄弟节点
  addSiblingNode(nodeId: string, text: string = "New Node"): MindmapNode | null {
    const parent = this.findParent(nodeId);
    if (!parent) {
      return null;
    }

    const newNode: MindmapNode = {
      data: {
        id: generateId(),
        created: Date.now(),
        text: text,
        expandState: "expand"
      },
      children: []
    };

    parent.children.push(newNode);
    return newNode;
  }

  // 删除节点
  deleteNode(nodeId: string): boolean {
    const parent = this.findParent(nodeId);
    if (!parent) {
      // 不能删除根节点
      return false;
    }

    const index = parent.children.findIndex(child => child.data.id === nodeId);
    if (index !== -1) {
      parent.children.splice(index, 1);
      return true;
    }
    return false;
  }

  // 更新节点内容
  updateNode(nodeId: string, updates: Partial<MindmapNodeData>): boolean {
    const node = this.findNode(nodeId);
    if (!node) {
      return false;
    }

    Object.assign(node.data, updates);
    return true;
  }

  // 切换节点展开状态
  toggleExpand(nodeId: string): boolean {
    const node = this.findNode(nodeId);
    if (!node) {
      return false;
    }

    node.data.expandState = node.data.expandState === "expand" ? "collapse" : "expand";
    return true;
  }

  // 移动节点到新的父节点
  moveNode(nodeId: string, newParentId: string): boolean {
    const node = this.findNode(nodeId);
    const newParent = this.findNode(newParentId);
    const oldParent = this.findParent(nodeId);

    if (!node || !newParent || !oldParent || nodeId === newParentId) {
      return false;
    }

    // 检查是否是将节点移动到自己的子节点中（防止循环引用）
    if (this.isDescendant(newParentId, nodeId)) {
      return false;
    }

    // 从旧父节点移除
    const index = oldParent.children.findIndex(child => child.data.id === nodeId);
    if (index !== -1) {
      oldParent.children.splice(index, 1);
    }

    // 添加到新父节点
    newParent.children.push(node);
    node.data.expandState = "expand";
    
    return true;
  }

  // 检查 targetId 是否是 nodeId 的后代
  private isDescendant(nodeId: string, targetId: string): boolean {
    const node = this.findNode(nodeId);
    if (!node) {
      return false;
    }
    return this.findNodeRecursive(node, targetId) !== null;
  }

  // 获取所有节点 ID
  getAllNodeIds(): string[] {
    const ids: string[] = [];
    this.collectIdsRecursive(this.document.root, ids);
    return ids;
  }

  private collectIdsRecursive(node: MindmapNode, ids: string[]): void {
    ids.push(node.data.id);
    for (const child of node.children) {
      this.collectIdsRecursive(child, ids);
    }
  }

  // 统计节点数量
  getNodeCount(): number {
    let count = 0;
    this.countRecursive(this.document.root, { value: count });
    return count;
  }

  private countRecursive(node: MindmapNode, count: { value: number }): void {
    count.value++;
    for (const child of node.children) {
      this.countRecursive(child, count);
    }
  }
}
