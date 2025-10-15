import React, { useRef, useEffect, useCallback } from 'react';

/**
 * AccessibleToolbar component that wraps any toolbar content with proper ARIA accessibility.
 * Implements keyboard navigation according to WAI-ARIA toolbar pattern:
 * https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Roles/toolbar_role
 * 
 * - Arrow keys move focus between toolbar items
 * - Home/End keys move to first/last items
 * - Tab key moves focus in/out of toolbar
 * - Uses roving tabindex for proper focus management
 */
export const AccessibleToolbar = ({ 
  children, 
  label, 
  orientation = 'horizontal',
  className = '',
  ...props 
}) => {
  const toolbarRef = useRef(null);
  const currentFocusIndexRef = useRef(0);

  /**
   * Get all focusable elements within the toolbar
   */
  const getFocusableElements = useCallback(() => {
    if (!toolbarRef.current) return [];
    
    // Make sure we only take enabled toolbar items into account
    const focusableSelectors = [
      'button:not([disabled])',
      '[href]:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"]):not([disabled])',
      '[role="button"]:not([disabled])'
    ].join(', ');
    
    return Array.from(toolbarRef.current.querySelectorAll(focusableSelectors));
  }, []);

  /**
   * Update tabindex values to implement roving tabindex pattern
   * Only one element should have tabindex="0" at a time
   */
  const updateTabIndex = useCallback((focusIndex = 0) => {
    const focusableElements = getFocusableElements();
    
    focusableElements.forEach((element, index) => {
      element.tabIndex = index === focusIndex ? 0 : -1;
    });
    
    currentFocusIndexRef.current = focusIndex;
  }, [getFocusableElements]);

  /**
   * Move focus to a specific element by index
   */
  const moveFocus = useCallback((newIndex) => {
    const focusableElements = getFocusableElements();
    
    if (focusableElements.length === 0) return;
    
    // Wrap around if necessary
    let targetIndex = newIndex;
    if (newIndex < 0) {
      targetIndex = focusableElements.length - 1;
    } else if (newIndex >= focusableElements.length) {
      targetIndex = 0;
    }
    
    updateTabIndex(targetIndex);
    focusableElements[targetIndex]?.focus();
  }, [getFocusableElements, updateTabIndex]);

  /**
   * Handle keyboard navigation within the toolbar
   */
  const handleKeyDown = useCallback((event) => {
    const focusableElements = getFocusableElements();
    const currentIndex = focusableElements.findIndex(el => el === event.target);
    
    if (currentIndex === -1) return;

    switch (event.key) {
      case 'ArrowRight':
        if (orientation === 'horizontal') {
          event.preventDefault();
          moveFocus(currentIndex + 1);
        }
        break;
        
      case 'ArrowLeft':
        if (orientation === 'horizontal') {
          event.preventDefault();
          moveFocus(currentIndex - 1);
        }
        break;
        
      case 'ArrowDown':
        if (orientation === 'vertical') {
          event.preventDefault();
          moveFocus(currentIndex + 1);
        }
        break;
        
      case 'ArrowUp':
        if (orientation === 'vertical') {
          event.preventDefault();
          moveFocus(currentIndex - 1);
        }
        break;
        
      case 'Home':
        event.preventDefault();
        moveFocus(0);
        break;
        
      case 'End':
        event.preventDefault();
        moveFocus(focusableElements.length - 1);
        break;
        
      default:
        // Let other keys pass through
        break;
    }
  }, [getFocusableElements, moveFocus, orientation]);

  /**
   * Handle focus entering the toolbar
   */
  const handleFocus = useCallback((event) => {
    // If focus is coming from outside the toolbar, ensure proper tabindex setup
    if (!toolbarRef.current?.contains(event.relatedTarget)) {
      updateTabIndex(currentFocusIndexRef.current);
    }
  }, [updateTabIndex]);

  /**
   * Initialize the toolbar on mount and when children change
   */
  useEffect(() => {
    const focusableElements = getFocusableElements();
    
    if (focusableElements.length > 0) {
      // Set up initial roving tabindex
      updateTabIndex(0);
    }
  }, [getFocusableElements, updateTabIndex, children]);

  return (
    <div
      ref={toolbarRef}
      role="toolbar"
      aria-label={label}
      aria-orientation={orientation}
      className={className}
      onKeyDown={handleKeyDown}
      onFocus={handleFocus}
      {...props}
    >
      {children}
    </div>
  );
};

export default AccessibleToolbar;