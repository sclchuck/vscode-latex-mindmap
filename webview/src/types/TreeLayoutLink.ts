/**
 * 树形布局链接接口
 * 表示节点之间的连接关系
 */
import { TreeLayoutNode } from './TreeLayoutNode';

export interface TreeLayoutLink<T = any> {
    source: TreeLayoutNode<T>;
    target: TreeLayoutNode<T>;
}