# Implementation Plan: 易用拖拽交互设计

[Overview]
实现双模式拖拽交互，让用户可以更直观地将节点拖放到目标位置：
- **子节点模式**：鼠标悬停在节点中心区域（60%），成为该节点的子节点
- **兄弟节点模式**：鼠标悬停在节点上下边缘（各20%），插入到兄弟节点之间
同时优化批量移动，保持拖拽节点的相对顺序。

[Types]

```typescript
/** 放置模式枚举 */
export enum DropMode {
    AsChild = 'child',      // 作为子节点
    AsSibling = 'sibling'   // 作为兄弟节点
}

/** 增强版放置预览结果 */
export interface DropPreview {
    readonly targetParentId: string;
    readonly insertIndex: number;
    readonly isValid: boolean;
    readonly mode: DropMode;              // 新增：放置模式
    readonly targetNodeId?: string;       // 新增：目标节点ID（用于高亮）
}
```

[Files]

需要修改的文件：

1. **`webview/src/store/DragDropService.ts`** - 核心修改
   - 添加 `DropMode` 枚举
   - 修改 `DropPreview` 接口
   - 添加 `DetectDropMode()` 方法
   - 添加 `CalculateChildDrop()` 方法
   - 修改 `CalculateDropPreview()` 方法支持双模式
   - 添加 `GetDocumentOrder()` 辅助方法

2. **`webview/src/store/mindmapStore.ts`** - 添加排序逻辑
   - 添加 `getDocumentOrder()` 辅助函数
   - 修改 `moveNodes()` 方法，按文档顺序排序后批量移动

3. **`webview/src/components/MindmapCanvas.tsx`** - 增强视觉反馈
   - 修改 `renderDropPreview()` 支持双模式渲染
   - 子节点模式：显示高亮边框 + "+" 图标
   - 兄弟节点模式：显示插入线（现有逻辑）

[Functions]

1. **新增 `DetectDropMode()`**
   - 位置：`DragDropService.ts`
   - 签名：`DetectDropMode(mouseX, mouseY, targetNode): DropMode`
   - 逻辑：根据鼠标在节点内的相对位置判断模式（上/下20%边缘 → 兄弟模式，中心60% → 子节点模式）

2. **新增 `CalculateChildDrop()`**
   - 位置：`DragDropService.ts`
   - 签名：`CalculateChildDrop(targetNodeId, documentRoot): DropPreview`
   - 逻辑：计算作为子节点的放置预览，验证不能拖到自己或后代

3. **修改 `CalculateDropPreview()`**
   - 位置：`DragDropService.ts`
   - 变更：调用 `DetectDropMode()` 判断模式，分发到 `CalculateChildDrop()` 或现有兄弟模式逻辑

4. **新增 `getDocumentOrder()`**
   - 位置：`mindmapStore.ts`
   - 签名：`getDocumentOrder(nodeId, root): number`
   - 逻辑：返回节点在文档树中的深度优先遍历顺序

5. **修改 `moveNodes()`**
   - 位置：`mindmapStore.ts`
   - 变更：按文档顺序排序移动项，调整插入索引避免冲突

6. **修改 `renderDropPreview()`**
   - 位置：`MindmapCanvas.tsx`
   - 变更：根据 `dropPreview.mode` 渲染不同视觉反馈

[Classes]

无新增类，仅修改现有类：
- `DragDropService` - 添加模式检测和子节点放置计算方法

[Dependencies]

无新增依赖。

[Testing]

测试场景：
1. 拖拽节点到目标节点中心区域 → 应成为该节点的子节点
2. 拖拽节点到目标节点上边缘 → 应插入到该节点之前
3. 拖拽节点到目标节点下边缘 → 应插入到该节点之后
4. 选中多个节点拖拽 → 应保持相对顺序
5. 拖拽到自己的后代节点 → 应显示无效预览

[Implementation Order]

1. [x] 修改 `DragDropService.ts` - 添加 `DropMode` 枚举和增强 `DropPreview` 接口
2. [x] 修改 `DragDropService.ts` - 实现 `DetectDropMode()` 方法
3. [x] 修改 `DragDropService.ts` - 实现 `CalculateChildDrop()` 方法
4. [x] 修改 `DragDropService.ts` - 重构 `CalculateDropPreview()` 支持双模式
5. [x] 修改 `mindmapStore.ts` - 添加 `getDocumentOrder()` 辅助函数
6. [x] 修改 `mindmapStore.ts` - 重构 `moveNodes()` 支持排序
7. [x] 修改 `MindmapCanvas.tsx` - 增强 `renderDropPreview()` 视觉反馈
8. [x] 构建验证
9. [ ] 测试验证（需手动测试）
