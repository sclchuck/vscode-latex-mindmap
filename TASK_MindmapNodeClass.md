# Task: Refactor MindmapNode to Class

## Context

将 MindmapNode 从 interface 转换为 class，使用强类型和 4 空格缩进，提供更好的面向对象封装和类型安全。

### Plan Document
请参考 `@IMPLEMENTATION_PLAN_MindmapNodeClass.md` 获取完整的实现计划详情。

## Implementation Steps

task_progress Items:
- [ ] Step 1: 将 MindmapNodeData 转换为 class（webview/src/types/index.ts）
- [ ] Step 2: 将 MindmapNode 转换为 class（webview/src/types/index.ts）
- [ ] Step 3: 将 MindmapDocument 转换为 class（webview/src/types/index.ts）
- [ ] Step 4: 更新 D3TreeWrapper.ts 使用新类
- [ ] Step 5: 更新 mindmapStore.ts
- [ ] Step 6: 更新组件文件
- [ ] Step 7: 运行 TypeScript 编译验证
- [ ] Step 8: 运行 Vite 构建验证

## Key Requirements

1. **缩进**: 使用 4 空格缩进
2. **强类型**: 所有属性必须有明确的类型
3. **向后兼容**: JSON 序列化格式必须与现有 .km 文件兼容
4. **方法**: MindmapNode 需提供 addChild, removeChild, findNode 等方法

## Read Plan Sections

```bash
# Read Overview
sed -n '/\[Overview\]/,/\[Types\]/p' IMPLEMENTATION_PLAN_MindmapNodeClass.md | head -n -1

# Read Types section
sed -n '/\[Types\]/,/\[Files\]/p' IMPLEMENTATION_PLAN_MindmapNodeClass.md | head -n -1

# Read Files section
sed -n '/\[Files\]/,/\[Functions\]/p' IMPLEMENTATION_PLAN_MindmapNodeClass.md | head -n -1

# Read Implementation Order
sed -n '/\[Implementation Order\]/,$p' IMPLEMENTATION_PLAN_MindmapNodeClass.md
```

## Example Code Structure

```typescript
export class MindmapNodeData {
    id: string;
    created: number;
    text: string;
    layout: string | null;
    expandState: "expand" | "collapse";

    constructor(data: Partial<MindmapNodeData> & { id: string; text: string }) {
        this.id = data.id;
        this.created = data.created ?? Date.now();
        this.text = data.text;
        this.layout = data.layout ?? null;
        this.expandState = data.expandState ?? "expand";
    }

    toJSON(): MindmapNodeData {
        return {
            id: this.id,
            created: this.created,
            text: this.text,
            layout: this.layout,
            expandState: this.expandState
        };
    }
}

export class MindmapNode {
    data: MindmapNodeData;
    children: MindmapNode[];

    constructor(data: MindmapNodeData | Partial<MindmapNodeData>, children: MindmapNode[] = []) {
        this.data = data instanceof MindmapNodeData ? data : new MindmapNodeData(data);
        this.children = children;
    }

    addChild(node: MindmapNode): void {
        this.children.push(node);
    }

    removeChild(nodeId: string): boolean {
        const index = this.children.findIndex(c => c.data.id === nodeId);
        if (index !== -1) {
            this.children.splice(index, 1);
            return true;
        }
        return false;
    }

    findNode(id: string): MindmapNode | null {
        if (this.data.id === id) return this;
        for (const child of this.children) {
            const found = child.findNode(id);
            if (found) return found;
        }
        return null;
    }

    isRoot(): boolean {
        return true; // Root is determined by context, not property
    }

    toJSON(): { data: MindmapNodeData; children: any[] } {
        return {
            data: this.data.toJSON(),
            children: this.children.map(c => c.toJSON())
        };
    }

    static fromJSON(obj: any): MindmapNode {
        return new MindmapNode(
            new MindmapNodeData(obj.data),
            obj.children?.map((c: any) => MindmapNode.fromJSON(c)) ?? []
        );
    }
}
```

## Validation Commands

```bash
# TypeScript check
npx tsc --project webview/tsconfig.json --noEmit

# Vite build
npx vite build --config webview/vite.config.ts