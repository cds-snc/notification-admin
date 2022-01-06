from datetime import datetime

import requests
import os
from flask import abort, current_app, make_response, redirect, render_template, request, url_for, json
from flask_login import current_user
from notifications_utils.international_billing_rates import INTERNATIONAL_BILLING_RATES
from notifications_utils.template import HTMLEmailTemplate, LetterImageTemplate

from app import email_branding_client, get_current_locale, letter_branding_client
from app.main import main
from app.main.forms import (
    FieldWithLanguageOptions,
    FieldWithNoneOption,
    SearchByNameForm,
)
from app.utils import (
    Spreadsheet,
    documentation_url,
    get_latest_stats,
    get_logo_cdn_domain,
    user_is_logged_in,
)


@main.route("/")
def index():
    if current_user and current_user.is_authenticated:
        return redirect(url_for("main.choose_account"))

    return render_template(
        "views/signedout.html",
        scrollTo="false",
        admin_base_url=current_app.config["ADMIN_BASE_URL"],
        stats=get_latest_stats(get_current_locale(current_app)),
        csv_max_rows=current_app.config["CSV_MAX_ROWS"],
        default_free_sms_fragment_limits_central=current_app.config["DEFAULT_FREE_SMS_FRAGMENT_LIMITS"]["central"],
    )


@main.route("/robots.txt")
def robots():
    robot_rules = [
        "User-agent: *",
        "Disallow: /sign-in",
        "Disallow: /contact",
        "Disallow: /register",
    ]
    return ("\n".join(robot_rules)), 200, {"Content-Type": "text/plain"}


@main.route("/.well-known/security.txt")
def security_txt():
    security_policy = url_for("main.security", _external=True)
    security_info = [
        f'Contact: mailto:{current_app.config["SECURITY_EMAIL"]}',
        "Preferred-Languages: en, fr",
        f"Policy: {security_policy}",
        "Hiring: https://digital.canada.ca/join-our-team/",
        "Hiring: https://numerique.canada.ca/rejoindre-notre-equipe/",
    ]
    return ("\n".join(security_info)), 200, {"Content-Type": "text/plain"}


@main.route("/error/<int:status_code>")
def error(status_code):
    if status_code >= 500:
        abort(404)
    abort(status_code)


@main.route("/verify-mobile")
@user_is_logged_in
def verify_mobile():
    return render_template("views/verify-mobile.html")


@main.route("/privacy")
def privacy():
    return render_template("views/privacy.html")


@main.route("/pricing")
def pricing():
    return render_template(
        "views/pricing/index.html",
        sms_rate=0.0158,
        international_sms_rates=sorted(
            [(cc, country["names"], country["billable_units"]) for cc, country in INTERNATIONAL_BILLING_RATES.items()],
            key=lambda x: x[0],
        ),
        search_form=SearchByNameForm(),
    )


@main.route("/design-patterns-content-guidance")
def design_content():
    return render_template("views/design-patterns-content-guidance.html")


@main.route("/_email")
def email_template():
    branding_type = "fip_english"
    branding_style = request.args.get("branding_style", None)

    if (
        branding_style == FieldWithLanguageOptions.ENGLISH_OPTION_VALUE
        or branding_style == FieldWithLanguageOptions.FRENCH_OPTION_VALUE
    ):
        if branding_style == FieldWithLanguageOptions.FRENCH_OPTION_VALUE:
            branding_type = "fip_french"
        branding_style = None

    if branding_style is not None:
        email_branding = email_branding_client.get_email_branding(branding_style)["email_branding"]
        branding_type = email_branding["brand_type"]

    if branding_type == "fip_english":
        brand_text = None
        brand_colour = None
        brand_logo = None
        fip_banner_english = True
        fip_banner_french = False
        logo_with_background_colour = False
        brand_name = None
    elif branding_type == "fip_french":
        brand_text = None
        brand_colour = None
        brand_logo = None
        fip_banner_english = False
        fip_banner_french = True
        logo_with_background_colour = False
        brand_name = None
    else:
        colour = email_branding["colour"]
        brand_text = email_branding["text"]
        brand_colour = colour
        brand_logo = "https://{}/{}".format(get_logo_cdn_domain(), email_branding["logo"]) if email_branding["logo"] else None
        fip_banner_english = branding_type in ["fip_english", "both_english"]
        fip_banner_french = branding_type in ["fip_french", "both_french"]
        logo_with_background_colour = branding_type == "custom_logo_with_background_colour"
        brand_name = email_branding["name"]

    template = {
        "subject": "foo",
        "content": (
            "Lorem Ipsum is simply dummy text of the printing and typesetting "
            "industry.\n\nLorem Ipsum has been the industry’s standard dummy "
            "text ever since the 1500s, when an unknown printer took a galley "
            "of type and scrambled it to make a type specimen book. "
            "\n\n"
            "# History"
            "\n\n"
            "It has "
            "survived not only"
            "\n\n"
            "* five centuries"
            "\n"
            "* but also the leap into electronic typesetting"
            "\n\n"
            "It was "
            "popularised in the 1960s with the release of Letraset sheets "
            "containing Lorem Ipsum passages, and more recently with desktop "
            "publishing software like Aldus PageMaker including versions of "
            "Lorem Ipsum."
            "\n\n"
            "^ It is a long established fact that a reader will be distracted "
            "by the readable content of a page when looking at its layout."
            "\n\n"
            "The point of using Lorem Ipsum is that it has a more-or-less "
            "normal distribution of letters, as opposed to using ‘Content "
            "here, content here’, making it look like readable English."
            "\n\n\n"
            "1. One"
            "\n"
            "2. Two"
            "\n"
            "10. Three"
            "\n\n"
            "This is an example of an email sent using Notification."
            "\n\n"
            "https://www.notifications.service.gov.uk"
        ),
    }

    if not bool(request.args):
        resp = make_response(str(HTMLEmailTemplate(template)))
    else:
        resp = make_response(
            str(
                HTMLEmailTemplate(
                    template,
                    fip_banner_english=fip_banner_english,
                    fip_banner_french=fip_banner_french,
                    brand_text=brand_text,
                    brand_colour=brand_colour,
                    brand_logo=brand_logo,
                    logo_with_background_colour=logo_with_background_colour,
                    brand_name=brand_name,
                )
            )
        )

    resp.headers["X-Frame-Options"] = "SAMEORIGIN"
    return resp


@main.route("/_letter")
def letter_template():
    branding_style = request.args.get("branding_style")

    if branding_style == FieldWithNoneOption.NONE_OPTION_VALUE:
        branding_style = None

    if branding_style:
        filename = letter_branding_client.get_letter_branding(branding_style)["filename"]
    else:
        filename = "no-branding"

    template = {"subject": "", "content": ""}
    image_url = url_for("main.letter_branding_preview_image", filename=filename)

    template_image = str(
        LetterImageTemplate(
            template,
            image_url=image_url,
            page_count=1,
        )
    )

    resp = make_response(render_template("views/service-settings/letter-preview.html", template=template_image))

    resp.headers["X-Frame-Options"] = "SAMEORIGIN"
    return resp


@main.route("/documentation")
def documentation():
    return redirect(documentation_url(), code=301)


@main.route("/callbacks")
def callbacks():
    return redirect(documentation_url("callbacks"), code=301)


# --- Features page set --- #


@main.route("/features", endpoint="features")
def features():
    endpoint = "https://articles.cdssandbox.xyz/notification-gc-notify/wp-json/wp/v2/pages/"
    response = requests.get(endpoint + "?slug=features&1=10")

    filename = os.path.join(os.path.dirname(__file__), "..", "notify-admin.json")
    with open(filename) as test_file:
        data = json.load(test_file)

    nav_items = []
    for item in data["items"]:
        nav_items.append({k: item[k] for k in ("title", "url", "target", "description")})

    for item in nav_items:
        # add "active" class
        item['active'] = True if item['url'] == request.path else False

    if response:
        parsed = json.loads(response.content)
        title = '<h1 class="heading-large">' + parsed[0]["title"]["rendered"] + "</h1>"
        html_content = title + parsed[0]["content"]["rendered"]
        return render_template("views/features.html", html_content=html_content, nav_items=nav_items)
    else:
        print("An error has occurred.")
        return "Error"

    # return render_template("views/features.html")


@main.route("/why-notify", endpoint="why-notify")
def why_notify():
    # rate_sms = current_app.config.get("DEFAULT_FREE_SMS_FRAGMENT_LIMITS", {}).get("central", 10000)

    endpoint = "https://articles.cdssandbox.xyz/notification-gc-notify/wp-json/wp/v2/pages/"
    response = requests.get(endpoint + "?slug=why-gc-notify&1=12")
    if response:
        parsed = json.loads(response.content)
        title = '<h1 class="heading-large">' + parsed[0]["title"]["rendered"] + "</h1>"
        html_content = title + parsed[0]["content"]["rendered"]
        return render_template("views/why-notify.html", html_content=html_content)
    else:
        print("An error has occurred.")
        return "Error"

    # return render_template("views/why-notify.html", rate_sms=rate_sms)


@main.route("/roadmap", endpoint="roadmap")
def roadmap():
    return render_template("views/roadmap.html")


@main.route("/email", endpoint="email")
def features_email():
    return render_template("views/emails.html")


@main.route("/sms", endpoint="sms")
def features_sms():
    return render_template("views/text-messages.html")


@main.route("/letters", endpoint="letters")
def features_letters():
    return render_template("views/letters.html")


@main.route("/guidance", endpoint="guidance")
def guidance():
    return render_template("views/guidance/index.html")


@main.route("/format", endpoint="format")
def format():
    return render_template("views/guidance/format.html")


@main.route("/personalise", endpoint="personalise")
def personalise():
    return render_template("views/guidance/personalise.html")


@main.route("/security", endpoint="security")
def security():
    return render_template("views/security.html", security_email=current_app.config["SECURITY_EMAIL"])


@main.route("/a11y", endpoint="a11y")
def a11y():
    return render_template("views/a11y.html")


@main.route("/welcome", endpoint="welcome")
def welcome():
    return render_template("views/welcome.html", default_limit=current_app.config["DEFAULT_SERVICE_LIMIT"])


@main.route("/activity", endpoint="activity")
def activity():
    return render_template("views/activity.html", **get_latest_stats(get_current_locale(current_app)))


@main.route("/activity/download", endpoint="activity_download")
def activity_download():
    stats = get_latest_stats(get_current_locale(current_app))["monthly_stats"]

    csv_data = [["date", "sms_count", "email_count", "total"]]
    for _, row in stats.items():
        csv_data.append([row["year_month"], row["sms"], row["email"], row["total"]])

    return (
        Spreadsheet.from_rows(csv_data).as_csv_data,
        200,
        {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": 'inline; filename="{} activity.csv"'.format(
                datetime.utcnow().strftime("%Y-%m-%d"),
            ),
        },
    )


@main.route("/terms", endpoint="terms")
def terms():
    return render_template("views/terms-of-use.html")


@main.route("/messages-status", endpoint="messages_status")
def messages_status():
    return render_template("views/messages-status.html")


# --- Redirects --- #


@main.route("/features/roadmap", endpoint="redirect_roadmap")
@main.route("/features/email", endpoint="redirect_email")
@main.route("/features/sms", endpoint="redirect_sms")
@main.route("/features/letters", endpoint="redirect_letters")
@main.route("/features/templates", endpoint="redirect_format")
@main.route("/features/security", endpoint="redirect_security")
@main.route("/features/terms", endpoint="redirect_terms")
@main.route("/features/messages-status", endpoint="redirect_messages_status")
@main.route("/templates", endpoint="redirect_format")
def old_page_redirects():
    return redirect(url_for(request.endpoint.replace("redirect_", "")), code=301)
