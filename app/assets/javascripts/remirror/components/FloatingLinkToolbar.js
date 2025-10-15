import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createMarkPositioner, LinkExtension } from 'remirror/extensions';
import {
  EditorComponent,
  FloatingWrapper,
  Remirror,
  ThemeProvider,
  useActive,
  useAttrs,
  useChainedCommands,
  useCurrentSelection,
  useExtensionEvent,
  useRemirror,
  useUpdateReason,
} from '@remirror/react';
import { CommandButton, FloatingToolbar } from '@remirror/react-ui';

function useLinkShortcut() {
  const [linkShortcut, setLinkShortcut] = useState();
  const [isEditing, setIsEditing] = useState(false);

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

function useFloatingLinkState() {
  const chain = useChainedCommands();
  const { isEditing, linkShortcut, setIsEditing } = useLinkShortcut();
  const { to, empty } = useCurrentSelection();

  const url = useAttrs().link()?.href ?? '';
  const [href, setHref] = useState(url);
  const ignoreUpdatesRef = useRef(0);

  useEffect(() => {
    if (!isEditing) {
      setHref(url);
    }
  }, [url, isEditing]);

  const linkPositioner = useMemo(() => createMarkPositioner({ type: 'link' }), []);
  const onRemove = useCallback(() => chain.removeLink().focus().run(), [chain]);
  const updateReason = useUpdateReason();

  useLayoutEffect(() => {
    if (!isEditing) {
      return;
    }

    if (ignoreUpdatesRef.current > 0) {
      ignoreUpdatesRef.current -= 1;
      return;
    }

    if (updateReason.doc || updateReason.selection) {
      setIsEditing(false);
    }
  }, [isEditing, setIsEditing, updateReason.doc, updateReason.selection]);

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

  const cancelHref = useCallback(() => {
    setIsEditing(false);
  }, [setIsEditing]);

  const clickEdit = useCallback(() => {
    if (empty) {
      chain.selectLink();
    }

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

const DelayAutoFocusInput = ({ autoFocus, ...rest }) => {
  const inputRef = useRef(null);

  useEffect(() => {
    if (!autoFocus) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      inputRef.current?.focus();
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [autoFocus]);

  return <input ref={inputRef} {...rest} />;
};

export const FloatingLinkToolbar = () => {
  const { isEditing, linkPositioner, clickEdit, onRemove, submitHref, href, setHref, cancelHref } =
    useFloatingLinkState();
  const active = useActive();
  const activeLink = active.link();
  const { empty } = useCurrentSelection();

  const handleClickEdit = useCallback(() => {
    clickEdit();
  }, [clickEdit]);

  const linkEditButtons = activeLink ? (
    <>
      <CommandButton commandName='updateLink' onSelect={handleClickEdit} icon='pencilLine' enabled />
      <CommandButton commandName='removeLink' onSelect={onRemove} icon='linkUnlink' enabled />
    </>
  ) : (
    <CommandButton commandName='updateLink' onSelect={handleClickEdit} icon='link' enabled />
  );

  return (
    <>
      {!isEditing && <FloatingToolbar>{linkEditButtons}</FloatingToolbar>}
      {!isEditing && empty && (
        <FloatingToolbar positioner={linkPositioner}>{linkEditButtons}</FloatingToolbar>
      )}

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

export default FloatingLinkToolbar;