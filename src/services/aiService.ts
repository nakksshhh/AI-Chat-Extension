import * as vscode from 'vscode';
import axios from 'axios';
import { WorkspaceContext, FileContent } from './workspaceService';

export interface AIProvider {
    name: string;
    sendMessage(message: string, context: WorkspaceContext, files: FileContent[]): Promise<string>;
}

export class AIService {
    private currentProvider: AIProvider | null = null;

    constructor() {
        this.initializeProvider();
        
        // Listen for configuration changes
        vscode.workspace.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration('aiChatAssistant')) {
                this.initializeProvider();
            }
        });
    }

    private initializeProvider() {
        const config = vscode.workspace.getConfiguration('aiChatAssistant');
        const provider = config.get<string>('provider') || 'ollama';

        switch (provider) {
            case 'ollama':
                this.currentProvider = new OllamaProvider();
                break;
            case 'groq':
                this.currentProvider = new GroqProvider();
                break;
            case 'openai':
                this.currentProvider = new OpenAIProvider();
                break;
            case 'anthropic':
                this.currentProvider = new AnthropicProvider();
                break;
            case 'custom':
                this.currentProvider = new CustomProvider();
                break;
            default:
                this.currentProvider = new OllamaProvider();
        }
    }

    async sendMessage(
        message: string, 
        workspaceContext: WorkspaceContext, 
        attachedFiles: FileContent[]
    ): Promise<string> {
        if (!this.currentProvider) {
            throw new Error('No AI provider configured');
        }

        return this.currentProvider.sendMessage(message, workspaceContext, attachedFiles);
    }
}

class OllamaProvider implements AIProvider {
    name = 'Ollama';

    async sendMessage(message: string, context: WorkspaceContext, files: FileContent[]): Promise<string> {
        const config = vscode.workspace.getConfiguration('aiChatAssistant');
        const url = config.get<string>('ollamaUrl') || 'http://localhost:11434';
        const model = config.get<string>('ollamaModel') || 'llama3.2';

        const contextMessage = this.buildContextMessage(context, files);
        const systemPrompt = `You are an AI assistant integrated into VS Code. You help with code analysis, generation, and debugging.

${contextMessage}

When providing code suggestions:
1. Always specify the programming language
2. Provide complete, working code when possible
3. Explain your reasoning
4. Consider the existing codebase context
5. Suggest best practices and improvements

Format your responses in markdown with proper code blocks.`;

        try {
            const response = await axios.post(`${url}/api/generate`, {
                model: model,
                prompt: `${systemPrompt}\n\nUser: ${message}`,
                stream: false,
                options: {
                    temperature: 0.7,
                    top_p: 0.9,
                    top_k: 40
                }
            }, {
                timeout: 60000 // 60 second timeout
            });

            return response.data.response || 'No response generated.';
        } catch (error: any) {
            console.error('Ollama API error:', error);
            if (error.code === 'ECONNREFUSED') {
                throw new Error('Cannot connect to Ollama. Make sure Ollama is running on ' + url);
            }
            throw new Error(`Ollama error: ${error.response?.data?.error || error.message}`);
        }
    }

    private buildContextMessage(workspaceContext: WorkspaceContext, attachedFiles: FileContent[]): string {
        let context = `**Workspace Context:**\n`;
        context += `- Project: ${workspaceContext.workspaceName}\n`;
        
        if (workspaceContext.activeFile) {
            context += `- Active File: ${workspaceContext.activeFile}\n`;
            context += `- Language: ${workspaceContext.language || 'Unknown'}\n`;
        }

        if (workspaceContext.projectStructure.length > 0) {
            context += `- Project Structure:\n`;
            workspaceContext.projectStructure.slice(0, 20).forEach(file => {
                context += `  - ${file}\n`;
            });
            if (workspaceContext.projectStructure.length > 20) {
                context += `  - ... and ${workspaceContext.projectStructure.length - 20} more files\n`;
            }
        }

        if (workspaceContext.activeFileContent) {
            context += `\n**Current File Content:**\n\`\`\`${workspaceContext.language}\n${workspaceContext.activeFileContent}\n\`\`\`\n`;
        }

        if (attachedFiles.length > 0) {
            context += `\n**Attached Files:**\n`;
            attachedFiles.forEach(file => {
                context += `\n**${file.path}:**\n\`\`\`\n${file.content}\n\`\`\`\n`;
            });
        }

        return context;
    }
}

class GroqProvider implements AIProvider {
    name = 'Groq';

    async sendMessage(message: string, context: WorkspaceContext, files: FileContent[]): Promise<string> {
        const config = vscode.workspace.getConfiguration('aiChatAssistant');
        const apiKey = config.get<string>('groqApiKey');
        const model = config.get<string>('groqModel') || 'llama-3.1-70b-versatile';

        if (!apiKey) {
            throw new Error('Groq API key not configured. Please set it in VS Code settings.');
        }

        const contextMessage = this.buildContextMessage(context, files);
        
        try {
            const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
                model: model,
                messages: [
                    {
                        role: 'system',
                        content: `You are an AI assistant integrated into VS Code. You help with code analysis, generation, and debugging.

${contextMessage}

When providing code suggestions:
1. Always specify the programming language
2. Provide complete, working code when possible
3. Explain your reasoning
4. Consider the existing codebase context
5. Suggest best practices and improvements

Format your responses in markdown with proper code blocks.`
                    },
                    {
                        role: 'user',
                        content: message
                    }
                ],
                max_tokens: 2000,
                temperature: 0.7
            }, {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                }
            });

            return response.data.choices[0]?.message?.content || 'No response generated.';
        } catch (error: any) {
            console.error('Groq API error:', error);
            throw new Error(`Groq error: ${error.response?.data?.error?.message || error.message}`);
        }
    }

    private buildContextMessage(workspaceContext: WorkspaceContext, attachedFiles: FileContent[]): string {
        let context = `**Workspace Context:**\n`;
        context += `- Project: ${workspaceContext.workspaceName}\n`;
        
        if (workspaceContext.activeFile) {
            context += `- Active File: ${workspaceContext.activeFile}\n`;
            context += `- Language: ${workspaceContext.language || 'Unknown'}\n`;
        }

        if (workspaceContext.projectStructure.length > 0) {
            context += `- Project Structure:\n`;
            workspaceContext.projectStructure.slice(0, 20).forEach(file => {
                context += `  - ${file}\n`;
            });
            if (workspaceContext.projectStructure.length > 20) {
                context += `  - ... and ${workspaceContext.projectStructure.length - 20} more files\n`;
            }
        }

        if (workspaceContext.activeFileContent) {
            context += `\n**Current File Content:**\n\`\`\`${workspaceContext.language}\n${workspaceContext.activeFileContent}\n\`\`\`\n`;
        }

        if (attachedFiles.length > 0) {
            context += `\n**Attached Files:**\n`;
            attachedFiles.forEach(file => {
                context += `\n**${file.path}:**\n\`\`\`\n${file.content}\n\`\`\`\n`;
            });
        }

        return context;
    }
}

class OpenAIProvider implements AIProvider {
    name = 'OpenAI';

    async sendMessage(message: string, context: WorkspaceContext, files: FileContent[]): Promise<string> {
        const config = vscode.workspace.getConfiguration('aiChatAssistant');
        const apiKey = config.get<string>('openaiApiKey');
        const model = config.get<string>('openaiModel') || 'gpt-4';

        if (!apiKey) {
            throw new Error('OpenAI API key not configured. Please set it in VS Code settings.');
        }

        const contextMessage = this.buildContextMessage(context, files);
        
        try {
            const response = await axios.post('https://api.openai.com/v1/chat/completions', {
                model: model,
                messages: [
                    {
                        role: 'system',
                        content: `You are an AI assistant integrated into VS Code. You help with code analysis, generation, and debugging.

${contextMessage}

When providing code suggestions:
1. Always specify the programming language
2. Provide complete, working code when possible
3. Explain your reasoning
4. Consider the existing codebase context
5. Suggest best practices and improvements

Format your responses in markdown with proper code blocks.`
                    },
                    {
                        role: 'user',
                        content: message
                    }
                ],
                max_tokens: 2000,
                temperature: 0.7
            }, {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                }
            });

            return response.data.choices[0]?.message?.content || 'No response generated.';
        } catch (error: any) {
            console.error('OpenAI API error:', error);
            throw new Error(`OpenAI error: ${error.response?.data?.error?.message || error.message}`);
        }
    }

    private buildContextMessage(workspaceContext: WorkspaceContext, attachedFiles: FileContent[]): string {
        let context = `**Workspace Context:**\n`;
        context += `- Project: ${workspaceContext.workspaceName}\n`;
        
        if (workspaceContext.activeFile) {
            context += `- Active File: ${workspaceContext.activeFile}\n`;
            context += `- Language: ${workspaceContext.language || 'Unknown'}\n`;
        }

        if (workspaceContext.projectStructure.length > 0) {
            context += `- Project Structure:\n`;
            workspaceContext.projectStructure.slice(0, 20).forEach(file => {
                context += `  - ${file}\n`;
            });
            if (workspaceContext.projectStructure.length > 20) {
                context += `  - ... and ${workspaceContext.projectStructure.length - 20} more files\n`;
            }
        }

        if (workspaceContext.activeFileContent) {
            context += `\n**Current File Content:**\n\`\`\`${workspaceContext.language}\n${workspaceContext.activeFileContent}\n\`\`\`\n`;
        }

        if (attachedFiles.length > 0) {
            context += `\n**Attached Files:**\n`;
            attachedFiles.forEach(file => {
                context += `\n**${file.path}:**\n\`\`\`\n${file.content}\n\`\`\`\n`;
            });
        }

        return context;
    }
}

class AnthropicProvider implements AIProvider {
    name = 'Anthropic';

    async sendMessage(message: string, context: WorkspaceContext, files: FileContent[]): Promise<string> {
        const config = vscode.workspace.getConfiguration('aiChatAssistant');
        const apiKey = config.get<string>('anthropicApiKey');
        const model = config.get<string>('anthropicModel') || 'claude-3-sonnet-20240229';

        if (!apiKey) {
            throw new Error('Anthropic API key not configured. Please set it in VS Code settings.');
        }

        const contextMessage = this.buildContextMessage(context, files);
        
        try {
            const response = await axios.post('https://api.anthropic.com/v1/messages', {
                model: model,
                max_tokens: 2000,
                messages: [
                    {
                        role: 'user',
                        content: `You are an AI assistant integrated into VS Code. You help with code analysis, generation, and debugging.

${contextMessage}

When providing code suggestions:
1. Always specify the programming language
2. Provide complete, working code when possible
3. Explain your reasoning
4. Consider the existing codebase context
5. Suggest best practices and improvements

Format your responses in markdown with proper code blocks.

User message: ${message}`
                    }
                ]
            }, {
                headers: {
                    'x-api-key': apiKey,
                    'Content-Type': 'application/json',
                    'anthropic-version': '2023-06-01'
                }
            });

            return response.data.content[0]?.text || 'No response generated.';
        } catch (error: any) {
            console.error('Anthropic API error:', error);
            throw new Error(`Anthropic error: ${error.response?.data?.error?.message || error.message}`);
        }
    }

    private buildContextMessage(workspaceContext: WorkspaceContext, attachedFiles: FileContent[]): string {
        let context = `**Workspace Context:**\n`;
        context += `- Project: ${workspaceContext.workspaceName}\n`;
        
        if (workspaceContext.activeFile) {
            context += `- Active File: ${workspaceContext.activeFile}\n`;
            context += `- Language: ${workspaceContext.language || 'Unknown'}\n`;
        }

        if (workspaceContext.projectStructure.length > 0) {
            context += `- Project Structure:\n`;
            workspaceContext.projectStructure.slice(0, 20).forEach(file => {
                context += `  - ${file}\n`;
            });
            if (workspaceContext.projectStructure.length > 20) {
                context += `  - ... and ${workspaceContext.projectStructure.length - 20} more files\n`;
            }
        }

        if (workspaceContext.activeFileContent) {
            context += `\n**Current File Content:**\n\`\`\`${workspaceContext.language}\n${workspaceContext.activeFileContent}\n\`\`\`\n`;
        }

        if (attachedFiles.length > 0) {
            context += `\n**Attached Files:**\n`;
            attachedFiles.forEach(file => {
                context += `\n**${file.path}:**\n\`\`\`\n${file.content}\n\`\`\`\n`;
            });
        }

        return context;
    }
}

class CustomProvider implements AIProvider {
    name = 'Custom';

    async sendMessage(message: string, context: WorkspaceContext, files: FileContent[]): Promise<string> {
        const config = vscode.workspace.getConfiguration('aiChatAssistant');
        const apiUrl = config.get<string>('customApiUrl');
        const apiKey = config.get<string>('customApiKey');
        const model = config.get<string>('customModel');

        if (!apiUrl) {
            throw new Error('Custom API URL not configured. Please set it in VS Code settings.');
        }

        const contextMessage = this.buildContextMessage(context, files);
        
        try {
            const headers: any = {
                'Content-Type': 'application/json'
            };

            if (apiKey) {
                headers['Authorization'] = `Bearer ${apiKey}`;
            }

            const payload: any = {
                messages: [
                    {
                        role: 'system',
                        content: `You are an AI assistant integrated into VS Code. You help with code analysis, generation, and debugging.

${contextMessage}

When providing code suggestions:
1. Always specify the programming language
2. Provide complete, working code when possible
3. Explain your reasoning
4. Consider the existing codebase context
5. Suggest best practices and improvements

Format your responses in markdown with proper code blocks.`
                    },
                    {
                        role: 'user',
                        content: message
                    }
                ],
                max_tokens: 2000,
                temperature: 0.7
            };

            if (model) {
                payload.model = model;
            }

            const response = await axios.post(apiUrl, payload, { headers });

            // Try to extract response from common API response formats
            if (response.data.choices && response.data.choices[0]?.message?.content) {
                return response.data.choices[0].message.content;
            } else if (response.data.content && response.data.content[0]?.text) {
                return response.data.content[0].text;
            } else if (response.data.response) {
                return response.data.response;
            } else if (typeof response.data === 'string') {
                return response.data;
            }

            return 'No response generated.';
        } catch (error: any) {
            console.error('Custom API error:', error);
            throw new Error(`Custom API error: ${error.response?.data?.error?.message || error.message}`);
        }
    }

    private buildContextMessage(workspaceContext: WorkspaceContext, attachedFiles: FileContent[]): string {
        let context = `**Workspace Context:**\n`;
        context += `- Project: ${workspaceContext.workspaceName}\n`;
        
        if (workspaceContext.activeFile) {
            context += `- Active File: ${workspaceContext.activeFile}\n`;
            context += `- Language: ${workspaceContext.language || 'Unknown'}\n`;
        }

        if (workspaceContext.projectStructure.length > 0) {
            context += `- Project Structure:\n`;
            workspaceContext.projectStructure.slice(0, 20).forEach(file => {
                context += `  - ${file}\n`;
            });
            if (workspaceContext.projectStructure.length > 20) {
                context += `  - ... and ${workspaceContext.projectStructure.length - 20} more files\n`;
            }
        }

        if (workspaceContext.activeFileContent) {
            context += `\n**Current File Content:**\n\`\`\`${workspaceContext.language}\n${workspaceContext.activeFileContent}\n\`\`\`\n`;
        }

        if (attachedFiles.length > 0) {
            context += `\n**Attached Files:**\n`;
            attachedFiles.forEach(file => {
                context += `\n**${file.path}:**\n\`\`\`\n${file.content}\n\`\`\`\n`;
            });
        }

        return context;
    }
}