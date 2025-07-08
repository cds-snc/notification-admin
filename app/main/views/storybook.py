from flask import render_template, request

from app.main import main
from app.main.forms import AuthMethodForm


@main.route("/_storybook")
def storybook():
    component = None
    if "component" in request.args:
        component = request.args["component"]

    # TODO: don't pass forms to every single component
    data1 = [
        ("email-1", "Recieve a code by email"),
        ("sms-1", "Recieve a code by text message"),
        ("new_key-1", "Add a new security key"),
    ]
    data2 = [
        ("email-2", "Recieve a code by email"),
        ("sms-2", "Recieve a code by text message"),
        ("new_key-2", "Add a new security key"),
    ]
    data3 = [
        ("email-3", "Recieve a code by email"),
        ("sms-3", "Recieve a code by text message"),
        ("new_key-3", "Add a new security key"),
    ]
    form1 = AuthMethodForm(all_auth_methods=data1, current_auth_method="current_auth_method")
    form2 = AuthMethodForm(all_auth_methods=data2, current_auth_method="current_auth_method")
    form3 = AuthMethodForm(all_auth_methods=data3, current_auth_method="current_auth_method")

    return render_template("views/storybook.html", component=component, form1=form1, form2=form2, form3=form3)
