import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './components/App';
import './styles/index.css';

// Declare VS Code API
declare global {
    interface Window {
        acquireVsCodeApi(): any;
    }
}

const container = document.getElementById('root');
if (container) {
    const root = createRoot(container);
    root.render(<App />);
}