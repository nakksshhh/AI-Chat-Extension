import * as vscode from 'vscode';
import * as path from 'path';

export interface WorkspaceContext {
    workspaceName: string;
    activeFile?: string;
    activeFileContent?: string;
    projectStructure: string[];
    language?: string;
}

export interface FileContent {
    path: string;
    content: string;
}

export class WorkspaceService {
    
    async getWorkspaceContext(): Promise<WorkspaceContext> {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        const activeEditor = vscode.window.activeTextEditor;
        
        const context: WorkspaceContext = {
            workspaceName: workspaceFolders?.[0]?.name || 'No Workspace',
            projectStructure: []
        };

        if (activeEditor) {
            context.activeFile = vscode.workspace.asRelativePath(activeEditor.document.fileName);
            context.activeFileContent = activeEditor.document.getText();
            context.language = activeEditor.document.languageId;
        }

        // Get project structure
        if (workspaceFolders) {
            try {
                const files = await vscode.workspace.findFiles('**/*', '**/node_modules/**', 100);
                context.projectStructure = files.map(file => 
                    vscode.workspace.asRelativePath(file)
                ).sort();
            } catch (error) {
                console.error('Error getting project structure:', error);
            }
        }

        return context;
    }

    async getFileContent(filePath: string): Promise<string> {
        try {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders) {
                throw new Error('No workspace folder found');
            }

            const fileUri = vscode.Uri.joinPath(workspaceFolders[0].uri, filePath);
            const document = await vscode.workspace.openTextDocument(fileUri);
            return document.getText();
        } catch (error) {
            console.error(`Error reading file ${filePath}:`, error);
            return `Error reading file: ${filePath}`;
        }
    }

    async searchFiles(query: string): Promise<string[]> {
        try {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders) {
                return [];
            }

            const files = await vscode.workspace.findFiles(`**/*${query}*`, '**/node_modules/**', 50);
            return files.map(file => vscode.workspace.asRelativePath(file)).sort();
        } catch (error) {
            console.error('Error searching files:', error);
            return [];
        }
    }

    async createFile(filePath: string, content: string): Promise<void> {
        try {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders) {
                throw new Error('No workspace folder found');
            }

            const fileUri = vscode.Uri.joinPath(workspaceFolders[0].uri, filePath);
            const encoder = new TextEncoder();
            await vscode.workspace.fs.writeFile(fileUri, encoder.encode(content));
            
            // Open the created file
            const document = await vscode.workspace.openTextDocument(fileUri);
            await vscode.window.showTextDocument(document);
        } catch (error) {
            console.error(`Error creating file ${filePath}:`, error);
            throw error;
        }
    }

    async updateFile(filePath: string, content: string): Promise<void> {
        try {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders) {
                throw new Error('No workspace folder found');
            }

            const fileUri = vscode.Uri.joinPath(workspaceFolders[0].uri, filePath);
            const encoder = new TextEncoder();
            await vscode.workspace.fs.writeFile(fileUri, encoder.encode(content));
        } catch (error) {
            console.error(`Error updating file ${filePath}:`, error);
            throw error;
        }
    }
}