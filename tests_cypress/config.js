let STAGING = {
    CONFIG_NAME: "STAGING",
    Hostnames: {
        API: 'https://api.staging.notification.cdssandbox.xyz',
        Admin: 'https://staging.notification.cdssandbox.xyz',
        DDAPI: 'https://api.document.staging.notification.cdssandbox.xyz',
    },
    Services: {
        Notify: 'd6aa2c68-a2d9-4437-ab19-3ae8eb202553',
        Cypress: '5c8a0501-2aa8-433a-ba51-cefb8063ab93'
    },
    Templates: {
        'FILE_ATTACH_TEMPLATE_ID': '7246c71e-3d60-458b-96af-af17a5b07659',
        'SIMPLE_EMAIL_TEMPLATE_ID': '939dafde-1b60-47f0-a6d5-c9080d92a4a8',
        'VARIABLES_EMAIL_TEMPLATE_ID': '1101a00a-11b7-4036-865c-add43fcff7c9',
        'SMOKE_TEST_EMAIL': '5e26fae6-3565-44d5-bfed-b18680b6bd39',
        'SMOKE_TEST_EMAIL_BULK': '04145882-0f21-4d57-940d-69883fc23e77',
        'SMOKE_TEST_EMAIL_ATTACH': 'bf85def8-01b4-4c72-98a8-86f2bc10f2a4',
        'SMOKE_TEST_EMAIL_LINK': '37924e87-038d-48b8-b122-f6dddefd56d5',
        'SMOKE_TEST_SMS': '16cae0b3-1d44-47ad-a537-fd12cc0646b6'
    },
    Users: {
        Team: ['andrew.leith+bannertest@cds-snc.ca'],
        NonTeam: ['person@example.com'],
        Simulated: ['simulate-delivered-2@notification.canada.ca', 'simulate-delivered-3@notification.canada.ca', 'success@simulator.amazonses.com'],
        SimulatedPhone: ['+16132532222', '+16132532223', '+16132532224']
    },
    Organisations: {
        'DEFAULT_ORG_ID': '4eef762f-383d-4068-81ca-c2c5c186eb16',
        'NO_CUSTOM_BRANDING_ORG_ID': '4eef762f-383d-4068-81ca-c2c5c186eb16'
    },
    ReplyTos: {
        Default: '24e5288d-8bfa-4ad4-93aa-592c11a694cd',
        Second: '797865c4-788b-4184-91ae-8e45eb07e40b'
    },
    viewports: [320, 375, 640, 768]
};

let LOCAL = {
    CONFIG_NAME: "LOCAL",
    Hostnames: {
        API: 'http://localhost:6011',
        Admin: 'http://localhost:6012',
        DDAPI: 'http://localhost:7000',
    },
    Services: {
        Notify: 'd6aa2c68-a2d9-4437-ab19-3ae8eb202553',
        Cypress: '5c8a0501-2aa8-433a-ba51-cefb8063ab93'
    },
    Templates: {
        'FILE_ATTACH_TEMPLATE_ID': 'e52acc48-dcb9-4f70-81cf-b87d0ceaef1b',
        'SIMPLE_EMAIL_TEMPLATE_ID': '0894dc6c-1b07-465e-91f0-aa76f202a83f',
        'VARIABLES_EMAIL_TEMPLATE_ID': 'fa00aa13-87fd-4bc7-9349-ba9270347055',
        'SMOKE_TEST_EMAIL': '08673acf-fef1-408d-8ce7-7809907595b2',
        'SMOKE_TEST_EMAIL_BULK': 'efbd319b-4de8-41c7-850f-93ec0490d3c2',
        'SMOKE_TEST_EMAIL_ATTACH': 'cbd5307f-8662-4cea-9b8e-3bc672bf005c',
        'SMOKE_TEST_EMAIL_LINK': '94cce202-b171-440f-b0c1-734368ca9494',
        'SMOKE_TEST_SMS': 'a9fff158-a745-417a-b1ec-ceebcba6614f'
    },
    Users: {
        Team: ['william.banks+admin@cds-snc.ca'],
        NonTeam: ['person@example.com'],
        Simulated: ['simulate-delivered-2@notification.canada.ca', 'simulate-delivered-3@notification.canada.ca', 'success@simulator.amazonses.com'],
        SimulatedPhone: ['+16132532222', '+16132532223', '+16132532224']
    },
    Organisations: {
        'DEFAULT_ORG_ID': 'ff9e5ddd-926f-4ae2-bc87-f5104262ca17',
        'NO_CUSTOM_BRANDING_ORG_ID': '39b3230e-300a-42f4-bfb7-40b20b704d44'
    },
    ReplyTos: {
        Default: '8c2a9b22-8fec-4ad9-bca8-658abbb7406e',
        Second: 'fc4d2266-5594-47d0-8056-7bef62d59177'
    },
    viewports: [320, 375, 640, 768]
};

const config = {
    STAGING,
    LOCAL,
};

// choose which config to use here
const ConfigToUse = config.STAGING;

module.exports = ConfigToUse;
