import pytest

from app.models.enum.notification_statuses import NotificationStatuses
from tests.conftest import create_notification, set_config

jobs_2_failures = [
    {
        "failure_rate": 0.0,
        "api_key": None,
        "archived": False,
        "created_at": "2023-04-18T18:09:07.737196+00:00",
        "created_by": {"id": "24baebe0-fb11-4fc0-8609-1e853c31d0fe", "name": "Andrew Leith"},
        "id": "6b4a62a7-329f-4332-8106-63ecc6cf7a1c",
        "job_status": "finished",
        "notification_count": 19,
        "original_file_name": "bulk_send_19_success_3.csv",
        "processing_finished": "2023-04-18T18:09:10.200722+00:00",
        "processing_started": "2023-04-18T18:09:08.041267+00:00",
        "scheduled_for": None,
        "sender_id": None,
        "service": "9cfb3884-fed6-4824-8901-c7d0857cc5b4",
        "service_name": {"name": "Bounce Rate"},
        "statistics": [{"count": 19, "status": "delivered"}],
        "template": "2156a57e-efd7-4531-b8f4-e7e0c64c03dc",
        "template_version": 1,
        "updated_at": "2023-04-18T18:09:10.202238+00:00",
        "notifications_sent": 19,
        "notifications_delivered": 19,
        "notifications_failed": 0,
        "notifications_requested": 19,
        "bounce_count": 0,
    },
    {
        "failure_rate": 0.0,
        "api_key": None,
        "archived": False,
        "created_at": "2023-04-18T18:08:29.951155+00:00",
        "created_by": {"id": "24baebe0-fb11-4fc0-8609-1e853c31d0fe", "name": "Andrew Leith"},
        "id": "b5e56c24-cfd6-439b-9c95-3c671d25545f",
        "job_status": "finished",
        "notification_count": 19,
        "original_file_name": "bulk_send_19_success_2.csv",
        "processing_finished": "2023-04-18T18:08:31.986638+00:00",
        "processing_started": "2023-04-18T18:08:30.961924+00:00",
        "scheduled_for": None,
        "sender_id": None,
        "service": "9cfb3884-fed6-4824-8901-c7d0857cc5b4",
        "service_name": {"name": "Bounce Rate"},
        "statistics": [{"count": 19, "status": "delivered"}],
        "template": "2156a57e-efd7-4531-b8f4-e7e0c64c03dc",
        "template_version": 1,
        "updated_at": "2023-04-18T18:08:31.987927+00:00",
        "notifications_sent": 19,
        "notifications_delivered": 19,
        "notifications_failed": 0,
        "notifications_requested": 19,
        "bounce_count": 0,
    },
    {
        "failure_rate": 0.0,
        "api_key": None,
        "archived": False,
        "created_at": "2023-04-18T14:37:30.363833+00:00",
        "created_by": {"id": "24baebe0-fb11-4fc0-8609-1e853c31d0fe", "name": "Andrew Leith"},
        "id": "298b3d50-feec-47a4-a771-1f34d860f513",
        "job_status": "finished",
        "notification_count": 19,
        "original_file_name": "bulk_send_19_success.csv",
        "processing_finished": "2023-04-18T14:37:35.161901+00:00",
        "processing_started": "2023-04-18T14:37:34.168804+00:00",
        "scheduled_for": None,
        "sender_id": None,
        "service": "9cfb3884-fed6-4824-8901-c7d0857cc5b4",
        "service_name": {"name": "Bounce Rate"},
        "statistics": [{"count": 19, "status": "delivered"}],
        "template": "2156a57e-efd7-4531-b8f4-e7e0c64c03dc",
        "template_version": 1,
        "updated_at": "2023-04-18T14:37:35.163298+00:00",
        "notifications_sent": 19,
        "notifications_delivered": 19,
        "notifications_failed": 0,
        "notifications_requested": 19,
        "bounce_count": 0,
    },
    {
        "failure_rate": 10.0,
        "api_key": None,
        "archived": False,
        "created_at": "2023-04-18T14:03:07.432308+00:00",
        "created_by": {"id": "24baebe0-fb11-4fc0-8609-1e853c31d0fe", "name": "Andrew Leith"},
        "id": "8f5cae07-e4dc-4a31-9c31-afc1fddf2f30",
        "job_status": "finished",
        "notification_count": 20,
        "original_file_name": "bulk_send_mix_20_2_fails.csv",
        "processing_finished": "2023-04-18T14:03:08.605917+00:00",
        "processing_started": "2023-04-18T14:03:07.839004+00:00",
        "scheduled_for": None,
        "sender_id": None,
        "service": "9cfb3884-fed6-4824-8901-c7d0857cc5b4",
        "service_name": {"name": "Bounce Rate"},
        "statistics": [
            {"count": 1, "status": "temporary-failure"},
            {"count": 18, "status": "delivered"},
            {"count": 1, "status": "permanent-failure"},
        ],
        "template": "2156a57e-efd7-4531-b8f4-e7e0c64c03dc",
        "template_version": 1,
        "updated_at": "2023-04-18T14:03:08.606670+00:00",
        "notifications_sent": 20,
        "notifications_delivered": 18,
        "notifications_failed": 2,
        "notifications_requested": 20,
        "bounce_count": 1,
    },
    {
        "failure_rate": 10.0,
        "api_key": None,
        "archived": False,
        "created_at": "2023-04-18T11:15:22.842906+00:00",
        "created_by": {"id": "24baebe0-fb11-4fc0-8609-1e853c31d0fe", "name": "Andrew Leith"},
        "id": "89e0f76e-777f-4d3a-aee1-bdd9277837ff",
        "job_status": "finished",
        "notification_count": 20,
        "original_file_name": "bulk_send_mix_20_2_fails copy.csv",
        "processing_finished": "2023-04-18T11:15:40.718126+00:00",
        "processing_started": "2023-04-18T11:15:39.333558+00:00",
        "scheduled_for": None,
        "sender_id": None,
        "service": "9cfb3884-fed6-4824-8901-c7d0857cc5b4",
        "service_name": {"name": "Bounce Rate"},
        "statistics": [{"count": 18, "status": "delivered"}, {"count": 2, "status": "permanent-failure"}],
        "template": "2156a57e-efd7-4531-b8f4-e7e0c64c03dc",
        "template_version": 1,
        "updated_at": "2023-04-18T11:15:40.721100+00:00",
        "notifications_sent": 20,
        "notifications_delivered": 18,
        "notifications_failed": 2,
        "notifications_requested": 20,
        "bounce_count": 2,
    },
]

jobs_0_failures = [
    {
        "failure_rate": 0.0,
        "api_key": None,
        "archived": False,
        "created_at": "2023-04-18T18:09:07.737196+00:00",
        "created_by": {"id": "24baebe0-fb11-4fc0-8609-1e853c31d0fe", "name": "Andrew Leith"},
        "id": "6b4a62a7-329f-4332-8106-63ecc6cf7a1c",
        "job_status": "finished",
        "notification_count": 19,
        "original_file_name": "bulk_send_19_success_3.csv",
        "processing_finished": "2023-04-18T18:09:10.200722+00:00",
        "processing_started": "2023-04-18T18:09:08.041267+00:00",
        "scheduled_for": None,
        "sender_id": None,
        "service": "9cfb3884-fed6-4824-8901-c7d0857cc5b4",
        "service_name": {"name": "Bounce Rate"},
        "statistics": [{"count": 19, "status": "delivered"}],
        "template": "2156a57e-efd7-4531-b8f4-e7e0c64c03dc",
        "template_version": 1,
        "updated_at": "2023-04-18T18:09:10.202238+00:00",
        "notifications_sent": 19,
        "notifications_delivered": 19,
        "notifications_failed": 0,
        "notifications_requested": 19,
        "bounce_count": 0,
    },
    {
        "failure_rate": 0.0,
        "api_key": None,
        "archived": False,
        "created_at": "2023-04-18T18:08:29.951155+00:00",
        "created_by": {"id": "24baebe0-fb11-4fc0-8609-1e853c31d0fe", "name": "Andrew Leith"},
        "id": "b5e56c24-cfd6-439b-9c95-3c671d25545f",
        "job_status": "finished",
        "notification_count": 19,
        "original_file_name": "bulk_send_19_success_2.csv",
        "processing_finished": "2023-04-18T18:08:31.986638+00:00",
        "processing_started": "2023-04-18T18:08:30.961924+00:00",
        "scheduled_for": None,
        "sender_id": None,
        "service": "9cfb3884-fed6-4824-8901-c7d0857cc5b4",
        "service_name": {"name": "Bounce Rate"},
        "statistics": [{"count": 19, "status": "delivered"}],
        "template": "2156a57e-efd7-4531-b8f4-e7e0c64c03dc",
        "template_version": 1,
        "updated_at": "2023-04-18T18:08:31.987927+00:00",
        "notifications_sent": 19,
        "notifications_delivered": 19,
        "notifications_failed": 0,
        "notifications_requested": 19,
        "bounce_count": 0,
    },
    {
        "failure_rate": 0.0,
        "api_key": None,
        "archived": False,
        "created_at": "2023-04-18T14:37:30.363833+00:00",
        "created_by": {"id": "24baebe0-fb11-4fc0-8609-1e853c31d0fe", "name": "Andrew Leith"},
        "id": "298b3d50-feec-47a4-a771-1f34d860f513",
        "job_status": "finished",
        "notification_count": 19,
        "original_file_name": "bulk_send_19_success.csv",
        "processing_finished": "2023-04-18T14:37:35.161901+00:00",
        "processing_started": "2023-04-18T14:37:34.168804+00:00",
        "scheduled_for": None,
        "sender_id": None,
        "service": "9cfb3884-fed6-4824-8901-c7d0857cc5b4",
        "service_name": {"name": "Bounce Rate"},
        "statistics": [{"count": 19, "status": "delivered"}],
        "template": "2156a57e-efd7-4531-b8f4-e7e0c64c03dc",
        "template_version": 1,
        "updated_at": "2023-04-18T14:37:35.163298+00:00",
        "notifications_sent": 19,
        "notifications_delivered": 19,
        "notifications_failed": 0,
        "notifications_requested": 19,
        "bounce_count": 0,
    },
]

jobs_1_failure = [
    {
        "failure_rate": 0.001,
        "api_key": None,
        "archived": False,
        "created_at": "2023-04-18T18:09:07.737196+00:00",
        "created_by": {"id": "24baebe0-fb11-4fc0-8609-1e853c31d0fe", "name": "Andrew Leith"},
        "id": "6b4a62a7-329f-4332-8106-63ecc6cf7a1c",
        "job_status": "finished",
        "notification_count": 1000,
        "original_file_name": "bulk_send_19_success_3.csv",
        "processing_finished": "2023-04-18T18:09:10.200722+00:00",
        "processing_started": "2023-04-18T18:09:08.041267+00:00",
        "scheduled_for": None,
        "sender_id": None,
        "service": "9cfb3884-fed6-4824-8901-c7d0857cc5b4",
        "service_name": {"name": "Bounce Rate"},
        "statistics": [{"count": 999, "status": "delivered"}],
        "template": "2156a57e-efd7-4531-b8f4-e7e0c64c03dc",
        "template_version": 1,
        "updated_at": "2023-04-18T18:09:10.202238+00:00",
        "notifications_sent": 1000,
        "notifications_delivered": 999,
        "notifications_failed": 1,
        "notifications_requested": 1000,
        "bounce_count": 2,
    }
]


@pytest.mark.parametrize(
    "totals, expected_problem_emails, expected_problem_percent",
    [
        (
            [
                {
                    "count": 19,
                    "is_precompiled_letter": False,
                    "status": "delivered",
                    "template_id": "2156a57e-efd7-4531-b8f4-e7e0c64c03dc",
                    "template_name": "test",
                    "template_type": "email",
                },
                {
                    "count": 1,
                    "is_precompiled_letter": False,
                    "status": "permanent-failure",
                    "template_id": "2156a57e-efd7-4531-b8f4-e7e0c64c03dc",
                    "template_name": "test",
                    "template_type": "email",
                },
            ],
            1,
            "5.0% problem addresses",
        ),
        (
            [
                {
                    "count": 18,
                    "is_precompiled_letter": False,
                    "status": "delivered",
                    "template_id": "2156a57e-efd7-4531-b8f4-e7e0c64c03dc",
                    "template_name": "test",
                    "template_type": "email",
                },
                {
                    "count": 1,
                    "is_precompiled_letter": False,
                    "status": "permanent-failure",
                    "template_id": "2156a57e-efd7-4531-b8f4-e7e0c64c03dc",
                    "template_name": "test",
                    "template_type": "email",
                },
                {
                    "count": 1,
                    "is_precompiled_letter": False,
                    "status": "permanent-failure",
                    "template_id": "2156a57e-efd7-4531-b8f4-e333c64c03dc",
                    "template_name": "test",
                    "template_type": "email",
                },
            ],
            2,
            "10.0% problem addresses",
        ),
        (
            [
                {
                    "count": 20,
                    "is_precompiled_letter": False,
                    "status": "delivered",
                    "template_id": "2156a57e-efd7-4531-b8f4-e7e0c64c03dc",
                    "template_name": "test",
                    "template_type": "email",
                }
            ],
            0,
            "No problem addresses",
        ),
        (
            [
                {
                    "count": 1100,
                    "is_precompiled_letter": False,
                    "status": "delivered",
                    "template_id": "2156a57e-efd7-4531-b8f4-e7e0c64c03dc",
                    "template_name": "test",
                    "template_type": "email",
                },
                {
                    "count": 1,
                    "is_precompiled_letter": False,
                    "status": "permanent-failure",
                    "template_id": "2156a57e-efd7-4531-b8f4-e7e0c64c03dc",
                    "template_name": "test",
                    "template_type": "email",
                },
            ],
            1,
            "Less than 0.1% problem addresses",
        ),
        (
            [
                {
                    "count": 999,
                    "is_precompiled_letter": False,
                    "status": "delivered",
                    "template_id": "2156a57e-efd7-4531-b8f4-e7e0c64c03dc",
                    "template_name": "test",
                    "template_type": "email",
                },
                {
                    "count": 1,
                    "is_precompiled_letter": False,
                    "status": "permanent-failure",
                    "template_id": "2156a57e-efd7-4531-b8f4-e7e0c64c03dc",
                    "template_name": "test",
                    "template_type": "email",
                },
            ],
            1,
            "0.1% problem addresses",
        ),
    ],
)
def test_bounce_rate_widget_displays_correct_status_and_totals_v1(
    client_request,
    mocker,
    mock_get_service_templates,
    mock_get_template_statistics,
    mock_get_service_statistics,
    mock_get_jobs,
    service_one,
    totals,
    expected_problem_emails,
    expected_problem_percent,
    app_,
):
    with set_config(app_, "FF_BOUNCE_RATE_V1", True):
        with set_config(app_, "FF_BOUNCE_RATE_V15", False):
            mocker.patch(
                "app.main.views.dashboard.template_statistics_client.get_template_statistics_for_service", return_value=totals
            )

            page = client_request.get(
                "main.service_dashboard",
                service_id=service_one["id"],
            )

            assert int(page.select_one("#problem-email-addresses .big-number-number").text.strip()) == expected_problem_emails

            if expected_problem_emails > 0:
                assert (
                    page.select_one("#problem-email-addresses .review-email-label")
                    .text.strip()
                    .replace("\n", "")
                    .replace("  ", "")
                    == expected_problem_percent
                )


@pytest.mark.parametrize(
    "bounce_rate, bounce_rate_status, total_hard_bounces, expected_problem_percent",
    [
        (0.05, "warning", 1, "5.0% problem addresses"),
        (0.10, "critical", 1, "10.0% problem addresses"),
        (0.0, "normal", 0, "No problem addresses"),
        (0.0005, "normal", 1, "Less than 0.1% problem addresses"),
        (0.001, "normal", 1, "0.1% problem addresses"),
    ],
)
def test_bounce_rate_widget_displays_correct_status_and_totals_v15(
    client_request,
    mocker,
    mock_get_service_templates,
    mock_get_template_statistics,
    mock_get_service_statistics,
    mock_get_jobs,
    service_one,
    bounce_rate,
    bounce_rate_status,
    total_hard_bounces,
    expected_problem_percent,
    app_,
):
    with set_config(app_, "FF_BOUNCE_RATE_V1", True):
        with set_config(app_, "FF_BOUNCE_RATE_V15", True):
            mocker.patch("app.main.views.dashboard.bounce_rate_client.get_bounce_rate", return_value=bounce_rate)
            mocker.patch("app.main.views.dashboard.bounce_rate_client.check_bounce_rate_status", return_value=bounce_rate_status)
            mocker.patch("app.main.views.dashboard.bounce_rate_client.get_total_hard_bounces", return_value=total_hard_bounces)

            page = client_request.get(
                "main.service_dashboard",
                service_id=service_one["id"],
            )

            assert int(page.select_one("#problem-email-addresses .big-number-number").text.strip()) == total_hard_bounces

            if total_hard_bounces > 0:
                assert (
                    page.select_one("#problem-email-addresses .review-email-label")
                    .text.strip()
                    .replace("\n", "")
                    .replace("  ", "")
                    == expected_problem_percent
                )


def test_bounce_rate_widget_doesnt_change_when_under_threshold_v1(
    client_request,
    mocker,
    mock_get_service_templates,
    mock_get_template_statistics,
    mock_get_service_statistics,
    mock_get_jobs,
    service_one,
    app_,
):
    with set_config(app_, "FF_BOUNCE_RATE_V1", True):
        with set_config(app_, "FF_BOUNCE_RATE_V15", False):
            threshold = app_.config["BR_DISPLAY_VOLUME_MINIMUM"]

            mock_data = [
                {
                    "count": (threshold - 20) * 0.5,
                    "is_precompiled_letter": False,
                    "status": "delivered",
                    "template_id": "2156a57e-efd7-4531-b8f4-e7e0c64c03dc",
                    "template_name": "test",
                    "template_type": "email",
                },
                {
                    "count": (threshold - 20) * 0.5,
                    "is_precompiled_letter": False,
                    "status": "permanent-failure",
                    "template_id": "2156a57e-efd7-4531-b8f4-e7e0c64c03dc",
                    "template_name": "test",
                    "template_type": "email",
                },
            ]

            mocker.patch(
                "app.main.views.dashboard.template_statistics_client.get_template_statistics_for_service", return_value=mock_data
            )

            page = client_request.get(
                "main.service_dashboard",
                service_id=service_one["id"],
            )

            assert len(page.find_all(class_="review-email-status-critical")) == 0
            assert len(page.find_all(class_="review-email-status-neutral")) == 1


def test_bounce_rate_widget_doesnt_change_when_under_threshold_v15(
    client_request,
    mocker,
    mock_get_service_templates,
    mock_get_template_statistics,
    mock_get_service_statistics,
    mock_get_jobs,
    service_one,
    app_,
):
    with set_config(app_, "FF_BOUNCE_RATE_V1", True):
        with set_config(app_, "FF_BOUNCE_RATE_V15", True):
            mocker.patch("app.main.views.dashboard.bounce_rate_client.get_bounce_rate", return_value=0.30)  # 30%
            mocker.patch("app.main.views.dashboard.bounce_rate_client.check_bounce_rate_status", return_value="normal")
            mocker.patch("app.main.views.dashboard.bounce_rate_client.get_total_hard_bounces", return_value=10)

            page = client_request.get(
                "main.service_dashboard",
                service_id=service_one["id"],
            )

            assert len(page.find_all(class_="review-email-status-critical")) == 0
            assert len(page.find_all(class_="review-email-status-normal")) == 0
            assert len(page.find_all(class_="review-email-status-neutral")) == 1


@pytest.mark.parametrize("FF_BOUNCE_RATE_V15", [True, False])
def test_review_problem_emails_is_empty_when_no_probems(mocker, service_one, app_, client_request, FF_BOUNCE_RATE_V15):
    with set_config(app_, "FF_BOUNCE_RATE_V1", True):
        with set_config(app_, "FF_BOUNCE_RATE_V15", FF_BOUNCE_RATE_V15):
            threshold = app_.config["BR_DISPLAY_VOLUME_MINIMUM"]

            mock_data = [
                {
                    "count": int((threshold - 20) * 0.5),
                    "is_precompiled_letter": False,
                    "status": "delivered",
                    "template_id": "2156a57e-efd7-4531-b8f4-e7e0c64c03dc",
                    "template_name": "test",
                    "template_type": "email",
                }
            ]

            mocker.patch(
                "app.main.views.dashboard.template_statistics_client.get_template_statistics_for_service", return_value=mock_data
            )
            mocker.patch("app.main.views.dashboard.get_jobs_and_calculate_hard_bounces", return_value=[])
            mocker.patch("app.notification_api_client.get_notifications_for_service", return_value={"notifications": []})
            page = client_request.get(
                "main.problem_emails",
                service_id=service_one["id"],
            )

            assert (
                page.find("p", {"class": "text-title"}).text.strip().replace("\n", "").replace("  ", "")
                == "Less than 0.1% of email addresses need review"
            )


@pytest.mark.parametrize(
    "jobs, expected_problem_list_count, FF_BOUNCE_RATE_V15",
    [
        (jobs_2_failures, 2, False),
        (jobs_0_failures, 0, False),
        (jobs_1_failure, 1, False),
        (jobs_2_failures, 2, True),
        (jobs_0_failures, 0, True),
        (jobs_1_failure, 1, True),
    ],
)
def test_review_problem_emails_shows_csvs_when_problem_emails_exist(
    mocker, service_one, app_, client_request, jobs, expected_problem_list_count, FF_BOUNCE_RATE_V15
):
    with set_config(app_, "FF_BOUNCE_RATE_V1", True):
        with set_config(app_, "FF_BOUNCE_RATE_V15", FF_BOUNCE_RATE_V15):
            threshold = app_.config["BR_DISPLAY_VOLUME_MINIMUM"]

            mock_data = [
                {
                    "count": (threshold - 20) * 0.5,
                    "is_precompiled_letter": False,
                    "status": "delivered",
                    "template_id": "2156a57e-efd7-4531-b8f4-e7e0c64c03dc",
                    "template_name": "test",
                    "template_type": "email",
                }
            ]

            mocker.patch(
                "app.main.views.dashboard.template_statistics_client.get_template_statistics_for_service", return_value=mock_data
            )

            mocker.patch("app.main.views.dashboard.get_jobs_and_calculate_hard_bounces", return_value=jobs)
            mocker.patch("app.notification_api_client.get_notifications_for_service", return_value={"notifications": []})
            page = client_request.get(
                "main.problem_emails",
                service_id=service_one["id"],
            )

            # ensure the number of CSVs displayed on this page correspond to what is found in the jobs data
            assert len(page.select_one(".ajax-block-container .list.list-bullet").find_all("li")) == expected_problem_list_count


@pytest.mark.parametrize(
    "notifications, jobs, expected_problem_list_count",
    [
        (
            {
                "notifications": [
                    create_notification(
                        template_type="email",
                        notification_status=NotificationStatuses.PERMANENT_FAILURE.value,
                        template_name="test",
                    ),
                    create_notification(
                        template_type="email",
                        notification_status=NotificationStatuses.PERMANENT_FAILURE.value,
                        template_name="test",
                    ),
                ]
            },
            [],
            2,
        ),
        (
            {
                "notifications": [
                    create_notification(
                        template_type="email",
                        notification_status=NotificationStatuses.PERMANENT_FAILURE.value,
                        template_name="test",
                    ),
                    create_notification(
                        template_type="email",
                        notification_status=NotificationStatuses.PERMANENT_FAILURE.value,
                        template_name="test",
                    ),
                ]
            },
            [
                {
                    "failure_rate": 10.0,
                    "api_key": None,
                    "archived": False,
                    "created_at": "2023-04-18T11:15:22.842906+00:00",
                    "created_by": {"id": "24baebe0-fb11-4fc0-8609-1e853c31d0fe", "name": "Andrew Leith"},
                    "id": "89e0f76e-777f-4d3a-aee1-bdd9277837ff",
                    "job_status": "finished",
                    "notification_count": 20,
                    "original_file_name": "bulk_send_mix_20_2_fails copy.csv",
                    "processing_finished": "2023-04-18T11:15:40.718126+00:00",
                    "processing_started": "2023-04-18T11:15:39.333558+00:00",
                    "scheduled_for": None,
                    "sender_id": None,
                    "service": "9cfb3884-fed6-4824-8901-c7d0857cc5b4",
                    "service_name": {"name": "Bounce Rate"},
                    "statistics": [{"count": 18, "status": "delivered"}, {"count": 2, "status": "permanent-failure"}],
                    "template": "2156a57e-efd7-4531-b8f4-e7e0c64c03dc",
                    "template_version": 1,
                    "updated_at": "2023-04-18T11:15:40.721100+00:00",
                    "notifications_sent": 20,
                    "notifications_delivered": 18,
                    "notifications_failed": 2,
                    "notifications_requested": 20,
                    "bounce_count": 2,
                },
            ],
            3,
        ),
    ],
    ids=["2 one-off bounces -> 2 rendered list items", "2 one-off bounces, 1 job with bounces -> 3 rendered list items"],
)
def test_review_problem_emails_shows_one_offs_when_problem_emails_exist(
    mocker, service_one, app_, client_request, notifications, jobs, expected_problem_list_count
):
    threshold = app_.config["BR_DISPLAY_VOLUME_MINIMUM"]

    mock_data = [
        {
            "count": (threshold - 20) * 0.5,
            "is_precompiled_letter": False,
            "status": "delivered",
            "template_id": "2156a57e-efd7-4531-b8f4-e7e0c64c03dc",
            "template_name": "test",
            "template_type": "email",
        }
    ]

    mocker.patch(
        "app.main.views.dashboard.template_statistics_client.get_template_statistics_for_service", return_value=mock_data
    )

    mocker.patch("app.main.views.dashboard.get_jobs_and_calculate_hard_bounces", return_value=jobs)
    mocker.patch("app.notification_api_client.get_notifications_for_service", return_value=notifications)
    page = client_request.get(
        "main.problem_emails",
        service_id=service_one["id"],
    )

    assert (
        page.find("p", {"class": "text-title"}).text.strip().replace("\n", "").replace("  ", "")
        == "Less than 0.1% of email addresses need review"
    )

    # ensure the number of CSVs displayed on this page correspond to what is found in the jobs data
    assert len(page.select_one(".ajax-block-container .list.list-bullet").find_all("li")) == expected_problem_list_count


@pytest.mark.parametrize(
    "jobs",
    [
        (jobs_2_failures),
        (jobs_1_failure),
    ],
)
def test_review_problem_emails_checks_problem_filter_checkbox(mocker, service_one, app_, client_request, jobs):
    with set_config(app_, "FF_BOUNCE_RATE_V1", True):
        threshold = app_.config["BR_DISPLAY_VOLUME_MINIMUM"]

        mock_data = [
            {
                "count": (threshold - 20) * 0.5,
                "is_precompiled_letter": False,
                "status": "delivered",
                "template_id": "2156a57e-efd7-4531-b8f4-e7e0c64c03dc",
                "template_name": "test",
                "template_type": "email",
            }
        ]

        mocker.patch(
            "app.main.views.dashboard.template_statistics_client.get_template_statistics_for_service", return_value=mock_data
        )

        mocker.patch("app.main.views.dashboard.get_jobs_and_calculate_hard_bounces", return_value=jobs)
        mocker.patch("app.notification_api_client.get_notifications_for_service", return_value={"notifications": []})
        page = client_request.get(
            "main.problem_emails",
            service_id=service_one["id"],
        )

        # ensure the number of CSVs displayed on this page correspond to what is found in the jobs data
        assert "pe_filter=true" in page.select_one(".ajax-block-container .list.list-bullet").select_one("li a")["href"]
        assert "status=permanent-failure" in page.select_one(".ajax-block-container .list.list-bullet").select_one("li a")["href"]
