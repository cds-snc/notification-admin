from flask import current_app, url_for
from flask_babel import _

from app import get_current_locale
from app.articles.routing import gca_url_for
from app.utils import documentation_url


def get_sitemap():
    lang = get_current_locale(current_app)
    return {
        "groups": [
            {
                "title": _("About GC Notify"),
                "pages": [
                    {"href": url_for("main.activity"), "link_text": _("Activity on GC Notify")},
                    {"href": url_for("main.contact"), "link_text": _("Contact us")},
                    {"href": gca_url_for("features"), "link_text": _("Features")},
                    {"href": gca_url_for("new_features"), "link_text": _("New features")},
                    {"href": gca_url_for("register_for_demo"), "link_text": _("Register for a demo")},
                    {"href": gca_url_for("whynotify"), "link_text": _("Why GC Notify")},
                ],
            },
            {
                "title": _("Developers"),
                "pages": [
                    {"href": documentation_url(), "link_text": _("Integrate the API")},
                    {
                        "href": current_app.config["SYSTEM_STATUS_URL"] + ("/#fr" if lang == "fr" else ""),
                        "link_text": _("System status"),
                    },
                ],
            },
            {
                "title": _("Help and guidance"),
                "pages": [
                    {"href": documentation_url(), "link_text": _("API documentation")},
                    # {"href": "/#", "link_text": _("Getting started")},
                    # {"href": "/#", "link_text": _("Guidance overview")},
                    {"href": gca_url_for("formatting_guide"), "link_text": _("Formatting emails")},
                    {"href": gca_url_for("spreadsheets"), "link_text": _("Using a spreadsheet")},
                    {"href": gca_url_for("personalisation_guide"), "link_text": _("Sending custom content")},
                    {"href": gca_url_for("message_delivery_status"), "link_text": _("Understanding delivery and failure")},
                    {"href": gca_url_for("bounce_guidance"), "link_text": _("Updating contact information")},
                ],
            },
            {
                "title": _("Policy"),
                "pages": [
                    {"href": gca_url_for("accessibility"), "link_text": _("Accessibility")},
                    {"href": gca_url_for("terms"), "link_text": _("GC Notify terms of use")},
                    {"href": gca_url_for("privacy"), "link_text": _("Privacy notice for staff using GC Notify")},
                    {"href": gca_url_for("security"), "link_text": _("Security")},
                    {"href": gca_url_for("service-level-agreement"), "link_text": _("GC Notify service level agreement")},
                    {
                        "href": gca_url_for("service-level-objectives"),
                        "link_text": _("Service level objectives: What to expect from GC Notify"),
                    },
                ],
            },
            {
                "must_be_logged_in": True,
                "title": _("You"),
                "pages": [
                    {"href": url_for("main.user_profile"), "link_text": _("Your account")},
                    {"href": url_for("main.choose_account"), "link_text": _("Your services")},
                ],
            },
        ]
    }
