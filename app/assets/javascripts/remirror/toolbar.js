import React from 'react';

import {
  BasicFormattingButtonGroup,
  DataTransferButtonGroup,
  HeadingLevelButtonGroup,
  HistoryButtonGroup,
  ListButtonGroup,
} from '@remirror/react-ui';
import { Toolbar } from '@remirror/react-ui';
import { VerticalDivider } from '@remirror/react-ui';

//import { ToggleBidiButton } from './components/bidiButton';
import { ToggleVariableButton } from './components/VariableButton';
import { LinkButton } from './components/LinkButton';
import { AccessibleToolbar } from './components/AccessibleToolbar';

export const NotifyToolbar = () => (
  <AccessibleToolbar 
    label="Text formatting toolbar"
    orientation="horizontal"
  >
    <Toolbar>
      <HistoryButtonGroup />
      <VerticalDivider />
      <DataTransferButtonGroup />
      <VerticalDivider />
      <HeadingLevelButtonGroup />
      <VerticalDivider />
      <BasicFormattingButtonGroup />
      <VerticalDivider />
      <LinkButton />
      <ToggleVariableButton/>
      <VerticalDivider />
      <ListButtonGroup />
      {/* <ToggleBidiButton/> */}
    </Toolbar>
  </AccessibleToolbar>
);