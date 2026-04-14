/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import MenuBar from '../../app/assets/javascripts/tiptap/MenuBar';
import { EditorProvider } from "../../app/assets/javascripts/tiptap/EditorContext";
import '@testing-library/jest-dom';

// Mock Tiptap editor
const mockEditor = {
  isActive: jest.fn().mockReturnValue(false),
  can: jest.fn().mockReturnValue({
    chain: jest.fn().mockReturnValue({
        focus: jest.fn().mockReturnValue({
            toggleBold: jest.fn().mockReturnValue({ run: jest.fn().mockReturnValue(true) }),
            toggleItalic: jest.fn().mockReturnValue({ run: jest.fn().mockReturnValue(true) }),
            toggleVariable: jest.fn().mockReturnValue({ run: jest.fn().mockReturnValue(true) }),
        })
    })
  }),
  chain: jest.fn().mockReturnValue({
    focus: jest.fn().mockReturnValue({
      toggleHeading: jest.fn().mockReturnValue({ run: jest.fn() }),
      setHorizontalRule: jest.fn().mockReturnValue({ run: jest.fn() }),
      toggleBold: jest.fn().mockReturnValue({ run: jest.fn() }),
      toggleItalic: jest.fn().mockReturnValue({ run: jest.fn() }),
      toggleBulletList: jest.fn().mockReturnValue({ run: jest.fn() }),
      toggleOrderedList: jest.fn().mockReturnValue({ run: jest.fn() }),
      toggleBlockquote: jest.fn().mockReturnValue({ run: jest.fn() }),
      toggleVariable: jest.fn().mockReturnValue({ run: jest.fn() }),
      toggleEnglishBlock: jest.fn().mockReturnValue({ run: jest.fn() }),
      toggleFrenchBlock: jest.fn().mockReturnValue({ run: jest.fn() }),
      toggleRtlBlock: jest.fn().mockReturnValue({ run: jest.fn() }),
    }),
  }),
};

// Mock dependencies that might be tricky in JSDOM or use specific TipTap features
jest.mock('../../app/assets/javascripts/tiptap/TooltipWrapper', () => ({ children, label }) => (
  <div data-testid="tooltip-wrapper" data-label={label}>{children}</div>
));

describe('MenuBar', () => {
  test('renders all toolbar buttons with correct English labels', () => {
    render(
      <EditorProvider lang="en">
        <MenuBar editor={mockEditor} />
      </EditorProvider>
    );

    // Check for some key buttons by their test-id or label
    expect(screen.getByTestId('rte-heading_1')).toBeInTheDocument();
    expect(screen.getByTestId('rte-bold')).toBeInTheDocument();
    expect(screen.getByTestId('rte-italic')).toBeInTheDocument();
    expect(screen.getByTestId('rte-variable')).toBeInTheDocument();

    // Check for the sr-only text for accessibility
    // Heading 1 should have "Apply Heading" when not active
    expect(screen.getByTestId('rte-heading_1')).toHaveTextContent('Apply Heading');
    
    // Bold should have "Apply Bold" when not active
    expect(screen.getByTestId('rte-bold')).toHaveTextContent('Apply Bold');
  });

  test('renders all toolbar buttons with correct French labels', () => {
    render(
      <EditorProvider lang="fr">
        <MenuBar editor={mockEditor} />
      </EditorProvider>
    );

    // Heading 1 (Titre) should have "Appliquer Titre" when not active
    expect(screen.getByTestId('rte-heading_1')).toHaveTextContent('Appliquer Titre');
    
    // Bold (Gras) should have "Appliquer Gras" when not active
    expect(screen.getByTestId('rte-bold')).toHaveTextContent('Appliquer Gras');
  });

  test('debug log button state (for manual inspection in test output)', () => {
    const { container } = render(
      <EditorProvider lang="en">
        <MenuBar editor={mockEditor} />
      </EditorProvider>
    );
    const buttons = container.querySelectorAll('button');
    
    console.log('--- Toolbar Buttons Debug ---');
    buttons.forEach(button => {
      const testId = button.getAttribute('data-testid');
      const label = button.getAttribute('title') || button.textContent.trim();
      const ariaPressed = button.getAttribute('aria-pressed');
      console.log(`Button [${testId}]: "${label}" (aria-pressed: ${ariaPressed})`);
    });
    console.log('-----------------------------');
  });
});
