
## 数据格式

```json
{
  "root": {
    "data": {
      "id": "node123",
      "created": 1234567890,
      "text": "\\textbf{My Mindmap}",
      "expandState": "expand"
    },
    "children": [
      {
        "data": {
          "id": "node456",
          "created": 1234567891,
          "text": "$$\\frac{d}{dx}x^n = nx^{n-1}$$"
        },
        "children": []
      }
    ]
  },
  "template": "right",
  "theme": "fresh-blue",
  "version": "1.0.0"
}
```

## 支持的 LaTeX 语法

### MVP 支持
- 行内公式：`$E=mc^2$`
- 块级公式：`$$\int_a^b f(x)\,dx$$`
- 常用命令：`\frac`, `\sqrt`, `\sum`, `\prod`, `\lim`
- 希腊字母：`\alpha`, `\beta`, `\gamma`, `\pi`, `\theta`

### 进阶支持
- `align` 环境
- `cases` 环境
- 矩阵

## 技术栈

- **插件框架**：VS Code Extension API
- **语言**：TypeScript
- **前端**：React 18
- **状态管理**：Zustand
- **布局算法**：D3-hierarchy
- **LaTeX 渲染**：KaTeX
- **构建工具**：Vite

## 目录结构

```
vscode-latex-mindmap/
├── src/                    # 插件主机代码
│   ├── extension.ts        # 插件入口
│   ├── TexMindEditorProvider.ts  # Custom Editor Provider
│   ├── TexMindDocument.ts  # 文档模型
│   └── utils/              # 工具函数
├── webview/                # Webview 前端代码
│   ├── src/
│   │   ├── components/    # React 组件
│   │   ├── store/         # Zustand 状态
│   │   ├── latex/         # LaTeX 渲染
│   │   └── layout/        # 布局算法
│   └── dist/              # 构建产物
├── package.json           # 插件配置
└── tsconfig.json          # TypeScript 配置
```

## 开发路线图

- [x] Phase 1: 项目初始化与基础架构
- [x] Phase 2: MVP 编辑器（节点增删改查）
- [x] Phase 3: LaTeX 节点渲染
- [x] Phase 4: 脑图交互增强（布局、缩放、折叠）
- [ ] Phase 5: 导出功能（SVG/PNG/PDF）
- [ ] Phase 6: 高级能力（theorem/definition 节点、宏支持）
