/**
 * 主机消息类型
 * 定义从 Webview 发送到 Extension Host 的消息
 */
import { MindmapDocument } from './MindmapDocument';
import { MindmapNodeData } from './MindmapNodeData';

export type HostMessage =
    | { type: 'addChild'; parentId: string; text: string }
    | { type: 'addSibling'; nodeId: string; text: string }
    | { type: 'deleteNode'; nodeId: string }
    | { type: 'updateNode'; nodeId: string; updates: Partial<MindmapNodeData> }
    | { type: 'toggleExpand'; nodeId: string }
    | { type: 'moveNode'; nodeId: string; newParentId: string }
    | { type: 'save'; document: MindmapDocument }
    | { type: 'exportSvg'; svgContent: string }
    | { type: 'exportJson'; document: MindmapDocument }
    | { type: 'undo' }
    | { type: 'redo' };