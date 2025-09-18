from flask import render_template, request
from flask_wtf import FlaskForm as Form
from wtforms import RadioField, SelectField

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


class ExampleAutocomplete(Form):
    search = SelectField("Search for a place")

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # provide some default options; story will pass explicit options too
        self.search.choices = [("", ""), ("Ontario", "Ontario"), ("Quebec", "Quebec")]


class ExampleAutocomplete2(Form):
    search2 = SelectField("Search for a place")

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # provide some default options; story will pass explicit options too
        self.search2.choices = [("", ""), ("Ontario", "Ontario"), ("Quebec", "Quebec")]


class ExampleAutocomplete3(Form):
    search3 = SelectField("Search for a place")

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # provide some default options; story will pass explicit options too
        self.search3.choices = [("", ""), ("Ontario", "Ontario"), ("Quebec", "Quebec")]


@main.route("/_storybook")
def storybook():
    component = None
    if "component" in request.args:
        component = request.args["component"]

    # TODO: don't pass forms to every single component
    form1 = Exampleform1()
    form2 = Exampleform2()
    form3 = Exampleform3()
    # dedicated autocomplete demo instances
    ac1 = ExampleAutocomplete()
    ac2 = ExampleAutocomplete2()
    ac3 = ExampleAutocomplete3()
    # simulate a validation error for the third autocomplete example
    try:
        # wtforms fields expose .errors as a list; ensure it's a list we can append to
        if not getattr(ac3.search3, "errors", None):
            ac3.search3.errors = []
        ac3.search3.errors.append("Please select an option")
    except Exception:
        # fallback: ensure attribute exists
        ac3.search3.errors = ["Please select an option"]

    return render_template(
        "views/storybook.html",
        component=component,
        form1=form1,
        form2=form2,
        form3=form3,
        ac1=ac1,
        ac2=ac2,
        ac3=ac3,
    )
