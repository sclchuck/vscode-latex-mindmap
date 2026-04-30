export interface MindmapNodeData {
    id: string;
    created: number;
    text: string;
    layout?: string | null;
    expandState?: "expand" | "collapse";
}
export interface MindmapNode {
    data: MindmapNodeData;
    children: MindmapNode[];
}
export interface MindmapDocument {
    root: MindmapNode;
    template: string;
    theme: string;
    version: string;
}
export interface LatexRenderResult {
    html: string;
    errors: LatexRenderError[];
}
export interface LatexRenderError {
    message: string;
    position: number;
}
export type NodeStyleType = "default" | "definition" | "theorem" | "proof" | "warning";
export type LayoutDirection = "right" | "left" | "top";
export interface HierarchyPointNode {
    data: MindmapNode;
    x: number;
    y: number;
    parent: HierarchyPointNode | null;
    children?: HierarchyPointNode[];
    depth: number;
}
export type WebviewMessageType = {
    type: 'init';
    document: MindmapDocument;
} | {
    type: 'update';
    document: MindmapDocument;
} | {
    type: 'exportSvg';
} | {
    type: 'exportJson';
} | {
    type: 'save';
    document: MindmapDocument;
};
export declare function createDefaultDocument(): MindmapDocument;
export declare function generateId(): string;
