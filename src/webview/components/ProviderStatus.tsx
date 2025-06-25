import React from 'react';
import { Server, Zap, Brain, MessageSquare, Globe, Settings } from 'lucide-react';

interface Props {
    provider: string;
}

const ProviderStatus: React.FC<Props> = ({ provider }) => {
    const getProviderInfo = () => {
        switch (provider) {
            case 'ollama':
                return {
                    icon: <Server size={14} />,
                    name: 'Ollama',
                    color: '#10b981',
                    description: 'Local AI'
                };
            case 'groq':
                return {
                    icon: <Zap size={14} />,
                    name: 'Groq',
                    color: '#f59e0b',
                    description: 'Fast Inference'
                };
            case 'openai':
                return {
                    icon: <Brain size={14} />,
                    name: 'OpenAI',
                    color: '#06b6d4',
                    description: 'GPT Models'
                };
            case 'anthropic':
                return {
                    icon: <MessageSquare size={14} />,
                    name: 'Anthropic',
                    color: '#8b5cf6',
                    description: 'Claude Models'
                };
            case 'custom':
                return {
                    icon: <Globe size={14} />,
                    name: 'Custom',
                    color: '#6b7280',
                    description: 'Custom API'
                };
            default:
                return {
                    icon: <Settings size={14} />,
                    name: 'Not Configured',
                    color: '#ef4444',
                    description: 'Select Provider'
                };
        }
    };

    const providerInfo = getProviderInfo();

    return (
        <div className="provider-status">
            <div className="provider-indicator" style={{ color: providerInfo.color }}>
                {providerInfo.icon}
            </div>
            <div className="provider-info">
                <span className="provider-name">{providerInfo.name}</span>
                <span className="provider-description">{providerInfo.description}</span>
            </div>
        </div>
    );
};

export default ProviderStatus;