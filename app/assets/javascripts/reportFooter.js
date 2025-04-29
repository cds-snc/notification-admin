(function(Modules) {
  "use strict";

  Modules.ReportFooter = function() {
    this.start = function(component) {
      var $component = $(component);
      var $button = $component.find('button[name="generate-report"]');
      var $spinner = $component.find('.loading-spinner-large');
      
      // If there's no button in this component, no need to continue
      if ($button.length === 0) {
        return;
      }

      // Create a spinner if it doesn't exist
      if ($spinner.length === 0) {
        $spinner = $('<div class="loading-spinner-large"></div>');
        $spinner.insertBefore($button);
      }
      
      // Find the closest form - could be a parent of the component or the component itself
      var $form = $button.closest('form');
      
      // If we can't find a form, look for it as a parent of our component
      if ($form.length === 0) {
        $form = $component.closest('form');
      }
      
      // If we can't find a form via DOM traversal, try to find it by more flexible means
      if ($form.length === 0) {
        // Look for any form in the parent container of the component
        $form = $component.parents().find('form').first();
      }
      
      // Last resort - if we still can't find a form, create one dynamically
      if ($form.length === 0) {
        console.log('Report Footer: Creating form dynamically');
        $form = $('<form method="POST"></form>');
        $form.attr('action', window.location.href);
        // Wrap the button in this form
        $button.wrap($form);
        // Re-acquire the form reference after DOM manipulation
        $form = $button.closest('form');
      }
      
      // Flag to track if our button triggered the submission
      var buttonClickTriggered = false;
      
      // Add click handler directly to the button instead of form submission
      $button.on('click', function(e) {
        // Prevent any default behavior
        e.preventDefault();
        
        // Already waiting for a response
        if ($button.prop('disabled')) {
          return;
        }
        
        // Disable the button and show spinner immediately
        $button.prop('disabled', true);
        $spinner.show();
        
        // Set our flag that we're handling this submission
        buttonClickTriggered = true;
        
        // Send the form data via AJAX
        $.ajax({
          url: $form.attr('action'),
          type: 'POST',
          data: $form.serialize(),
          success: function(response) {
            console.log('Report requested successfully');
            // The UpdateContent module will handle refreshing the component
            // with the latest report totals through its regular polling
          },
          error: function(xhr, status, error) {
            console.error('Error requesting report:', error);
            // In case of error, re-enable the button and hide the spinner
            $button.prop('disabled', false);
            $spinner.hide();
          }
        });
      });
    };
  };

})(window.GOVUK.Modules);