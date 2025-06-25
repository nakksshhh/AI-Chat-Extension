import React, { useState, useEffect, useRef } from 'react';
import ChatMessage from './ChatMessage';
import MessageInput from './MessageInput';
import FileAttachment from './FileAttachment';
import ProviderStatus from './ProviderStatus';
import { MessageType, ChatMessage as ChatMessageType, AttachedFile } from '../types';

// VS Code API instance
const vscode = window.acquireVsCodeApi();

const App: React.FC = () => {
    const [messages, setMessages] = useState<ChatMessageType[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
    const [currentProvider, setCurrentProvider] = useState<string>('ollama');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            const message = event.data;
            
            switch (message.type) {
                case 'aiResponse':
                    setMessages(prev => [...prev, {
                        id: Date.now().toString(),
                        type: MessageType.AI,
                        content: message.response,
                        timestamp: new Date()
                    }]);
                    setIsLoading(false);
                    break;
                    
                case 'error':
                    setMessages(prev => [...prev, {
                        id: Date.now().toString(),
                        type: MessageType.ERROR,
                        content: message.message,
                        timestamp: new Date()
                    }]);
                    setIsLoading(false);
                    break;
                    
                case 'fileSearchResults':
                    // Handle file search results for @ mentions
                    window.dispatchEvent(new CustomEvent('fileSearchResults', { 
                        detail: message.files 
                    }));
                    break;

                case 'providerStatus':
                    setCurrentProvider(message.provider);
                    break;
            }
        };

        window.addEventListener('message', handleMessage);
        
        // Request initial provider status
        vscode.postMessage({ type: 'getProviderStatus' });
        
        return () => window.removeEventListener('message', handleMessage);
    }, []);

    const sendMessage = (content: string) => {
        if (!content.trim()) return;

        // Add user message
        const userMessage: ChatMessageType = {
            id: Date.now().toString(),
            type: MessageType.USER,
            content: content,
            timestamp: new Date(),
            attachedFiles: [...attachedFiles]
        };

        setMessages(prev => [...prev, userMessage]);
        setIsLoading(true);

        // Send to extension
        vscode.postMessage({
            type: 'sendMessage',
            message: content,
            attachedFiles: attachedFiles.map(f => f.path)
        });

        // Clear attached files
        setAttachedFiles([]);
    };

    const searchFiles = (query: string) => {
        vscode.postMessage({
            type: 'searchFiles',
            query: query
        });
    };

    const addAttachedFile = (file: AttachedFile) => {
        setAttachedFiles(prev => {
            const exists = prev.find(f => f.path === file.path);
            if (exists) return prev;
            return [...prev, file];
        });
    };

    const removeAttachedFile = (path: string) => {
        setAttachedFiles(prev => prev.filter(f => f.path !== path));
    };

    const getWelcomeMessage = () => {
        switch (currentProvider) {
            case 'ollama':
                return {
                    title: 'Welcome to AI Chat Assistant with Ollama!',
                    description: 'Using local AI models via Ollama. Make sure Ollama is running locally.',
                    setup: [
                        'Install Ollama from https://ollama.ai',
                        'Run "ollama pull llama3.2" to download a model',
                        'Start Ollama service',
                        'Configure the model in VS Code settings if needed'
                    ]
                };
            case 'groq':
                return {
                    title: 'Welcome to AI Chat Assistant with Groq!',
                    description: 'Using Groq for fast AI inference. Configure your API key in settings.',
                    setup: [
                        'Get a free API key from https://console.groq.com',
                        'Add it to VS Code settings under "AI Chat Assistant: Groq Api Key"',
                        'Select your preferred model in settings'
                    ]
                };
            case 'openai':
                return {
                    title: 'Welcome to AI Chat Assistant with OpenAI!',
                    description: 'Using OpenAI GPT models. Configure your API key in settings.',
                    setup: [
                        'Get an API key from https://platform.openai.com',
                        'Add it to VS Code settings under "AI Chat Assistant: Openai Api Key"',
                        'Note: OpenAI requires billing to be set up'
                    ]
                };
            case 'anthropic':
                return {
                    title: 'Welcome to AI Chat Assistant with Anthropic!',
                    description: 'Using Anthropic Claude models. Configure your API key in settings.',
                    setup: [
                        'Get an API key from https://console.anthropic.com',
                        'Add it to VS Code settings under "AI Chat Assistant: Anthropic Api Key"',
                        'Select your preferred Claude model in settings'
                    ]
                };
            case 'custom':
                return {
                    title: 'Welcome to AI Chat Assistant with Custom API!',
                    description: 'Using a custom API endpoint. Configure your settings.',
                    setup: [
                        'Set your API URL in "AI Chat Assistant: Custom Api Url"',
                        'Add API key if required in "AI Chat Assistant: Custom Api Key"',
                        'Specify model name if needed in "AI Chat Assistant: Custom Model"'
                    ]
                };
            default:
                return {
                    title: 'Welcome to AI Chat Assistant!',
                    description: 'Select an AI provider in VS Code settings to get started.',
                    setup: []
                };
        }
    };

    const welcomeInfo = getWelcomeMessage();

    return (
        <div className="chat-app">
            <div className="chat-header">
                <h3>AI Chat Assistant</h3>
                <p>Ask questions about your code, attach files with @filename</p>
                <ProviderStatus provider={currentProvider} />
            </div>
            
            <div className="chat-messages">
                {messages.length === 0 && (
                    <div className="welcome-message">
                        <h4>{welcomeInfo.title}</h4>
                        <p>{welcomeInfo.description}</p>
                        
                        {welcomeInfo.setup.length > 0 && (
                            <>
                                <p><strong>Setup:</strong></p>
                                <ol>
                                    {welcomeInfo.setup.map((step, index) => (
                                        <li key={index}>{step}</li>
                                    ))}
                                </ol>
                            </>
                        )}
                        
                        <p><strong>I can help you with:</strong></p>
                        <ul>
                            <li>Code analysis and debugging</li>
                            <li>Code generation and refactoring</li>
                            <li>Explaining complex code patterns</li>
                            <li>Best practices and optimization tips</li>
                        </ul>
                        <p>Use <code>@filename</code> to attach files to your messages.</p>
                    </div>
                )}
                
                {messages.map(message => (
                    <ChatMessage key={message.id} message={message} />
                ))}
                
                {isLoading && (
                    <div className="loading-message">
                        <div className="loading-dots">
                            <span></span>
                            <span></span>
                            <span></span>
                        </div>
                        <span>AI is thinking...</span>
                    </div>
                )}
                
                <div ref={messagesEndRef} />
            </div>

            {attachedFiles.length > 0 && (
                <div className="attached-files">
                    {attachedFiles.map(file => (
                        <FileAttachment
                            key={file.path}
                            file={file}
                            onRemove={() => removeAttachedFile(file.path)}
                        />
                    ))}
                </div>
            )}

            <MessageInput
                onSendMessage={sendMessage}
                onSearchFiles={searchFiles}
                onFileAttached={addAttachedFile}
                disabled={isLoading}
            />
        </div>
    );
};

export default App;