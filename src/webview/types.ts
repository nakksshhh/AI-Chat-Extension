export enum MessageType {
    USER = 'user',
    AI = 'ai',
    ERROR = 'error'
}

export interface AttachedFile {
    path: string;
    name: string;
}

export interface ChatMessage {
    id: string;
    type: MessageType;
    content: string;
    timestamp: Date;
    attachedFiles?: AttachedFile[];
}