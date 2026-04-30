/**
 * Webview 消息类型
 * 定义从 Extension Host 发送到 Webview 的消息
 */
import { MindmapDocument } from './MindmapDocument';

export type WebviewMessage =
    | { type: 'init'; document: MindmapDocument }
    | { type: 'documentUpdated'; document: MindmapDocument }
    | { type: 'undo' }
    | { type: 'redo' };