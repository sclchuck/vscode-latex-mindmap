/**
 * 操作基类 - 所有操作必须继承此类
 */
export abstract class MindmapOpBase {
    /** 操作的唯一标识 */
    public readonly id: string;
    /** 操作类型名称 */
    public abstract readonly type: string;
    /** 操作描述（用于调试） */
    public abstract readonly description: string;
    /** 操作时间戳 */
    public readonly timestamp: number;

    constructor() {
        this.id = generateOpId();
        this.timestamp = Date.now();
    }

    /**
     * 执行操作（正向）
     */
    public abstract execute(doc: any): void;

    /**
     * 撤销操作（反向）
     */
    public abstract undo(doc: any): void;
}

/**
 * 修改节点内容操作
 */
export class MindmapOpChangeContent extends MindmapOpBase {
    public readonly type = 'changeContent';
    public readonly description: string;

    constructor(
        public readonly nodeId: string,
        public readonly oldText: string,
        public readonly newText: string
    ) {
        super();
        this.description = `修改节点 ${nodeId} 内容`;
    }

    public execute(doc: any): void {
        const node = findNodeById(doc.root, this.nodeId);
        if (node) {
            node.data.text = this.newText;
        }
    }

    public undo(doc: any): void {
        const node = findNodeById(doc.root, this.nodeId);
        if (node) {
            node.data.text = this.oldText;
        }
    }
}

/**
 * 切换节点折叠状态操作
 */
export class MindmapOpSwitchFoldNode extends MindmapOpBase {
    public readonly type = 'switchFold';
    public readonly description: string;

    constructor(
        public readonly nodeId: string,
        public readonly oldState: 'expand' | 'collapse',
        public readonly newState: 'expand' | 'collapse'
    ) {
        super();
        this.description = `${nodeId}: ${oldState} -> ${newState}`;
    }

    public execute(doc: any): void {
        const node = findNodeById(doc.root, this.nodeId);
        if (node) {
            node.data.expandState = this.newState;
        }
    }

    public undo(doc: any): void {
        const node = findNodeById(doc.root, this.nodeId);
        if (node) {
            node.data.expandState = this.oldState;
        }
    }
}

/**
 * 添加节点操作
 */
export class MindmapOpAddNode extends MindmapOpBase {
    public readonly type = 'addNode';
    public readonly description: string;

    constructor(
        public readonly parentId: string,
        public readonly newNode: MindmapNodeData,
        public readonly insertIndex?: number  // 可选，指定插入位置
    ) {
        super();
        this.description = `添加节点 ${newNode.id} 到 ${parentId}`;
    }

    public execute(doc: any): void {
        const parent = findNodeById(doc.root, this.parentId);
        if (parent) {
            const node: MindmapNode = {
                data: this.newNode,
                children: []
            };
            
            if (this.insertIndex !== undefined && this.insertIndex >= 0) {
                parent.children.splice(this.insertIndex, 0, node);
            } else {
                parent.children.push(node);
            }
            
            console.log(`[AddNodeOp] 添加节点 ${this.newNode.id} 到 ${this.parentId}`);
        }
    }

    public undo(doc: any): void {
        const parent = findNodeById(doc.root, this.parentId);
        if (parent) {
            const index = parent.children.findIndex((c: MindmapNode) => c.data.id === this.newNode.id);
            if (index !== -1) {
                parent.children.splice(index, 1);
                console.log(`[AddNodeOp] 撤销：删除节点 ${this.newNode.id}`);
            }
        }
    }
}

/**
 * 删除节点操作
 */
export class MindmapOpRemoveNode extends MindmapOpBase {
    public readonly type = 'removeNode';
    public readonly description: string;

    constructor(
        public readonly nodeId: string,
        public readonly parentId: string,
        public readonly removedNode: MindmapNode,
        public readonly removeIndex: number  // 节点在父节点中的位置
    ) {
        super();
        this.description = `删除节点 ${nodeId} 从 ${parentId}`;
    }

    public execute(doc: any): void {
        const parent = findNodeById(doc.root, this.parentId);
        if (parent) {
            const index = parent.children.findIndex((c: MindmapNode) => c.data.id === this.nodeId);
            if (index !== -1) {
                parent.children.splice(index, 1);
                console.log(`[RemoveNodeOp] 删除节点 ${this.nodeId}`);
            }
        }
    }

    public undo(doc: any): void {
        const parent = findNodeById(doc.root, this.parentId);
        if (parent) {
            // 将节点恢复到原来的位置
            parent.children.splice(this.removeIndex, 0, this.removedNode);
            console.log(`[RemoveNodeOp] 撤销：恢复节点 ${this.nodeId} 到索引 ${this.removeIndex}`);
        }
    }
}

/**
 * 移动节点操作（改变父子关系）
 */
export class MindmapOpMoveNode extends MindmapOpBase {
    public readonly type = 'moveNode';
    public readonly description: string;

    constructor(
        public readonly nodeId: string,
        public readonly oldParentId: string,
        public readonly newParentId: string,
        public readonly oldIndex: number,
        public readonly newIndex: number,
        public readonly movedNode: MindmapNode
    ) {
        super();
        this.description = `移动节点 ${nodeId}: ${oldParentId} -> ${newParentId}`;
    }

    public execute(doc: any): void {
        const oldParent = findNodeById(doc.root, this.oldParentId);
        const newParent = findNodeById(doc.root, this.newParentId);
        
        if (oldParent && newParent) {
            // 从旧父节点移除
            const index = oldParent.children.findIndex((c: MindmapNode) => c.data.id === this.nodeId);
            if (index !== -1) {
                oldParent.children.splice(index, 1);
            }
            
            // 添加到新父节点
            newParent.children.splice(this.newIndex, 0, this.movedNode);
            console.log(`[MoveNodeOp] 移动节点 ${this.nodeId}`);
        }
    }

    public undo(doc: any): void {
        const oldParent = findNodeById(doc.root, this.oldParentId);
        const newParent = findNodeById(doc.root, this.newParentId);
        
        if (oldParent && newParent) {
            // 从新父节点移除
            const index = newParent.children.findIndex((c: MindmapNode) => c.data.id === this.nodeId);
            if (index !== -1) {
                newParent.children.splice(index, 1);
            }
            
            // 恢复到旧父节点
            oldParent.children.splice(this.oldIndex, 0, this.movedNode);
            console.log(`[MoveNodeOp] 撤销移动节点 ${this.nodeId}`);
        }
    }
}

/**
 * 批量移动节点操作
 * 注意：不存储 movedNode 引用，而是在执行时动态查找
 */
export class MindmapOpBatchMove extends MindmapOpBase {
    public readonly type = 'batchMove';
    public readonly description: string;

    constructor(
        public readonly moves: Array<{
            nodeId: string;
            oldParentId: string;
            newParentId: string;
            oldIndex: number;
            newIndex: number;
        }>
    ) {
        super();
        this.description = `批量移动 ${moves.length} 个节点`;
    }

    public execute(doc: any): void {
        for (const move of this.moves) {
            const oldParent = findNodeById(doc.root, move.oldParentId);
            const newParent = findNodeById(doc.root, move.newParentId);
            
            if (oldParent && newParent) {
                // 动态查找节点引用
                const nodeIndex = oldParent.children.findIndex((c: MindmapNode) => c.data.id === move.nodeId);
                if (nodeIndex !== -1) {
                    const movedNode = oldParent.children[nodeIndex];
                    
                    // 从旧父节点移除
                    oldParent.children.splice(nodeIndex, 1);
                    
                    // 添加到新父节点
                    newParent.children.splice(move.newIndex, 0, movedNode);
                }
            }
        }
        console.log(`[BatchMoveOp] 执行批量移动 ${this.moves.length} 个节点`);
    }

    public undo(doc: any): void {
        // 逆序撤销
        for (let i = this.moves.length - 1; i >= 0; i--) {
            const move = this.moves[i];
            const oldParent = findNodeById(doc.root, move.oldParentId);
            const newParent = findNodeById(doc.root, move.newParentId);
            
            if (oldParent && newParent) {
                // 动态查找节点引用
                const nodeIndex = newParent.children.findIndex((c: MindmapNode) => c.data.id === move.nodeId);
                if (nodeIndex !== -1) {
                    const movedNode = newParent.children[nodeIndex];
                    
                    // 从新父节点移除
                    newParent.children.splice(nodeIndex, 1);
                    
                    // 恢复到旧父节点
                    oldParent.children.splice(move.oldIndex, 0, movedNode);
                }
            }
        }
        console.log(`[BatchMoveOp] 撤销批量移动 ${this.moves.length} 个节点`);
    }
}

/**
 * 节点数据结构
 */
interface MindmapNodeData {
    id: string;
    created: number;
    text: string;
    layout?: string | null;
    expandState?: 'expand' | 'collapse';
}

interface MindmapNode {
    data: MindmapNodeData;
    children: MindmapNode[];
}

/**
 * 生成操作 ID
 */
function generateOpId(): string {
    return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 递归查找节点
 */
function findNodeById(node: any, id: string): any {
    if (node.data.id === id) {
        return node;
    }
    for (const child of node.children) {
        const found = findNodeById(child, id);
        if (found) {
            return found;
        }
    }
    return null;
}

/**
 * 操作管理器 - 管理撤销/重做栈
 */
export class MindmapOperationManager {
    private undoStack: MindmapOpBase[] = [];
    private redoStack: MindmapOpBase[] = [];
    private maxStackSize: number = 100;

    /**
     * 执行操作并记录到撤销栈
     */
    public execute(doc: any, op: MindmapOpBase): void {
        op.execute(doc);
        console.log(`[OperationManager] 执行操作 ${op.description}`);

        this.undoStack.push(op);
        // 清空重做栈
        this.redoStack = [];
        // 限制撤销栈大小
        if (this.undoStack.length > this.maxStackSize) {
            this.undoStack.shift();
        }
    }

    /**
     * 撤销操作
     */
    public undo(doc: any): MindmapOpBase | null {
        const op = this.undoStack.pop();
        if (op) {
            op.undo(doc);
            this.redoStack.push(op);
            console.log(`[OperationManager] 撤销操作: ${op.description}`);
            return op;
        }
        return null;
    }

    /**
     * 重做操作
     */
    public redo(doc: any): MindmapOpBase | null {
        const op = this.redoStack.pop();
        if (op) {
            op.execute(doc);
            this.undoStack.push(op);
            console.log(`[OperationManager] 重做操作: ${op.description}`);
            return op;
        }
        return null;
    }

    /**
     * 是否可以撤销
     */
    public canUndo(): boolean {
        return this.undoStack.length > 0;
    }

    /**
     * 是否可以重做
     */
    public canRedo(): boolean {
        return this.redoStack.length > 0;
    }

    /**
     * 获取撤销栈大小
     */
    public getUndoCount(): number {
        return this.undoStack.length;
    }

    /**
     * 获取重做栈大小
     */
    public getRedoCount(): number {
        return this.redoStack.length;
    }

    /**
     * 清空所有操作
     */
    public clear(): void {
        this.undoStack = [];
        this.redoStack = [];
    }
}