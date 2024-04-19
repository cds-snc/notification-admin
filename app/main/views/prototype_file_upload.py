from flask import render_template
from flask_wtf import FlaskForm as Form
from wtforms import FileField

from app.main import main


@main.route("/_prototype-file-upload")
def prototype_file_upload():
    class FormExamples(Form):
        file_upload = FileField("Upload a CSV file to add your recipients’ details")

    form = FormExamples()
    form.validate()

    return render_template("views/prototype/file-upload.html", form=form, example=[["email address", "name", "reference_number"]])
