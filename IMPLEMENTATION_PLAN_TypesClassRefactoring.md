# Implementation Plan: Types Class Refactoring

[Overview]

将 `webview/src/types/index.ts` 中的所有 interface、type 和 class 重构为独立文件，每个类型一个文件，遵从一个文件一个类原则，使用 C# 风格的强类型实现。

[Types]

需要重构成 class 的类型：

1. **MindmapNodeData** - 节点数据类
2. **MindmapNode** - 完整节点类
3. **MindmapDocument** - 文档根类
4. **LayoutConfig** - 布局配置类
5. **ThemeConfig** - 主题配置类
6. **LatexRenderResult** - LaTeX 渲染结果类
7. **LatexRenderError** - LaTeX 渲染错误类

保留为 type/interface（不可实例化）：

1. **LayoutDirection** - type
2. **TreeLayoutNode** - interface
3. **TreeLayoutLink** - interface
4. **TreeLayoutResult** - interface（部分保留）
5. **WebviewMessage** - type
6. **HostMessage** - type

[Files]

创建的新文件：

```
webview/src/types/
├── index.ts                    # 导出入口
├── MindmapNodeData.ts          # 节点数据类
├── MindmapNode.ts              # 完整节点类
├── MindmapDocument.ts          # 文档根类
├── LayoutConfig.ts             # 布局配置类
├── ThemeConfig.ts              # 主题配置类
├── LatexRenderResult.ts        # LaTeX 渲染结果类
├── LatexRenderError.ts         # LaTeX 渲染错误类
├── LayoutDirection.ts         # 布局方向 type
├── TreeLayoutNode.ts          # 树形布局节点 interface
├── TreeLayoutLink.ts          # 树形布局链接 interface
├── WebviewMessage.ts          # Webview 消息 type
└── HostMessage.ts             # 主机消息 type
```

修改的文件：

1. **webview/src/types/index.ts** - 简化为导出入口
2. **webview/src/layout/D3TreeWrapper.ts** - 更新导入路径
3. **webview/src/store/mindmapStore.ts** - 更新导入路径
4. **webview/src/components/MindmapCanvas.tsx** - 更新导入路径
5. **webview/src/App.tsx** - 更新导入路径
6. **其他使用 types 的文件** - 更新导入路径

[Functions]

无新增函数，所有功能保留在类方法中。

[Classes]

1. **MindmapNodeData** (新文件: MindmapNodeData.ts)
    - 属性: id, created, text, layout, expandState
    - 方法: constructor, toJSON, static fromJSON

2. **MindmapNode** (新文件: MindmapNode.ts)
    - 属性: data, children
    - 方法: constructor, addChild, removeChild, findNode, getDepth, isRoot, hasChildren, getChildCount, toJSON, static fromJSON

3. **MindmapDocument** (新文件: MindmapDocument.ts)
    - 属性: root, template, theme, version
    - 方法: constructor, toJSON, static fromJSON

4. **LayoutConfig** (新文件: LayoutConfig.ts)
    - 属性: nodeWidth, nodeHeight, horizontalSpacing, verticalSpacing, direction
    - 方法: constructor

5. **ThemeConfig** (新文件: ThemeConfig.ts)
    - 属性: name, nodeBackground, nodeBorder, nodeText, rootBackground, rootBorder, rootText, lineColor, selectedBackground, selectedBorder
    - 方法: constructor

6. **LatexRenderResult** (新文件: LatexRenderResult.ts)
    - 属性: html, errors
    - 方法: constructor

7. **LatexRenderError** (新文件: LatexRenderError.ts)
    - 属性: message, position
    - 方法: constructor

[Dependencies]

无新增依赖，仅重构现有代码结构。

[Testing]

1. TypeScript 编译验证
2. Vite 构建验证
3. 运行时测试

[Implementation Order]

1. 创建 MindmapNodeData.ts
2. 创建 MindmapNode.ts
3. 创建 MindmapDocument.ts
4. 创建 LayoutConfig.ts
5. 创建 ThemeConfig.ts
6. 创建 LatexRenderResult.ts
7. 创建 LatexRenderError.ts
8. 创建 type 文件（LayoutDirection.ts, TreeLayoutNode.ts, TreeLayoutLink.ts, WebviewMessage.ts, HostMessage.ts）
9. 更新 index.ts 为导出入口
10. 更新所有导入路径
11. 运行编译验证
12. 运行构建验证