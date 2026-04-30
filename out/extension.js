"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const TexMindEditorProvider_1 = require("./TexMindEditorProvider");
const types_1 = require("./types");
function activate(context) {
    console.log('LaTeX Mindmap extension is now active!');
    // 注册 Custom Editor Provider
    const editorProvider = new TexMindEditorProvider_1.TexMindEditorProvider(context);
    context.subscriptions.push(vscode.window.registerCustomEditorProvider('texmind.editor', editorProvider, {
        webviewOptions: {
            retainContextWhenHidden: true,
        },
    }));
    // 注册新建脑图命令
    context.subscriptions.push(vscode.commands.registerCommand('texmind.newMindmap', async () => {
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
            const defaultDoc = (0, types_1.createDefaultDocument)();
            const encoder = new TextEncoder();
            await vscode.workspace.fs.writeFile(uri, encoder.encode(JSON.stringify(defaultDoc, null, 2)));
            // 打开文件
            const doc = await vscode.workspace.openTextDocument(uri);
            await vscode.window.showTextDocument(doc);
        }
    }));
    // 注册导出 SVG 命令
    context.subscriptions.push(vscode.commands.registerCommand('texmind.exportSvg', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor || !editor.document.fileName.endsWith('.texmind')) {
            vscode.window.showInformationMessage('Please open a .texmind file first.');
            return;
        }
        // 导出功能由 Webview 处理
        vscode.window.showInformationMessage('Use the toolbar in the editor to export SVG.');
    }));
    // 注册导出 JSON 命令
    context.subscriptions.push(vscode.commands.registerCommand('texmind.exportJson', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor || !editor.document.fileName.endsWith('.texmind')) {
            vscode.window.showInformationMessage('Please open a .texmind file first.');
            return;
        }
        // 导出功能由 Webview 处理
        vscode.window.showInformationMessage('Use the toolbar in the editor to export JSON.');
    }));
    // 注册撤销命令
    context.subscriptions.push(vscode.commands.registerCommand('texmind.undo', async () => {
        editorProvider.sendUndoRedo('undo');
    }));
    // 注册重做命令
    context.subscriptions.push(vscode.commands.registerCommand('texmind.redo', async () => {
        editorProvider.sendUndoRedo('redo');
    }));
}
function deactivate() {
    console.log('LaTeX Mindmap extension is now deactivated!');
}
//# sourceMappingURL=extension.js.map