import { BidiExtension } from '@remirror/extension-bidi';
import { BlockquoteExtension } from '@remirror/extension-blockquote';
import { BoldExtension } from '@remirror/extension-bold';
import { CodeExtension } from '@remirror/extension-code';
import { CodeBlockExtension } from '@remirror/extension-code-block';
import { DropCursorExtension } from '@remirror/extension-drop-cursor';
import { GapCursorExtension } from '@remirror/extension-gap-cursor';
import { HardBreakExtension } from '@remirror/extension-hard-break';
import { HeadingExtension } from '@remirror/extension-heading';
import { HorizontalRuleExtension } from '@remirror/extension-horizontal-rule';
import { ItalicExtension } from '@remirror/extension-italic';
import { LinkExtension } from '@remirror/extension-link';
import {
  BulletListExtension,
  OrderedListExtension,
} from '@remirror/extension-list';
import { ShortcutsExtension } from '@remirror/extension-shortcuts';
import { StrikeExtension } from '@remirror/extension-strike';
import { TrailingNodeExtension } from '@remirror/extension-trailing-node';
import { UnderlineExtension } from '@remirror/extension-underline';
import { HighlightExtension } from './extensions/HighlightExtension';
import { MarkdownExtension } from 'remirror/extensions';
import { MarkdownLinkInputRuleExtension } from './extensions/MarkdownLinkInputRuleExtension';


const DEFAULT_OPTIONS = {
  ...BidiExtension.defaultOptions,
  ...BoldExtension.defaultOptions,
  ...CodeBlockExtension.defaultOptions,
  ...DropCursorExtension.defaultOptions,
  ...TrailingNodeExtension.defaultOptions,
  ...HeadingExtension.defaultOptions,
  ...MarkdownExtension.defaultOptions
};

/**
 * Create the wysiwyg preset which includes all the more exotic extensions
 * provided by the `remirror` core library.
 */
export function NotifyPreset(options = {}) {
  options = { ...DEFAULT_OPTIONS, ...options };

  const gapCursorExtension = new GapCursorExtension();
  const hardBreakExtension = new HardBreakExtension();
  const horizontalRuleExtension = new HorizontalRuleExtension();
  const italicExtension = new ItalicExtension();
  const strikeExtension = new StrikeExtension();
  const underlineExtension = new UnderlineExtension();
  const blockquoteExtension = new BlockquoteExtension();
  const codeExtension = new CodeExtension();
  const bulletListExtension = new BulletListExtension();
  const orderedListExtension = new OrderedListExtension();
  const shortcutsExtension = new ShortcutsExtension();
  const highlightExtension = new HighlightExtension();

  const markdownExtension = new MarkdownExtension();
  //const markdownLinkInputRuleExtension = new MarkdownLinkInputRuleExtension();

  const { selectTextOnClick } = options;
  const linkExtension = new LinkExtension({
    autoLink: false
  });

  const { autoUpdate, defaultDirection, excludeNodes } = options;
  const bidiExtension = new BidiExtension({ autoUpdate, defaultDirection, excludeNodes });

  const { weight } = options;
  const boldExtension = new BoldExtension({ weight });

  const { defaultLanguage, formatter, toggleName, syntaxTheme, supportedLanguages } = options;
  const codeBlockExtension = new CodeBlockExtension({
    defaultLanguage,
    formatter,
    toggleName,
    syntaxTheme,
    supportedLanguages,
  });

  const { color, width } = options;
  const dropCursorExtension = new DropCursorExtension({
    color,
    width,
  });

  const { defaultLevel, levels } = options;
  const headingExtension = new HeadingExtension({ defaultLevel, levels });


  const { disableTags, ignoredNodes, nodeName } = options;
  const trailingNodeExtension = new TrailingNodeExtension({
    disableTags,
    ignoredNodes,
    nodeName,
  });

  return [
    // Plain
    bidiExtension,
    dropCursorExtension,
    gapCursorExtension,
    shortcutsExtension,
    trailingNodeExtension,
    //markdownLinkInputRuleExtension,

    // Nodes
    hardBreakExtension,
    horizontalRuleExtension,
    blockquoteExtension,
    codeBlockExtension,
    headingExtension,
    bulletListExtension,
    orderedListExtension,

    // Marks
    boldExtension,
    codeExtension,
    strikeExtension,
    italicExtension,
    linkExtension,
    underlineExtension,
    highlightExtension,

    markdownExtension
  ];
}