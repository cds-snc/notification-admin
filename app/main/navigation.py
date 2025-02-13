from flask import current_app, url_for
from flask_babel import _
from flask_login import current_user

from app import current_service, get_current_locale
from app.articles.routing import gca_url_for
from app.utils import documentation_url


def get_footer():
    lang = get_current_locale(current_app)
    return [
        {
            "id": "about",
            "name": _("About"),
            "links": {
                _("Why GC Notify"): gca_url_for("whynotify"),
                _("Features"): gca_url_for("features"),
                _("New features"): gca_url_for("new_features"),
                _("Activity on GC Notify"): url_for("main.activity"),
            },
        },
        {
            "id": "usage",
            "name": _("Using GC Notify"),
            "links": {
                _("API documentation"): documentation_url(),
                _("Guidance"): gca_url_for("guidance"),
                _("Sitemap"): url_for("main.sitemap"),
                _("Service level objectives"): gca_url_for("service-level-objectives"),
            },
        },
        {
            "id": "support",
            "name": _("Support"),
            "links": {
                _("Contact us"): url_for("main.contact"),
                _("System status"): current_app.config["SYSTEM_STATUS_URL"] + ("/#fr" if lang == "fr" else ""),
            },
        },
    ]


def get_sub_footer():
    return {
        _("Privacy"): gca_url_for("privacy"),
        _("Security"): gca_url_for("security"),
        _("Accessibility"): gca_url_for("accessibility"),
        _("Terms of use"): gca_url_for("terms"),
        _("Service level agreement"): gca_url_for("service-level-agreement"),
    }


def get_public_nav():
    return [
        {"key": "home", "name": _("Home"), "url": url_for("main.index")},
        {"key": "why-notify", "name": _("Why GC Notify"), "url": gca_url_for("whynotify")},
        {"key": "features", "name": _("Features"), "url": gca_url_for("features")},
        {"key": "guidance", "name": _("Guidance"), "url": gca_url_for("guidance")},
        {"key": "documentation", "name": _("API documentation"), "url": documentation_url()},
        {"key": "contact", "name": _("Contact us"), "url": url_for("main.contact")},
    ]


def get_user_nav():
    nav_items = []

    if current_user.platform_admin:
        nav_items.append({"key": "admin_panel", "name": _("Admin panel"), "url": url_for("main.live_services")})

    if current_user.has_permissions():
        nav_items.append(
            {"key": "dashboard", "name": _("Dashboard"), "url": url_for("main.service_dashboard", service_id=current_service.id)}
        )
        nav_items.append(
            {"key": "templates", "name": _("Templates"), "url": url_for("main.choose_template", service_id=current_service.id)}
        )
    else:
        nav_items.append({"key": "choose_account", "name": _("Your services"), "url": url_for("main.choose_account")})

    if current_user.has_permissions("manage_api_keys"):
        nav_items.append(
            {
                "key": "api-integration",
                "name": _("API integration"),
                "url": url_for("main.api_integration", service_id=current_service.id),
            }
        )

    if current_user.has_permissions():
        nav_items.append(
            {"key": "team-members", "name": _("Team members"), "url": url_for("main.manage_users", service_id=current_service.id)}
        )

    if current_user.has_permissions("manage_api_keys"):
        nav_items.append(
            {"key": "settings", "name": _("Settings"), "url": url_for("main.service_settings", service_id=current_service.id)}
        )

    return nav_items


def get_main_nav():
    nav = get_public_nav()
    if current_user.is_authenticated:
        nav = get_user_nav()

    return nav


def get_account_nav():
    nav = [
        {"key": "choose_account", "name": _("Your services"), "url": url_for("main.choose_account")},
        {"key": "user_profile", "name": _("Your profile"), "url": url_for("main.user_profile")},
        {"key": "sign_out", "name": _("Sign out"), "url": url_for("main.sign_out")},
    ]

    # Admin panel if admin
    if current_user.is_authenticated:
        if current_user.platform_admin:
            nav.insert(0, {"key": "live_services", "name": _("Admin panel"), "url": url_for("main.live_services")})

    return nav
