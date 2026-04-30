# Implementation Plan: MindmapNode Class Refactoring

[Overview]

将 MindmapNode 从 interface 转换为 class，使用强类型和 4 空格缩进，提供更好的面向对象封装和类型安全。

[Types]

将 MindmapNodeData 和 MindmapNode 从 interface 转换为 class：

```typescript
// 节点数据类
export class MindmapNodeData {
    id: string;
    created: number;
    text: string;
    layout: string | null;
    expandState: "expand" | "collapse";

    constructor(data: Partial<MindmapNodeData> & { id: string; text: string });
    toJSON(): MindmapNodeData;
}

// 完整节点类
export class MindmapNode {
    data: MindmapNodeData;
    children: MindmapNode[];

    constructor(data: MindmapNodeData | Partial<MindmapNodeData>, children?: MindmapNode[]);
    addChild(node: MindmapNode): void;
    removeChild(nodeId: string): boolean;
    findNode(id: string): MindmapNode | null;
    getDepth(): number;
    isRoot(): boolean;
    toJSON(): { data: MindmapNodeData; children: any[] };
}

// 文档类
export class MindmapDocument {
    root: MindmapNode;
    template: string;
    theme: string;
    version: string;

    constructor(root?: MindmapNode, template?: string, theme?: string);
    toJSON(): MindmapDocument;
    static fromJSON(obj: any): MindmapDocument;
}
```

[Files]

需要修改的文件：

1. **webview/src/types/index.ts**
    - 将 MindmapNodeData interface 转换为 class
    - 将 MindmapNode interface 转换为 class
    - 将 MindmapDocument interface 转换为 class
    - 更新所有导出类型

2. **webview/src/layout/D3TreeWrapper.ts**
    - 更新 createVisibleTree 函数使用类方法
    - 更新 validateMindmapNode 验证逻辑
    - 更新所有使用 MindmapNode 的地方

3. **webview/src/store/mindmapStore.ts**
    - 更新 findNodeRecursive 函数

4. **webview/src/components/** (多个组件文件)
    - 更新所有使用 MindmapNode 的组件

[Functions]

需要添加的方法：

1. **MindmapNodeData 类**：
    - `constructor(data)` - 构造函数
    - `toJSON()` - 序列化为 JSON

2. **MindmapNode 类**：
    - `constructor(data, children)` - 构造函数
    - `addChild(node)` - 添加子节点
    - `removeChild(nodeId)` - 移除子节点
    - `findNode(id)` - 查找节点
    - `getDepth()` - 获取深度
    - `isRoot()` - 是否为根节点
    - `toJSON()` - 序列化

3. **MindmapDocument 类**：
    - `constructor(root, template, theme)` - 构造函数
    - `toJSON()` - 序列化
    - `fromJSON(obj)` - 静态方法，从 JSON 创建

[Classes]

1. **MindmapNodeData** (新)
    - 文件: webview/src/types/index.ts
    - 方法: constructor, toJSON
    - 继承: 无

2. **MindmapNode** (转换自 interface)
    - 文件: webview/src/types/index.ts
    - 方法: constructor, addChild, removeChild, findNode, getDepth, isRoot, toJSON
    - 继承: 无

3. **MindmapDocument** (转换自 interface)
    - 文件: webview/src/types/index.ts
    - 方法: constructor, toJSON, static fromJSON
    - 继承: 无

[Dependencies]

无新增依赖。使用现有的 TypeScript 特性。

[Testing]

1. 验证 MindmapNode 类的方法正确工作
2. 验证 JSON 序列化/反序列化正确
3. 验证树结构操作（addChild, removeChild）正确
4. 验证 D3 布局计算不受影响
5. 验证所有组件正确使用新的类

[Implementation Order]

1. **Step 1**: 将 MindmapNodeData 转换为 class
2. **Step 2**: 将 MindmapNode 转换为 class
3. **Step 3**: 将 MindmapDocument 转换为 class
4. **Step 4**: 更新 D3TreeWrapper.ts 使用新类
5. **Step 5**: 更新 mindmapStore.ts
6. **Step 6**: 更新组件文件
7. **Step 7**: 运行 TypeScript 编译验证
8. **Step 8**: 运行 Vite 构建验证
9. **Step 9**: 运行完整测试

注意事项：
- 保持向后兼容性，所有属性和方法需要与现有接口一致
- 使用 4 空格缩进
- 添加 JSDoc 注释
- 确保 JSON 序列化与现有 .km 文件格式兼容