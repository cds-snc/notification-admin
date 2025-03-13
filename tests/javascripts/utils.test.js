describe('Utils - emailSafe', () => {
  // Load the utils.js file before running tests
  beforeAll(() => {
    // Mocking the window object for the IIFE in utils.js
    global.window = {};
    require('../../app/assets/javascripts/utils.js');
    // Access the function through the global window object
    global.emailSafe = window.utils.emailSafe;
  });

  test('strips accents and diacritics', () => {
    expect(emailSafe('café')).toBe('cafe');
    expect(emailSafe('résumé')).toBe('resume');
    expect(emailSafe('naïve')).toBe('naive');
    expect(emailSafe('äöüß')).toBe('aou');
  });

  test('replaces spaces with dots by default', () => {
    expect(emailSafe('first last')).toBe('first.last');
    expect(emailSafe('  extra  spaces  ')).toBe('extra.spaces');
    expect(emailSafe('multiple   spaces')).toBe('multiple.spaces');
  });

  test('replaces spaces with custom whitespace character', () => {
    expect(emailSafe('first last', '-')).toBe('first-last');
    expect(emailSafe('first last', '_')).toBe('first_last');
    expect(emailSafe('  extra  spaces  ', '*')).toBe('extra*spaces');
  });

  test('filters out non-alphanumeric characters except whitespace, hyphens, underscores', () => {
    expect(emailSafe('user@example.com')).toBe('userexample.com');
    expect(emailSafe('first!#$%^&*()last')).toBe('firstlast');
    expect(emailSafe('valid-name_123')).toBe('valid-name_123');
    expect(emailSafe('symbols!@#$%^123')).toBe('symbols123');
  });

  test('converts characters to lowercase', () => {
    expect(emailSafe('UserName')).toBe('username');
    expect(emailSafe('UPPER.CASE')).toBe('upper.case');
    expect(emailSafe('MiXeD_CaSe')).toBe('mixed_case');
  });

  test('handles consecutive dots and special characters', () => {
    expect(emailSafe('double..dots')).toBe('double.dots');
    expect(emailSafe('triple...dots')).toBe('triple.dots');
    expect(emailSafe('dot.-.dot')).toBe('dot-dot');
    expect(emailSafe('dot._.dot')).toBe('dot_dot');
    expect(emailSafe('a--b__c')).toBe('a-b_c');
    expect(emailSafe('a.-._.-b')).toBe('a-b');
  });

  test('removes dots from beginning and end', () => {
    expect(emailSafe('.leading')).toBe('leading');
    expect(emailSafe('trailing.')).toBe('trailing');
    expect(emailSafe('.both.ends.')).toBe('both.ends');
  });

  test('handles edge cases', () => {
    expect(emailSafe('')).toBe('');
    expect(emailSafe('   ')).toBe('');
    expect(emailSafe('....')).toBe('');
    expect(emailSafe('!@#$%^&*()')).toBe('');
    expect(emailSafe('...a...')).toBe('a');
  });

  test('does not replace underscores and hyphens with dots', () => {
    expect(emailSafe('sending_domain')).toBe('sending_domain');
    expect(emailSafe('sending-domain')).toBe('sending-domain');
    expect(emailSafe('sending_domain_')).toBe('sending_domain_');
    expect(emailSafe('sending-domain-')).toBe('sending-domain-');
  });

});