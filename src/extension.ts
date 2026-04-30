import * as vscode from 'vscode';
import { TexMindEditorProvider } from './TexMindEditorProvider';
import { createDefaultDocument } from './types';

export function activate(context: vscode.ExtensionContext) {
  console.log('LaTeX Mindmap extension is now active!');

  // 注册 Custom Editor Provider
  const editorProvider = new TexMindEditorProvider(context);
  context.subscriptions.push(
    vscode.window.registerCustomEditorProvider(
      'texmind.editor',
      editorProvider,
      {
        webviewOptions: {
          retainContextWhenHidden: true,
        },
      }
    )
  );

  // 注册新建脑图命令
  context.subscriptions.push(
    vscode.commands.registerCommand('texmind.newMindmap', async () => {
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      if (!workspaceFolder) {
        vscode.window.showErrorMessage('Please open a folder first.');
        return;
      }

      const uri = await vscode.window.showSaveDialog({
        defaultUri: vscode.Uri.joinPath(workspaceFolder.uri, 'untitled.texmind'),
        filters: {
          'TeX Mindmap Files': ['texmind'],
          'All Files': ['*']
        }
      });

      if (uri) {
        const defaultDoc = createDefaultDocument();
        const encoder = new TextEncoder();
        await vscode.workspace.fs.writeFile(uri, encoder.encode(JSON.stringify(defaultDoc, null, 2)));
        
        // 打开文件
        const doc = await vscode.workspace.openTextDocument(uri);
        await vscode.window.showTextDocument(doc);
      }
    })
  );

  // 注册导出 SVG 命令
  context.subscriptions.push(
    vscode.commands.registerCommand('texmind.exportSvg', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor || !editor.document.fileName.endsWith('.texmind')) {
        vscode.window.showInformationMessage('Please open a .texmind file first.');
        return;
      }
      // 导出功能由 Webview 处理
      vscode.window.showInformationMessage('Use the toolbar in the editor to export SVG.');
    })
  );

  // 注册导出 JSON 命令
  context.subscriptions.push(
    vscode.commands.registerCommand('texmind.exportJson', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor || !editor.document.fileName.endsWith('.texmind')) {
        vscode.window.showInformationMessage('Please open a .texmind file first.');
        return;
      }
      // 导出功能由 Webview 处理
      vscode.window.showInformationMessage('Use the toolbar in the editor to export JSON.');
    })
  );

  // 注册撤销命令
  context.subscriptions.push(
    vscode.commands.registerCommand('texmind.undo', async () => {
      editorProvider.sendUndoRedo('undo');
    })
  );

  // 注册重做命令
  context.subscriptions.push(
    vscode.commands.registerCommand('texmind.redo', async () => {
      editorProvider.sendUndoRedo('redo');
    })
  );
}

export function deactivate() {
  console.log('LaTeX Mindmap extension is now deactivated!');
}