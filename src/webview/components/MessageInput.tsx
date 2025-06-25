import React, { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';
import { AttachedFile } from '../types';

interface Props {
    onSendMessage: (message: string) => void;
    onSearchFiles: (query: string) => void;
    onFileAttached: (file: AttachedFile) => void;
    disabled: boolean;
}

const MessageInput: React.FC<Props> = ({ 
    onSendMessage, 
    onSearchFiles, 
    onFileAttached, 
    disabled 
}) => {
    const [message, setMessage] = useState('');
    const [showFileSearch, setShowFileSearch] = useState(false);
    const [fileSearchResults, setFileSearchResults] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [cursorPosition, setCursorPosition] = useState(0);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileSearchRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleFileSearchResults = (event: Event) => {
            const customEvent = event as CustomEvent;
            setFileSearchResults(customEvent.detail);
        };

        window.addEventListener('fileSearchResults', handleFileSearchResults);
        return () => window.removeEventListener('fileSearchResults', handleFileSearchResults);
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (fileSearchRef.current && !fileSearchRef.current.contains(event.target as Node)) {
                setShowFileSearch(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const value = e.target.value;
        const cursorPos = e.target.selectionStart;
        
        setMessage(value);
        setCursorPosition(cursorPos);

        // Check for @ mention
        const beforeCursor = value.substring(0, cursorPos);
        const atMatch = beforeCursor.match(/@(\w*)$/);
        
        if (atMatch) {
            const query = atMatch[1];
            setSearchQuery(query);
            setShowFileSearch(true);
            onSearchFiles(query);
        } else {
            setShowFileSearch(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }

        if (showFileSearch && (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'Escape')) {
            e.preventDefault();
            if (e.key === 'Escape') {
                setShowFileSearch(false);
            }
        }
    };

    const handleSend = () => {
        if (message.trim() && !disabled) {
            onSendMessage(message);
            setMessage('');
            setShowFileSearch(false);
        }
    };

    const handleFileSelect = (filePath: string) => {
        const beforeCursor = message.substring(0, cursorPosition);
        const afterCursor = message.substring(cursorPosition);
        const atMatch = beforeCursor.match(/@(\w*)$/);
        
        if (atMatch) {
            const beforeAt = beforeCursor.substring(0, beforeCursor.length - atMatch[0].length);
            const fileName = filePath.split('/').pop() || filePath;
            const newMessage = beforeAt + `@${fileName} ` + afterCursor;
            
            setMessage(newMessage);
            
            // Add to attached files
            onFileAttached({
                path: filePath,
                name: fileName
            });
        }
        
        setShowFileSearch(false);
        textareaRef.current?.focus();
    };

    const adjustTextareaHeight = () => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = 'auto';
            textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
        }
    };

    useEffect(() => {
        adjustTextareaHeight();
    }, [message]);

    return (
        <div className="message-input-container">
            {showFileSearch && fileSearchResults.length > 0 && (
                <div className="file-search-results" ref={fileSearchRef}>
                    {fileSearchResults.slice(0, 10).map(file => (
                        <div
                            key={file}
                            className="file-search-item"
                            onClick={() => handleFileSelect(file)}
                        >
                            <span className="file-path">{file}</span>
                        </div>
                    ))}
                </div>
            )}
            
            <div className="message-input-wrapper">
                <textarea
                    ref={textareaRef}
                    value={message}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask me anything about your code... Use @filename to attach files"
                    className="message-input"
                    disabled={disabled}
                    rows={1}
                />
                <button
                    onClick={handleSend}
                    disabled={!message.trim() || disabled}
                    className="send-button"
                    title="Send message"
                >
                    <Send size={18} />
                </button>
            </div>
        </div>
    );
};

export default MessageInput;