(function() {
  // Track GA events when accessibility or newsletter options are selected on contact form
  document.addEventListener('DOMContentLoaded', function() {
    var form = document.querySelector('form');
    if (!form) return;
    
    form.addEventListener('submit', function(e) {
      var selectedOption = document.querySelector('input[name="support_type"]:checked');
      if (!selectedOption) return;
      
      var selectedValue = selectedOption.value;
      
      // Only track for accessibility feedback and newsletter signup
      if (selectedValue !== 'a11y_feedback' && selectedValue !== 'newsletter_signup') {
        return;
      }
      
      // Prevent immediate submission to ensure GA event fires
      e.preventDefault();
      
      var eventName, eventLabel;
      if (selectedValue === 'a11y_feedback') {
        eventName = 'accessibility_feedback_selected';
        eventLabel = 'Report accessibility issues';
      } else {
        eventName = 'newsletter_signup_selected';
        eventLabel = 'Sign up to newsletter';
      }
      
      // Get language from html lang attribute
      var language = document.documentElement.lang || 'en';
      
      // Check if gtag is available (only in production for non-CDS users)
      if (typeof gtag !== 'undefined') {
        gtag('event', eventName, {
          'event_category': 'Contact Form',
          'event_label': eventLabel,
          'language': language,
          'event_callback': function() {
            form.submit();
          }
        });
        
        // Fallback: submit after timeout even if callback doesn't fire
        setTimeout(function() {
          form.submit();
        }, 300);
      } else {
        // No GA available (dev/staging or CDS user), just submit normally
        form.submit();
      }
    });
  });
})();
