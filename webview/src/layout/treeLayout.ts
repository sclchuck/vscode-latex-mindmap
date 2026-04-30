/**
 * 树形布局模块
 * 提供类型安全的树形布局计算接口
 */

import { MindmapNode, LayoutDirection, LayoutConfig, TreeLayoutNode } from '../types';
import {
  D3TreeLayoutCalculator,
  LayoutCoordinateAdjuster,
  LinkPathGenerator,
  TreeLayoutManager
} from './D3TreeWrapper';

/**
 * 布局结果接口
 */
export interface LayoutResult {
  nodes: TreeLayoutNode[];
  width: number;
  height: number;
}

/**
 * 节点尺寸映射类型
 */
export type NodeDimensions = Map<string, { width: number; height: number }>;

// 创建布局管理器的工厂函数
function createLayoutManager(config: LayoutConfig, nodeDimensions?: NodeDimensions): TreeLayoutManager {
  console.log('[LAYOUT] 创建布局管理器，尺寸数据:', nodeDimensions?.size ?? 0, '个节点');
  return new TreeLayoutManager(config, nodeDimensions);
}

/**
 * 计算树形布局
 * @param root - 树的根节点
 * @param config - 布局配置
 * @param nodeDimensions - 可选：节点尺寸映射，用于使用真实尺寸进行布局计算
 */
export function calculateTreeLayout(
  root: MindmapNode,
  config: LayoutConfig,
  nodeDimensions?: NodeDimensions
): LayoutResult {
  console.log('[LAYOUT] ====== 开始计算树形布局 ======');
  console.log('[LAYOUT] 根节点:', root.data.id, '-', root.data.text);
  console.log('[LAYOUT] 布局方向:', config.direction);
  console.log('[LAYOUT] 节点尺寸数量:', nodeDimensions?.size ?? 0);

  const manager = createLayoutManager(config, nodeDimensions);
  const result = manager.calculateLayout(root);

  console.log('[LAYOUT] 坐标调整完成，节点数量:', result.nodes.length);
  result.nodes.forEach((node, index) => {
    console.log(`[LAYOUT] 节点${index}: id=${node.data.data.id}, x=${node.x?.toFixed(0)}, y=${node.y?.toFixed(0)}, depth=${node.depth}`);
  });
  console.log('[LAYOUT] 画布尺寸:', result.width, 'x', result.height);
  console.log('[LAYOUT] ====== 布局计算完成 ======');

  return {
    nodes: result.nodes,
    width: result.width,
    height: result.height,
  };
}

/**
 * 获取节点连接线的 SVG 路径
 * 传入源节点和目标节点的真实 width/height，避免对可变尺寸节点使用错误的默认值。
 */
export function getLinkPath(
  source: TreeLayoutNode,
  target: TreeLayoutNode,
  direction: LayoutDirection,
  _config?: LayoutConfig  // 保留签名兼容性，但不再需要
): string {
  const pathGenerator = new LinkPathGenerator(direction);
  return pathGenerator.generateFromNodes(
    { x: source.x, y: source.y, width: source.width, height: source.height },
    { x: target.x, y: target.y, width: target.width, height: target.height }
  );
}

/**
 * 创建布局计算器
 */
export function createLayoutCalculator(
  config: LayoutConfig,
  nodeDimensions?: NodeDimensions
): D3TreeLayoutCalculator {
  return new D3TreeLayoutCalculator(config, nodeDimensions);
}

/**
 * 创建坐标调整器
 *
 * FIX 6: 补上必要的 config 参数（原来的签名丢失了它）
 */
export function createCoordinateAdjuster(
  direction: LayoutDirection,
  config: LayoutConfig,
  marginX = 100,
  marginY = 100
): LayoutCoordinateAdjuster {
  return new LayoutCoordinateAdjuster(direction, config, marginX, marginY);
}

/**
 * 创建路径生成器
 */
export function createPathGenerator(
  direction: LayoutDirection,
  _nodeWidth?: number,  // 废弃参数，保留兼容性
  _nodeHeight?: number,
): LinkPathGenerator {
  return new LinkPathGenerator(direction);
}
