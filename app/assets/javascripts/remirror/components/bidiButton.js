import React, { useCallback } from 'react';
import { useCommands, useActive } from '@remirror/react';
import { CommandButton } from '@remirror/react-ui';

export const ToggleBidiButton = ({ direction = 'ltr' }) => {
    const commands = useCommands();

    const handleSelect = useCallback(() => {
        // Check if the command exists before calling
        if (commands.setTextDirection) {
            commands.setTextDirection({ dir: direction });
        }
    }, [commands, direction]);

    const active = useActive().bidi();
    const enabled = commands.setTextDirection.enabled();

    return (
        <CommandButton
            commandName="setTextDirection"
            active={active}
            enabled={enabled}
            onSelect={handleSelect}
            icon="arrowLeftSFill"
            label="Toggle Direction"
        />
    );
};