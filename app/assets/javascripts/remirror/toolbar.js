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
  </Toolbar>
);