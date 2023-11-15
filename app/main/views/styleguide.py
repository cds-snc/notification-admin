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
        "data": """Step 2

This is a heading


Step 3

Bold


Step 4

Italicize


Step 5

Bulleted list

Bulleted list

Bulleted list


Step 6

Numbered list

Numbered list

Numbered list


Step 7

Add a divider


Step 8

Insert a hyperlink to Canada.ca
""",
    }

    return render_template("views/rte.html", template=template)
