# Sample Templates Readme

## How to add a new sample template

1. Add a json file to this folder, for example `app/sample_templates/template_43.json`
2. Copy the contents of another template json file so you have a starting point. Make sure you copy from a template file of the same notification type - i.e. sms or email
3. Edit the values, placing the body of the template in `"content"`, the english and french names that will be displayed to the notify user in `"template_name": {"en": ..., "fr": ...}`, etc
4. Make a draft PR and open the review app
5. Navigate to your new sample template in the review app and verify that the markdown is displayed how you want it