import * as vscode from 'vscode';
import * as path from 'path';
import { WorkspaceService } from './services/workspaceService';
import { AIService } from './services/aiService';

export class ChatProvider implements vscode.WebviewViewProvider {
    private _view?: vscode.WebviewView;

    constructor(
        private readonly _context: vscode.ExtensionContext,
        private readonly _workspaceService: WorkspaceService,
        private readonly _aiService: AIService
    ) {}

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                this._context.extensionUri
            ]
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        // Handle messages from webview
        webviewView.webview.onDidReceiveMessage(async (data) => {
            switch (data.type) {
                case 'sendMessage':
                    await this._handleSendMessage(data.message, data.attachedFiles);
                    break;
                case 'searchFiles':
                    await this._handleSearchFiles(data.query);
                    break;
                case 'getWorkspaceContext':
                    await this._handleGetWorkspaceContext();
                    break;
                case 'getProviderStatus':
                    await this._handleGetProviderStatus();
                    break;
            }
        });

        // Send initial provider status
        this._sendProviderStatus();

        // Listen for configuration changes
        vscode.workspace.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration('aiChatAssistant.provider')) {
                this._sendProviderStatus();
            }
        });
    }

    private async _handleSendMessage(message: string, attachedFiles: string[]) {
        try {
            // Get workspace context
            const workspaceContext = await this._workspaceService.getWorkspaceContext();
            
            // Get attached file contents
            const fileContents = await Promise.all(
                attachedFiles.map(async (filePath) => {
                    const content = await this._workspaceService.getFileContent(filePath);
                    return { path: filePath, content };
                })
            );

            // Send to AI service
            const response = await this._aiService.sendMessage(message, workspaceContext, fileContents);

            // Send response back to webview
            this._view?.webview.postMessage({
                type: 'aiResponse',
                response: response
            });

        } catch (error) {
            console.error('Error handling message:', error);
            let errorMessage = 'Failed to get AI response.';
            
            if (error instanceof Error) {
                errorMessage = error.message;
            }
            
            this._view?.webview.postMessage({
                type: 'error',
                message: errorMessage
            });
        }
    }

    private async _handleSearchFiles(query: string) {
        try {
            const files = await this._workspaceService.searchFiles(query);
            this._view?.webview.postMessage({
                type: 'fileSearchResults',
                files: files
            });
        } catch (error) {
            console.error('Error searching files:', error);
        }
    }

    private async _handleGetWorkspaceContext() {
        try {
            const context = await this._workspaceService.getWorkspaceContext();
            this._view?.webview.postMessage({
                type: 'workspaceContext',
                context: context
            });
        } catch (error) {
            console.error('Error getting workspace context:', error);
        }
    }

    private async _handleGetProviderStatus() {
        this._sendProviderStatus();
    }

    private _sendProviderStatus() {
        const config = vscode.workspace.getConfiguration('aiChatAssistant');
        const provider = config.get<string>('provider') || 'ollama';
        
        this._view?.webview.postMessage({
            type: 'providerStatus',
            provider: provider
        });
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._context.extensionUri, 'dist', 'webview.js'));
        
        const nonce = getNonce();

        return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>AI Chat Assistant</title>
                <style>
                    body {
                        margin: 0;
                        padding: 0;
                        background-color: var(--vscode-editor-background);
                        color: var(--vscode-editor-foreground);
                        font-family: var(--vscode-font-family);
                        font-size: var(--vscode-font-size);
                        height: 100vh;
                        overflow: hidden;
                    }
                </style>
            </head>
            <body>
                <div id="root"></div>
                <script nonce="${nonce}" src="${scriptUri}"></script>
            </body>
            </html>`;
    }
}

function getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}