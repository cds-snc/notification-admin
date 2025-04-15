// Parts of the page a user can interact with
let Components = {
    ChangePhoneNumberLink: () => cy.get('a[href="/user-profile/mobile-number"]'),
    SaveButton: () => cy.get('button[type="submit"]'),
    PhoneField: () => cy.get('input[name="mobile_number"]'),
    PasswordField: () => cy.get('input[name="password"]'),
};

// Actions users can take on the page
let Actions = {
};

let YourProfilePage = {
    URL: '/user-profile', // URL for the page, relative to the base URL
    Components,
    ...Actions
};

export default YourProfilePage;
