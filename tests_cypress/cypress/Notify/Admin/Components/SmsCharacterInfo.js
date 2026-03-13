// Parts of the component a user can interact with
let Components = {
    Root: () => cy.getByTestId('sms-character-info'),
    Textarea: () => cy.get('#template_content'),
    FragmentCountText: () => cy.getByTestId('sms-fragment-count-text'),
    FragmentCountSuffix: () => cy.getByTestId('sms-fragment-count-suffix'),
    CarrierInfo: () => cy.getByTestId('sms-carrier-info'),
    GuideLink: () => cy.getByTestId('sms-guide-link'),
    DailyLimit: () => cy.getByTestId('sms-daily-limit'),
    DailyLimitValue: () => cy.getByTestId('sms-daily-limit-value'),
};

// Actions users can take on the component
let Actions = {
    typeContent: (content) => {
        Components.Textarea().clear().type(content, { delay: 0 });
    },
    clearContent: () => {
        Components.Textarea().clear();
    },
};

let SmsCharacterInfo = {
    URL: '/_storybook?component=sms-character-info',
    URL_WITH_PREFIX: '/_storybook?component=sms-character-info-with-prefix',
    Components,
    ...Actions,
};

export default SmsCharacterInfo;
