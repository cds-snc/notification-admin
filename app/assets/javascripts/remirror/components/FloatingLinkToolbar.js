/**
 * @fileoverview FloatingLinkToolbar component for managing link creation and editing in Remirror editor
 * 
 * This component provides a floating toolbar interface for:
 * - Creating new links
 * - Editing existing links
 * - Removing links
 * - Keyboard shortcuts for link operations
 * 
 * The toolbar appears contextually when:
 * - A link is selected
 * - Link creation mode is activated via keyboard shortcut
 * - The cursor is positioned within a link
 * 
 * @author Notification Admin Team
 * @version 1.0.0
 */

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createMarkPositioner, LinkExtension } from 'remirror/extensions';
import {
  FloatingWrapper,
  useActive,
  useAttrs,
  useChainedCommands,
  useCurrentSelection,
  useExtensionEvent,
  useUpdateReason,
} from '@remirror/react';
import { CommandButton, FloatingToolbar } from '@remirror/react-ui';

/**
 * Custom hook to handle link keyboard shortcuts and editing state
 * 
 * Listens for link-related keyboard shortcuts (Ctrl/Cmd+K) and manages
 * the editing state for the link toolbar. This hook integrates with Remirror's
 * LinkExtension.
 * 
 * @returns {Object} Hook state object
 * @returns {Object|undefined} returns.linkShortcut - Link shortcut event data
 * @returns {boolean} returns.isEditing - Whether link editing mode is active
 * @returns {Function} returns.setIsEditing - Function to toggle editing state
 */
function useLinkShortcut() {
  const [linkShortcut, setLinkShortcut] = useState();
  const [isEditing, setIsEditing] = useState(false);

  // Listen for link keyboard shortcuts from the LinkExtension
  useExtensionEvent(
    LinkExtension,
    'onShortcut',
    useCallback(
      (props) => {
        if (!isEditing) {
          setIsEditing(true);
        }
        setLinkShortcut(props);
      },
      [isEditing],
    ),
  );

  return { linkShortcut, isEditing, setIsEditing };
}

/**
 * Hook for managing floating link toolbar state and operations
 * 
 * This hook combines multiple Remirror hooks and local state. It handles:
 * - Link URL state management
 * - Position tracking for the floating toolbar
 * - Link creation, updating, and removal operations
 * - Keyboard shortcuts and editing mode transitions
 * - Focus management and cursor positioning
 */
function useFloatingLinkState() {
  const chain = useChainedCommands();
  const { isEditing, linkShortcut, setIsEditing } = useLinkShortcut();
  const { to, empty } = useCurrentSelection();

  // Get current link URL from editor state
  const url = useAttrs().link()?.href ?? '';
  const [href, setHref] = useState(url);
  const ignoreUpdatesRef = useRef(0);

  // Sync local href state with editor link state when not editing
  useEffect(() => {
    if (!isEditing) {
      setHref(url);
    }
  }, [url, isEditing]);

  // Create positioner for floating toolbar placement, memoize it so we're not redrawing components
  const linkPositioner = useMemo(() => createMarkPositioner({ type: 'link' }), []);
  
  // Handler to remove the current link
  const onRemove = useCallback(() => chain.removeLink().focus().run(), [chain]);
  const updateReason = useUpdateReason();

  // Auto-exit editing mode when document or selection changes
  useLayoutEffect(() => {
    if (!isEditing) {
      return;
    }

    // Skip updates if we're intentionally ignoring them (e.g., during link operations)
    if (ignoreUpdatesRef.current > 0) {
      ignoreUpdatesRef.current -= 1;
      return;
    }

    // Exit editing mode if document content or selection changes
    if (updateReason.doc || updateReason.selection) {
      setIsEditing(false);
    }
  }, [isEditing, setIsEditing, updateReason.doc, updateReason.selection]);

  /**
   * Submit the current href value and create/update the link
   *
   * This function handles link creation and editing:
   * - If href is empty, remove the existing link
   * - If href has a value, create or update the link
   * - Restore focus to the appropriate position after the operation
   */
  const submitHref = useCallback(() => {
    setIsEditing(false);
    const range = linkShortcut ?? undefined;

    if (href === '') {
      chain.removeLink();
    } else {
      chain.updateLink({ href, auto: false }, range);
    }

    chain.focus(range?.to ?? to).run();
  }, [setIsEditing, linkShortcut, chain, href, to]);

  /**
   * Cancel link editing without making changes
   * Exits editing mode and discards any uncommitted changes
   */
  const cancelHref = useCallback(() => {
    setIsEditing(false);
  }, [setIsEditing]);

  /**
   * Enter link editing mode
   * 
   * If no text is selected, automatically selects the entire link.
   * Sets up editing state and prepares for text input.
   */
  const clickEdit = useCallback(() => {
    if (empty) {
      chain.selectLink();
    }

    // Ignore next few updates to prevent auto-exit during mode transition
    ignoreUpdatesRef.current = 2;
    setIsEditing(true);
  }, [chain, empty, setIsEditing]);

  return useMemo(
    () => ({
      href,
      setHref,
      linkShortcut,
      linkPositioner,
      isEditing,
      clickEdit,
      onRemove,
      submitHref,
      cancelHref,
    }),
    [href, linkShortcut, linkPositioner, isEditing, clickEdit, onRemove, submitHref, cancelHref],
  );
}

/**
 * Input component with delayed auto-focus capability
 * 
 * Provides an input field that automatically focuses after a
 * brief delay. This prevents focus conflicts during toolbar transitions.
 *
 * @param {Object} props - Component props
 * @param {boolean} props.autoFocus - Whether to auto-focus the input
 * @returns {JSX.Element} Input element with delayed focus behavior
 */
const DelayAutoFocusInput = ({ autoFocus, ...rest }) => {
  const inputRef = useRef(null);

  useEffect(() => {
    if (!autoFocus) {
      return;
    }

    // Use requestAnimationFrame to delay focus
    const frame = window.requestAnimationFrame(() => {
      inputRef.current?.focus();
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [autoFocus]);

  return <input ref={inputRef} {...rest} />;
};

/**
 * FloatingLinkToolbar - Main component for link editing interface
 * 
 * Provides a comprehensive floating toolbar for link management. 
 * displays different UI states based on the current context and 
 * editing mode:
 * 
 * **Display States:**
 * - When a link is selected: Shows edit and remove buttons
 * - When no link is selected: Shows create link button
 * - When editing: Shows input field with auto-focus
 * 
 * **Keyboard Interactions:**
 * - Enter: Submit the link URL
 * - Escape: Cancel editing
 * - Ctrl/Cmd+K: Trigger link creation (handled by LinkExtension)
 * 
 * **Accessibility Features:**
 * - Auto-focus on input when editing starts
 * - Keyboard navigation support
 * - Clear visual feedback for different states
 * 
 * @returns {JSX.Element} The floating link toolbar component
 * 
 * @example
 * // Basic usage in a Remirror editor
 * <Remirror manager={manager}>
 *   <EditorComponent />
 *   <FloatingLinkToolbar />
 * </Remirror>
 */
export const FloatingLinkToolbar = () => {
  // Extract state and handlers from the floating link hook
  const { isEditing, linkPositioner, clickEdit, onRemove, submitHref, href, setHref, cancelHref } =
    useFloatingLinkState();
  
  // Get current editor state
  const active = useActive();
  const activeLink = active.link();
  const { empty } = useCurrentSelection();

  // Memoized click handler for edit button
  const handleClickEdit = useCallback(() => {
    clickEdit();
  }, [clickEdit]);

  // Determine which buttons to show based on link state
  const linkEditButtons = activeLink ? (
    // When a link is active, show edit and remove options
    <>
      <CommandButton commandName='updateLink' onSelect={handleClickEdit} icon='pencilLine' enabled />
      <CommandButton commandName='removeLink' onSelect={onRemove} icon='linkUnlink' enabled />
    </>
  ) : (
    // When no link is active, show create link option
    <CommandButton commandName='updateLink' onSelect={handleClickEdit} icon='link' enabled />
  );

  return (
    <>
      {/* Show toolbar when not editing and a link is selected */}
      {!isEditing && <FloatingToolbar>{linkEditButtons}</FloatingToolbar>}
      
      {/* Show positioned toolbar when not editing and no selection */}
      {!isEditing && empty && (
        <FloatingToolbar positioner={linkPositioner}>{linkEditButtons}</FloatingToolbar>
      )}

      {/* Show input field when in editing mode */}
      <FloatingWrapper
        positioner='always'
        placement='right-end'
        enabled={isEditing}
      >
        <DelayAutoFocusInput
          style={{ zIndex: 20 }}
          autoFocus
          placeholder='Enter link...'
          onChange={(event) => setHref(event.target.value)}
          value={href}
          onKeyPress={(event) => {
            const { code } = event;

            if (code === 'Enter') {
              submitHref();
            }

            if (code === 'Escape') {
              cancelHref();
            }
          }}
        />
      </FloatingWrapper>
    </>
  );
};

/**
 * Default export of the FloatingLinkToolbar component
 * 
 * @exports FloatingLinkToolbar
 * @see {@link FloatingLinkToolbar} For component documentation
 */
export default FloatingLinkToolbar;