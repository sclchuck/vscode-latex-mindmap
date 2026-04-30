// 节点数据类型
export interface MindmapNodeData {
  id: string;           // 唯一标识符（12位字母数字）
  created: number;      // 创建时间戳（毫秒）
  text: string;         // 节点文本内容（支持 LaTeX）
  layout?: string | null;  // 布局信息（可选）
  expandState?: "expand" | "collapse";  // 展开状态
}

// 完整节点结构
export interface MindmapNode {
  data: MindmapNodeData;
  children: MindmapNode[];
}

// 文档根结构
export interface MindmapDocument {
  root: MindmapNode;
  template: string;     // 布局模板："right" | "left" | "top" 等
  theme: string;        // 主题名称："fresh-blue" 等
  version: string;      // 数据格式版本
}

// LaTeX 渲染结果
export interface LatexRenderResult {
  html: string;
  errors: LatexRenderError[];
}

export interface LatexRenderError {
  message: string;
  position: number;
}

// 节点样式类型
export type NodeStyleType = "default" | "definition" | "theorem" | "proof" | "warning";

// 布局方向
export type LayoutDirection = "right" | "left" | "top";

// D3 Hierarchy 节点
export interface HierarchyPointNode {
  data: MindmapNode;
  x: number;
  y: number;
  parent: HierarchyPointNode | null;
  children?: HierarchyPointNode[];
  depth: number;
}

// Webview 消息类型
export type WebviewMessageType = 
  | { type: 'init'; document: MindmapDocument }
  | { type: 'update'; document: MindmapDocument }
  | { type: 'exportSvg' }
  | { type: 'exportJson' }
  | { type: 'save'; document: MindmapDocument };

// 创建默认文档
export function createDefaultDocument(): MindmapDocument {
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

// 生成唯一 ID
export function generateId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < 12; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}
