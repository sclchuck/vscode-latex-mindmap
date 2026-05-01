[English](README.md) | [中文](README.zh.md)
# LaTeX Mindmap for VS Code

A VS Code mind mapping plugin designed for research, mathematics, and engineering note-taking. Built with TypeScript, it allows you to edit node content using LaTeX/Overleaf-style syntax and renders mathematical formulas and structured academic content instantly within the mind map.

## Features

### Core Features
- 📝 **LaTeX Node Editing** - Full LaTeX syntax input and rendering supported for each node
- 🔢 **Mathematical Formula Rendering** - Supports inline formulas `$...$` and block-level formulas `$$...$$`
- 🌲 **Automatic Tree Layout** - Intelligent tree layout algorithm based on D3.js
- 💾 **File Saving** - Supports saving in .texmind and .km formats
- 📤 **Export Features** - Supports exporting to SVG and JSON formats

### Keyboard Shortcuts
| Shortcut | Function |
|------- -|------|
| `Tab` | Add child node |
| `Enter` | Add sibling node |
| `Delete` | Delete node |
| `Space + drag or right-click and drag` | Pan the canvas |
| `Mouse wheel` | Zoom |

## How to Use

1. Open the command panel (`Ctrl+Shift+P`)
2. Type `TeX Mindmap: New Mindmap` to create a new mind map
3. Or create a `.km` file directly
4. Double-click the root node to edit its content
5. Use Tab/Enter to add new nodes
6. Enter LaTeX formulas such as `$E=mc^2$` or `$$\int_a^b f(x)dx$$`