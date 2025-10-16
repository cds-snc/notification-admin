// TODO: We should copy remirrors LinkExtension into our project
// and modify it's functionality there instead of encapsulating it all 
// in this component

import React, { useCallback, useState, useRef, useEffect } from 'react';
import { useCommands, useActive, useChainedCommands, useCurrentSelection, useAttrs, FloatingWrapper, useKeymap } from '@remirror/react';
import { CommandButton } from '@remirror/react-ui';

const AutoFocusInput = ({ autoFocus, ...rest }) => {
  const inputRef = useRef(null);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      const frame = window.requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      });

      return () => {
        window.cancelAnimationFrame(frame);
      };
    }
  }, [autoFocus]);

  return <input ref={inputRef} {...rest} />;
};

/**
 * Detect if we're on Mac for keyboard shortcut display
 * TODO: Remove after custom LinkExtension impl
 * @returns {boolean} True if on Mac, false otherwise
 */
const isMac = () => {
    return typeof navigator !== 'undefined' && 
            /Mac|iPod|iPhone|iPad/.test(navigator.platform);
};

/**
 * Get the formatted keyboard shortcut text for aria-label
 * * TODO: Remove after custom LinkExtension impl
 * @returns {string} Formatted shortcut (⌘K for Mac, Ctrl+K for others)
 */
const getKeyboardShortcut = () => {
    return isMac() ? '⌘K' : 'Ctrl+K';
};

export const LinkButton = () => {
    const commands = useCommands();
    const chain = useChainedCommands();
    const { empty } = useCurrentSelection();
    const attrs = useAttrs();
    
    // Check if cursor is currently within a link (for active state)
    const active = useActive().link();
    const enabled = commands.updateLink.enabled();
    
    // Local state for input interface
    const [isEditing, setIsEditing] = useState(false);
    const [href, setHref] = useState('');
    
    /**
     * Handle link button click
     * 
     * Shows the input interface and pre-fills with existing URL if editing
     */
    const handleSelect = useCallback(() => {
        if (!enabled) {
            return;
        }
        // If we're in an existing link, select it first for editing
        if (active) {
            chain.selectLink().run();
        }

        // Get current link URL if we're editing an existing link
        const currentHref = active ? attrs.link()?.href || '' : '';
        setHref(currentHref);
        setIsEditing(true);
    }, [chain, active, enabled, attrs]);

    /**
     * Submit the link URL
     */
    const submitHref = useCallback(() => {
        setIsEditing(false);
        
        if (href.trim() === '') {
            // If URL is empty, remove the link
            if (active) {
                chain.removeLink().focus().run();
            }
        } else {
            // Create or update the link
            chain.updateLink({ href: href.trim(), auto: false }).focus().run();
        }
        
        setHref('');
    }, [chain, href, active]);

    /**
     * Cancel link editing
     */
    const cancelHref = useCallback(() => {
        setIsEditing(false);
        setHref('');
    }, []);

    /**
     * Remove the current link
     */
    const removeLink = useCallback(() => {
        setIsEditing(false);
        chain.removeLink().focus().run();
        setHref('');
    }, [chain]);

    /**
     * Handle focus leaving the floating container
     * Only close if focus moves completely outside the container
     */
    const handleContainerBlur = useCallback((event) => {
        // Get the container element
        const container = event.currentTarget;
        
        // Use setTimeout to allow focus to settle on the new element
        setTimeout(() => {
            // Check if the currently focused element is inside the container
            if (!container.contains(document.activeElement)) {
                cancelHref();
            }
        }, 0);
    }, [cancelHref]);

    /**
     * Handle input key presses with improved accessibility
     */
    const handleKeyPress = useCallback((event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            submitHref();
        } else if (event.key === 'Escape') {
            event.preventDefault();
            cancelHref();
        } else if (event.key === 'Tab' && !event.shiftKey) {
            const buttons = event.currentTarget.parentElement.querySelectorAll('[role="button"], button');
            if (buttons.length > 0) {
                event.preventDefault();
                buttons[0].focus();
            }
        }
    }, [submitHref, cancelHref, active]);

    /**
     * Handle remove button key presses
     */
    const handleRemoveKeyPress = useCallback((event) => {
        if (event.key === 'Tab' && event.shiftKey) {
            const input = event.currentTarget.parentElement.querySelector('input');
            if (input) {
                event.preventDefault();
                input.focus();
            }
        }
    }, []);

    // Add keyboard shortcut for Ctrl+K (or Cmd+K on Mac) using useKeymap
    // This will override any default LinkExtension shortcuts.
    // TODO: Remove after custom LinkExtension impl
    useKeymap(
        'Mod-k',
        () => {
            if (enabled) {
                handleSelect();
                return true;
            }
            return false;
        },
        [enabled, handleSelect]
    );

    return (
        <>
            <CommandButton
                commandName="updateLink"
                active={active}
                enabled={enabled}
                onSelect={handleSelect}
                icon="link"
                label={`Insert or edit link (${getKeyboardShortcut()})`}
            />
            
            {/* Floating input interface */}
            <FloatingWrapper
                positioner='always'
                placement='bottom-start'
                enabled={isEditing}
            >
                <div 
                    role="dialog"
                    aria-label={active ? "Edit link" : "Insert link"}
                    onBlur={handleContainerBlur}
                    className="link-button-dialog"
                >
                    <label htmlFor="link-url-input" className="sr-only">
                        {active ? "Edit link URL" : "Enter link URL"}
                    </label>
                    <AutoFocusInput
                        id="link-url-input"
                        autoFocus
                        type="url"
                        placeholder="Enter link URL..."
                        value={href}
                        onChange={(event) => setHref(event.target.value)}
                        onKeyDown={handleKeyPress}
                        aria-label={active ? "Edit link URL" : "Enter link URL"}
                        aria-describedby={active ? "link-help-edit" : "link-help-create"}
                        className="link-button-input"
                    />
                    
                    {/* Button container for better layout */}
                    <div style={{ display: 'flex', gap: '4px', marginLeft: '8px' }}>
                        {/* Show save button for both new and existing links */}
                        <CommandButton
                            commandName="updateLink"
                            onSelect={submitHref}
                            icon="checkboxMultipleLine"
                            enabled={true}
                            aria-label={active ? "Save link changes" : "Create link"}
                        />
                        
                        {/* Show remove button only when editing existing link */}
                        {active && (
                            <CommandButton
                                commandName="removeLink"
                                onSelect={removeLink}
                                icon="linkUnlink"
                                enabled={true}
                                aria-label="Remove link"
                                data-remove-button
                                onKeyDown={handleRemoveKeyPress}
                            />
                        )}
                    </div>
                    
                    {/* Screen reader instructions */}
                    <div id="link-help-create" className="sr-only">
                        Press Enter to create link, Escape to cancel, Tab to navigate to save button
                    </div>
                    <div id="link-help-edit" className="sr-only">
                        Press Enter to save changes, Escape to cancel, Tab to navigate save and remove buttons
                    </div>
                    
                </div>
            </FloatingWrapper>
        </>
    );
};

export default LinkButton;