# Implementation Plan

[Overview]
根据 plans/1.md 的审查结果，修复 LaTeX Mindmap VS Code 扩展中的多个关键问题，包括：D3TreeWrapper 使用普通对象替代构造函数、MindmapNode 尺寸测量改用 offsetWidth/offsetHeight、MindmapCanvas 添加鼠标离开处理和全局 mousemove 清理、mindmapStore 尺寸变化时触发 relayoutVersion。

[Types]
无类型系统变更，仅修改现有代码逻辑。

[Files]

## D3TreeWrapper.ts
- 修改 `createVisibleTree` 函数，将 `new MindmapNode(...)` 改为普通对象 `{ data, children }`

## MindmapNode.tsx
- 修改测量尺寸 useEffect，使用 `offsetWidth / offsetHeight` 替代 `getBoundingClientRect()`
- 修改 `handleDoubleClick`，使用 `offsetWidth / offsetHeight` 记录冻结尺寸
- 外层节点 style 改 `overflow: 'visible'`
- 非编辑内容区域添加 `display: 'inline-block', whiteSpace: 'nowrap'`

## MindmapCanvas.tsx
- 新增 `handleMouseLeave` 函数（检查左键状态，如果按住则不处理）
- 新增全局 mousemove 清理 effect
- JSX 中 `onMouseLeave={handleMouseUp}` 改为 `onMouseLeave={handleMouseLeave}`

## mindmapStore.ts
- 修改 `updateNodeDimensions`，添加尺寸变化检测和 relayoutVersion 递增
- 修改 `batchUpdateNodeDimensions`，添加 relayoutVersion 递增

[Functions]

1. **D3TreeWrapper.ts - createVisibleTree**
   - 当前: `return new MindmapNode(node.data, []);`
   - 修改为: `return { data: node.data, children: [] };`

2. **MindmapNode.tsx - measureNode (useEffect)**
   - 当前: `const rect = nodeRef.current.getBoundingClientRect();`
   - 修改为: `const width = nodeRef.current.offsetWidth; const height = nodeRef.current.offsetHeight;`

3. **MindmapNode.tsx - handleDoubleClick**
   - 当前: `const nodeRect = nodeRef.current.getBoundingClientRect();`
   - 修改为: `const width = nodeRef.current.offsetWidth; const height = nodeRef.current.offsetHeight;`

4. **MindmapNode.tsx - 外层 div style**
   - 当前: `overflow: 'hidden'`
   - 修改为: `overflow: 'visible'`

5. **MindmapNode.tsx - 非编辑内容区域 style**
   - 添加: `display: 'inline-block', whiteSpace: 'nowrap'`

6. **MindmapCanvas.tsx - 新增 handleMouseLeave**
   - 检查左键状态，按住时不处理 mouseleave

7. **MindmapCanvas.tsx - 新增全局 mousemove 清理 effect**
   - 监听 window mousemove，左键释放时清理拖拽状态

8. **mindmapStore.ts - updateNodeDimensions**
   - 添加尺寸变化检测（误差 < 1 则跳过）
   - 添加 relayoutVersion 递增

9. **mindmapStore.ts - batchUpdateNodeDimensions**
   - 添加 relayoutVersion 递增

[Classes]
无类变更。

[Dependencies]
无依赖变更。

[Testing]
1. 修改后执行 `npm run build:webview` 验证编译
2. 按 F5 测试扩展功能
3. 验证以下场景：
   - 编辑时节点大小不变
   - 展开折叠按钮在节点外部正常显示
   - 拖拽预览只在左键按住时显示
   - 鼠标在 canvas 外释放不会导致状态残留

[Implementation Order]

1. [ ] 修改 D3TreeWrapper.ts - createVisibleTree 改用普通对象
2. [ ] 修改 MindmapNode.tsx - 尺寸测量改用 offsetWidth/offsetHeight
3. [ ] 修改 MindmapNode.tsx - 外层 overflow 改为 visible
4. [ ] 修改 MindmapNode.tsx - 非编辑内容区域添加 inline-block
5. [ ] 修改 MindmapCanvas.tsx - 新增 handleMouseLeave
6. [ ] 修改 MindmapCanvas.tsx - 新增全局 mousemove 清理
7. [ ] 修改 MindmapCanvas.tsx - onMouseLeave 改为 handleMouseLeave
8. [ ] 修改 mindmapStore.ts - updateNodeDimensions 添加 relayoutVersion
9. [ ] 修改 mindmapStore.ts - batchUpdateNodeDimensions 添加 relayoutVersion
10. [ ] 执行 build:webview 验证