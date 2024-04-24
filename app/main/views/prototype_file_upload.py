from flask import render_template
from flask_wtf import FlaskForm as Form
from wtforms import FileField

from app.main import main


@main.route("/_prototype-file-upload-a")
def prototype_file_upload_a():
    class FormExamples(Form):
        file_upload = FileField("Upload a CSV file to add your recipients’ details")

    form = FormExamples()
    form.validate()

    return render_template("views/prototype/file-upload-a.html", form=form, example=[["email address", "name", "reference_number"]])

@main.route("/_prototype-file-upload-b")
def prototype_file_upload_b():
    class FormExamples(Form):
        file_upload = FileField("Upload a CSV file to add your recipients’ details")

    form = FormExamples()
    form.validate()

    return render_template("views/prototype/file-upload-b.html", form=form, example=[["email address", "name", "reference_number"]])
