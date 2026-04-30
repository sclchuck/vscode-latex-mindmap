# LaTeX Mindmap 架构流程图

## 文件解析到渲染的完整流程

```mermaid
flowchart TB
    subgraph Extension["VS Code 扩展主机端 (src/)"]
        direction TB
        File["文件 (.km)<br/>JSON 格式"]
        
        File --> Parse["TexMindDocument.parse()<br/>解析 JSON"]
        
        Parse --> Doc1["TexMindDocument<br/>文档模型"]
        
        Doc1 --> Provider["TexMindEditorProvider<br/>Custom Editor Provider"]
        
        Provider --> |"postMessage init"| WebviewMsg["消息通信"]
    end
    
    subgraph Webview["Webview 前端 (webview/src/)"]
        direction TB
        
        WebviewMsg --> App["App.tsx<br/>主应用组件"]
        
        App --> Store["useMindmapStore<br/>Zustand 状态管理"]
        
        Store --> Canvas["MindmapCanvas.tsx<br/>画布组件"]
        
        Canvas --> Layout["treeLayout.ts<br/>布局计算"]
        
        Layout --> D3Wrapper["D3TreeWrapper.ts<br/>D3 树形布局"]
        
        D3Wrapper --> |"hierarchy()"| D3Tree["d3-hierarchy<br/>tree()"]
        
        D3Tree --> CalcLayout["calculateLayout()<br/>计算节点坐标"]
        
        CalcLayout --> |"nodes + links"| LayoutResult["LayoutResult<br/>{nodes, links, width, height}"]
        
        Canvas --> Nodes["MindmapNode.tsx<br/>节点渲染"]
        
        Nodes --> Latex["renderLatex.ts<br/>LaTeX 渲染"]
        
        Latex --> |"KaTeX"| Html["HTML 公式"]
        
        LayoutResult --> Canvas
        
        Html --> Nodes
    end
    
    subgraph Types["类型定义 (types/index.ts)"]
        direction TB
        NodeData["MindmapNodeData<br/>class"]
        Node["MindmapNode<br/>class"]
        Doc2["MindmapDocument<br/>class"]
        TreeNode["TreeLayoutNode<br/>interface"]
    end
    
    Doc1 -.-> |"序列化"| Doc2
    Store -.-> |"使用"| Node
    Layout -.-> |"使用"| Node
    D3Wrapper -.-> |"类型"| TreeNode
    Canvas -.-> |"类型"| Doc2
```

## 核心类交互关系

```mermaid
classDiagram
    class MindmapNodeData {
        +string id
        +number created
        +string text
        +string layout
        +"expand" | "collapse" expandState
        +constructor(data)
        +toJSON(): MindmapNodeDataInterface
        +static fromJSON(obj): MindmapNodeData
    }
    
    class MindmapNode {
        +MindmapNodeData data
        +MindmapNode[] children
        +constructor(data, children)
        +addChild(node): void
        +removeChild(nodeId): boolean
        +findNode(id): MindmapNode
        +toJSON(): object
        +static fromJSON(obj): MindmapNode
    }
    
    class MindmapDocument {
        +MindmapNode root
        +string template
        +string theme
        +string version
        +constructor(root, template, theme)
        +toJSON(): object
        +static fromJSON(obj): MindmapDocument
    }
    
    class D3TreeLayoutCalculator {
        -LayoutConfig config
        +constructor(config)
        +calculate(root): TreeLayoutResult
    }
    
    class LayoutCoordinateAdjuster {
        -LayoutDirection direction
        +adjust(nodes): T[]
    }
    
    class LinkPathGenerator {
        -LayoutDirection direction
        +generatePath(...): string
    }
    
    class TreeLayoutManager {
        -D3TreeLayoutCalculator calculator
        -LayoutCoordinateAdjuster adjuster
        -LinkPathGenerator pathGenerator
        +calculateLayout(root): LayoutResult
        +generateLinkPath(...): string
    }
    
    MindmapNodeData --> MindmapNode : data
    MindmapNode --> MindmapDocument : root
    MindmapNode *-- MindmapNodeData : contains
    MindmapDocument --> TreeLayoutManager : uses for layout
    TreeLayoutManager --> D3TreeLayoutCalculator : contains
    TreeLayoutManager --> LayoutCoordinateAdjuster : contains
    TreeLayoutManager --> LinkPathGenerator : contains
```

## 数据流向

```mermaid
flowchart LR
    subgraph Input["输入"]
        J[".km 文件<br/>JSON 字符串"]
    end
    
    subgraph Parse["解析阶段"]
        J --> P1["JSON.parse()"]
        P1 --> P2["MindmapDocument.fromJSON()"]
        P2 --> P3["MindmapNode.fromJSON()"]
        P3 --> P4["MindmapNodeData.fromJSON()"]
    end
    
    subgraph Model["数据模型"]
        P4 --> MD["MindmapNodeData"]
        P3 --> MN["MindmapNode"]
        P2 --> MDoc["MindmapDocument"]
    end
    
    subgraph Layout["布局计算"]
        MDoc --> LM["TreeLayoutManager"]
        LM --> D3["D3 tree layout"]
        D3 --> TLN["TreeLayoutNode[]"]
        TLN --> TLL["TreeLayoutLink[]"]
    end
    
    subgraph Render["渲染阶段"]
        TLN --> MN2["MindmapNode 组件"]
        TLL --> Links["SVG 连接线"]
        MN2 --> Latex["renderLatex()"]
        Latex --> Html["HTML 公式"]
        Html --> Final["最终脑图"]
        Links --> Final
    end
```

## 消息通信协议

```mermaid
sequenceDiagram
    participant Ext as Extension Host
    participant WV as Webview
    
    Note over Ext,WV: 初始化流程
    
    Ext->>WV: HTML with main.js
    WV->>Ext: postMessage({type: 'webviewReady'})
    Ext->>WV: postMessage({type: 'init', document})
    
    Note over Ext,WV: 节点操作
    
    WV->>Ext: postMessage({type: 'addChild', parentId, text})
    Ext->>WV: postMessage({type: 'documentUpdated', document})
    
    WV->>Ext: postMessage({type: 'updateNode', nodeId, updates})
    Ext->>WV: postMessage({type: 'documentUpdated', document})
    
    WV->>Ext: postMessage({type: 'toggleExpand', nodeId})
    Ext->>WV: postMessage({type: 'documentUpdated', document})
    
    Note over Ext,WV: 保存导出
    
    WV->>Ext: postMessage({type: 'save', document})
    Ext-->>WV: 文件保存成功
    
    WV->>Ext: postMessage({type: 'exportSvg', svgContent})
    Ext-->>WV: 显示保存对话框
```

## 文件与类对应关系

```mermaid
erDiagram
    FILE ||--|| CLASS : defines
    
    "TexMindEditorProvider.ts" {
        class TexMindEditorProvider
    }
    
    "types/index.ts" {
        class MindmapNodeData
        class MindmapNode
        class MindmapDocument
        interface TreeLayoutNode
        interface LayoutConfig
    }
    
    "D3TreeWrapper.ts" {
        class D3TreeLayoutCalculator
        class LayoutCoordinateAdjuster
        class LinkPathGenerator
        class TreeLayoutManager
    }
    
    "treeLayout.ts" {
        function calculateTreeLayout
        function getLinkPath
    }
    
    "MindmapCanvas.tsx" {
        class MindmapCanvas
    }
    
    "App.tsx" {
        class App
    }
    
    "renderLatex.ts" {
        function renderLatex
        function sanitizeLatex
    }
    
    "mindmapStore.ts" {
        class MindmapStore
    }
    
    "TexMindDocument.ts" {
        class TexMindDocument
    }
    
    TexMindEditorProvider ||--|| TexMindDocument : uses
    TexMindEditorProvider ||--|| MindmapDocument : serializes
    MindmapCanvas ||--|| MindmapDocument : displays
    MindmapCanvas ||--|| TreeLayoutNode : positions
    MindmapCanvas ||--|| MindmapNode : renders
    MindmapCanvas ||--|| MindmapStore : reads state
    MindmapNode ||--|| renderLatex : renders text
    MindmapCanvas ||--|| treeLayout : calculates
    treeLayout ||--|| D3TreeWrapper : wraps
    D3TreeWrapper ||--|| MindmapNode : types
```
