import React from 'react';
import { MessageType, ChatMessage as ChatMessageType } from '../types';
import { MessageCircle, Bot, AlertCircle, File } from 'lucide-react';

interface Props {
    message: ChatMessageType;
}

const ChatMessage: React.FC<Props> = ({ message }) => {
    const getIcon = () => {
        switch (message.type) {
            case MessageType.USER:
                return <MessageCircle size={16} />;
            case MessageType.AI:
                return <Bot size={16} />;
            case MessageType.ERROR:
                return <AlertCircle size={16} />;
            default:
                return <MessageCircle size={16} />;
        }
    };

    const formatContent = (content: string) => {
        // Simple markdown-like formatting
        const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
        const inlineCodeRegex = /`([^`]+)`/g;
        
        let formattedContent = content;
        
        // Replace code blocks
        formattedContent = formattedContent.replace(codeBlockRegex, (match, language, code) => {
            return `<pre class="code-block ${language || ''}"><code>${escapeHtml(code.trim())}</code></pre>`;
        });
        
        // Replace inline code
        formattedContent = formattedContent.replace(inlineCodeRegex, (match, code) => {
            return `<code class="inline-code">${escapeHtml(code)}</code>`;
        });
        
        // Replace line breaks
        formattedContent = formattedContent.replace(/\n/g, '<br>');
        
        return formattedContent;
    };

    const escapeHtml = (text: string) => {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    };

    const copyCode = (event: React.MouseEvent) => {
        const codeElement = (event.target as HTMLElement).closest('.code-block')?.querySelector('code');
        if (codeElement) {
            navigator.clipboard.writeText(codeElement.textContent || '');
            // Show a brief success indicator
            const button = event.target as HTMLElement;
            const originalText = button.textContent;
            button.textContent = 'Copied!';
            setTimeout(() => {
                button.textContent = originalText;
            }, 2000);
        }
    };

    return (
        <div className={`chat-message ${message.type}`}>
            <div className="message-header">
                <div className="message-icon">
                    {getIcon()}
                </div>
                <div className="message-info">
                    <span className="message-sender">
                        {message.type === MessageType.USER ? 'You' : 
                         message.type === MessageType.AI ? 'AI Assistant' : 'Error'}
                    </span>
                    <span className="message-time">
                        {message.timestamp.toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                        })}
                    </span>
                </div>
            </div>
            
            {message.attachedFiles && message.attachedFiles.length > 0 && (
                <div className="message-attachments">
                    {message.attachedFiles.map(file => (
                        <div key={file.path} className="attachment-tag">
                            <File size={12} />
                            <span>{file.name}</span>
                        </div>
                    ))}
                </div>
            )}
            
            <div 
                className="message-content"
                dangerouslySetInnerHTML={{ __html: formatContent(message.content) }}
                onClick={copyCode}
            />
        </div>
    );
};

export default ChatMessage;