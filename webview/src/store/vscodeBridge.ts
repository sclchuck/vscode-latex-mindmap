import { MindmapDocument } from '../types';

export interface VSCodeBridge {
  notifyDocumentChanged: (document: MindmapDocument) => void;
  requestSave: () => void;
}

// 获取 VS Code API
function getVSCodeAPI(): any {
  return (window as any).vscode || (window as any).vscodeApi;
}

// VS Code 桥接单例
let bridgeInstance: VSCodeBridge | null = null;

export function getVSCodeBridge(): VSCodeBridge {
  if (!bridgeInstance) {
    bridgeInstance = {
      notifyDocumentChanged: (document: MindmapDocument) => {
        const api = getVSCodeAPI();
        if (api) {
          console.log('[vscodeBridge] 通知文档变更');
          api.postMessage({ type: 'documentChanged', document });
        }
      },
      requestSave: () => {
        const api = getVSCodeAPI();
        if (api) {
          console.log('[vscodeBridge] 请求保存');
          api.postMessage({ type: 'requestSave' });
        }
      }
    };
  }
  return bridgeInstance;
}