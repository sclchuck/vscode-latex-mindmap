/**
 * 树形布局节点接口
 * 表示 D3 布局计算后的节点位置信息
 */
import { MindmapNode } from './MindmapNode';

export interface TreeLayoutNode<T = MindmapNode> {
    data: T;
    x: number;
    y: number;
    parent: TreeLayoutNode<T> | null;
    children?: TreeLayoutNode<T>[];
    depth: number;
    /** 原始节点是否有子节点（用于显示折叠按钮） */
    hasChildren: boolean;
    /** 节点宽度 */
    width: number;
    /** 节点高度 */
    height: number;
}
