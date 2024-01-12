from flask import abort, current_app, render_template
from flask_wtf import FlaskForm as Form
from notifications_utils.template import Template
from wtforms import FileField, PasswordField, StringField, TextAreaField, validators

from app.main import main


@main.route("/_styleguide")
def styleguide():
    if not current_app.config["SHOW_STYLEGUIDE"]:
        abort(404)

    class FormExamples(Form):
        username = StringField("Username")
        password = PasswordField("Password", [validators.input_required()])
        code = StringField("Enter code")
        message = TextAreaField("Message")
        file_upload = FileField("Upload a CSV file to add your recipients’ details")

    sms = "Your vehicle tax for ((registration number)) is due on ((date)). Renew online at www.gov.uk/vehicle-tax"

    form = FormExamples()
    form.message.data = sms
    form.validate()

    template = Template({"content": sms})

    return render_template("views/styleguide.html", form=form, template=template)


@main.route("/_rte")
def rte():
    template = {
        "id": "fable_test",
        "data": """Annual newsletter

We hope this newsletter finds you well! As we dive into the new year, we want to ensure you're up to speed with the latest happenings. Here's a quick recap!

Things You May Have Missed:

Thing 1

Thing 2

\r\n\r\n\r\n

Steps to Sign Up:

Visit our website at https://www.example.com

Look for the &quot;Newsletter Sign-Up&quot; section on the homepage.

Enter your email address in the provided field.

Click &quot;Subscribe&quot; to start receiving our regular updates directly in your inbox.

More Information:

For more details on our products, services, or any other inquiries, feel free to reach out to our dedicated support team at [support-email] or visit our FAQ page [FAQ-link]. We value your feedback and are here to assist you in any way we can.""",
    }

    return render_template("views/rte.html", template=template)
