describe('Utils - emailSafe', () => {
  // Load the utils.js file before running tests
  beforeAll(() => {
    // Mocking the window object for the IIFE in utils.js
    global.window = {};
    require('../../app/assets/javascripts/utils.js');
    // Access the function through the global window object
    global.emailSafe = window.utils.emailSafe;
  });

  const testCases = [
    // Accents and diacritics
    ['café', 'cafe'],
    ['résumé', 'resume'],
    ['naïve', 'naive'],
    ['äöü', 'aou'],
    
    // Spaces with default dot replacement
    ['first last', 'first.last'],
    ['  extra  spaces  ', 'extra.spaces'],
    ['multiple   spaces', 'multiple.spaces'],
    
    // Custom whitespace character
    ['first last', 'first-last', '-'],
    ['first last', 'first_last', '_'],
    ['  extra  spaces  ', 'extra*spaces', '*'],
    
    // Non-alphanumeric filtering
    ['user@example.com', 'userexample.com'],
    ['first!#$%^&*()last', 'firstlast'],
    ['valid-name_123', 'valid-name_123'],
    ['symbols!@#$%^123', 'symbols123'],
    
    // Case conversion
    ['UserName', 'username'],
    ['UPPER.CASE', 'upper.case'],
    ['MiXeD_CaSe', 'mixed_case'],
    
    // Consecutive special characters
    ['double..dots', 'double.dots'],
    ['triple...dots', 'triple.dots'],
    ['dot.-.dot', 'dot-dot'],
    ['dot._.dot', 'dot_dot'],
    ['a--b__c', 'a-b_c'],
    ['a.-._.-b', 'a-b'],
    
    // Beginning and end cleanup
    ['.leading', 'leading'],
    ['trailing.', 'trailing'],
    ['.both.ends.', 'both.ends'],
    
    // Edge cases
    ['', ''],
    ['   ', ''],
    ['....', ''],
    ['!@#$%^&*()', ''],
    ['...a...', 'a'],
    
    // Underscores and hyphens preservation
    ['sending_domain', 'sending_domain'],
    ['sending-domain', 'sending-domain'],
    ['sending_domain_', 'sending_domain_'],
    ['sending-domain-', 'sending-domain-'],
  ];

  test.each(testCases)(
    'emailSafe(%s) should return %s',
    (input, expected, whitespace = '.') => {
      expect(emailSafe(input, whitespace)).toBe(expected);
    }
  );

  // Add additional test cases from Python test_email_safe_return_dot_separated_email_domain
  const pythonTestCases = [
    ['name with spaces', 'name.with.spaces'],
    ['singleword', 'singleword'],
    ['UPPER CASE', 'upper.case'],
    ['Service - with dash', 'service-with.dash'],
    ['lots      of spaces', 'lots.of.spaces'],
    ['name.with.dots', 'name.with.dots'],
    ['name-with-other-delimiters', 'name-with-other-delimiters'],
    ['name_with_other_delimiters', 'name_with_other_delimiters'],
    ['üńïçödë wördś', 'unicode.words'],
    ['foo--bar', 'foo-bar'],
    ['a-_-_-_-b', 'a-b']
  ];

  test.each(pythonTestCases)(
    'emailSafe(%s) matches Python implementation with result %s',
    (input, expected) => {
      expect(emailSafe(input)).toBe(expected);
    }
  );
});