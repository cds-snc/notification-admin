import re
from pathlib import Path
from uuid import UUID

from flask import Response, jsonify, render_template, request
from flask_wtf import FlaskForm as Form
from wtforms import BooleanField, RadioField, StringField
from wtforms.validators import DataRequired

from app.main import main
from app.main.forms import MultiCheckboxField


def load_markdown_samples():
    """Read the Cypress markdown fixture and extract the `before` sections.

    This is a lightweight parser that finds JS template literal values assigned
    to `before:` in the fixture file and concatenates them in a sensible order.
    """
    fixture = Path(__file__).resolve().parents[3] / "tests_cypress" / "cypress" / "fixtures" / "markdownSamples.js"
    if not fixture.exists():
        return None

    text = fixture.read_text(encoding="utf-8")

    # Find occurrences like expected: `...` (backtick delimited). We capture the contents.
    matches = re.findall(r"expected:\s*`([\s\S]*?)`", text)

    if not matches:
        return None

    # Concatenate in the file order. Add two newlines between sections for readability.
    combined = "\n\n".join(s.strip() for s in matches)
    return combined


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


class TestTemplateUser:
    is_authenticated = True
    platform_admin = False
    mobile_number = None
    verified_phonenumber = False

    def has_permissions(self, *permissions, **kwargs):
        return True

    def has_template_folder_permission(self, folder, service=None):
        return True


class TestTemplateService:
    id = "test-service"
    name = "GC Notify prototype service"
    email_from = "notify"
    prefix_sms = ""
    trial_mode = False
    pending_live = False

    def get_template_path(self, template):
        return [
            {"id": None, "name": "Templates", "template_type": None},
            template,
        ]

    def has_permission(self, permission):
        return permission == "upload_document"


class TestTemplate:
    id = UUID("8f4db2e2-7b89-4c2d-9f70-2f3d6e4b9a11")
    template_type = "email"
    placeholders = True

    def __init__(self):
        self._template = {
            "id": str(self.id),
            "name": "Service update: your application",
            "folder": None,
            "template_type": self.template_type,
            "archived": False,
            "updated_at": "2026-08-20T14:30:00.000000Z",
            "redact_personalisation": False,
        }

    def __str__(self):
        return """<div class="email-message mb-12">
    <table class="email-message-meta mb-12 leading-tight font-normal border border-solid border-gray-grey2">
        <tbody>
            <tr>
                <th class="email-message-table pl-doubleGutter text-gray-grey1" scope="row">From</th>
                <td class="email-message-table">GC Notify prototype service</td>
            </tr>
            <tr>
                <th class="email-message-table pl-doubleGutter text-gray-grey1" scope="row">To</th>
                <td class="email-message-table"><mark class="placeholder">((email address))</mark></td>
            </tr>
            <tr class="email-message-meta m-0 text-smaller leading-tight font-normal">
                <th class="email-message-table pl-doubleGutter text-gray-grey1" scope="row">Subject</th>
                <td class="email-message-table">Service update: your application</td>
            </tr>
        </tbody>
    </table>

    <div class="email-message-body w-full relative break-words box-border px-doubleGutter border-gray-grey2 border">
        <div style="max-width: 580px; margin: 0 auto;">
            <div style="margin: 20px auto 30px auto;">
                <img src="https://assets.notification.canada.ca/gc-logo-en.png" alt="Government of Canada" height="55" width="281">
            </div>

            <div style="padding: 0 10px" dir="ltr">
                <p style="Margin: 0 0 20px 0; font-size: 19px; line-height: 25px; color: #0B0C0C;">Your application has been received and is now being reviewed.</p>
            </div>

            <div style="margin: 10px 0 20px 0; float: right">
                <img src="https://assets.notification.canada.ca/canada-logo.png" alt="Symbol of the Government of Canada / Symbole du gouvernement du Canada" height="55" width="123">
            </div>
            <div style="clear:both;"></div>
        </div>
    </div>
</div>"""


@main.route("/_test-template")
def test_template():
    template = TestTemplate()

    def test_template_url_for(*args, **kwargs):
        return "#"

    return render_template(
        "views/templates/test-template.html",
        current_service=TestTemplateService(),
        current_user=TestTemplateUser(),
        template=template,
        url_for=test_template_url_for,
        fragment_count=1,
        file_attachments_enabled_for_service=True,
        template_attachments=[],
        user_has_template_permission=True,
        heading="Ready to send?",
        notification_type="email",
        dailyLimit=1000,
        dailyUsed=120,
        dailyRemaining=880,
        yearlyLimit=100000,
        yearlyUsed=12000,
        yearlyRemaining=88000,
    )


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

    # Attempt to load complex markdown samples (for storybook playgrounds)
    complex_markdown = load_markdown_samples()

    return render_template(
        "views/storybook.html",
        component=component,
        form1=form1,
        form2=form2,
        form3=form3,
        full_form=full_form,
        complex_markdown=complex_markdown,
    )


@main.route("/_storybook/attachments/attach", methods=["POST"])
def storybook_attachments_attach():
    uploaded_files = request.files.getlist("files")
    created_files = []

    for uploaded_file in uploaded_files:
        filename = uploaded_file.filename or "unnamed-file"
        name_lower = filename.lower()

        if "malware" in name_lower or "virus" in name_lower:
            status = "virus_scan_failed"
        elif "fail" in name_lower or "error" in name_lower:
            status = "deleted"
        else:
            status = "uploaded"

        created_files.append(
            {
                "id": filename,
                "name": filename,
                "status": status,
            }
        )

    return jsonify(created_files)


@main.route("/_storybook/attachments/remove", methods=["POST"])
@main.route("/_storybook/attachments/remove/<file_id>", methods=["POST"])
def storybook_attachments_remove(file_id=None):
    return ("", 204)


@main.route("/_storybook/attachments/download", methods=["GET"])
@main.route("/_storybook/attachments/download/<file_id>", methods=["GET"])
def storybook_attachments_download(file_id=None):
    file_id = file_id or "attachment.txt"
    return Response(
        f"Mock Storybook attachment for {file_id}\n".encode("utf-8"),
        mimetype="text/plain",
        headers={"Content-Disposition": f'attachment; filename="{file_id}"'},
    )
