import { useEffect } from 'react';
import { useMindmapStore } from '../store/mindmapStore';

// 发送文档变更消息（不保存）
function postDocumentChanged() {
  const currentDoc = useMindmapStore.getState().document;
  if (currentDoc && window.vscode) {
    console.log('[useMindmapShortcuts] 通知文档已变更');
    window.vscode.postMessage({
      type: 'documentChanged',
      document: currentDoc
    });
  }
}

export function useMindmapShortcuts() {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMod = e.ctrlKey || e.metaKey;
      if (!isMod) return;

      const key = e.key.toLowerCase();

      // Ctrl/Cmd + S - 保存
      if (key === 's') {
        e.preventDefault();
        e.stopPropagation();
        console.log('[useMindmapShortcuts] Ctrl+S 保存');

        const currentDoc = useMindmapStore.getState().document;
        if (currentDoc && window.vscode) {
          window.vscode.postMessage({
            type: 'save',
            document: currentDoc
          });
          // 不 markClean，等收到 mindmap.saved 后再 markClean
        }
        return;
      }

      // Ctrl/Cmd + Z - 撤销
      if (key === 'z' && !e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();

        const store = useMindmapStore.getState();
        console.log('[useMindmapShortcuts] Ctrl+Z 撤销, canUndo:', store.canUndo());

        if (store.canUndo()) {
          store.undo();
          postDocumentChanged();
        }
        return;
      }

      // Ctrl + Y 或 Cmd/Ctrl + Shift + Z - 重做
      const isRedo = key === 'y' || (key === 'z' && e.shiftKey);

      if (isRedo) {
        e.preventDefault();
        e.stopPropagation();

        const store = useMindmapStore.getState();
        console.log('[useMindmapShortcuts] 重做, canRedo:', store.canRedo());

        if (store.canRedo()) {
          store.redo();
          postDocumentChanged();
        }
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, []);
}