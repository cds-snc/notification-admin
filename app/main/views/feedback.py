from datetime import datetime

import pytz
from flask import abort, redirect, render_template, request, url_for
from flask_login import current_user

from app import convert_to_boolean, service_api_client, user_api_client
from app.main import main
from app.main.forms import ContactNotifyTeam

QUESTION_TICKET_TYPE = 'ask-question-give-feedback'
PROBLEM_TICKET_TYPE = "report-problem"


def get_prefilled_message():
    return {
        'agreement': (
            'Please can you tell me if there’s an agreement in place '
            'between Notification and my organisation?'
        ),
        'letter-branding': (
            'I would like my own logo on my letter templates.'
        ),
    }.get(
        request.args.get('body'), ''
    )


@main.route('/support', methods=['GET', 'POST'])
def support():
    return render_template('views/support/index.html')


@main.route('/support/triage', methods=['GET', 'POST'])
def triage():
    return redirect(url_for('main.support'))


@main.route('/support/<ticket_type>', methods=['GET', 'POST'])
def feedback(ticket_type):
    form = ContactNotifyTeam()

    ## catch with the honeypot field
    if(form.phone.data):
        return redirect(url_for('.thanks', auto="true"))

    if form.validate_on_submit():
        msg = 'Contact Name: {}\nContact Email: {}\nMessage: {}'.format(
            form.name.data,
            form.email_address.data,
            form.feedback.data,
        )

        # send email here
        user_api_client.send_contact_email(msg, form.email_address.data)

        return redirect(url_for(
            '.thanks',
        ))

    types = [
        'ask-question-give-feedback',
        'bat-phone',
        'report-problem',
        'thanks',
        'triage']

    if ticket_type not in types:
        abort(404)

    if request.method == 'POST':
        return render_template(
            'views/support/{}.html'.format(ticket_type),
            form=form
        )

    return render_template(
        'views/support/{}.html'.format(ticket_type),
        form=form
    )


@main.route('/support/escalate', methods=['GET', 'POST'])
def bat_phone():
    return redirect(url_for('main.support'))


@main.route('/support/thanks', methods=['GET', 'POST'])
def thanks():
    return render_template(
        'views/support/thanks.html',
        out_of_hours_emergency=convert_to_boolean(request.args.get('out_of_hours_emergency')),
        email_address_provided=convert_to_boolean(request.args.get('email_address_provided')),
        out_of_hours=not in_business_hours(),
    )


def in_business_hours():

    now = datetime.utcnow().replace(tzinfo=pytz.utc)

    if is_weekend(now) or is_bank_holiday(now):
        return False

    return london_time_today_as_utc(9, 30) <= now < london_time_today_as_utc(17, 30)


def london_time_today_as_utc(hour, minute):
    return pytz.timezone('Europe/London').localize(
        datetime.now().replace(hour=hour, minute=minute)
    ).astimezone(pytz.utc)


def is_weekend(time):
    return time.strftime('%A') in {
        'Saturday',
        'Sunday',
    }


def is_bank_holiday(time):
    return time.strftime('%Y-%m-%d') in {
        # taken from https://www.gov.uk/bank-holidays.json
        "2016-01-01",
        "2016-03-25",
        "2016-03-28",
        "2016-05-02",
        "2016-05-30",
        "2016-08-29",
        "2016-12-26",
        "2016-12-27",
        "2017-01-02",
        "2017-04-14",
        "2017-04-17",
        "2017-05-01",
        "2017-05-29",
        "2017-08-28",
        "2017-12-25",
        "2017-12-26",
        "2018-01-01",
        "2018-03-30",
        "2018-04-02",
        "2018-05-07",
        "2018-05-28",
        "2018-08-27",
        "2018-12-25",
        "2018-12-26",
        "2019-01-01",
        "2019-04-19",
        "2019-04-22",
        "2019-05-06",
        "2019-05-27",
        "2019-08-26",
        "2019-12-25",
        "2019-12-26",
    }


def has_live_services(user_id):
    return any(
        service['restricted'] is False
        for service in service_api_client.get_services({'user_id': user_id})['data']
    )


def needs_triage(ticket_type, severe):
    return all((
        ticket_type == PROBLEM_TICKET_TYPE,
        severe is None,
        (
            not current_user.is_authenticated or has_live_services(current_user.id)
        ),
        not in_business_hours(),
    ))


def needs_escalation(ticket_type, severe):
    return all((
        ticket_type == PROBLEM_TICKET_TYPE,
        severe,
        not current_user.is_authenticated,
        not in_business_hours(),
    ))
