import React, { useCallback } from 'react';
import { useCommands, useActive } from '@remirror/react';
import { CommandButton } from '@remirror/react-ui';

export const ToggleVariableButton = () => {
    const commands = useCommands();

    const handleSelect = useCallback(() => {
        if (enabled) {
            commands.toggleHighlight();
        }
    }, [commands]);

    const active = useActive().highlight();
    const enabled = commands.toggleHighlight.enabled();

    return (
        <CommandButton
            commandName="toggleHighlight"
            active={active}
            enabled={enabled}
            onSelect={handleSelect}
            icon="bracesLine"
            label="Toggle variable"
        />
    );
};