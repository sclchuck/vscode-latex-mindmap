/**
 * 文档根类
 * 表示脑图文档，包含根节点和元数据
 */
import { MindmapNode, MindmapNodeJson } from './MindmapNode';

export class MindmapDocument {
    public root: MindmapNode;
    public template: string;
    public theme: string;
    public version: string;

    constructor(
        root?: MindmapNode,
        template: string = "right",
        theme: string = "fresh-blue",
        version: string = "1.0"
    ) {
        this.root = root ?? new MindmapNode({ id: this.generateId(), text: "New Mindmap" });
        this.template = template;
        this.theme = theme;
        this.version = version;
    }

    /**
     * 生成唯一 ID
     */
    private generateId(): string {
        return Math.random().toString(36).substring(2, 14);
    }

    /**
     * 序列化为 JSON 对象
     */
    public toJSON(): MindmapDocumentJson {
        return {
            root: this.root.toJSON(),
            template: this.template,
            theme: this.theme,
            version: this.version
        };
    }

    /**
     * 从 JSON 对象创建实例
     */
    public static fromJSON(obj: MindmapDocumentJson): MindmapDocument {
        const root = obj.root 
            ? MindmapNode.fromJSON(obj.root as MindmapNodeJson) 
            : new MindmapNode({ id: Math.random().toString(36).substring(2, 14), text: "New Mindmap" });
        return new MindmapDocument(
            root,
            obj.template ?? "right",
            obj.theme ?? "fresh-blue",
            obj.version ?? "1.0"
        );
    }
}

/**
 * JSON 序列化接口
 */
export interface MindmapDocumentJson {
    root: MindmapNodeJson;
    template: string;
    theme: string;
    version: string;
}