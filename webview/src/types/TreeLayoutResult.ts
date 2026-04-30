/**
 * 树形布局结果接口
 * 包含布局计算后的所有节点和链接信息
 */
import { TreeLayoutNode } from './TreeLayoutNode';
import { TreeLayoutLink } from './TreeLayoutLink';

export interface TreeLayoutResult {
    nodes: TreeLayoutNode[];
    links: TreeLayoutLink[];
    width: number;
    height: number;
}