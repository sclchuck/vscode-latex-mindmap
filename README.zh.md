[English](README.md) | [中文](README.zh.md)
# LaTeX Mindmap for VS Code

一个面向科研、数学和工程笔记的 VS Code 脑图插件，使用 TypeScript 构建，节点内容以 LaTeX/Overleaf 风格语法编辑，并在脑图中即时渲染公式与结构化学术内容。

## 功能特性

### 核心功能
- 📝 **LaTeX 节点编辑** - 每个节点支持完整的 LaTeX 语法输入与渲染
- 🔢 **数学公式渲染** - 支持行内公式 `$...$` 和块级公式 `$$...$$`
- 🌲 **自动树形布局** - 基于 D3.js 的智能树形布局算法
- 💾 **文件保存** - 支持 .texmind 和 .km 格式保存
- 📤 **导出功能** - 支持导出 SVG 和 JSON 格式

### 快捷键
| 快捷键 | 功能 |
|--------|------|
| `Tab` | 添加子节点 |
| `Enter` | 添加兄弟节点 |
| `Delete` | 删除节点 |
| `Space+拖拽 或者 右键拖拽` | 平移画布 |
| `滚轮` | 缩放 |

## 使用方法

1. 打开命令面板 (`Ctrl+Shift+P`)
2. 输入 `TeX Mindmap: New Mindmap` 创建新脑图
3. 或直接创建 `.km` 文件
4. 双击根节点修改内容
5. 使用 Tab/Enter 添加新节点
6. 输入 LaTeX 公式如 `$E=mc^2$` 或 `$$\int_a^b f(x)dx$$`
