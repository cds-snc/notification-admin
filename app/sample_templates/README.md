# Sample Templates Readme

## How to add a new sample template

1. Start by writing your template inside Notify by creating a new template on one of your services. Once you are happy with how it looks, proceed to step 2.
2. Add a yaml file to this folder, for example `app/sample_templates/my_new_template_en_fr.json`
3. Copy the contents of another template yaml file so you have a starting point. Make sure you copy from a template file of the same notification type - i.e. sms or email
4. Copy the contents of your new Notify template and paste it into the yaml file below the `content:` line. Select all the text you have pasted and click `<tab>` to make sure it is indented. 
5. Replace the `id` with a new uuid you have generated. You can use [this online tool](https://www.uuidgenerator.net/version4).
6. Edit the other values in the file, such as the english and french names that will be displayed to the notify user under: 
```
template_name:
  en: "My Template"
  fr: "Mon Gabarit"
```
Pay close attention to the indentation.
7. Make a draft PR and open the review app
8. Navigate to your new sample template in the review app and verify that the markdown is displayed how you want it