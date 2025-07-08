from flask import render_template, request
from flask_wtf import FlaskForm as Form
from wtforms import RadioField

from app.main import main


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


@main.route("/_storybook")
def storybook():
    component = None
    if "component" in request.args:
        component = request.args["component"]

    # TODO: don't pass forms to every single component
    form1 = Exampleform1()
    form2 = Exampleform2()
    form3 = Exampleform3()

    return render_template("views/storybook.html", component=component, form1=form1, form2=form2, form3=form3)
