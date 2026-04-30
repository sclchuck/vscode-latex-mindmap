import { MindmapDocument, MindmapNode, MindmapNodeData } from './types';
export declare class TexMindDocument {
    private document;
    constructor(document?: MindmapDocument);
    private createDefaultDocument;
    getDocument(): MindmapDocument;
    setDocument(document: MindmapDocument): void;
    static parse(content: string): TexMindDocument;
    private static countNodes;
    serialize(): string;
    findNode(nodeId: string): MindmapNode | null;
    private findNodeRecursive;
    findParent(nodeId: string): MindmapNode | null;
    private findParentRecursive;
    addChildNode(parentId: string, text?: string): MindmapNode | null;
    addSiblingNode(nodeId: string, text?: string): MindmapNode | null;
    deleteNode(nodeId: string): boolean;
    updateNode(nodeId: string, updates: Partial<MindmapNodeData>): boolean;
    toggleExpand(nodeId: string): boolean;
    moveNode(nodeId: string, newParentId: string): boolean;
    private isDescendant;
    getAllNodeIds(): string[];
    private collectIdsRecursive;
    getNodeCount(): number;
    private countRecursive;
}
