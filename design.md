下面是一个适合 **TypeScript + VS Code Extension + Overleaf/LaTeX 语法节点渲染** 的 mindmap 插件大纲。重点不是只做“脑图”，而是做一个 **LaTeX-first 的结构化思维编辑器**。

## 1. 产品定位

插件名称可以暂定为：

**LaTeX Mindmap for VS Code**
或
**Overleaf Mindmap**

核心目标：

让用户在 VS Code 中用脑图方式组织内容，每个节点都支持类似 Overleaf 的 LaTeX 语法输入与渲染，适合写论文、数学推导、课程笔记、研究计划、公式结构图、知识图谱。

典型用户：

* 数学、物理、工程、计算机方向学生
* 写论文、讲义、教材的人
* 使用 Overleaf 但希望在 VS Code 中组织内容的人
* 需要公式密集型 mindmap 的用户

---

## 2. 核心功能大纲

### 2.1 Mindmap 编辑能力

基础节点能力：

* 新建根节点
* 添加子节点
* 添加兄弟节点
* 删除节点
* 折叠 / 展开节点
* 拖拽调整结构
* 节点缩放与画布平移
* 节点搜索
* 节点聚焦模式
* 快捷键操作

建议快捷键：

```text
Enter        添加兄弟节点
Tab          添加子节点
Delete       删除节点
Ctrl/Cmd + / 切换源码/预览
Ctrl/Cmd + F 搜索节点
Ctrl/Cmd + S 保存
```

---

### 2.2 节点内容完全走 Overleaf/LaTeX 语法

每个节点可以支持：

```latex
\textbf{Definition}

Let $f: X \to Y$ be a function.

$$
\forall x_1, x_2 \in X,\quad f(x_1)=f(x_2)\Rightarrow x_1=x_2
$$
```

节点显示时渲染为：

* 普通文本
* 行内公式 `$...$`
* 块级公式 `$$...$$`
* LaTeX 命令
* 简单环境，如 `align`, `matrix`, `cases`
* 可选支持 theorem/definition/proof 风格块

LaTeX 渲染方案建议：

* **MVP 阶段：KaTeX**
* **进阶阶段：MathJax**

KaTeX 在浏览器中集成简单，适合快速、轻量渲染；MathJax 4 对 TeX 输入和更复杂排版支持更强，但集成复杂度和性能成本通常更高。KaTeX 官方提供浏览器端渲染方式，MathJax 4 官方文档也说明其 TeX 输入处理器会把 TeX 数学表达式转换到内部格式再输出渲染结果。([KaTeX][1])

---

## 3. VS Code 插件形态

推荐使用 **Custom Editor + Webview**。

原因：

VS Code 的 Webview 可以在插件中渲染自定义 HTML/CSS/JS UI，适合实现脑图画布这类复杂交互界面；Custom Editor 则适合让某类文件，比如 `.latexmind` 或 `.mmtex`，用自定义 UI 打开并编辑。VS Code 官方文档也说明 Custom Editor 的视图侧通常通过 Webview 实现，而 Webview 与扩展进程通过消息通信。([Visual Studio Code][2])

建议文件扩展名：

```text
.lmind
.texmind
.mmtex
```

示例文件内容可以是 JSON：

```json
{
  "version": "0.1.0",
  "title": "Linear Algebra Notes",
  "nodes": [
    {
      "id": "root",
      "parentId": null,
      "content": "\\textbf{Linear Algebra}",
      "children": ["node-1", "node-2"]
    }
  ]
}
```

也可以设计成更接近 Markdown/LaTeX 的文本格式，但 MVP 推荐 JSON，便于保存结构和布局。

---

## 4. 技术架构

### 4.1 总体架构

```text
VS Code Extension Host
│
├── extension.ts
│   ├── 注册命令
│   ├── 注册 Custom Editor
│   ├── 管理文件读写
│   └── 与 Webview 通信
│
├── documentModel.ts
│   ├── 解析 .texmind 文件
│   ├── 维护节点树
│   ├── undo/redo 支持
│   └── 保存序列化
│
└── webview/
    ├── React / Svelte / Vue 前端
    ├── Mindmap Canvas
    ├── LaTeX Renderer
    ├── Node Editor
    └── State Store
```

---

### 4.2 推荐技术栈

插件侧：

```text
TypeScript
VS Code Extension API
CustomTextEditorProvider 或 CustomEditorProvider
esbuild / webpack / vite
```

Webview 前端：

```text
React + TypeScript
Zustand / Redux Toolkit
SVG / Canvas / React Flow
KaTeX / MathJax
```

脑图渲染选择：

| 方案             | 优点       | 缺点       | 建议     |
| -------------- | -------- | -------- | ------ |
| SVG 自研布局       | 可控性最高    | 开发量大     | 中后期    |
| React Flow     | 节点/边交互成熟 | 默认更像流程图  | MVP 可用 |
| D3 tree layout | 树布局强     | 交互需自己做   | 推荐     |
| Canvas         | 性能好      | DOM 编辑麻烦 | 大图进阶   |

MVP 推荐：

```text
React + D3 tree layout + SVG + KaTeX
```

---

## 5. 核心模块设计

### 5.1 Extension 注册模块

负责：

* 注册 `.texmind` 文件打开方式
* 注册命令
* 创建 Webview
* 监听 Webview 消息
* 保存文件

命令示例：

```json
{
  "contributes": {
    "commands": [
      {
        "command": "texmind.newMindmap",
        "title": "TeX Mindmap: New Mindmap"
      },
      {
        "command": "texmind.exportSvg",
        "title": "TeX Mindmap: Export as SVG"
      },
      {
        "command": "texmind.exportLatex",
        "title": "TeX Mindmap: Export as LaTeX"
      }
    ],
    "customEditors": [
      {
        "viewType": "texmind.editor",
        "displayName": "TeX Mindmap Editor",
        "selector": [
          {
            "filenamePattern": "*.texmind"
          }
        ]
      }
    ]
  }
}
```

---

### 5.2 文档模型模块

核心数据结构：

```ts
type TexMindNode = {
  id: string;
  parentId: string | null;
  children: string[];
  content: string;
  collapsed?: boolean;
  position?: {
    x: number;
    y: number;
  };
  style?: {
    type?: "default" | "definition" | "theorem" | "proof" | "warning";
  };
};

type TexMindDocument = {
  version: string;
  title: string;
  rootId: string;
  nodes: Record<string, TexMindNode>;
};
```

需要支持：

* `addNode`
* `deleteNode`
* `updateNodeContent`
* `moveNode`
* `collapseNode`
* `serialize`
* `deserialize`
* `validateDocument`

---

### 5.3 LaTeX 渲染模块

职责：

* 将节点源码渲染成 HTML
* 支持行内公式
* 支持块级公式
* 支持错误提示
* 支持预览 / 源码双模式
* 防止不安全 HTML 注入

接口示例：

```ts
type LatexRenderResult = {
  html: string;
  errors: LatexRenderError[];
};

function renderLatexNodeContent(source: string): LatexRenderResult;
```

建议：

* 默认用 KaTeX 渲染数学部分
* 文本部分做最小 Markdown-like 解析
* 不直接允许任意 HTML
* 节点编辑时显示源码
* 失焦后显示渲染结果

---

### 5.4 Mindmap 布局模块

职责：

* 根据节点树计算 x/y 坐标
* 支持横向树、纵向树、放射状布局
* 支持折叠节点
* 支持重排动画

布局类型：

```ts
type LayoutDirection = "left-right" | "top-down" | "radial";
```

MVP 只做：

```text
left-right tree layout
```

后续再加：

```text
top-down
radial
manual layout
```

---

### 5.5 节点编辑模块

节点交互状态：

* 预览态
* 编辑态
* 选中态
* 错误态
* 折叠态
* 拖拽态

编辑体验建议：

```text
单击：选中节点
双击：进入编辑
Esc：退出编辑
Ctrl/Cmd + Enter：完成编辑
Shift + Enter：节点内换行
```

节点编辑器可以先用普通 `textarea`，后期升级到 Monaco Editor 的轻量嵌入或 CodeMirror。

---

## 6. Overleaf 语法兼容范围

需要注意：Overleaf 本身是在线 LaTeX 编辑平台，不等于一种独立语法。你真正要支持的是 **LaTeX/TeX 语法体验接近 Overleaf**。

建议分阶段支持。

### MVP 支持

```latex
$E = mc^2$

$$
\int_a^b f(x)\,dx
$$

\frac{a}{b}
\sqrt{x}
\sum
\prod
\lim
\alpha, \beta, \gamma
```

### V1 支持

```latex
\begin{align}
a^2 + b^2 &= c^2 \\
x &= \frac{-b \pm \sqrt{b^2-4ac}}{2a}
\end{align}
```

```latex
\begin{cases}
x + y = 1 \\
x - y = 0
\end{cases}
```

### V2 支持

```latex
\begin{definition}
...
\end{definition}

\begin{theorem}
...
\end{theorem}

\begin{proof}
...
\end{proof}
```

### 不建议早期支持

```latex
\usepackage{...}
\newcommand{...}
\input{...}
\bibliography{...}
TikZ
PGFPlots
```

这些更接近完整 LaTeX 编译系统，复杂度会显著上升。

---

## 7. 数据存储设计

### 7.1 JSON 格式

优点：

* 结构清晰
* 易维护
* 易做 undo/redo
* 易导出
* 易扩展布局信息

示例：

```json
{
  "version": "0.1.0",
  "title": "Calculus",
  "rootId": "n1",
  "nodes": {
    "n1": {
      "id": "n1",
      "parentId": null,
      "children": ["n2"],
      "content": "\\textbf{Calculus}"
    },
    "n2": {
      "id": "n2",
      "parentId": "n1",
      "children": [],
      "content": "$$\\frac{d}{dx}x^n = nx^{n-1}$$"
    }
  }
}
```

### 7.2 后续可支持 Markdown-like 格式

例如：

```text
# \textbf{Calculus}
## Derivatives
### $$\frac{d}{dx}x^n = nx^{n-1}$$
## Integrals
### $$\int x^n dx = \frac{x^{n+1}}{n+1}+C$$
```

这种格式可读性更强，但保留布局、折叠状态、样式会麻烦。

---

## 8. 导出能力

建议导出：

### MVP

* PNG
* SVG
* JSON

### V1

* Markdown
* LaTeX outline
* PDF

### V2

* Overleaf project 结构
* `.tex` 文件
* Beamer slides
* HTML 页面

LaTeX 导出示例：

```latex
\section{Calculus}
\subsection{Derivatives}
\[
\frac{d}{dx}x^n = nx^{n-1}
\]
```

---

## 9. 开发路线图

### Phase 0：项目初始化

目标：能跑起来 VS Code 插件。

任务：

* 初始化 TypeScript VS Code extension
* 配置打包工具
* 注册命令
* 打开 Webview
* Webview 中渲染一个静态 mindmap

---

### Phase 1：MVP 编辑器

目标：可以创建、编辑、保存 `.texmind` 文件。

任务：

* 注册 Custom Editor
* 定义 JSON 文档模型
* Webview 与 Extension 双向通信
* 添加/删除/编辑节点
* 保存文件
* 基础 undo/redo

---

### Phase 2：LaTeX 节点渲染

目标：节点内容可以用 LaTeX 输入并显示。

任务：

* 集成 KaTeX
* 支持 `$...$`
* 支持 `$$...$$`
* 渲染错误提示
* 编辑态/预览态切换
* 节点内容缓存，避免频繁重复渲染

---

### Phase 3：脑图交互增强

目标：像真正的 mindmap 工具。

任务：

* 自动布局
* 拖拽节点
* 折叠/展开
* 缩放和平移
* 节点搜索
* 快捷键
* 小地图 minimap

---

### Phase 4：导出和生态集成

目标：与 LaTeX/Overleaf 工作流打通。

任务：

* 导出 SVG/PNG
* 导出 `.tex`
* 导出 Markdown
* 从 Markdown/LaTeX outline 导入
* 与 VS Code 文件资源管理器集成
* 支持命令面板操作

---

### Phase 5：高级能力

目标：成为公式型知识组织工具。

任务：

* 支持 theorem/definition/proof 节点
* 支持自定义宏 `\newcommand`
* 支持项目级宏文件
* 支持 BibTeX 引用预览
* 支持 TikZ 简单预览
* 支持协作或 Git diff 友好格式
* 支持 AI 辅助生成脑图结构

---

## 10. 推荐目录结构

```text
texmind-vscode/
├── package.json
├── tsconfig.json
├── src/
│   ├── extension.ts
│   ├── TexMindEditorProvider.ts
│   ├── TexMindDocument.ts
│   ├── commands/
│   │   ├── exportSvg.ts
│   │   └── exportLatex.ts
│   └── utils/
│       ├── nonce.ts
│       └── uri.ts
├── webview/
│   ├── index.html
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── store/
│   │   │   └── mindmapStore.ts
│   │   ├── components/
│   │   │   ├── MindmapCanvas.tsx
│   │   │   ├── MindmapNode.tsx
│   │   │   ├── NodeEditor.tsx
│   │   │   └── LatexPreview.tsx
│   │   ├── latex/
│   │   │   ├── renderLatex.ts
│   │   │   └── sanitize.ts
│   │   └── layout/
│   │       └── treeLayout.ts
│   └── vite.config.ts
└── README.md
```

---

## 11. MVP 最小验收标准

第一个可用版本建议做到：

```text
1. 用户可以新建 .texmind 文件
2. 用自定义编辑器打开
3. 显示一个可编辑 mindmap
4. 节点支持 LaTeX 输入
5. 节点失焦后渲染公式
6. 支持添加/删除/编辑节点
7. 支持保存和重新打开
8. 支持导出 SVG
```

---

## 12. 关键风险点

### 12.1 “完全 Overleaf 语法”范围过大

Overleaf 背后是完整 LaTeX 编译环境。VS Code Webview 中直接做到完全兼容不现实。建议产品定义为：

> 节点内容采用 LaTeX/Overleaf 风格输入，优先支持数学公式和常用排版命令。

### 12.2 LaTeX 渲染性能

大量节点同时渲染公式会卡顿。

解决方案：

* 节点进入视口再渲染
* 内容 hash 缓存
* 编辑态不实时全量渲染
* 大图时虚拟化渲染
* 优先 KaTeX，复杂内容再 MathJax fallback

### 12.3 Webview 安全

Webview 很强，但也需要注意安全边界。VS Code 官方建议 Webview 只在必要时使用，并遵循主题、可访问性和上下文相关性等 UX 规范。([Visual Studio Code][3])

应避免：

* 直接执行用户输入中的 HTML
* 允许外部脚本随意加载
* 不受控的 `eval`
* 未处理的消息通信

---

## 13. 建议的项目一句话定义

> 一个面向科研、数学和工程笔记的 VS Code mindmap 插件，使用 TypeScript 构建，节点内容以 LaTeX/Overleaf 风格语法编辑，并在脑图中即时渲染公式与结构化学术内容。

我建议你第一版不要追求“完整 Overleaf 编译”，而是先做 **LaTeX 数学公式脑图编辑器**，把 `$...$`、`$$...$$`、`align`、`cases`、节点增删改、保存导出打磨好。

[1]: https://katex.org/docs/browser.html?utm_source=chatgpt.com "Browser · KaTeX"
[2]: https://code.visualstudio.com/api/extension-guides/webview?utm_source=chatgpt.com "Webview API | Visual Studio Code Extension API"
[3]: https://code.visualstudio.com/api/ux-guidelines/webviews?utm_source=chatgpt.com "Webviews | Visual Studio Code Extension API"
