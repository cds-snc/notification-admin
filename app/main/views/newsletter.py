from flask import current_app, flash, redirect, render_template, request, url_for
from flask_babel import _
from flask_login import current_user

from app import get_current_locale
from app.articles.pages import get_page_by_slug, get_page_by_slug_with_cache
from app.main import main
from app.main.forms import NewsletterLanguageForm, NewsletterSubscriptionForm
from app.notify_client.newsletter_api_client import newsletter_api_client


@main.route("/newsletter-subscription", methods=["POST"])
def newsletter_subscription():
    """Handle newsletter subscription form submissions"""
    newsletter_form = NewsletterSubscriptionForm()
    path = "home" if get_current_locale(current_app) == "en" else "accueil"

    if newsletter_form.validate_on_submit():
        submitted_email = newsletter_form.email.data
        language = newsletter_form.language.data

        # Create unconfirmed subscriber via API
        newsletter_api_client.create_unconfirmed_subscriber(submitted_email, language)

        # Redirect back to the home page with success parameter and email
        return redirect(url_for("main.index", subscribed="1", email=submitted_email) + "#newsletter-section")

    # Re-render the home page with form errors if validation failed
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


@main.route("/newsletter/confirm/<subscriber_id>", methods=["GET"])
def confirm_newsletter_subscriber(subscriber_id):
    # send an api request with the subscriber_id
    data = newsletter_api_client.confirm_subscriber(subscriber_id=subscriber_id)
    email = data["subscriber"]["email"]

    # redirect to the newsletter_subscribed page
    return redirect(url_for("main.newsletter_subscribed", email=email, subscriber_id=subscriber_id))


@main.route("/newsletter/subscribed", methods=["GET", "POST"])
def newsletter_subscribed():
    """Newsletter subscription confirmation page"""
    language_form = NewsletterLanguageForm()
    # Get parameters from URL query string
    email = request.args.get("email")
    subscriber_id = request.args.get("subscriber_id")

    return render_template("views/newsletter/subscribed.html", form=language_form, email=email, subscriber_id=subscriber_id)


@main.route("/newsletter/send-latest", methods=["GET"])
def send_latest_newsletter():
    """Send the latest newsletter to a subscriber"""
    email = request.args.get("email")
    subscriber_id = request.args.get("subscriber_id")

    # Call API to send latest newsletter
    newsletter_api_client.send_latest_newsletter(subscriber_id)

    # Display success message
    flash(_("We’ve sent you the most recent newsletter"), category="default_with_tick")

    # Redirect back to subscribed page
    return redirect(url_for("main.newsletter_subscribed", email=email, subscriber_id=subscriber_id))


@main.route("/newsletter/change-language", methods=["GET", "POST"])
def newsletter_change_language():
    """Newsletter subscription management page"""
    language_form = NewsletterLanguageForm()
    # Get parameters from URL query string (GET) or hidden form fields (POST)
    email = request.args.get("email") or request.form.get("email")
    subscriber_id = request.args.get("subscriber_id") or request.form.get("subscriber_id")

    if request.method == "POST":
        action = request.form.get("action")

        if action == "change_language" and language_form.validate_on_submit():
            selected_language = language_form.language.data
            newsletter_api_client.update_language(subscriber_id=subscriber_id, language=selected_language)

            # Display success message with language name
            language_name = _("English") if selected_language == "en" else _("French")
            flash(
                _("You’ll receive the next newsletter in {}".format(language_name), email=email, language=language_name),
                category="default_with_tick",
            )

            # redirect back to the change_language page
            return redirect(url_for("main.newsletter_change_language", email=email, subscriber_id=subscriber_id))

    return render_template("views/newsletter/change_language.html", form=language_form, email=email, subscriber_id=subscriber_id)


@main.route("/newsletter/unsubscribe", methods=["GET"])
def newsletter_unsubscribe():
    """Newsletter unsubscribe confirmation page"""
    email = request.args.get("email")
    subscriber_id = request.args.get("subscriber_id")

    if subscriber_id:
        # Call API to unsubscribe
        newsletter_api_client.unsubscribe(subscriber_id)

    return render_template("views/newsletter/unsubscribe.html", email=email)
