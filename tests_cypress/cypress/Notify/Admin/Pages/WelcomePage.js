let Components = {
    CreateYourFirstService: () => cy.get("a[href='/add-service?first=first']"),
    GuidanceJoinService: () => cy.getByTestId('guidance-join-existing-service'),
    DetailsJoinService: () => cy.getByTestId('details-join-existing-service'),
}

let Actions = {
    ClickCreateYourFirstService: () => {
        Components.CreateYourFirstService().click();
    },
    ExpandDetailsJoinService: () => {
        Components.DetailsJoinService().click();
    },
}

let WelcomePage = {
    URL: '/welcome', // URL for the page, relative to the base URL
    Components,
    ...Actions
};

export default WelcomePage;