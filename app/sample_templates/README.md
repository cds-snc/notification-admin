# Sample Templates Readme

## How to add a new sample template

1. Start writing your template inside Notify by creating a new template in one of your services. Once you are happy with how the template looks, proceed to Step 2.
2. Create a new file in this folder, for example `app/sample_templates/my_new_email_template_en_fr.yaml`
3. Copy the contents of another template `.yaml` file so you have a starting point. Make sure you copy from a template file of the same notification type - i.e. sms or email
4. Copy the contents of your new Notify template and paste it into the yaml file below the `content:` line. Select all the text you have pasted and click `<tab>` to make sure it is indented. 
5. Copy what will be displayed on the preview page to `example_content:`. This should have no variables or explanation text.
6. Replace the `id` with a new uuid you have generated. You can use [this online tool](https://www.uuidgenerator.net/version4).
7. Edit the other values in the file, such as the english and french names that will be displayed to the notify user under: 
    ```
    template_name:
      en: "My Template"
      fr: "Mon Gabarit"
    ```
    Pay close attention to the indentation.
8. Make a draft PR and open the review app
9. Navigate to your new sample template in the review app and verify that the sample template is displayed correctly