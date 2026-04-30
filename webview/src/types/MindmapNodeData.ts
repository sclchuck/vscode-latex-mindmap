/**
 * 节点数据类
 * 表示脑图节点的元数据
 */
export class MindmapNodeData {
    public readonly id: string;
    public readonly created: number;
    public text: string;
    public layout: string | null;
    public expandState: "expand" | "collapse";

    constructor(data: Partial<MindmapNodeData> & { id: string; text: string }) {
        this.id = data.id;
        this.created = data.created ?? Date.now();
        this.text = data.text;
        this.layout = data.layout ?? null;
        this.expandState = data.expandState ?? "expand";
    }

    /**
     * 序列化为 JSON 对象
     */
    public toJSON(): MindmapNodeDataJson {
        return {
            id: this.id,
            created: this.created,
            text: this.text,
            layout: this.layout,
            expandState: this.expandState
        };
    }

    /**
     * 从 JSON 对象创建实例
     */
    public static fromJSON(obj: Partial<MindmapNodeDataJson> & { id: string; text: string }): MindmapNodeData {
        return new MindmapNodeData(obj);
    }
}

/**
 * JSON 序列化接口
 */
export interface MindmapNodeDataJson {
    id: string;
    created: number;
    text: string;
    layout: string | null;
    expandState: "expand" | "collapse";
}