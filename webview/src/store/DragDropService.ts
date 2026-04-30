/**
 * 拖拽放置服务
 * 职责：管理拖拽状态、计算放置位置、验证移动合法性
 * C# 风格强类型设计
 */

import { MindmapNode } from '../types';
import { TreeLayoutNode } from '../types/TreeLayoutNode';

/** 放置模式枚举 */
export enum DropMode {
    AsChild = 'child',      // 作为子节点
    AsSibling = 'sibling'   // 作为兄弟节点
}

/** 插入位置（用于兄弟模式） */
export enum InsertPosition {
    Before = 'before',   // 插入到目标节点之前
    After = 'after'      // 插入到目标节点之后
}

/** 放置预览结果 */
export interface DropPreview {
    readonly targetParentId: string;
    readonly insertIndex: number;
    readonly isValid: boolean;
    readonly mode: DropMode;              // 放置模式
    readonly targetNodeId?: string;       // 目标节点ID（用于高亮）
    readonly insertPosition?: InsertPosition; // 插入位置（用于兄弟模式）
}

export class DragDropService {
    private readonly DRAG_THRESHOLD_PX = 5;
  
    // 拖拽状态
    private _isMouseDown: boolean = false;  // 鼠标是否按下
    private _isDragging: boolean = false;
    private _draggedNodeIds: ReadonlySet<string> = new Set();
    private _startPosition: Readonly<{ x: number; y: number }> | null = null;
    private _currentPosition: Readonly<{ x: number; y: number }> | null = null;
  
    // 放置预览
    private _dropPreview: Readonly<DropPreview> | null = null;
  
    /** 鼠标是否按下 */
    public get IsMouseDown(): boolean {
        return this._isMouseDown;
    }
  
    /** 是否正在拖拽 */
    public get IsDragging(): boolean {
        return this._isDragging;
    }
  
    /** 当前放置预览 */
    public get DropPreview(): Readonly<DropPreview> | null {
        return this._dropPreview;
    }
  
    /**
     * 鼠标按下
     */
    public SetMouseDown(isDown: boolean): void {
        this._isMouseDown = isDown;
        console.log(`[DragDropService] SetMouseDown: ${isDown}`);
    }
  
    /**
     * 开始拖拽
     */
    public BeginDrag(nodeIds: string[], startX: number, startY: number): void {
        console.log(`[DragDropService] BeginDrag: ${nodeIds.length} 个节点`);
        this._draggedNodeIds = new Set(nodeIds);
        this._startPosition = { x: startX, y: startY };
        this._currentPosition = { x: startX, y: startY };
        this._isDragging = false; // 初始为 false，超过阈值后才激活
        this._dropPreview = null;
    }
  
    /**
     * 更新拖拽位置
     * @returns 是否超过阈值激活拖拽
     */
    public UpdateDragPosition(currentX: number, currentY: number): boolean {
        // 修复：如果鼠标未按下，不允许激活拖拽
        if (!this._isMouseDown) {
            this._dropPreview = null;
            this._isDragging = false;
            return false;
        }
      
        if (!this._startPosition) return false;
      
        this._currentPosition = { x: currentX, y: currentY };
      
        // 计算距离
        const dx = currentX - this._startPosition.x;
        const dy = currentY - this._startPosition.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
      
        // 超过阈值才激活拖拽
        if (!this._isDragging && distance > this.DRAG_THRESHOLD_PX) {
            this._isDragging = true;
            console.log(`[DragDropService] 拖拽已激活，距离: ${distance.toFixed(2)}px`);
            return true;
        }
      
        return this._isDragging;
    }
  
    /**
     * 计算放置预览（双模式支持）
     */
    public CalculateDropPreview(
        targetX: number,
        targetY: number,
        documentRoot: MindmapNode,
        layoutNodes: ReadonlyArray<TreeLayoutNode>
    ): void {
        // 只有在鼠标按下且拖拽激活后才计算预览
        if (!this._isMouseDown || !this._isDragging) {
            this._dropPreview = null;
            return;
        }
      
        // 1. 找到鼠标下的布局节点
        const targetLayoutNode = this.FindNodeAtPosition(targetX, targetY, layoutNodes);
        if (!targetLayoutNode) {
            console.log(`[DragDropService] 鼠标下没有节点`);
            this._dropPreview = null;
            return;
        }
      
        const targetNodeId = targetLayoutNode.data.data.id;
      
        // 新增：如果目标节点是被拖拽的节点之一，不显示预览
        if (this._draggedNodeIds.has(targetNodeId)) {
            console.log(`[DragDropService] 目标节点是被拖拽节点，跳过预览`);
            this._dropPreview = null;
            return;
        }
      
        console.log(`[DragDropService] 目标节点: ${targetNodeId}`);
      
        // 2. 检测放置模式
        const modeResult = this.DetectDropMode(targetX, targetY, targetLayoutNode);
        console.log(`[DragDropService] 放置模式: ${modeResult.mode}, 位置: ${modeResult.insertPosition || 'N/A'}`);
      
        if (modeResult.mode === DropMode.AsChild) {
            // 模式 A：作为子节点
            this._dropPreview = this.CalculateChildDrop(targetNodeId, documentRoot);
        } else {
            // 模式 B：作为兄弟节点
            this._dropPreview = this.CalculateSiblingDrop(
                targetNodeId,
                documentRoot,
                modeResult.insertPosition
            );
        }
    }
  
    /**
     * 检测放置模式
     * - 上边缘 20% → 兄弟模式-before
     * - 下边缘 20% → 兄弟模式-after
     * - 中心 60% → 子节点模式
     */
    private DetectDropMode(
        mouseX: number,
        mouseY: number,
        targetNode: TreeLayoutNode
    ): { mode: DropMode; insertPosition?: InsertPosition } {
        const nodeHeight = targetNode.height ?? 60;
        const relativeY = mouseY - targetNode.y;
        const ratio = relativeY / nodeHeight;
      
        // 上边缘 20% → 兄弟模式-before
        if (ratio < 0.2) {
            return { mode: DropMode.AsSibling, insertPosition: InsertPosition.Before };
        }
      
        // 下边缘 20% → 兄弟模式-after
        if (ratio > 0.8) {
            return { mode: DropMode.AsSibling, insertPosition: InsertPosition.After };
        }
      
        // 中心 60% → 子节点模式
        return { mode: DropMode.AsChild };
    }
  
    /**
     * 计算"作为子节点"的放置预览
     */
    private CalculateChildDrop(
        targetNodeId: string,
        documentRoot: MindmapNode
    ): DropPreview {
        const targetNode = this.FindNodeInTree(targetNodeId, documentRoot);
        if (!targetNode) {
            return { 
                targetParentId: '', 
                insertIndex: 0, 
                isValid: false, 
                mode: DropMode.AsChild 
            };
        }
      
        // 验证：不能拖到自己或后代
        for (const draggedId of this._draggedNodeIds) {
            if (draggedId === targetNodeId) {
                console.log(`[DragDropService] 不能拖到自己`);
                return {
                    targetParentId: targetNodeId,
                    insertIndex: 0,
                    isValid: false,
                    mode: DropMode.AsChild,
                    targetNodeId
                };
            }
            if (this.ContainsDescendant(targetNode, draggedId)) {
                console.log(`[DragDropService] 目标节点包含被拖拽节点`);
                return {
                    targetParentId: targetNodeId,
                    insertIndex: 0,
                    isValid: false,
                    mode: DropMode.AsChild,
                    targetNodeId
                };
            }
        }
      
        return {
            targetParentId: targetNodeId,
            insertIndex: targetNode.children.length, // 插入到末尾
            isValid: true,
            mode: DropMode.AsChild,
            targetNodeId
        };
    }
  
    /**
     * 计算"作为兄弟节点"的放置预览（修复版）
     * 直接基于目标节点索引计算，避免 targetY 导致的逻辑冲突
     */
    private CalculateSiblingDrop(
        targetNodeId: string,
        documentRoot: MindmapNode,
        insertPosition: InsertPosition | undefined
    ): DropPreview {
        const parentInfo = this.FindParentInDocumentTree(targetNodeId, documentRoot);
        if (!parentInfo) {
            console.log(`[DragDropService] 在文档树中找不到父节点`);
            return { 
                targetParentId: '', 
                insertIndex: 0, 
                isValid: false, 
                mode: DropMode.AsSibling 
            };
        }

        const parentId = parentInfo.parent.data.id;
        const parentNode = parentInfo.parent;

        // 验证：不能拖到自己的后代中
        for (const draggedId of this._draggedNodeIds) {
            const draggedNode = this.FindNodeInTree(draggedId, documentRoot);
            if (!draggedNode) continue;
          
            if (this.ContainsDescendant(draggedNode, parentId)) {
                console.log(`[DragDropService] 不能移动到自己的后代中: ${draggedId} -> ${parentId}`);
                return {
                    targetParentId: parentId,
                    insertIndex: 0,
                    isValid: false,
                    mode: DropMode.AsSibling,
                    targetNodeId
                };
            }
        }

        // 直接根据目标节点在 children 数组中的位置计算索引
        const targetIndex = parentNode.children.findIndex(c => c.data.id === targetNodeId);
        if (targetIndex === -1) {
            console.log(`[DragDropService] 目标节点不在父节点的 children 中`);
            return {
                targetParentId: parentId,
                insertIndex: 0,
                isValid: false,
                mode: DropMode.AsSibling
            };
        }

        // 计算最终插入索引
        let insertIndex: number;
        if (insertPosition === InsertPosition.Before) {
            insertIndex = targetIndex;
        } else {
            // After 模式：插入到目标节点之后
            insertIndex = targetIndex + 1;
        }

        // 调整索引：如果被拖拽节点在目标位置之前，需要减 1
        // 这是因为移动后原位置的节点会被移除
        const draggedIndices = Array.from(this._draggedNodeIds)
            .map(id => parentNode.children.findIndex(c => c.data.id === id))
            .filter(idx => idx !== -1 && idx < insertIndex);
  
        insertIndex -= draggedIndices.length;

        console.log(`[DragDropService] Sibling: target=${targetNodeId}[${targetIndex}], position=${insertPosition}, final=${insertIndex}`);
  
        return {
            targetParentId: parentId,
            insertIndex: Math.max(0, insertIndex),
            isValid: true,
            mode: DropMode.AsSibling,
            targetNodeId,
            insertPosition
        };
    }
  
    /**
     * 结束拖拽，返回移动指令
     */
    public EndDrag(): Array<{ nodeId: string; newParentId: string; newIndex: number }> | null {
        if (!this._isDragging || !this._dropPreview || !this._dropPreview.isValid) {
            console.log(`[DragDropService] EndDrag: 无效移动，取消`);
            this.Reset();
            return null;
        }
      
        const moves = Array.from(this._draggedNodeIds).map(nodeId => ({
            nodeId,
            newParentId: this._dropPreview!.targetParentId,
            newIndex: this._dropPreview!.insertIndex
        }));
      
        console.log(`[DragDropService] EndDrag: 返回 ${moves.length} 个移动指令`);
        this.Reset();
        return moves;
    }
  
    /**
     * 取消拖拽
     */
    public CancelDrag(): void {
        console.log(`[DragDropService] CancelDrag`);
        this.Reset();
    }
  
    private Reset(): void {
        this._isMouseDown = false;
        this._isDragging = false;
        this._draggedNodeIds = new Set();
        this._startPosition = null;
        this._currentPosition = null;
        this._dropPreview = null;
    }
  
    // ===== 私有辅助方法 =====
  
    private FindNodeAtPosition(
        x: number,
        y: number,
        layoutNodes: ReadonlyArray<TreeLayoutNode>
    ): TreeLayoutNode | null {
        for (const node of layoutNodes) {
            const width = node.width ?? 200;
            const height = node.height ?? 60;
            if (x >= node.x && x <= node.x + width && y >= node.y && y <= node.y + height) {
                return node;
            }
        }
        return null;
    }
  
    private FindParentInDocumentTree(
        childId: string,
        root: MindmapNode
    ): { parent: MindmapNode; index: number } | null {
        for (let i = 0; i < root.children.length; i++) {
            if (root.children[i].data.id === childId) {
                return { parent: root, index: i };
            }
            const found = this.FindParentInDocumentTree(childId, root.children[i]);
            if (found) return found;
        }
        return null;
    }
  
    private FindNodeInTree(nodeId: string, root: MindmapNode): MindmapNode | null {
        if (root.data.id === nodeId) return root;
        for (const child of root.children) {
            const found = this.FindNodeInTree(nodeId, child);
            if (found) return found;
        }
        return null;
    }
  
    private ContainsDescendant(node: MindmapNode, descendantId: string): boolean {
        for (const child of node.children) {
            if (child.data.id === descendantId) return true;
            if (this.ContainsDescendant(child, descendantId)) return true;
        }
        return false;
    }
}