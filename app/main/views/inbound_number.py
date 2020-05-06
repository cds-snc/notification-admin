from flask import render_template

from app import inbound_number_client
from app.main import main
from app.main.forms import CreateInboundSmsForm
from app.utils import user_is_platform_admin


@main.route('/inbound-sms-admin', methods=['GET', 'POST'])
@user_is_platform_admin
def inbound_sms_admin():
    data = inbound_number_client.get_all_inbound_sms_number_service()

    return render_template('views/inbound-sms-admin.html', inbound_num_list=data)


@main.route('/inbound-sms-admin/add', methods=['GET', 'POST'])
@user_is_platform_admin
def add_inbound_sms_admin():
    inbound_num_list = inbound_number_client.get_all_inbound_sms_number_service()
    form = CreateInboundSmsForm(inbound_num_list)
    if form.validate_on_submit():
        number = inbound_number_client.add_inbound_sms_number(
            inbound_number=form.inbound_number.data
        )
        return render_template(
            'views/added-inbound-sms-admin.html',
            number=number
        )
    return render_template('views/add-inbound-sms-admin.html', form=form)
