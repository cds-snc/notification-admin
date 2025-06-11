import calendar
import time
from datetime import datetime, timedelta
from functools import partial
from itertools import groupby

from flask import (
    abort,
    current_app,
    jsonify,
    render_template,
    request,
    session,
    url_for,
)
from flask_babel import _
from flask_babel import lazy_gettext as _l
from flask_login import current_user
from werkzeug.utils import redirect

from app import (
    current_service,
    job_api_client,
    notification_api_client,
    service_api_client,
    template_statistics_client,
)
from app.extensions import annual_limit_client, bounce_rate_client
from app.main import main
from app.models.enum.bounce_rate_status import BounceRateStatus
from app.models.enum.notification_statuses import NotificationStatuses
from app.models.enum.template_types import TemplateType
from app.statistics_utils import add_rate_to_job, get_formatted_percentage
from app.types import AnnualData, DashboardTotals
from app.utils import (
    DELIVERED_STATUSES,
    FAILURE_STATUSES,
    REQUESTED_STATUSES,
    get_current_financial_year,
    get_month_name,
    user_has_permissions,
    yyyy_mm_to_datetime,
)


# This is a placeholder view method to be replaced
# when product team makes decision about how/what/when
# to view history
@main.route("/services/<service_id>/history")
@user_has_permissions()
def temp_service_history(service_id):
    data = service_api_client.get_service_history(service_id)["data"]
    return render_template(
        "views/temp-history.html",
        services=data["service_history"],
        api_keys=data["api_key_history"],
        events=data["events"],
    )


@main.route("/services/<service_id>/dashboard")
@user_has_permissions("view_activity", "send_messages")
def redirect_service_dashboard(service_id):
    return redirect(url_for(".service_dashboard", service_id=service_id))


@main.route("/services/<service_id>/problem-emails")
@user_has_permissions("view_activity", "send_messages")
def problem_emails(service_id):
    # get the daily stats
    bounce_rate_data = get_bounce_rate_data_from_redis(service_id)

    problem_one_off_notifications_7days = notification_api_client.get_notifications_for_service(
        service_id=service_id,
        template_type=TemplateType.EMAIL.value,
        status=NotificationStatuses.PERMANENT_FAILURE.value,
        include_one_off=True,
        include_jobs=False,
        page_size=20,
        limit_days=7,
    )

    jobs_7days = get_jobs_and_calculate_hard_bounces(service_id, 7)

    problem_jobs_7days = [job for job in jobs_7days if job["bounce_count"] > 0]
    twenty_four_hours_ago_timestamp = (datetime.now() - timedelta(hours=24)).timestamp()

    problem_jobs_within_24hrs = [
        job for job in problem_jobs_7days if get_timestamp_from_iso(job["processing_started"]) >= twenty_four_hours_ago_timestamp
    ]
    problem_jobs_older_than_24hrs = [
        job for job in problem_jobs_7days if get_timestamp_from_iso(job["processing_started"]) < twenty_four_hours_ago_timestamp
    ]

    problem_one_offs_within_24hrs = [
        notification
        for notification in problem_one_off_notifications_7days["notifications"]
        if get_timestamp_from_iso(notification["created_at"]) >= twenty_four_hours_ago_timestamp
    ]
    problem_one_offs_older_than_24hrs = [
        notification
        for notification in problem_one_off_notifications_7days["notifications"]
        if get_timestamp_from_iso(notification["created_at"]) < twenty_four_hours_ago_timestamp
    ]

    problem_count_within_24hrs = len(problem_one_offs_within_24hrs) + sum(
        [job["bounce_count"] for job in problem_jobs_within_24hrs]
    )
    problem_count_older_than_24hrs = len(problem_one_offs_older_than_24hrs) + sum(
        [job["bounce_count"] for job in problem_jobs_older_than_24hrs]
    )

    return render_template(
        "views/dashboard/review-email-list.html",
        bounce_status=BounceRateStatus.NORMAL,
        problem_jobs_older_than_24hrs=problem_jobs_older_than_24hrs,
        problem_jobs_within_24hrs=problem_jobs_within_24hrs,
        bounce_rate=bounce_rate_data,
        problem_one_offs_older_than_24hrs=problem_one_offs_older_than_24hrs,
        problem_one_offs_within_24hrs=problem_one_offs_within_24hrs,
        problem_count_within_24hrs=problem_count_within_24hrs,
        problem_count_older_than_24hrs=problem_count_older_than_24hrs,
    )


def get_timestamp_from_iso(iso_datetime_string):
    return datetime.fromisoformat(iso_datetime_string).timestamp()


def get_jobs_and_calculate_hard_bounces(service_id, limit_days):
    # get the jobs stats
    jobs = []
    if job_api_client.has_jobs(service_id):
        jobs = [add_rate_to_job(job) for job in job_api_client.get_immediate_jobs(service_id, limit_days=limit_days)]

    # get the permanent failures
    for job in jobs:
        for stat in job["statistics"]:
            if stat["status"] == "permanent-failure":
                job["bounce_count"] = stat["count"]

        if job.get("bounce_count") is None:
            job["bounce_count"] = 0

    return jobs


@main.route("/services/<service_id>")
@user_has_permissions()
def service_dashboard(service_id):
    if session.get("invited_user"):
        session.pop("invited_user", None)
        session["service_id"] = service_id

    if not current_user.has_permissions("view_activity"):
        return redirect(url_for("main.choose_template", service_id=service_id))

    return render_template(
        "views/dashboard/dashboard.html",
        updates_url=url_for(".service_dashboard_updates", service_id=service_id),
        partials=get_dashboard_partials(service_id),
    )


@main.route("/services/<service_id>/dashboard.json")
@user_has_permissions("view_activity")
def service_dashboard_updates(service_id):
    return jsonify(**get_dashboard_partials(service_id))


@main.route("/services/<service_id>/template-activity")
@user_has_permissions("view_activity")
def template_history(service_id):
    return redirect(url_for("main.template_usage", service_id=service_id), code=301)


@main.route("/services/<service_id>/template-usage")
@user_has_permissions("view_activity")
def template_usage(service_id):
    year, current_financial_year = requested_and_current_financial_year(request)
    stats = template_statistics_client.get_monthly_template_usage_for_service(service_id, year)

    stats = sorted(stats, key=lambda x: (x["count"]), reverse=True)

    def get_monthly_template_stats(month_name, stats):
        return {
            "name": month_name,
            "templates_used": [
                {
                    "id": month_name + "_" + stat["template_id"],
                    "name": stat["name"],
                    "type": stat["type"],
                    "requested_count": stat["count"],
                }
                for stat in stats
                if calendar.month_name[int(stat["month"])] == month_name
            ],
        }

    months = [get_monthly_template_stats(month, stats) for month in get_months_for_financial_year(year, time_format="%B")]

    return render_template(
        "views/dashboard/all-template-statistics.html",
        months=reversed(months),
        stats=stats,
        most_used_template_count=max(
            max(
                (template["requested_count"] for template in month["templates_used"]),
                default=0,
            )
            for month in months
        ),
        years=get_tuples_of_financial_years(
            partial(url_for, ".template_usage", service_id=service_id),
            start=current_financial_year - 2,
            end=current_financial_year,
        ),
        selected_year=year,
    )


@main.route("/services/<service_id>/usage")
@user_has_permissions("manage_service", allow_org_user=True)
def usage(service_id):
    if current_service.has_permission("view_activity") or current_user.platform_admin:
        return redirect(url_for(".service_dashboard", service_id=service_id))

    return redirect(url_for(".main.index", service_id=service_id))


@main.route("/services/<service_id>/monthly")
@user_has_permissions("view_activity")
def monthly(service_id):
    def combine_daily_to_annual(daily, annual, mode):
        if mode == "redis":
            # the redis client omits properties if there are no counts yet, so account for this here\
            daily_redis = {
                field: daily.get(field, 0) for field in ["sms_delivered", "sms_failed", "email_delivered", "email_failed"]
            }
            annual["sms"] += daily_redis["sms_delivered"] + daily_redis["sms_failed"]
            annual["email"] += daily_redis["email_delivered"] + daily_redis["email_failed"]
        elif mode == "db":
            annual["sms"] += daily["sms"]["requested"]
            annual["email"] += daily["email"]["requested"]

        return annual

    def combine_daily_to_monthly(daily, monthly, mode):
        if mode == "redis":
            # the redis client omits properties if there are no counts yet, so account for this here\
            daily_redis = {
                field: daily.get(field, 0) for field in ["sms_delivered", "sms_failed", "email_delivered", "email_failed"]
            }

            monthly[0]["sms_counts"]["failed"] += daily_redis["sms_failed"]
            monthly[0]["sms_counts"]["requested"] += daily_redis["sms_failed"] + daily_redis["sms_delivered"]
            monthly[0]["email_counts"]["failed"] += daily_redis["email_failed"]
            monthly[0]["email_counts"]["requested"] += daily_redis["email_failed"] + daily_redis["email_delivered"]
        elif mode == "db":
            monthly[0]["sms_counts"]["failed"] += daily["sms"]["failed"]
            monthly[0]["sms_counts"]["requested"] += daily["sms"]["requested"]
            monthly[0]["email_counts"]["failed"] += daily["email"]["failed"]
            monthly[0]["email_counts"]["requested"] += daily["email"]["requested"]

        return monthly

    def aggregate_by_type(notification_data):
        counts = {"sms": 0, "email": 0, "letter": 0}
        for month_data in notification_data["data"].values():
            for message_type, message_counts in month_data.items():
                if isinstance(message_counts, dict):
                    counts[message_type] += sum(message_counts.values())

        # return the result
        return counts

    year, current_financial_year = requested_and_current_financial_year(request)

    # if FF_ANNUAL is on
    if current_app.config["FF_ANNUAL_LIMIT"]:
        monthly_data = service_api_client.get_monthly_notification_stats(service_id, year)
        annual_data = aggregate_by_type(monthly_data)

        todays_data = annual_limit_client.get_all_notification_counts(current_service.id)

        # if redis is empty, query the db
        if all(value == 0 for value in todays_data.values()):
            todays_data = service_api_client.get_service_statistics(service_id, limit_days=1, today_only=False)
            annual_data_aggregate = combine_daily_to_annual(todays_data, annual_data, "db")

            months = (format_monthly_stats_to_list(monthly_data["data"]),)
            monthly_data_aggregate = combine_daily_to_monthly(todays_data, months[0], "db")
        else:
            # aggregate daily + annual
            current_app.logger.info("todays data" + str(todays_data))
            annual_data_aggregate = combine_daily_to_annual(todays_data, annual_data, "redis")

            months = (format_monthly_stats_to_list(monthly_data["data"]),)
            monthly_data_aggregate = combine_daily_to_monthly(todays_data, months[0], "redis")
    else:
        monthly_data_aggregate = (
            format_monthly_stats_to_list(service_api_client.get_monthly_notification_stats(service_id, year)["data"]),
        )
        monthly_data_aggregate = monthly_data_aggregate[0]
        annual_data_aggregate = None

    return render_template(
        "views/dashboard/monthly.html",
        months=monthly_data_aggregate,
        years=get_tuples_of_financial_years(
            partial_url=partial(url_for, ".monthly", service_id=service_id),
            start=current_financial_year - 2,
            end=current_financial_year,
        ),
        annual_data=annual_data_aggregate,
        selected_year=year,
        current_financial_year=current_financial_year,
    )


def filter_out_cancelled_stats(template_statistics):
    return [s for s in template_statistics if s["status"] != "cancelled"]


def aggregate_template_usage(template_statistics, sort_key="count"):
    template_statistics = filter_out_cancelled_stats(template_statistics)
    templates = []
    for k, v in groupby(
        sorted(template_statistics, key=lambda x: x["template_id"]),
        key=lambda x: x["template_id"],
    ):
        template_stats = list(v)

        templates.append(
            {
                "template_id": k,
                "template_name": template_stats[0]["template_name"],
                "template_type": template_stats[0]["template_type"],
                "is_precompiled_letter": template_stats[0]["is_precompiled_letter"],
                "count": sum(s["count"] for s in template_stats),
            }
        )

    return sorted(templates, key=lambda x: x[sort_key], reverse=True)


def aggregate_notifications_stats(template_statistics):
    template_statistics = filter_out_cancelled_stats(template_statistics)
    notifications = {
        template_type: {status: 0 for status in ("requested", "delivered", "failed")} for template_type in ["sms", "email"]
    }
    for stat in template_statistics:
        notifications[stat["template_type"]]["requested"] += stat["count"]
        if stat["status"] in DELIVERED_STATUSES:
            notifications[stat["template_type"]]["delivered"] += stat["count"]
        elif stat["status"] in FAILURE_STATUSES:
            notifications[stat["template_type"]]["failed"] += stat["count"]

    return notifications


def get_dashboard_partials(service_id):
    timings = {}

    # Time each backend API call
    start_total = time.time()

    start = time.time()
    all_statistics_weekly = template_statistics_client.get_template_statistics_for_service(service_id, limit_days=7)
    timings["template_statistics_weekly"] = (time.time() - start) * 1000

    start = time.time()
    template_statistics_weekly = aggregate_template_usage(all_statistics_weekly)
    timings["aggregate_template_usage"] = (time.time() - start) * 1000

    scheduled_jobs, immediate_jobs = [], []
    if job_api_client.has_jobs(service_id):
        start = time.time()
        scheduled_jobs = job_api_client.get_scheduled_jobs(service_id)
        timings["get_scheduled_jobs"] = (time.time() - start) * 1000

        start = time.time()
        immediate_jobs_raw = job_api_client.get_immediate_jobs(service_id)
        timings["get_immediate_jobs"] = (time.time() - start) * 1000

        start = time.time()
        immediate_jobs = [add_rate_to_job(job) for job in immediate_jobs_raw]
        timings["add_rate_to_job"] = (time.time() - start) * 1000

    # get the daily stats
    start = time.time()
    dashboard_totals_daily, highest_notification_count_daily, all_statistics_daily = _get_daily_stats(service_id)
    timings["_get_daily_stats"] = (time.time() - start) * 1000

    column_width, max_notifiction_count = get_column_properties(number_of_columns=2)

    start = time.time()
    stats_weekly = aggregate_notifications_stats(all_statistics_weekly)
    dashboard_totals_weekly = (get_dashboard_totals(stats_weekly),)
    timings["weekly_stats_aggregation"] = (time.time() - start) * 1000

    start = time.time()
    bounce_rate_data = get_bounce_rate_data_from_redis(service_id)
    timings["get_bounce_rate_data"] = (time.time() - start) * 1000

    start = time.time()
    annual_data = get_annual_data(service_id, dashboard_totals_daily)
    timings["get_annual_data"] = (time.time() - start) * 1000

    # Calculate total time
    total_time = (time.time() - start_total) * 1000
    current_app.logger.info(f"TIMING: Total get_dashboard_partials execution took {total_time:.2f}ms")
    current_app.logger.info(f"TIMING SUMMARY: {timings}")

    return {
        "upcoming": render_template("views/dashboard/_upcoming.html", scheduled_jobs=scheduled_jobs),
        "daily_totals": render_template(
            "views/dashboard/_totals_daily.html",
            service_id=service_id,
            statistics=dashboard_totals_daily,
            column_width=column_width,
        ),
        "annual_totals": render_template(
            "views/dashboard/_totals_annual.html",
            service_id=service_id,
            statistics=dashboard_totals_daily,
            statistics_annual=annual_data,
            column_width=column_width,
        ),
        "weekly_totals": render_template(
            "views/dashboard/_totals.html",
            service_id=service_id,
            statistics=dashboard_totals_weekly[0],
            column_width=column_width,
            smaller_font_size=(highest_notification_count_daily > max_notifiction_count),
            bounce_rate=bounce_rate_data,
        ),
        "template-statistics": render_template(
            "views/dashboard/template-statistics.html",
            template_statistics=template_statistics_weekly,
            most_used_template_count=max([row["count"] for row in template_statistics_weekly] or [0]),
        ),
        "has_template_statistics": bool(template_statistics_weekly),
        "jobs": render_template("views/dashboard/_jobs.html", jobs=immediate_jobs),
        "has_jobs": bool(immediate_jobs),
        "has_scheduled_jobs": bool(scheduled_jobs),
        "debug_timings": timings,  # Include timings in the response for debugging
    }


def aggregate_by_type_daily(data, daily_data: DashboardTotals) -> AnnualData:
    counts = {"sms": 0, "email": 0, "letter": 0}
    # flatten out this structure to match the above
    for month_data in data["data"].values():
        for message_type, message_counts in month_data.items():
            if isinstance(message_counts, dict):
                counts[message_type] += sum(message_counts.values())

    # add todays data to the annual data
    return {
        "sms": counts["sms"] + daily_data["sms"]["requested"],
        "email": counts["email"] + daily_data["email"]["requested"],
    }


def _get_daily_stats(service_id):
    # TODO: get from redis, else fallback to template_statistics_client.get_template_statistics_for_service
    all_statistics_daily = template_statistics_client.get_template_statistics_for_service(service_id, limit_days=1)
    stats_daily = aggregate_notifications_stats(all_statistics_daily)
    dashboard_totals_daily = get_dashboard_totals(stats_daily)

    highest_notification_count_daily = max(
        sum(value[key] for key in {"requested", "failed", "delivered"}) for key, value in dashboard_totals_daily.items()
    )

    return dashboard_totals_daily, highest_notification_count_daily, all_statistics_daily


class BounceRate:
    bounce_total = 0
    bounce_percentage = 0.0
    bounce_percentage_display = 0.0
    bounce_status = BounceRateStatus.NORMAL.value
    below_volume_threshold = False


def get_bounce_rate_data_from_redis(service_id):
    """This function gets bounce rate from Redis."""

    # Populate the bounce stats
    bounce_rate = BounceRate()
    bounce_rate.bounce_percentage = bounce_rate_client.get_bounce_rate(service_id)
    bounce_rate.bounce_percentage_display = 100.0 * bounce_rate.bounce_percentage
    bounce_rate.bounce_total = bounce_rate_client.get_total_hard_bounces(service_id)
    bounce_status = bounce_rate_client.check_bounce_rate_status(
        service_id=service_id, volume_threshold=current_app.config["BR_DISPLAY_VOLUME_MINIMUM"]
    )
    bounce_rate.bounce_status = bounce_status

    total_email_volume = bounce_rate_client.get_total_notifications(service_id)
    if total_email_volume < current_app.config["BR_DISPLAY_VOLUME_MINIMUM"]:
        bounce_rate.below_volume_threshold = True

    return bounce_rate


def calculate_bounce_rate(all_statistics_daily, dashboard_totals_daily):
    """This function calculates the bounce rate using the daily statistics provided from the dashboard"""

    # Populate the bounce stats
    bounce_rate = BounceRate()

    # get total sent
    total_sent = dashboard_totals_daily["email"]["requested"]

    # get total hard bounces
    for stat in all_statistics_daily:
        if stat["status"] == "permanent-failure" and stat["template_type"] == "email":
            bounce_rate.bounce_total += stat["count"]

    # calc bounce rate
    bounce_rate.bounce_percentage = (bounce_rate.bounce_total / total_sent) if total_sent > 0 else 0
    bounce_rate.bounce_percentage_display = 100.0 * bounce_rate.bounce_percentage

    if total_sent < current_app.config["BR_DISPLAY_VOLUME_MINIMUM"]:
        bounce_rate.below_volume_threshold = True

    # compute bounce status
    if bounce_rate.bounce_percentage < bounce_rate_client._warning_threshold:
        bounce_rate.bounce_status = BounceRateStatus.NORMAL.value
    elif bounce_rate.bounce_percentage >= bounce_rate_client._critical_threshold:
        bounce_rate.bounce_status = BounceRateStatus.CRITICAL.value
    else:
        bounce_rate.bounce_status = BounceRateStatus.WARNING.value
    return bounce_rate


def get_dashboard_totals(statistics) -> DashboardTotals:
    for msg_type in statistics.values():
        msg_type["failed_percentage"] = get_formatted_percentage(msg_type["failed"], msg_type["requested"])
        msg_type["show_warning"] = float(msg_type["failed_percentage"]) > 3
    return statistics


def calculate_usage(usage, free_sms_fragment_limit):
    sms_breakdowns = [breakdown for breakdown in usage if breakdown["notification_type"] == "sms"]

    # this relies on the assumption: only one SMS rate per financial year.
    sms_rate = 0 if len(sms_breakdowns) == 0 else sms_breakdowns[0].get("rate", 0)
    sms_sent = get_sum_billing_units(sms_breakdowns)
    sms_free_allowance = free_sms_fragment_limit

    emails = [breakdown["billing_units"] for breakdown in usage if breakdown["notification_type"] == "email"]
    emails_sent = 0 if len(emails) == 0 else emails[0]

    return {
        "emails_sent": emails_sent,
        "sms_free_allowance": sms_free_allowance,
        "sms_sent": sms_sent,
        "sms_allowance_remaining": max(0, (sms_free_allowance - sms_sent)),
        "sms_chargeable": max(0, sms_sent - sms_free_allowance),
        "sms_rate": sms_rate,
    }


def format_monthly_stats_to_list(historical_stats):
    return sorted(
        (
            dict(
                date=key,
                future=yyyy_mm_to_datetime(key) > datetime.utcnow(),
                name=get_month_name(key),
                **aggregate_status_types(value),
            )
            for key, value in historical_stats.items()
        ),
        key=lambda x: x["date"],
        reverse=True,
    )


def aggregate_status_types(counts_dict):
    return get_dashboard_totals(
        {
            "{}_counts".format(message_type): {
                "failed": sum(stats.get(status, 0) for status in FAILURE_STATUSES),
                "requested": sum(stats.get(status, 0) for status in REQUESTED_STATUSES),
            }
            for message_type, stats in counts_dict.items()
        }
    )


def get_months_for_financial_year(year, time_format="%B"):
    return [
        month.strftime(time_format)
        for month in (get_months_for_year(4, 13, year) + get_months_for_year(1, 4, year + 1))
        if month < datetime.now()
    ]


def get_months_for_year(start, end, year):
    return [datetime(year, month, 1) for month in range(start, end)]


def get_sum_billing_units(billing_units, month=None):
    if month:
        return sum(b["billing_units"] for b in billing_units if b["month"] == month)
    return sum(b["billing_units"] for b in billing_units)


def get_free_paid_breakdown_for_billable_units(year, free_sms_fragment_limit, billing_units):
    cumulative = 0
    sms_units = [x for x in billing_units if x["notification_type"] == "sms"]
    for month in get_months_for_financial_year(year):
        previous_cumulative = cumulative
        monthly_usage = get_sum_billing_units(sms_units, month)
        cumulative += monthly_usage
        breakdown = get_free_paid_breakdown_for_month(
            free_sms_fragment_limit,
            cumulative,
            previous_cumulative,
            [billing_month for billing_month in sms_units if billing_month["month"] == month],
        )
        yield {
            "name": month,
            "paid": breakdown["paid"],
            "free": breakdown["free"],
        }


def get_free_paid_breakdown_for_month(free_sms_fragment_limit, cumulative, previous_cumulative, monthly_usage):
    allowance = free_sms_fragment_limit

    total_monthly_billing_units = get_sum_billing_units(monthly_usage)

    if cumulative < allowance:
        return {
            "paid": 0,
            "free": total_monthly_billing_units,
        }
    elif previous_cumulative < allowance:
        remaining_allowance = allowance - previous_cumulative
        return {
            "paid": total_monthly_billing_units - remaining_allowance,
            "free": remaining_allowance,
        }
    else:
        return {
            "paid": total_monthly_billing_units,
            "free": 0,
        }


def requested_and_current_financial_year(request):
    try:
        return (
            int(request.args.get("year", get_current_financial_year())),
            get_current_financial_year(),
        )
    except ValueError:
        abort(404)


def get_tuples_of_financial_years(
    partial_url,
    start=2015,
    end=None,
) -> list:
    return list(
        (
            _l("fiscal year"),
            year,
            partial_url(year=year),
            "{} {} {}".format(year, _("to"), year + 1),
        )
        for year in range(start, end + 1)
    )


def get_column_properties(number_of_columns):
    return {
        2: ("w-1/2 float-left py-0 px-0 px-gutterHalf box-border", 999999999),
        3: ("md:w-1/3 float-left py-0 px-0 px-gutterHalf box-border", 99999),
    }.get(number_of_columns)


def get_annual_data(service_id: str, dashboard_totals_daily: DashboardTotals) -> AnnualData:
    """Retrieves and combines annual notification statistics for a service.

    This function attempts to fetch annual data from Redis cache. If Redis is not enabled or
    the cache hasn't been seeded today, it falls back to an API call to fetch the data from the database.

    The function then aggregates annual notification counts (from Redis or API) and combines them with
    the daily dashboard totals to get complete annual statistics.

    Args:
        service_id: The ID of the service to get annual data for
        dashboard_totals_daily: The daily dashboard totals containing requested counts for SMS and email

    Returns:
        AnnualData: Dictionary containing combined annual notification counts for SMS and email
    """

    if not current_app.config["REDIS_ENABLED"] or not annual_limit_client.was_seeded_today(service_id):
        annual_data = service_api_client.get_monthly_notification_stats(service_id, get_current_financial_year())
        aggregated_annual_data = aggregate_by_type_daily(annual_data, dashboard_totals_daily)
        return aggregated_annual_data

    # get annual_data from redis
    annual_data_redis = annual_limit_client.get_all_notification_counts(service_id)

    # use the daily requested totals from the api, so that this number is calculated the same
    # way regardless of whether we use api data or redis data
    return {
        "email": dashboard_totals_daily["email"]["requested"] + annual_data_redis["total_email_fiscal_year_to_yesterday"],
        "sms": dashboard_totals_daily["sms"]["requested"] + annual_data_redis["total_sms_fiscal_year_to_yesterday"],
    }
