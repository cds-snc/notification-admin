import "cypress-real-events";

import { getHostname, getConfig } from "./utils";

import LoginPage from "../Notify/Admin/Pages/LoginPage";

const CONFIG = getConfig();

// keep track of what we test so we dont test the same thing twice
let links_checked = [];
let svgs_checked = [];

// if the tests failed, reset the arrays so the links are re-checked and a link failure is treated as a real failure
afterEach(function () {
    if (this.currentTest.state === 'failed') {
        links_checked = [];
        svgs_checked = [];
    }
});

Cypress.Commands.add('a11yScan', (url, options = { a11y: true, htmlValidate: true, deadLinks: true, mimeTypes: true, axeConfig: false }) => {
    const current_hostname = getHostname('Admin');
    const ignoreLinks = ['documentation.staging.notification.cdssandbox.xyz', 'https://blog.lastpass.com/fr/posts/security-incident-update-recommended-actions', 'https://blog.lastpass.com/2023/03/security-incident-update-recommended-actions/']

    if (url) {
        cy.visit(url);
    }

    // 1. validate a11y rules using axe dequeue
    if (options.a11y) {
        cy.injectAxe();

        if (options.axeConfig) {
            cy.configureAxe({ rules: options.axeConfig });
        }
    }

    // 2. validate html
    if (options.htmlValidate) {
        cy.get('main').htmlvalidate();
    }

    // 3. check for dead links
    if (options.deadLinks) {
        cy.get('body').within(() => {
            let checked = 0;

            cy.get('a').each((link) => {
                // if the link is in the ignore list, skip it
                if (ignoreLinks.some(ignore => link.prop('href').includes(ignore))) return;

                if (link.prop('href').startsWith('mailto') || link.prop('href').includes('/set-lang') || link.prop('href').includes(url)) return;

                const check_url = link.prop('href');

                // skip if its already been checked
                if (links_checked.includes(check_url)) return;

                // bypass rate limiting
                cy.log('checking link', check_url);
                if (check_url.includes(current_hostname)) {
                    cy.request({
                        url: check_url,
                        headers: { 'waf-secret': CONFIG.WAF_SECRET }
                    }).as('link');
                }
                else {
                    cy.request(link.prop('href')).as('link');
                }

                links_checked.push(check_url);
                checked++;
            }).as('links');

            cy.get('@links').then((links) => {
                cy.log('links checked', checked);
            });

        });
    }

    // 4. check for correct mime type on svg images (should be image/svg+xml)
    if (options.mimeTypes) {
        const svg_mime_type = 'image/svg+xml';
        cy.get('body').within(() => {
            let checked = 0;
            cy.get('img').each((link) => {
                const svg = link.prop('src');
                if (svg.endsWith('.svg')) {
                    // skip if its already been checked
                    if (svgs_checked.includes(svg)) return;

                    cy.request(link.prop('src')).its('headers').its('content-type').should('include', svg_mime_type);

                    svgs_checked.push(svg);
                    checked++;
                }
            }).as('svgs');

            cy.get('@svgs').then((links) => {
                cy.log('svgs checked', checked);
            });
        });
    }
});

Cypress.Commands.add('getByTestId', (selector, ...args) => {
    return cy.get(`[data-testid=${selector}]`, ...args)
});


Cypress.Commands.add('login', (agreeToTerms = true) => {
    cy.task('createAccount', {
        baseUrl: CONFIG.Hostnames.API,
        username: CONFIG.CYPRESS_AUTH_USER_NAME,
        secret: CONFIG.CYPRESS_AUTH_CLIENT_SECRET
    }).then((acct) => {
        Cypress.env('ADMIN_USER_ID', acct.admin.id);
        Cypress.env('REGULAR_USER_ID', acct.regular.id);
        cy.session([acct.regular.email_address, agreeToTerms], () => {
            if (CONFIG.ENV === 'LOCAL' || CONFIG.ENV === 'STAGING') {
                LoginPage.LoginLocal(acct.regular.email_address, CONFIG.CYPRESS_USER_PASSWORD, agreeToTerms);
            } else {
                LoginPage.Login(acct.regular.email_address, CONFIG.CYPRESS_USER_PASSWORD, agreeToTerms);
            }
        });
    });
});


Cypress.Commands.add('loginAsPlatformAdmin', (agreeToTerms = true) => {
    cy.task('createAccount', {
        baseUrl: CONFIG.Hostnames.API,
        username: CONFIG.CYPRESS_AUTH_USER_NAME,
        secret: CONFIG.CYPRESS_AUTH_CLIENT_SECRET
    }).then((acct) => {
        Cypress.env('ADMIN_USER_ID', acct.admin.id);
        Cypress.env('REGULAR_USER_ID', acct.regular.id);
        cy.session([acct.admin.email_address, agreeToTerms], () => {
            if (CONFIG.ENV === 'LOCAL' || CONFIG.ENV === 'STAGING') {
                LoginPage.LoginLocal(acct.admin.email_address, CONFIG.CYPRESS_USER_PASSWORD, agreeToTerms);
            } else {
                LoginPage.Login(acct.admin.email_address, CONFIG.CYPRESS_USER_PASSWORD, agreeToTerms);
            }
        });
    });
});

// this adds the waf-secret to cy.visit()'s that target the admin hostname
Cypress.Commands.overwrite('visit', (originalFn, url, options = {}) => {
    // Get full URL by combining baseUrl with path
    const fullUrl = url.startsWith('http')
        ? url
        : `${Cypress.config('baseUrl')}${url}`;

    // Only add headers if URL matches admin hostname
    if (fullUrl.includes(getHostname('Admin'))) {
        const mergedOptions = {
            ...options,
            headers: {
                ...options.headers,
                'waf-secret': CONFIG.WAF_SECRET
            }
        };
        return originalFn(url, mergedOptions);
    }

    return originalFn(url, options);
});


Cypress.Commands.add('setSelection', { prevSubject: true }, (subject, query, endQuery) => {
  return cy.wrap(subject).selection($el => {
    if (typeof query === 'string') {
      const anchorNode = getTextNode($el[0], query);
      const focusNode = endQuery ? getTextNode($el[0], endQuery) : anchorNode;
      const anchorOffset = anchorNode.wholeText.indexOf(query);
      const focusOffset = endQuery
        ? focusNode.wholeText.indexOf(endQuery) + endQuery.length
        : anchorOffset + query.length;
      setBaseAndExtent(anchorNode, anchorOffset, focusNode, focusOffset);
    } else if (typeof query === 'object') {
      const el = $el[0];
      const anchorNode = getTextNode(el.querySelector(query.anchorQuery));
      const anchorOffset = query.anchorOffset || 0;
      const focusNode = query.focusQuery
        ? getTextNode(el.querySelector(query.focusQuery))
        : anchorNode;
      const focusOffset = query.focusOffset || 0;
      setBaseAndExtent(anchorNode, anchorOffset, focusNode, focusOffset);
    }
  });
});

Cypress.Commands.add('setCursor', { prevSubject: true }, (subject, query, atStart) => {
  return cy.wrap(subject).selection($el => {
    const node = getTextNode($el[0], query);
    const offset = node.wholeText.indexOf(query) + (atStart ? 0 : query.length);
    const document = node.ownerDocument;
    document.getSelection().removeAllRanges();
    document.getSelection().collapse(node, offset);
  });
});

Cypress.Commands.add('setCursorBefore', { prevSubject: true }, (subject, query) => {
  cy.wrap(subject).setCursor(query, true);
});

Cypress.Commands.add('setCursorAfter', { prevSubject: true }, (subject, query) => {
  cy.wrap(subject).setCursor(query);
});
Cypress.Commands.add('selection', { prevSubject: true }, (subject, fn) => {
  cy.wrap(subject)
    .trigger('mousedown')
    .then(fn)
    .trigger('mouseup');

  cy.document().trigger('selectionchange');
  return cy.wrap(subject);
});

function getTextNode(el, match) {
  const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null, false);
  if (!match) {
    return walk.nextNode();
  }

  let node;
  while ((node = walk.nextNode())) {
    if (node.wholeText.includes(match)) {
      return node;
    }
  }
}
function setBaseAndExtent(...args) {
  const document = args[0].ownerDocument;
  document.getSelection().removeAllRanges();
  document.getSelection().setBaseAndExtent(...args);
}