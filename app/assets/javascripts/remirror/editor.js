import React, { useCallback } from 'react';
import { PlaceholderExtension } from 'remirror/extensions';
import { i18nFormat } from '@remirror/i18n';
import { EditorComponent, Remirror, ThemeProvider, useRemirror } from '@remirror/react';
import { AllStyledComponent } from '@remirror/styles/emotion';

import { NotifyToolbar } from './toolbar';
import { NotifyPreset } from './preset';
import { FloatingLinkToolbar } from './components/FloatingLinkToolbar';

export const NotifyEditor = ({
  stringHandler,
  children,
  theme,
  ...rest
}) => {
  const { manager } = useRemirror({
    extensions: () => [...NotifyPreset()],
    content: '',
    stringHandler: stringHandler || 'markdown',
  });

  return (
    <AllStyledComponent>
      <ThemeProvider theme={theme}>
        <Remirror manager={manager} i18nFormat={i18nFormat} {...rest}>
          <NotifyToolbar />
          <EditorComponent />
          <FloatingLinkToolbar />
          {children}
        </Remirror>
      </ThemeProvider>
    </AllStyledComponent>
  );
};