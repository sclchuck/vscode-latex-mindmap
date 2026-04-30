/**
 * Type-safe D3 Flextree layout wrapper.
 * Uses d3-flextree for variable-size node support.
 *
 * Flextree semantics:
 * - node.x: sibling axis position (top-left corner)
 * - node.y: depth axis position (top-left corner)
 * - nodeSize(node) returns [siblingAxisSize, depthAxisSize]
 *
 * Direction mapping (mapDirection):
 * - right:  screenX = depthCenter,   screenY = siblingCenter
 * - left:   screenX = -depthCenter,  screenY = siblingCenter
 * - bottom: screenX = siblingCenter, screenY = depthCenter
 * - top:    screenX = siblingCenter, screenY = -depthCenter
 */

import { hierarchy, HierarchyNode } from "d3-hierarchy";
import { flextree, FlexTreeLayout } from "d3-flextree";
import {
    MindmapNode,
    LayoutDirection,
    LayoutConfig,
    TreeLayoutNode,
    TreeLayoutResult,
    TreeLayoutLink,
} from "../types";

// 节点尺寸类型
type NodeSize = {
    width: number;
    height: number;
};

// 简单的断言函数
function assert(condition: boolean, message: string): void {
    if (!condition) {
        throw new Error(message);
    }
}

// 验证布局方向
function validateLayoutDirection(direction: LayoutDirection): void {
    const validDirections: LayoutDirection[] = ["right", "left", "top", "bottom"];
    if (!validDirections.includes(direction)) {
        throw new Error(`direction must be one of: ${validDirections.join(", ")}`);
    }
}

// 验证布局配置
function validateLayoutConfig(config: LayoutConfig): void {
    assert(
        typeof config.nodeWidth === "number" && config.nodeWidth > 0,
        "config.nodeWidth must be a positive number",
    );
    assert(
        typeof config.nodeHeight === "number" && config.nodeHeight > 0,
        "config.nodeHeight must be a positive number",
    );
    assert(
        typeof config.horizontalSpacing === "number" &&
        config.horizontalSpacing >= 0,
        "config.horizontalSpacing must be a non-negative number",
    );
    assert(
        typeof config.verticalSpacing === "number" && config.verticalSpacing >= 0,
        "config.verticalSpacing must be a non-negative number",
    );
    validateLayoutDirection(config.direction);
}

// 验证 MindmapNode
function validateMindmapNode(node: unknown, fieldName = "root"): void {
    assert(
        node !== null && typeof node === "object",
        `${fieldName} must be an object`,
    );
    const obj = node as Record<string, unknown>;
    assert(
        Boolean(obj.data) && typeof obj.data === "object",
        `${fieldName}.data must be an object`,
    );
    const data = obj.data as Record<string, unknown>;
    assert(
        typeof data.id === "string" && (data.id as string).length > 0,
        `${fieldName}.data.id must be a non-empty string`,
    );
    assert(Array.isArray(obj.children), `${fieldName}.children must be an array`);
    (obj.children as unknown[]).forEach((child: unknown, index: number) => {
        validateMindmapNode(child, `${fieldName}.children[${index}]`);
    });
}

/**
 * 获取有效的尺寸值
 */
function getValidSizeValue(value: unknown, fallback: number): number {
    return typeof value === "number" && Number.isFinite(value) && value > 0
        ? value
        : fallback;
}

/**
 * 获取节点尺寸
 * 优先顺序：
 * 1. 传入的 nodeDimensions Map 中的尺寸
 * 2. 节点上存储的真实尺寸 (measuredWidth/measuredHeight)
 * 3. 节点上存储的 width/height
 * 4. 配置中的默认值
 */
function getNodeSize(
    node: MindmapNode,
    config: LayoutConfig,
    nodeDimensions?: Map<string, { width: number; height: number }>
): NodeSize {
    const nodeId = node.data.id;
    const data = node.data as unknown as {
        width?: number;
        height?: number;
        measuredWidth?: number;
        measuredHeight?: number;
    };

    // 1. 优先使用传入的尺寸映射
    if (nodeDimensions?.has(nodeId)) {
        const dims = nodeDimensions.get(nodeId)!;
        return {
            width: getValidSizeValue(dims.width, config.nodeWidth),
            height: getValidSizeValue(dims.height, config.nodeHeight),
        };
    }

    // 2. 使用节点上存储的尺寸
    return {
        width: getValidSizeValue(
            data.measuredWidth ?? data.width,
            config.nodeWidth,
        ),
        height: getValidSizeValue(
            data.measuredHeight ?? data.height,
            config.nodeHeight,
        ),
    };
}

/**
 * 计算节点包围盒
 */
function getLayoutNodeSize(
    node: TreeLayoutNode,
    config: LayoutConfig,
): NodeSize {
    return {
        width: typeof node.width === "number" ? node.width : config.nodeWidth,
        height: typeof node.height === "number" ? node.height : config.nodeHeight,
    };
}

/**
 * 计算布局包围盒
 */
function calculateBounds(
    nodes: TreeLayoutNode[],
    config: LayoutConfig,
    padding = 100,
): { width: number; height: number } {
    if (nodes.length === 0) {
        return { width: 800, height: 600 };
    }

    const minX = Math.min(...nodes.map((n) => n.x));
    const minY = Math.min(...nodes.map((n) => n.y));

    const maxX = Math.max(
        ...nodes.map((n) => {
            const size = getLayoutNodeSize(n, config);
            return n.x + size.width;
        }),
    );

    const maxY = Math.max(
        ...nodes.map((n) => {
            const size = getLayoutNodeSize(n, config);
            return n.y + size.height;
        }),
    );

    return {
        width: Math.max(maxX - minX + padding, 800),
        height: Math.max(maxY - minY + padding, 600),
    };
}

/**
 * 创建可见的树结构（过滤掉折叠节点的子节点）
 */
function createVisibleTree(node: MindmapNode): MindmapNode {
    if (node.data.expandState === "collapse") {
        return {
            data: node.data,
            children: [],
        };
    }

    return {
        data: node.data,
        children: node.children.map((child: MindmapNode) => createVisibleTree(child)),
    };
}

/**
 * D3 Flextree 布局计算器
 * 使用 d3-flextree 支持可变节点大小
 */
export class D3TreeLayoutCalculator {
    private config: LayoutConfig;
    private nodeDimensions?: Map<string, { width: number; height: number }>;

    constructor(config: LayoutConfig, nodeDimensions?: Map<string, { width: number; height: number }>) {
        validateLayoutConfig(config);
        this.config = config;
        this.nodeDimensions = nodeDimensions;
    }

    private getNodeSize(node: MindmapNode): NodeSize {
        return getNodeSize(node, this.config, this.nodeDimensions);
    }

    /**
     * 获取 sibling axis 的尺寸
     * right/left: sibling axis 是屏幕垂直方向，使用节点高度
     * top/bottom: sibling axis 是屏幕水平方向，使用节点宽度
     */
    private getSiblingAxisSize(size: NodeSize): number {
        return this.config.direction === "right" || this.config.direction === "left"
            ? size.height
            : size.width;
    }

    /**
     * 获取 depth axis 的尺寸
     * right/left: depth axis 是屏幕水平方向，使用节点宽度
     * top/bottom: depth axis 是屏幕垂直方向，使用节点高度
     */
    private getDepthAxisSize(size: NodeSize): number {
        return this.config.direction === "right" || this.config.direction === "left"
            ? size.width
            : size.height;
    }

    /**
     * 获取 sibling axis 的间距
     */
    private getSiblingSpacing(): number {
        return this.config.direction === "right" || this.config.direction === "left"
            ? this.config.verticalSpacing
            : this.config.horizontalSpacing;
    }

    /**
     * 获取 depth axis 的间距
     */
    private getDepthSpacing(): number {
        return this.config.direction === "right" || this.config.direction === "left"
            ? this.config.horizontalSpacing
            : this.config.verticalSpacing;
    }

    /**
     * 创建 Flextree 布局
     */
    private createFlexLayout(_visibleRoot: MindmapNode): FlexTreeLayout<MindmapNode> {
        const self = this;

        return flextree<MindmapNode>({
            /**
             * 返回 [siblingAxisSize, depthAxisSize]
             * depthAxisSize 包含节点尺寸 + depth 间距
             */
            nodeSize: (node: HierarchyNode<MindmapNode>) => {
                const size = self.getNodeSize(node.data);
                const siblingSize = self.getSiblingAxisSize(size);
                const depthSize = self.getDepthAxisSize(size);
                return [siblingSize, depthSize + self.getDepthSpacing()];
            },
            /**
             * sibling 间距
             */
            spacing: (a: HierarchyNode<MindmapNode>, b: HierarchyNode<MindmapNode>) => {
                return a.parent === b.parent
                    ? self.getSiblingSpacing()
                    : self.getSiblingSpacing() * 1.5;
            },
        });
    }

    private buildOriginalNodeMap(
        node: MindmapNode,
        map = new Map<string, MindmapNode>(),
    ): Map<string, MindmapNode> {
        map.set(node.data.id, node);
        node.children.forEach((child) => this.buildOriginalNodeMap(child, map));
        return map;
    }

    public calculate(root: MindmapNode): TreeLayoutResult {
        validateMindmapNode(root);

        const originalNodeById = this.buildOriginalNodeMap(root);
        const visibleRoot = createVisibleTree(root);

        const hierarchyData = hierarchy<MindmapNode>(
            visibleRoot,
            (node) => node.children,
        );

        const layout = this.createFlexLayout(visibleRoot);
        const laidOutRoot = layout(hierarchyData);
        const layoutNodes = laidOutRoot.descendants();

        assert(layoutNodes.length > 0, "layout result must contain at least one node");

        /**
         * 计算中心点：
         * - node.x 是 sibling axis 上的左上角偏移
         * - node.y 是 depth axis 上的左上角偏移
         * - 中心点 = (node.x + siblingAxisSize/2, node.y + depthAxisSize/2)
         */
        const nodes: TreeLayoutNode[] = layoutNodes.map((node) => {
            const id = node.data.data.id;
            const originalNode = originalNodeById.get(id);
            const size = this.getNodeSize(node.data);
            const siblingSize = this.getSiblingAxisSize(size);
            const depthSize = this.getDepthAxisSize(size);

            const hasChildren =
                originalNode !== undefined && originalNode.children.length > 0;

            return {
                data: node.data,
                x: node.x + siblingSize / 2,
                y: node.y + depthSize / 2,
                parent: null,
                depth: node.depth,
                hasChildren,
                width: size.width,
                height: size.height,
            };
        });

        const nodesById = new Map<string, TreeLayoutNode>();
        layoutNodes.forEach((node, index) => {
            const id = node.data.data.id;
            nodesById.set(id, nodes[index]);

            if (node.parent) {
                const parent = nodesById.get(node.parent.data.data.id);
                if (parent) {
                    nodes[index].parent = parent;
                }
            }
        });

        const links: TreeLayoutLink[] = laidOutRoot.links().map((link) => {
            const source = nodesById.get(link.source.data.data.id);
            const target = nodesById.get(link.target.data.data.id);

            assert(source !== undefined, `missing source node: ${link.source.data.data.id}`);
            assert(target !== undefined, `missing target node: ${link.target.data.data.id}`);

            return { source, target } as TreeLayoutLink;
        });

        return {
            nodes,
            links,
            width: this.calculateWidth(nodes),
            height: this.calculateHeight(nodes),
        };
    }

    private calculateWidth(nodes: TreeLayoutNode[]): number {
        return calculateBounds(nodes, this.config).width;
    }

    private calculateHeight(nodes: TreeLayoutNode[]): number {
        return calculateBounds(nodes, this.config).height;
    }
}

/**
 * 坐标调整器
 *
 * 输入：(siblingCenter, depthCenter) — flextree 坐标系中的节点中心
 * 输出：屏幕左上角坐标，原点归一化到 (marginX, marginY)
 */
export class LayoutCoordinateAdjuster {
    private direction: LayoutDirection;
    private marginX: number;
    private marginY: number;
    private config: LayoutConfig;
    private nodeDimensions?: Map<string, { width: number; height: number }>;

    constructor(
        direction: LayoutDirection,
        config: LayoutConfig,
        marginX = 100,
        marginY = 100,
        nodeDimensions?: Map<string, { width: number; height: number }>
    ) {
        validateLayoutDirection(direction);
        this.direction = direction;
        this.config = config;
        this.marginX = marginX;
        this.marginY = marginY;
        this.nodeDimensions = nodeDimensions;
    }

    public adjust<T extends { x: number; y: number; data?: MindmapNode; width?: number; height?: number }>(
        nodes: T[],
    ): T[] {
        if (nodes.length === 0) return nodes;

        const mappedNodes = nodes.map((node) => {
            const screenCenter = this.mapDirection(node.x, node.y);

            const size = node.data
                ? getNodeSize(node.data, this.config, this.nodeDimensions)
                : {
                    width: node.width ?? this.config.nodeWidth,
                    height: node.height ?? this.config.nodeHeight,
                };

            return {
                ...node,
                x: screenCenter.x - size.width / 2,
                y: screenCenter.y - size.height / 2,
                width: size.width,
                height: size.height,
            };
        });

        const minX = Math.min(...mappedNodes.map((n) => n.x));
        const minY = Math.min(...mappedNodes.map((n) => n.y));

        return mappedNodes.map((node) => ({
            ...node,
            x: node.x - minX + this.marginX,
            y: node.y - minY + this.marginY,
        }));
    }

    /**
     * 将 flextree 坐标 (siblingCenter, depthCenter) 映射为屏幕中心坐标
     */
    private mapDirection(siblingCenter: number, depthCenter: number): { x: number; y: number } {
        switch (this.direction) {
            case "right":
                return { x: depthCenter, y: siblingCenter };
            case "left":
                return { x: -depthCenter, y: siblingCenter };
            case "bottom":
                return { x: siblingCenter, y: depthCenter };
            case "top":
                return { x: siblingCenter, y: -depthCenter };
            default:
                return { x: depthCenter, y: siblingCenter };
        }
    }
}

/**
 * 连接线路径生成器
 */
export class LinkPathGenerator {
    private direction: LayoutDirection;

    constructor(direction: LayoutDirection) {
        validateLayoutDirection(direction);
        this.direction = direction;
    }

    private getSourcePoint(
        sourceX: number,
        sourceY: number,
        sourceWidth: number,
        sourceHeight: number,
    ): { x: number; y: number } {
        const centerX = sourceX + sourceWidth / 2;
        const centerY = sourceY + sourceHeight / 2;

        switch (this.direction) {
            case "right":
                return { x: sourceX + sourceWidth, y: centerY };
            case "left":
                return { x: sourceX, y: centerY };
            case "bottom":
                return { x: centerX, y: sourceY + sourceHeight };
            case "top":
                return { x: centerX, y: sourceY };
            default:
                return { x: centerX, y: centerY };
        }
    }

    private getTargetPoint(
        targetX: number,
        targetY: number,
        targetWidth: number,
        targetHeight: number,
    ): { x: number; y: number } {
        const centerX = targetX + targetWidth / 2;
        const centerY = targetY + targetHeight / 2;

        switch (this.direction) {
            case "right":
                return { x: targetX, y: centerY };
            case "left":
                return { x: targetX + targetWidth, y: centerY };
            case "bottom":
                return { x: centerX, y: targetY };
            case "top":
                return { x: centerX, y: targetY + targetHeight };
            default:
                return { x: centerX, y: centerY };
        }
    }

    public generatePath(
        sourceX: number,
        sourceY: number,
        targetX: number,
        targetY: number,
        sourceWidth: number,
        sourceHeight: number,
        targetWidth: number,
        targetHeight: number,
    ): string {
        const source = this.getSourcePoint(sourceX, sourceY, sourceWidth, sourceHeight);
        const target = this.getTargetPoint(targetX, targetY, targetWidth, targetHeight);

        if (this.direction === "right" || this.direction === "left") {
            const midX = (source.x + target.x) / 2;
            return `M ${source.x} ${source.y} C ${midX} ${source.y}, ${midX} ${target.y}, ${target.x} ${target.y}`;
        } else {
            const midY = (source.y + target.y) / 2;
            return `M ${source.x} ${source.y} C ${source.x} ${midY}, ${target.x} ${midY}, ${target.x} ${target.y}`;
        }
    }

    public generateFromNodes(
        source: { x: number; y: number; width: number; height: number },
        target: { x: number; y: number; width: number; height: number },
    ): string {
        return this.generatePath(
            source.x, source.y,
            target.x, target.y,
            source.width, source.height,
            target.width, target.height,
        );
    }
}

/**
 * 完整的树形布局管理器
 */
export class TreeLayoutManager {
    private calculator: D3TreeLayoutCalculator;
    private coordinateAdjuster: LayoutCoordinateAdjuster;
    private pathGenerator: LinkPathGenerator;
    private config: LayoutConfig;

    constructor(config: LayoutConfig, nodeDimensions?: Map<string, { width: number; height: number }>) {
        validateLayoutConfig(config);
        this.config = config;
        this.calculator = new D3TreeLayoutCalculator(config, nodeDimensions);
        // 传递 nodeDimensions 到坐标调整器，确保尺寸一致
        this.coordinateAdjuster = new LayoutCoordinateAdjuster(
            config.direction,
            config,
            100,
            100,
            nodeDimensions
        );
        this.pathGenerator = new LinkPathGenerator(config.direction);
    }

    public calculateLayout(root: MindmapNode): {
        nodes: TreeLayoutNode[];
        links: TreeLayoutLink[];
        width: number;
        height: number;
    } {
        validateMindmapNode(root);

        const result = this.calculator.calculate(root);
        const adjustedNodes = this.coordinateAdjuster.adjust(result.nodes);

        const adjustedNodesById = new Map(
            adjustedNodes.map((node) => [node.data.data.id, node]),
        );

        const adjustedLinks = result.links.map((link) => {
            const source = adjustedNodesById.get(link.source.data.data.id);
            const target = adjustedNodesById.get(link.target.data.data.id);

            assert(source !== undefined, `missing adjusted source node: ${link.source.data.data.id}`);
            assert(target !== undefined, `missing adjusted target node: ${link.target.data.data.id}`);

            return { source, target } as TreeLayoutLink;
        });

        const bounds = calculateBounds(adjustedNodes, this.config);

        return {
            nodes: adjustedNodes,
            links: adjustedLinks,
            width: bounds.width,
            height: bounds.height,
        };
    }

    public generateLinkPath(
        source: { x: number; y: number; width: number; height: number },
        target: { x: number; y: number; width: number; height: number },
    ): string {
        return this.pathGenerator.generateFromNodes(source, target);
    }
}
