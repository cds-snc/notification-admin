from flask import render_template

from app import user_api_client
from app.main import main
from app.main.forms import SearchIds
from app.utils import user_is_platform_admin


@main.route("/find-ids", methods=["GET", "POST"])
@user_is_platform_admin
def find_ids():
    form = SearchIds()
    records = None
    if form.validate_on_submit():
        records = user_api_client.find_ids(form.search.data)
    return render_template("views/find-ids/find-ids.html", form=form, records=records)

