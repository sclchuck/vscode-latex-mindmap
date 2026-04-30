# Debug Logging Implementation Plan

[Overview]
为脑图编辑器添加调试日志功能，用于追踪三个关键流程：源数据读取、节点生成、连接线渲染。

[Types]

新增日志相关类型定义：

```typescript
// 日志级别
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

// 日志条目
export interface LogEntry {
  timestamp: number;
  level: LogLevel;
  category: 'data' | 'node' | 'link';
  message: string;
  data?: any;
}

// 日志配置
export interface LogConfig {
  enabled: boolean;
  categories: {
    data: boolean;  // 源数据读取日志
    node: boolean;  // 节点生成日志
    link: boolean;  // 连线日志
  };
  maxEntries: number;
}
```

[Files]

需要修改的文件：

1. **webview/src/types/index.ts**
   - 添加 `LogLevel`, `LogEntry`, `LogConfig` 类型定义
   - 添加 `logConfig` 常量

2. **webview/src/utils/logger.ts** (新建)
   - 实现 `Logger` 类，提供 `debug()`, `info()`, `warn()`, `error()` 方法
   - 实现 `createDataLogger()`, `createNodeLogger()`, `createLinkLogger()` 工厂函数

3. **webview/src/layout/treeLayout.ts**
   - 在 `calculateTreeLayout` 函数开头添加数据读取日志
   - 在 `filterCollapsedNodes` 函数中添加折叠过滤日志
   - 在 `getLinkPath` 函数中添加连线日志

4. **webview/src/components/MindmapCanvas.tsx**
   - 在 `renderLinks` 函数中添加连线渲染日志

[Functions]

新建函数：

1. **Logger 类** (`webview/src/utils/logger.ts`)
   - `constructor(config: LogConfig)`
   - `debug(category: string, message: string, data?: any): void`
   - `info(category: string, message: string, data?: any): void`
   - `warn(category: string, message: string, data?: any): void`
   - `error(category: string, message: string, data?: any): void`
   - `getEntries(): LogEntry[]`
   - `clear(): void`

2. **createDataLogger()** - 创建源数据日志记录器
3. **createNodeLogger()** - 创建节点日志记录器
4. **createLinkLogger()** - 创建连线日志记录器

修改函数：

1. **calculateTreeLayout** (`treeLayout.ts`)
   - 在函数开始记录输入数据信息
   - 记录 D3 hierarchy 创建信息
   - 记录布局计算结果

2. **filterCollapsedNodes** (`treeLayout.ts`)
   - 记录每个被折叠/展开的节点信息

3. **getLinkPath** (`treeLayout.ts`)
   - 记录源节点和目标节点 ID
   - 记录生成的 SVG 路径

4. **renderLinks** (`MindmapCanvas.tsx`)
   - 记录连线渲染的节点数量
   - 记录每个连线路径

[Classes]

不需要新增类，Logger 作为工具类实现。

[Dependencies]

无新增依赖，使用现有 console API 和数组进行日志管理。

[Testing]

1. 单元测试 (`webview/src/utils/logger.test.ts`)
   - 测试 Logger 初始化
   - 测试不同级别日志记录
   - 测试分类过滤
   - 测试日志上限
   - 测试清空功能

2. 手动测试清单
   - [ ] 打开 .texmind 文件，验证数据读取日志输出
   - [ ] 添加新节点，验证节点生成日志
   - [ ] 验证连接线渲染日志

[Implementation Order]

1. 创建 `webview/src/utils/logger.ts`，实现基础 Logger 类
2. 在 `types/index.ts` 添加日志相关类型
3. 在 `treeLayout.ts` 添加源数据读取日志和连线日志
4. 在 `MindmapCanvas.tsx` 添加连线渲染日志
5. 运行构建验证
