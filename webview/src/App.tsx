import { useEffect, useCallback, useRef } from 'react';
import { MindmapCanvas } from './components/MindmapCanvas';
import { Toolbar } from './components/Toolbar';
import { useMindmapStore } from './store/mindmapStore';
import { useMindmapShortcuts } from './hooks/useMindmapShortcuts';
import { HostMessage, WebviewMessage } from './types';

// VS Code API 类型（从 HTML 预加载）
declare global {
  interface Window {
    vscode: {
      postMessage: (message: any) => void;
      getState: () => any;
      setState: (state: any) => void;
    };
    vscodeApi: {
      postMessage: (message: any) => void;
      getState: () => any;
      setState: (state: any) => void;
    };
  }
}

export const App: React.FC = () => {
  const vscodeRef = useRef<typeof window.vscode | null>(null);
  const undoRef = useRef<() => void>(() => {});
  const redoRef = useRef<() => void>(() => {});
  const canUndoRef = useRef<() => boolean>(() => false);
  const canRedoRef = useRef<() => boolean>(() => false);
  const isApplyingRef = useRef(false); // 标记是否正在应用外部更新
  
  // 注册快捷键监听
  useMindmapShortcuts();
  
  const {
    document,
    setDocument,
    setTheme,
    setLayoutDirection,
    isDirty,
    markClean,
    undo,
    redo,
    canUndo,
    canRedo,
    addNode,
    removeNode,
    findNode,
    switchNodeFold,
  } = useMindmapStore();
  
  // 通知文档已变更（不保存，不 markClean）
  const notifyDocumentChanged = useCallback(() => {
    const currentDoc = useMindmapStore.getState().document;
    if (currentDoc && vscodeRef.current) {
      console.log('[APP] 通知主机文档已变更');
      vscodeRef.current.postMessage({ type: 'documentChanged', document: currentDoc });
    }
  }, []);

  // 保存文档到主机（用户明确保存时调用）
  const saveDocument = useCallback(() => {
    const currentDoc = useMindmapStore.getState().document;
    if (currentDoc && vscodeRef.current) {
      console.log('[APP] 请求保存文档到主机');
      vscodeRef.current.postMessage({ type: 'save', document: currentDoc });
      // 不在这里 markClean，等收到 mindmap.saved 后再 markClean
    }
  }, []);
  
  // 使用 ref 保存最新函数，避免闭包问题
  useEffect(() => {
    undoRef.current = () => {
      console.log('[APP] 执行撤销, canUndo:', canUndo());
      if (canUndo()) {
        undo();
        // 撤销后通知变更，不自动保存
        notifyDocumentChanged();
      }
    };
    redoRef.current = () => {
      console.log('[APP] 执行重做, canRedo:', canRedo());
      if (canRedo()) {
        redo();
        // 重做后通知变更，不自动保存
        notifyDocumentChanged();
      }
    };
    canUndoRef.current = canUndo;
    canRedoRef.current = canRedo;
  }, [undo, redo, canUndo, canRedo, notifyDocumentChanged]);
  
  // 初始化
  useEffect(() => {
    console.log('[APP] Webview 初始化开始');
    
    // 使用预加载的 VS Code API
    vscodeRef.current = window.vscode;
    
    // 通知主机扩展已准备好
    if (vscodeRef.current) {
      console.log('[APP] 发送 webviewReady 消息');
      vscodeRef.current.postMessage({ type: 'webviewReady' });
    } else {
      console.warn('[APP] VS Code API 不可用!');
    }
    
    // 监听来自主机的消息
    const handleMessage = (event: MessageEvent) => {
      const message = event.data as WebviewMessage;
      console.log('[APP] 收到消息:', message.type);
      
      switch (message.type) {
        case 'init':
        case 'documentUpdated':
          // 标记正在应用外部更新，跳过操作记录
          isApplyingRef.current = true;
          console.log('[APP] 设置文档:', message.document.root.data.id);
          console.log('[APP] 根节点文本:', message.document.root.data.text);
          console.log('[APP] 子节点数:', message.document.root.children.length);
          console.log('[APP] 主题:', message.document.theme);
          console.log('[APP] 布局方向:', message.document.template);
          setDocument(message.document);
          setTheme(message.document.theme);
          setLayoutDirection(message.document.template as any);
          markClean(); // 收到新文档时清除脏标记
          // 重置标记
          setTimeout(() => { isApplyingRef.current = false; }, 100);
          break;
        
        case 'mindmap.saved':
          console.log('[APP] 保存完成，清除 dirty');
          markClean();
          break;
          
        case 'undo':
          console.log('[APP] 收到主机 undo');
          undoRef.current();
          break;
          
        case 'redo':
          console.log('[APP] 收到主机 redo');
          redoRef.current();
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [setDocument, setTheme, setLayoutDirection, markClean]);
  
  // 发送消息到主机
  const postMessage = useCallback((message: HostMessage) => {
    if (vscodeRef.current) {
      vscodeRef.current.postMessage(message);
    }
  }, []);
  
  // 保存文档
  const handleSave = useCallback(() => {
    if (document) {
      console.log('[APP] 手动保存文档');
      postMessage({ type: 'save', document });
      markClean();
    }
  }, [document, postMessage, markClean]);
  
  // 导出 SVG
  const handleExportSvg = useCallback(() => {
    const svgElement = globalThis.document.querySelector('svg');
    if (svgElement) {
      const svgContent = svgElement.outerHTML;
      postMessage({ type: 'exportSvg', svgContent });
    }
  }, [postMessage]);
  
  // 导出 JSON
  const handleExportJson = useCallback(() => {
    if (document) {
      postMessage({ type: 'exportJson', document });
    }
  }, [document, postMessage]);
  
  // 更新节点（内容变更通过 MindmapNode 的 changeNodeContent）
  const handleUpdateNode = useCallback((nodeId: string, updates: any) => {
    postMessage({ type: 'updateNode', nodeId, updates });
  }, [postMessage]);
  
  // 切换展开/折叠 - 使用 store 方法
  const handleToggleExpand = useCallback((nodeId: string) => {
    if (isApplyingRef.current) return;
    
    console.log('[APP] handleToggleExpand:', nodeId);
    const node = findNode(nodeId);
    if (node) {
      const oldState = node.data.expandState || 'expand';
      const newState = oldState === 'expand' ? 'collapse' : 'expand';
      switchNodeFold(nodeId, oldState, newState);
      // 通知变更，不保存
      notifyDocumentChanged();
    }
  }, [findNode, switchNodeFold, notifyDocumentChanged]);
  
  // 添加子节点 - 使用 store 方法
  const handleAddChild = useCallback((parentId: string) => {
    if (isApplyingRef.current) return;
    
    console.log('[APP] handleAddChild:', parentId);
    const newNode = addNode(parentId, 'New Node');
    if (newNode) {
      console.log('[APP] 成功添加节点:', newNode.data.id);
      // 通知变更，不保存
      notifyDocumentChanged();
    }
  }, [addNode, notifyDocumentChanged]);
  
  // 添加兄弟节点 - 使用 store 方法
  const handleAddSibling = useCallback((nodeId: string) => {
    if (isApplyingRef.current) return;
    
    console.log('[APP] handleAddSibling:', nodeId);
    const { getParentNode } = useMindmapStore.getState();
    const parentInfo = getParentNode(nodeId);
    if (parentInfo) {
      const newNode = addNode(parentInfo.parent.data.id, 'New Node');
      if (newNode) {
        console.log('[APP] 成功添加兄弟节点:', newNode.data.id);
        // 通知变更，不保存
        notifyDocumentChanged();
      }
    }
  }, [addNode, notifyDocumentChanged]);
  
  // 删除节点 - 使用 store 方法
  const handleDeleteNode = useCallback((nodeId: string) => {
    if (isApplyingRef.current) return;
    
    console.log('[APP] handleDeleteNode:', nodeId);
    const success = removeNode(nodeId);
    if (success) {
      console.log('[APP] 成功删除节点');
      // 通知变更，不保存
      notifyDocumentChanged();
    }
  }, [removeNode, notifyDocumentChanged]);
  
  // 撤销（由 Toolbar 按钮触发）
  const handleUndo = useCallback(() => {
    console.log('[APP] Toolbar 触发撤销, canUndo:', canUndoRef.current());
    undoRef.current();
  }, []);
  
  // 重做（由 Toolbar 按钮触发）
  const handleRedo = useCallback(() => {
    console.log('[APP] Toolbar 触发重做, canRedo:', canRedoRef.current());
    redoRef.current();
  }, []);
  
  if (!document) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        color: '#888',
      }}>
        Loading...
      </div>
    );
  }
  
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }}>
      <Toolbar
        onSave={handleSave}
        onExportSvg={handleExportSvg}
        onExportJson={handleExportJson}
        isDirty={isDirty}
        canUndo={canUndo()}
        canRedo={canRedo()}
        onUndo={handleUndo}
        onRedo={handleRedo}
      />
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <MindmapCanvas
          document={document}
          onUpdateNode={handleUpdateNode}
          onToggleExpand={handleToggleExpand}
          onAddChild={handleAddChild}
          onAddSibling={handleAddSibling}
          onDeleteNode={handleDeleteNode}
        />
      </div>
    </div>
  );
};