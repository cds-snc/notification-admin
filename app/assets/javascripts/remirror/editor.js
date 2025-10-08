import React, { useCallback } from 'react';
import { PlaceholderExtension } from 'remirror/extensions';
import { i18nFormat } from '@remirror/i18n';
import { EditorComponent, Remirror, ThemeProvider, useRemirror } from '@remirror/react';
import { AllStyledComponent } from '@remirror/styles/emotion';

import { NotifyToolbar } from './toolbar';
import { NotifyPreset } from './preset';

export const NotifyEditor = ({
  placeholder,
  stringHandler,
  children,
  theme,
  ...rest
}) => {
  const extensions = useCallback(
    () => [new PlaceholderExtension({ placeholder }), ...NotifyPreset()],
    [placeholder],
  );

  const { manager } = useRemirror({ extensions, stringHandler });

  return (
    <AllStyledComponent>
      <ThemeProvider theme={theme}>
        <Remirror manager={manager} i18nFormat={i18nFormat} {...rest}>
          <NotifyToolbar />
          <EditorComponent />
          {children}
        </Remirror>
      </ThemeProvider>
    </AllStyledComponent>
  );
};