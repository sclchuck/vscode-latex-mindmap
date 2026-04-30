import * as vscode from 'vscode';
export declare class TexMindEditorProvider implements vscode.CustomTextEditorProvider {
    private context;
    private documentCache;
    private currentPanel;
    private applyingEditUris;
    constructor(context: vscode.ExtensionContext);
    sendUndoRedo(type: 'undo' | 'redo'): void;
    resolveCustomTextEditor(document: vscode.TextDocument, webviewPanel: vscode.WebviewPanel, token: vscode.CancellationToken): void | Thenable<void>;
    private saveDocument;
    private updateTextDocumentWithoutSaving;
    private exportSvg;
    private exportJson;
    private getHtmlForWebview;
}
