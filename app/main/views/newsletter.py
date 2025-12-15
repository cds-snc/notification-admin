from flask import current_app, flash, redirect, render_template, request, url_for
from flask_babel import _
from flask_login import current_user
from notifications_python_client.errors import HTTPError

from app import get_current_locale
from app.articles.pages import get_page_by_slug, get_page_by_slug_with_cache
from app.main import main
from app.main.forms import NewsletterLanguageForm, NewsletterSubscriptionForm
from app.notify_client.newsletter_api_client import newsletter_api_client


@main.route("/newsletter/subscribe", methods=["GET", "POST"])
def newsletter_subscription():
    """Handle newsletter subscription form submissions and display"""
    newsletter_form = NewsletterSubscriptionForm()

    # Handle GET request - display the form
    if request.method == "GET":
        return render_template(
            "views/newsletter/subscribe.html",
            newsletter_form=newsletter_form,
        )

    # Handle POST request - process form submission
    # Check if the form was submitted from the home page or the standalone page
    from_home_page = request.form.get("from_page") == "home"
    path = "home" if get_current_locale(current_app) == "en" else "accueil"

    if newsletter_form.validate_on_submit():
        submitted_email = newsletter_form.email.data
        language = newsletter_form.language.data

        # Create unconfirmed subscriber via API
        newsletter_api_client.create_unconfirmed_subscriber(submitted_email, language)

        # Redirect based on where the form was submitted from
        if from_home_page:
            return redirect(url_for("main.index", subscribed="1", email=submitted_email) + "#newsletter-section")
        else:
            return redirect(url_for("main.newsletter_check_email", email=submitted_email))

    # Re-render with form errors if validation failed
    if from_home_page:
        # Re-render the home page with form errors
        endpoint = "wp/v2/pages"
        lang = get_current_locale(current_app)
        params = {"slug": path, "lang": lang}

        if current_user.is_authenticated:
            response = get_page_by_slug(endpoint, params=params)
        else:
            response = get_page_by_slug_with_cache(endpoint, params=params)

        if isinstance(response, list):
            response = response[0]

        # Import here to avoid circular dependency
        from app.main.views.index import _render_articles_page

        return _render_articles_page(response, newsletter_form)
    else:
        # Re-render the standalone page with form errors
        return render_template(
            "views/newsletter/subscribe.html",
            newsletter_form=newsletter_form,
        )


# keep support for the old confirm route until we update the email
@main.route("/newsletter/confirm/<subscriber_id>", methods=["GET"])
@main.route("/newsletter/<subscriber_id>/confirm", methods=["GET"])
def confirm_newsletter_subscriber(subscriber_id):
    # send an api request with the subscriber_id
    newsletter_api_client.confirm_subscriber(subscriber_id=subscriber_id)

    # redirect to the newsletter_subscribed page
    return redirect(url_for("main.newsletter_subscribed", subscriber_id=subscriber_id))


@main.route("/newsletter/check-email", methods=["GET"])
def newsletter_check_email():
    """Newsletter subscription check email page"""

    email = request.args.get("email")
    if not email:
        # If no email provided, redirect to subscription page
        return redirect(url_for("main.newsletter_subscription"))

    return render_template("views/newsletter/check_email.html", email=email)


@main.route("/newsletter/<subscriber_id>/subscribed", methods=["GET", "POST"])
def newsletter_subscribed(subscriber_id):
    """Newsletter subscription confirmation page"""
    language_form = NewsletterLanguageForm()
    # Get subscriber data including email
    subscriber_data = newsletter_api_client.get_subscriber(subscriber_id=subscriber_id)
    email = subscriber_data["subscriber"]["email"]

    return render_template("views/newsletter/subscribed.html", form=language_form, email=email, subscriber_id=subscriber_id)


@main.route("/newsletter/<subscriber_id>/send-latest", methods=["GET"])
def send_latest_newsletter(subscriber_id):
    """Send the latest newsletter to a subscriber"""

    # Call API to send latest newsletter
    try:
        newsletter_api_client.send_latest_newsletter(subscriber_id)
    except HTTPError:
        return redirect(url_for("main.newsletter_subscription"))

    # Display success message
    flash(_("We’ve sent you the most recent newsletter"), category="default_with_tick")

    # Redirect back to subscribed page
    return redirect(url_for("main.newsletter_subscribed", subscriber_id=subscriber_id))


@main.route("/newsletter/<subscriber_id>/change-language", methods=["GET", "POST"])
def newsletter_change_language(subscriber_id):
    """Newsletter subscription management page"""
    language_form = NewsletterLanguageForm()
    # Get subscriber data including email
    subscriber_data = newsletter_api_client.get_subscriber(subscriber_id=subscriber_id)
    email = subscriber_data["subscriber"]["email"]
    if subscriber_data["subscriber"]["status"] != "subscribed":
        return redirect(url_for("main.newsletter_subscription"))

    if request.method == "POST":
        action = request.form.get("action")

        if action == "change_language" and language_form.validate_on_submit():
            selected_language = language_form.language.data
            newsletter_api_client.update_language(subscriber_id=subscriber_id, language=selected_language)

            # Display success message with language name
            language_name = _("English") if selected_language == "en" else _("French")
            flash(
                _("You’ll receive the next newsletter in {}").format(language_name),
                category="default_with_tick",
            )

            # redirect back to the change_language page
            return redirect(url_for("main.newsletter_change_language", subscriber_id=subscriber_id))

    return render_template("views/newsletter/change_language.html", form=language_form, email=email, subscriber_id=subscriber_id)


@main.route("/newsletter/<subscriber_id>/unsubscribe", methods=["GET"])
def newsletter_unsubscribe(subscriber_id):
    """Newsletter unsubscribe confirmation page"""

    # Call API to unsubscribe
    subscriber_data = newsletter_api_client.unsubscribe(subscriber_id)
    email = subscriber_data["subscriber"]["email"]

    return render_template("views/newsletter/unsubscribe.html", email=email)
