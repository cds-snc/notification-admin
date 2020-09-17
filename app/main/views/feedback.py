from flask import abort, redirect, render_template, request, url_for

from app import user_api_client
from app.main import main
from app.main.forms import ContactNotifyTeam

QUESTION_TICKET_TYPE = 'ask-question-give-feedback'
PROBLEM_TICKET_TYPE = "report-problem"


@main.route('/support/<ticket_type>', methods=['GET', 'POST'])
def feedback(ticket_type):
    form = ContactNotifyTeam()

    # catch with the honeypot field
    if(form.phone.data):
        return redirect(url_for('.feedback', ticket_type='thanks'))

    if form.validate_on_submit():
        # send email here
        user_api_client.send_contact_email(form.name.data, form.email_address.data, form.feedback.data, form.support_type.data)

        return redirect(url_for('.feedback', ticket_type='thanks'))

    types = [
        'ask-question-give-feedback',
        'thanks',
    ]

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
