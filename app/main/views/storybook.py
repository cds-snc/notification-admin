from flask import render_template, request

from app.main import main


@main.route("/_storybook")
def storybook():
    component = None
    if "component" in request.args:
        component = request.args["component"]

    return render_template("views/storybook.html", component=component)
