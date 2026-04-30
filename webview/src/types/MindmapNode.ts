/**
 * 完整节点类
 * 表示脑图中的节点，包含数据和子节点
 */
import { MindmapNodeData, MindmapNodeDataJson } from './MindmapNodeData';

export class MindmapNode {
    public data: MindmapNodeData;
    public children: MindmapNode[];

    constructor(data: MindmapNodeData | (Partial<MindmapNodeData> & { id: string; text: string }), children: MindmapNode[] = []) {
        this.data = data instanceof MindmapNodeData ? data : new MindmapNodeData(data);
        this.children = children;
    }

    /**
     * 添加子节点
     */
    public addChild(node: MindmapNode): void {
        this.children.push(node);
    }

    /**
     * 移除子节点
     * @returns 是否成功移除
     */
    public removeChild(nodeId: string): boolean {
        const index = this.children.findIndex(c => c.data.id === nodeId);
        if (index !== -1) {
            this.children.splice(index, 1);
            return true;
        }
        return false;
    }

    /**
     * 递归查找节点
     */
    public findNode(id: string): MindmapNode | null {
        if (this.data.id === id) {
            return this;
        }
        for (const child of this.children) {
            const found = child.findNode(id);
            if (found) {
                return found;
            }
        }
        return null;
    }

    /**
     * 获取节点深度
     */
    public getDepth(): number {
        return 0; // 由布局计算提供
    }

    /**
     * 检查是否为根节点
     */
    public isRoot(): boolean {
        return true; // Root 由上下文决定，非属性
    }

    /**
     * 是否有子节点
     */
    public hasChildren(): boolean {
        return this.children.length > 0;
    }

    /**
     * 子节点数量
     */
    public getChildCount(): number {
        return this.children.length;
    }

    /**
     * 序列化为 JSON 对象
     */
    public toJSON(): MindmapNodeJson {
        return {
            data: this.data.toJSON(),
            children: this.children.map(c => c.toJSON())
        };
    }

    /**
     * 从 JSON 对象创建实例
     */
    public static fromJSON(obj: MindmapNodeJson): MindmapNode {
        return new MindmapNode(
            MindmapNodeData.fromJSON(obj.data),
            obj.children?.map((c: MindmapNodeJson) => MindmapNode.fromJSON(c)) ?? []
        );
    }
}

/**
 * JSON 序列化接口
 */
export interface MindmapNodeJson {
    data: MindmapNodeDataJson;
    children?: MindmapNodeJson[];
}