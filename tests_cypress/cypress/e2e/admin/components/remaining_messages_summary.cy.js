
// RMS components in the storybook
let RMS = {
    Below: () => cy.getByTestId('rms-below'),
    Warn: () => cy.getByTestId('rms-warning'),
    LimitDaily: () => cy.getByTestId('rms-limit-daily'),
    LimitBoth: () => cy.getByTestId('rms-limit-both'),
    TextBelow: () => cy.getByTestId('rms-text-below'),
    TextWarn: () => cy.getByTestId('rms-text-warning'),
    TextLimit: () => cy.getByTestId('rms-text-limit'),
    EmojiBelow: () => cy.getByTestId('rms-emoji-below'),
    EmojiWarn: () => cy.getByTestId('rms-emoji-warning'),
    EmojiLimit: () => cy.getByTestId('rms-emoji-limit'),
}

let PageURL = '/_storybook?component=remaining-messages-summary';

describe('Remaining Messages Summary Component', () => {
    beforeEach(() => {
        cy.visit(PageURL);
    });
    
    // Components rendered in the storybook


    describe('Happy path', () => {
        it('shows the number of notifications remaining for today', () => {
            RMS.Below().find('*[data-testid="rms-daily-remaining"]').first().should('have.text', '201');
        });

        it('shows the number of notifications remaining for the year', () => {
            RMS.Below().find('*[data-testid="rms-yearly-remaining"]').first().should('have.text', '201');
        });

        it('links to the contact form to request a daily limit increase', () => {
            RMS.Below().find('*[data-testid="rms"]').first().find('*[data-testid="rms-daily-link"]').should('exist');
        });

        it('links to usage reports', () => {
            RMS.Below().find('*[data-testid="rms"]').first().find('*[data-testid="rms-yearly-link"]').should('exist');
        });
    });

    describe('Thousands separator', () => {
        it('shows thousands separator in EN for today’s remaining', () => {
            RMS.Below().find('*[data-testid="rms"]').eq(1).find('*[data-testid="rms-daily-remaining"]').should('have.text', '9,301');
        });

        it('shows thousands separator in FR for today’s remaining', () => {
            cy.get('#header-lang').click();
            cy.visit(PageURL);
            RMS.Below().find('*[data-testid="rms"]').eq(1).find('*[data-testid="rms-daily-remaining"]').should('have.text', '9 301');
        });

        it('shows thousands separator in EN for the year’s remaining', () => {
            RMS.Below().find('*[data-testid="rms"]').eq(1).find('*[data-testid="rms-yearly-remaining"]').should('have.text', '9,301');
        });

        it('shows thousands separator in FR for the year’s remaining', () => {
            cy.get('#header-lang').click();
            cy.visit(PageURL);
            RMS.Below().find('*[data-testid="rms"]').eq(1).find('*[data-testid="rms-yearly-remaining"]').should('have.text', '9 301');
        });
    });

    describe('Default icons', () => {
        it('shows blue checkmark for daily when < 80% usage', () => {
            RMS.Below().find('*[data-testid="rms"]').first().find('*[data-testid="rms-item"]').first().find('*[data-testid="rms-icon-default"]').should('exist');
        });

        it('shows blue checkmark for annual when < 80% usage', () => {
            RMS.Below().find('*[data-testid="rms"]').first().find('*[data-testid="rms-item"]').eq(1).find('*[data-testid="rms-icon-default"]').should('exist');
        });
    });

    describe('Warning icons', () => {
        it('shows red warning symbol for daily when >= 80% usage', () => {
            RMS.Warn().find('*[data-testid="rms"]').first().find('*[data-testid="rms-item"]').first().find('*[data-testid="rms-icon-warning"]').should('exist');
        });

        it('shows red warning symbol for annual when >= 80% usage', () => {
            RMS.Warn().find('*[data-testid="rms"]').first().find('*[data-testid="rms-item"]').eq(1).find('*[data-testid="rms-icon-warning"]').should('exist');
        });
    });

    describe('Daily limit reached', () => {
        it('displays daily paused message instead of remaining messages when daily limit reached', () => {
            RMS.LimitDaily().find('*[data-testid="daily-sending-paused"]').should('exist');
        });
    });

    describe('Both limits reached', () => {
        it('displays annual limit message instead of remaining messages when both limits reached', () => {
            RMS.LimitBoth().find('*[data-testid="yearly-sending-paused"]').should('exist');
        });
    });

    describe('Text-only below limit', () => {
        it('shows “Below limit” daily prefix when daily is < 80% usage', () => {
            RMS.TextBelow().find('*[data-testid="rms-item"]').first().find('*[data-testid="text-prefix-below-limit"]').should('exist');
        });

        it('shows “Below limit” annual prefix when annual is < 80% usage', () => {
            RMS.TextBelow().find('*[data-testid="rms-item"]').eq(1).find('*[data-testid="text-prefix-below-limit"]').should('exist');
        });
    });

    describe('Text-only near limit', () => {
        it('shows “Near limit” daily prefix when daily is >= 80% usage', () => {
            RMS.TextWarn().find('*[data-testid="rms-item"]').first().find('*[data-testid="text-prefix-near-limit"]').should('exist');
        });

        it('shows “Near limit” annual prefix when annual is >= 80% usage', () => {
            RMS.TextWarn().find('*[data-testid="rms-item"]').eq(1).find('*[data-testid="text-prefix-near-limit"]').should('exist');
        });
    });

    describe('Text-only at limit', () => {
        it('shows “At limit” daily prefix when daily is < 80% usage', () => {
            RMS.TextLimit().find('*[data-testid="rms-item"]').first().find('*[data-testid="text-prefix-at-limit"]').should('exist');
        });

        it('shows “At limit” annual prefix when annual is < 80% usage', () => {
            RMS.TextLimit().find('*[data-testid="rms-item"]').eq(1).find('*[data-testid="text-prefix-at-limit"]').should('exist');
        });
    });

    describe('Text-only emoji below limit', () => {
        it('shows “🆗” daily prefix when daily is < 80% usage', () => {
            RMS.EmojiBelow().find('*[data-testid="rms-item"]').first().find('*[data-testid="text-prefix-below-limit"]').should('contain', '🆗');
        });

        it('shows “🆗” annual prefix when annual is < 80% usage', () => {
            RMS.EmojiBelow().find('*[data-testid="rms-item"]').eq(1).find('*[data-testid="text-prefix-below-limit"]').should('contain', '🆗');
        });
    });

    describe('Text-only emoji near limit', () => {
        it('shows “⚠️” daily prefix when daily is >= 80% usage', () => {
            RMS.EmojiWarn().find('*[data-testid="rms-item"]').first().find('*[data-testid="text-prefix-near-limit"]').should('contain', '⚠️');
        });

        it('shows “⚠️” annual prefix when annual is >= 80% usage', () => {
            RMS.EmojiWarn().find('*[data-testid="rms-item"]').eq(1).find('*[data-testid="text-prefix-near-limit"]').should('contain', '⚠️');
        });
    });

    describe('Text-only emoji at limit', () => {
        it('shows “⚠️” daily prefix when daily is < 80% usage', () => {
            RMS.EmojiLimit().find('*[data-testid="rms-item"]').first().find('*[data-testid="text-prefix-at-limit"]').should('contain', '⚠️');
        });

        it('shows “⚠️” annual prefix when annual is < 80% usage', () => {
            RMS.EmojiLimit().find('*[data-testid="rms-item"]').eq(1).find('*[data-testid="text-prefix-at-limit"]').should('contain', '⚠️');
        });
    });
});
