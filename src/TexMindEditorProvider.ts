import * as vscode from 'vscode';
import * as path from 'path';
import { TexMindDocument } from './TexMindDocument';
import { MindmapDocument, createDefaultDocument } from './types';
import { getNonce } from './utils/nonce';

export class TexMindEditorProvider implements vscode.CustomTextEditorProvider {
  private context: vscode.ExtensionContext;
  private documentCache: Map<string, TexMindDocument> = new Map();
  private currentPanel: vscode.WebviewPanel | null = null;
  private applyingEditUris: Set<string> = new Set();

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  // 发送撤销/重做命令到 webview
  public sendUndoRedo(type: 'undo' | 'redo'): void {
    if (this.currentPanel) {
      console.log('[EXTENSION] 发送', type, '命令到 webview');
      this.currentPanel.webview.postMessage({ type });
    }
  }

  // 解析自定义文本编辑器
  resolveCustomTextEditor(
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel,
    token: vscode.CancellationToken
  ): void | Thenable<void> {
    // 保存当前 panel 引用
    this.currentPanel = webviewPanel;

    // 获取或创建文档
    let texMindDoc = this.documentCache.get(document.uri.toString());
    if (!texMindDoc) {
      if (document.getText().trim()) {
        texMindDoc = TexMindDocument.parse(document.getText());
      } else {
        texMindDoc = new TexMindDocument(createDefaultDocument());
      }
      this.documentCache.set(document.uri.toString(), texMindDoc);
    }

    // 配置 Webview
    webviewPanel.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.file(path.join(this.context.extensionPath, 'webview')),
      ],
    };

    // 设置 HTML 内容
    webviewPanel.webview.html = this.getHtmlForWebview(webviewPanel.webview);

    // 使用 ref 对象来保存 webview 状态（避免闭包问题）
    const webviewState = { ready: false };

    // 处理来自 Webview 的消息
    webviewPanel.webview.onDidReceiveMessage(async (message) => {
      // 处理 webviewReady 消息
      if (message.type === 'webviewReady') {
        webviewState.ready = true;
        if (texMindDoc) {
          webviewPanel.webview.postMessage({
            type: 'init',
            document: texMindDoc.getDocument()
          });
        }
        return;
      }

      // 如果 webview 还没准备好，忽略其他消息
      if (!webviewState.ready) {
        console.log('webview not ready yet, ignoring message:', message.type);
        return;
      }

      console.log('[EXTENSION] 收到消息类型:', message.type, message);
      
      switch (message.type) {
        case 'update':
          // 更新文档
          console.log('[EXTENSION] 执行 update 操作');
          const updatedDoc = message.document as MindmapDocument;
          texMindDoc!.setDocument(updatedDoc);
          console.log('[EXTENSION] 文档已更新');
          break;

        case 'save':
          // 保存文档
          console.log('[EXTENSION] 执行 save 操作');
          await this.saveDocument(document, message.document);
          // 通知 webview 保存完成
          webviewPanel.webview.postMessage({ type: 'mindmap.saved' });
          break;
        
        case 'documentChanged':
          // Webview 通知文档已变更，更新本地缓存并同步 TextDocument
          console.log('[EXTENSION] 收到 documentChanged 消息');
          const changedDoc = message.document as MindmapDocument;
          texMindDoc!.setDocument(changedDoc);
          // 让 VS Code 知道 TextDocument 已变脏，但不保存
          await this.updateTextDocumentWithoutSaving(document, changedDoc);
          break;
        
        case 'requestSave':
          // Webview 请求 VS Code 保存
          console.log('[EXTENSION] 收到 requestSave 请求');
          const currentDoc = texMindDoc!.getDocument();
          await this.saveDocument(document, currentDoc);
          webviewPanel.webview.postMessage({ type: 'mindmap.saved' });
          break;

        case 'exportSvg':
          // 导出 SVG
          console.log('[EXTENSION] 执行 exportSvg 操作');
          await this.exportSvg(webviewPanel, message.svgContent);
          break;

        case 'exportJson':
          // 导出 JSON
          console.log('[EXTENSION] 执行 exportJson 操作');
          await this.exportJson(document, message.document);
          break;

        case 'addChild':
          // 添加子节点
          console.log('[EXTENSION] 执行 addChild 操作, parentId:', message.parentId);
          const newChild = texMindDoc!.addChildNode(message.parentId, message.text);
          console.log('[EXTENSION] addChild 结果:', newChild ? '成功' : '失败');
          if (newChild) {
            console.log('[EXTENSION] 发送 documentUpdated 消息');
            webviewPanel.webview.postMessage({
              type: 'documentUpdated',
              document: texMindDoc!.getDocument()
            });
          }
          break;

        case 'addSibling':
          // 添加兄弟节点
          console.log('[EXTENSION] 执行 addSibling 操作, nodeId:', message.nodeId);
          const newSibling = texMindDoc!.addSiblingNode(message.nodeId, message.text);
          console.log('[EXTENSION] addSibling 结果:', newSibling ? '成功' : '失败');
          if (newSibling) {
            console.log('[EXTENSION] 发送 documentUpdated 消息');
            webviewPanel.webview.postMessage({
              type: 'documentUpdated',
              document: texMindDoc!.getDocument()
            });
          }
          break;

        case 'deleteNode':
          // 删除节点
          console.log('[EXTENSION] 执行 deleteNode 操作, nodeId:', message.nodeId);
          const deleted = texMindDoc!.deleteNode(message.nodeId);
          console.log('[EXTENSION] deleteNode 结果:', deleted ? '成功' : '失败');
          if (deleted) {
            console.log('[EXTENSION] 发送 documentUpdated 消息');
            webviewPanel.webview.postMessage({
              type: 'documentUpdated',
              document: texMindDoc!.getDocument()
            });
          }
          break;

        case 'updateNode':
          // 更新节点
          console.log('[EXTENSION] 执行 updateNode 操作, nodeId:', message.nodeId);
          texMindDoc!.updateNode(message.nodeId, message.updates);
          console.log('[EXTENSION] 发送 documentUpdated 消息');
          webviewPanel.webview.postMessage({
            type: 'documentUpdated',
            document: texMindDoc!.getDocument()
          });
          break;

        case 'toggleExpand':
          // 切换展开状态
          console.log('[EXTENSION] 执行 toggleExpand 操作, nodeId:', message.nodeId);
          texMindDoc!.toggleExpand(message.nodeId);
          console.log('[EXTENSION] 发送 documentUpdated 消息');
          webviewPanel.webview.postMessage({
            type: 'documentUpdated',
            document: texMindDoc!.getDocument()
          });
          break;

        case 'moveNode':
          // 移动节点
          console.log('[EXTENSION] 执行 moveNode 操作, nodeId:', message.nodeId, 'newParentId:', message.newParentId);
          if (texMindDoc!.moveNode(message.nodeId, message.newParentId)) {
            console.log('[EXTENSION] 发送 documentUpdated 消息');
            webviewPanel.webview.postMessage({
              type: 'documentUpdated',
              document: texMindDoc!.getDocument()
            });
          }
          break;
      }
    });

    // 监听文档变化
    const changeDisposable = vscode.workspace.onDidChangeTextDocument((e) => {
      if (e.document !== document) return;

      const uriKey = document.uri.toString();

      // 忽略本扩展自己 applyEdit 引发的变化
      if (this.applyingEditUris.has(uriKey)) {
        console.log('[EXTENSION] 忽略内部 applyEdit 引发的 TextDocument 变化');
        return;
      }

      console.log('[EXTENSION] 检测到外部 TextDocument 修改，重新加载');

      texMindDoc = TexMindDocument.parse(document.getText());
      this.documentCache.set(uriKey, texMindDoc);

      webviewPanel.webview.postMessage({
        type: 'documentUpdated',
        document: texMindDoc.getDocument()
      });
    });

    // 监听文件删除
    const deleteDisposable = vscode.workspace.onDidDeleteFiles((e) => {
      for (const uri of e.files) {
        if (uri.toString() === document.uri.toString()) {
          this.documentCache.delete(document.uri.toString());
          webviewPanel.dispose();
        }
      }
    });

    // 监听面板关闭
    webviewPanel.onDidDispose(() => {
      changeDisposable.dispose();
      deleteDisposable.dispose();
      this.documentCache.delete(document.uri.toString());
      if (this.currentPanel === webviewPanel) {
        this.currentPanel = null;
      }
    });
  }

  // 保存文档
  private async saveDocument(document: vscode.TextDocument, content: MindmapDocument): Promise<void> {
    const uriKey = document.uri.toString();

    this.applyingEditUris.add(uriKey);

    try {
      const edit = new vscode.WorkspaceEdit();
      edit.replace(
        document.uri,
        new vscode.Range(0, 0, document.lineCount, 0),
        JSON.stringify(content, null, 2)
      );
      await vscode.workspace.applyEdit(edit);
    } finally {
      setTimeout(() => {
        this.applyingEditUris.delete(uriKey);
      }, 100);
    }

    await document.save();
  }

  // 更新 TextDocument 但不保存（让 VS Code 知道文件变脏）
  private async updateTextDocumentWithoutSaving(
    document: vscode.TextDocument,
    content: MindmapDocument
  ): Promise<void> {
    const uriKey = document.uri.toString();

    this.applyingEditUris.add(uriKey);

    try {
      const edit = new vscode.WorkspaceEdit();
      edit.replace(
        document.uri,
        new vscode.Range(0, 0, document.lineCount, 0),
        JSON.stringify(content, null, 2)
      );
      await vscode.workspace.applyEdit(edit);
    } finally {
      setTimeout(() => {
        this.applyingEditUris.delete(uriKey);
      }, 100);
    }
  }

  // 导出 SVG
  private async exportSvg(webviewPanel: vscode.WebviewPanel, svgContent: string): Promise<void> {
    const uri = await vscode.window.showSaveDialog({
      defaultUri: vscode.Uri.file('mindmap.svg'),
      filters: {
        'SVG Files': ['svg'],
        'All Files': ['*']
      }
    });

    if (uri) {
      const encoder = new TextEncoder();
      await vscode.workspace.fs.writeFile(uri, encoder.encode(svgContent));
      vscode.window.showInformationMessage('SVG exported successfully!');
    }
  }

  // 导出 JSON
  private async exportJson(document: vscode.TextDocument, content: MindmapDocument): Promise<void> {
    const uri = await vscode.window.showSaveDialog({
      defaultUri: vscode.Uri.file('mindmap.json'),
      filters: {
        'JSON Files': ['json'],
        'All Files': ['*']
      }
    });

    if (uri) {
      const encoder = new TextEncoder();
      await vscode.workspace.fs.writeFile(uri, encoder.encode(JSON.stringify(content, null, 2)));
      vscode.window.showInformationMessage('JSON exported successfully!');
    }
  }

  // 获取 Webview HTML
  private getHtmlForWebview(webview: vscode.Webview): string {
    const nonce = getNonce();

    // 获取资源文件 URI
    const mainJsUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, 'webview', 'dist', 'assets', 'main.js')
    );
    const mainCssUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, 'webview', 'dist', 'assets', 'main.css')
    );
    const katexCssUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, 'webview', 'public', 'katex.min.css')
    );

    // 直接构建 HTML，不依赖文件替换
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} https: data:; script-src ${webview.cspSource} 'nonce-${nonce}' 'unsafe-inline' 'unsafe-eval'; style-src ${webview.cspSource} 'unsafe-inline'; font-src ${webview.cspSource} data:;">
  <link href="${katexCssUri}" rel="stylesheet">
  <link href="${mainCssUri}" rel="stylesheet">
  <title>LaTeX Mindmap</title>
</head>
<body>
  <script type="text/javascript" nonce="${nonce}">
    window.vscode = acquireVsCodeApi();
    window.vscodeApi = window.vscode;
  </script>
  <div id="root"></div>
  <script type="module" src="${mainJsUri}"></script>
</body>
</html>`;
  }
}