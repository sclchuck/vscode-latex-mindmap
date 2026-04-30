# LaTeX Mindmap for VS Code

一个面向科研、数学和工程笔记的 VS Code 脑图插件，使用 TypeScript 构建，节点内容以 LaTeX/Overleaf 风格语法编辑，并在脑图中即时渲染公式与结构化学术内容。

## 功能特性

### 核心功能
- 📝 **LaTeX 节点编辑** - 每个节点支持完整的 LaTeX 语法输入与渲染
- 🔢 **数学公式渲染** - 支持行内公式 `$...$` 和块级公式 `$$...$$`
- 🌲 **自动树形布局** - 基于 D3.js 的智能树形布局算法
- 💾 **文件保存** - 支持 .texmind 和 .km 格式保存
- 📤 **导出功能** - 支持导出 SVG 和 JSON 格式

### 交互功能
- ✏️ **双击编辑** - 双击节点进入编辑模式
- ➕ ➡️ **添加节点** - 使用 Tab 添加子节点，Enter 添加兄弟节点
- 🗑️ **删除节点** - 使用 Delete 或 Backspace 删除选中节点
- 🔍 **缩放平移** - 鼠标滚轮缩放，Ctrl+拖拽平移
- 📂 **折叠展开** - 点击节点右侧按钮折叠/展开子节点

### 快捷键
| 快捷键 | 功能 |
|--------|------|
| `Tab` | 添加子节点 |
| `Enter` | 添加兄弟节点 |
| `Delete` | 删除节点 |
| `Ctrl+拖拽` | 平移画布 |
| `滚轮` | 缩放 |

## 安装

1. 克隆本仓库到本地
2. 安装依赖：`npm install`
3. 编译插件：`npm run compile`
4. 构建 Webview：`npm run build:webview`
5. 在 VS Code 中按 `F5` 启动调试

## 使用方法

1. 打开命令面板 (`Ctrl+Shift+P`)
2. 输入 `TeX Mindmap: New Mindmap` 创建新脑图
3. 或直接创建 `.texmind` 文件
4. 双击根节点修改内容
5. 使用 Tab/Enter 添加新节点
6. 输入 LaTeX 公式如 `$E=mc^2$` 或 `$$\int_a^b f(x)dx$$`

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

## License

MIT
