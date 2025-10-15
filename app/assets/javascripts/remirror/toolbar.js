import React from 'react';

import {
  BasicFormattingButtonGroup,
  DataTransferButtonGroup,
  HeadingLevelButtonGroup,
  HistoryButtonGroup,
  ListButtonGroup,
  CommandButton
} from '@remirror/react-ui';
import { Toolbar } from '@remirror/react-ui';
import { VerticalDivider } from '@remirror/react-ui';

import { HighlightExtension } from './extensions/HighlightExtension'
import { EditorComponent, Remirror, useCommands, useRemirror } from '@remirror/react';
//import { ToggleBidiButton } from './components/bidiButton';
import { ToggleVariableButton } from './components/VariableButton';

export const NotifyToolbar = () => (
  <Toolbar>
    <HistoryButtonGroup />
    <VerticalDivider />
    <DataTransferButtonGroup />
    <VerticalDivider />
    <HeadingLevelButtonGroup />
    <VerticalDivider />
    <BasicFormattingButtonGroup />
    <VerticalDivider />
    <ListButtonGroup />
    <ToggleVariableButton/>
    {/* <ToggleBidiButton/> */}
  </Toolbar>
);