import "./style.css";

import React, { useCallback, useState } from 'react';
import {
    useHelpers,
} from '@remirror/react';

import { MarkdownExtension } from 'remirror/extensions';
import { NotifyEditor } from './editor';

const RemirrorEditor = ({ config }) => {
    const [output, setOutput] = useState('');
    const [outputType, setOutputType] = useState('json');

    const hooks = [
        () => {
            const { getJSON } = useHelpers();

            const handleSaveToTextarea = useCallback(() => {
                const json = getJSON();
                setOutput(JSON.stringify(json, null, 2));
                setOutputType('json');
            }, [getJSON]);

            window.remirrorSaveJsonHandler = handleSaveToTextarea;

            return null;
        },
        () => {
            const { getHTML } = useHelpers();

            const handleSaveToTextarea = useCallback(() => {
                const html = getHTML();
                setOutput(html);
                setOutputType('html');
            }, [getHTML]);

            window.remirrorSaveHTMLHandler = handleSaveToTextarea;

            return null;
        },
        () => {
            const { getHTML } = useHelpers();
            const extension = new MarkdownExtension();

            const handleSaveToTextarea = useCallback(() => {
                const html = getHTML();
                const markdown = extension.options.htmlToMarkdown(html);
                setOutput(markdown);
                setOutputType('md');
            }, [getHTML]);

            window.remirrorSaveMarkdownHandler = handleSaveToTextarea;

            return null;
        }
    ];

    const handleJsonSaveClick = () => {
        if (window.remirrorSaveJsonHandler) {
            window.remirrorSaveJsonHandler();
        }
    };

    const handleHTMLSaveClick = () => {
        if (window.remirrorSaveHTMLHandler) {
            window.remirrorSaveHTMLHandler();
        }
    };

    const handleMarkdownSaveClick = () => {
        if (window.remirrorSaveMarkdownHandler) {
            window.remirrorSaveMarkdownHandler();
        }
    };

    return (
        <div className="remirror-theme">
            <NotifyEditor
                placeholder="Start typing..."
                stringHandler="html"
                initialContent={config.initialContent}
                hooks={hooks}
            />
            <div class="py-4">
                <button className="button" onClick={handleJsonSaveClick}>
                    View JSON
                </button>
                <button className="button" onClick={handleHTMLSaveClick}>
                    View HTML
                </button>
                <button className="button" onClick={handleMarkdownSaveClick}>
                    View Markdown
                </button>
            </div>
            <div>
                <h2>{outputType.toUpperCase()} Output</h2>
                <textarea
                    value={output}
                    readOnly
                    rows="25"
                    cols="100"
                />
            </div>
        </div>
    );
};

export default RemirrorEditor;