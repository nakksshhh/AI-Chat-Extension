import * as vscode from 'vscode';
import { ChatProvider } from './chatProvider';
import { WorkspaceService } from './services/workspaceService';
import { AIService } from './services/aiService';

export function activate(context: vscode.ExtensionContext) {
    console.log('AI Chat Assistant is now active!');

    const workspaceService = new WorkspaceService();
    const aiService = new AIService();
    const chatProvider = new ChatProvider(context, workspaceService, aiService);

    // Register the webview provider
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider('aiChatAssistant.chatView', chatProvider)
    );

    // Register commands
    const openChatCommand = vscode.commands.registerCommand('aiChatAssistant.openChat', () => {
        vscode.commands.executeCommand('workbench.view.extension.aiChatAssistant');
    });

    context.subscriptions.push(openChatCommand);

    // Show welcome message
    vscode.window.showInformationMessage('AI Chat Assistant is ready! Open the chat panel from the Activity Bar.');
}

export function deactivate() {}