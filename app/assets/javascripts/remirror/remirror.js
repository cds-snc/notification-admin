import React from 'react';
import { createRoot } from 'react-dom/client';
import App from "./App";

export const load = function (element) {
    // Get configuration from data attributes
    const config = {
        fieldName: element.dataset.fieldName || 'content',
        placeholder: element.dataset.placeholder || 'Start typing...',
        initialContent: element.dataset.initialContent || '',
        readonly: element.dataset.readonly === 'true'
    };
    const root = createRoot(element);
    root.render(<App config={config} />);
};

// Make it available globally
window.Remirror = { load };