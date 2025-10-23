from flask import render_template, request
from flask_wtf import FlaskForm as Form
from wtforms import BooleanField, RadioField, StringField
from wtforms.validators import DataRequired

from app.main import main
from app.main.forms import MultiCheckboxField


class Exampleform1(Form):
    auth_method1 = RadioField("Select your two-step verification method")

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.auth_method1.choices = [
            ("email-1", "Receive a code by email"),
            ("sms-1", "Receive a code by text message"),
            ("new_key-1", "Add a new security key"),
        ]


class Exampleform2(Form):
    auth_method2 = RadioField("Select your two-step verification method")

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.auth_method2.choices = [
            ("email-2", "Receive a code by email"),
            ("sms-2", "Receive a code by text message"),
            ("new_key-2", "Add a new security key"),
        ]


class Exampleform3(Form):
    auth_method3 = RadioField("Select your two-step verification method")

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.auth_method3.choices = [
            ("email-3", "Receive a code by email"),
            ("sms-3", "Receive a code by text message"),
            ("new_key-3", "Add a new security key"),
        ]


class ExampleFullForm(Form):
    name = StringField("Full name", validators=[DataRequired(message="This cannot be empty")])
    email = StringField("Email address", validators=[DataRequired(message="This cannot be empty")])
    contact_method = RadioField("Preferred contact method", validators=[DataRequired(message="This cannot be empty")])
    newsletter = BooleanField("Sign up for newsletter", validators=[DataRequired(message="This cannot be empty")])
    autocomplete = StringField("Select your ciy", validators=[DataRequired("Choose city from drop-down menu")])
    main_use_case = MultiCheckboxField(
        "For what purpose are you using GC Notify?",
        default="",
        choices=[
            ("service", "Government service or program delivery"),
            ("account_management", "Account management and verification"),
            ("broadcast", "Informational broadcasts"),
            ("alerts", "Monitoring and alerts"),
            ("scheduling", "Scheduling and booking"),
            ("workflow", "Workflow management"),
        ],
        validators=[DataRequired()],
    )
    main_use_case_hints = {
        "service": "Applications, permits, licenses, official documents, and benefit claims",
        "account_management": "User authentication, password resets, profile updates",
        "broadcast": "Newsletters, digests, announcements, policy updates, general communications",
        "alerts": "System status, maintenance windows, outages, closures, emergency notices",
        "scheduling": "Appointments, reservations, confirmations, availability updates, reminders",
        "workflow": "Shift scheduling, inventory tracking, access requests, automated responses",
    }
    process_type = RadioField(
        ("Select a priority queue"),
        choices=[
            ("bulk", "Bulk — Not time-sensitive"),
            ("normal", "Normal"),
            ("priority", "Priority — Time-sensitive"),
        ],
    )

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.contact_method.choices = [
            ("email", "Email"),
            ("phone", "Phone"),
            ("none", "Do not contact"),
        ]
        self.autocomplete.choices = ["Halifax", "Montreal", "Ottawa", "Toronto"]


@main.route("/_storybook", methods=["GET", "POST"])
def storybook():
    component = None
    if "component" in request.args:
        component = request.args["component"]

    # TODO: don't pass forms to every single component
    form1 = Exampleform1()
    form2 = Exampleform2()
    form3 = Exampleform3()
    full_form = ExampleFullForm()

    # run validation on POST so field.errors are populated and shown in the template
    if request.method == "POST":
        full_form.validate()

    return render_template(
        "views/storybook.html",
        component=component,
        form1=form1,
        form2=form2,
        form3=form3,
        full_form=full_form,
    )


@main.route("/_rte", methods=["GET"])
def rte():
    class ExampleFullForm(Form):
        name = StringField(
            "Template name", default="Annual newsletter template", validators=[DataRequired(message="This cannot be empty")]
        )
        subject = StringField(
            "Subject field", default="Annual newsletter", validators=[DataRequired(message="This cannot be empty")]
        )

    return render_template("views/rte.html", form=ExampleFullForm(), showStructure=len(request.args) == 0)
