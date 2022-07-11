import os

import pytest

from app.models.user import User
from config.mixpanel import NotifyMixpanel


@pytest.fixture(autouse=True)
def environment_vars_fixtures(app_):
    with app_.app_context():
        environment_vars = os.environ.copy()
        os.environ["MIXPANEL_PROJECT_TOKEN"] = "project_token_from_mixpanel"

        yield

        os.environ = environment_vars


def test_when_mixpanel_project_token_is_not_set(mocker, environment_vars_fixtures):
    os.environ["MIXPANEL_PROJECT_TOKEN"] = ""

    mocked_current_app_logger_warning_fxn = mocker.patch("flask.current_app.logger.warning")
    NotifyMixpanel()
    mocked_current_app_logger_warning_fxn.assert_called_once()


def test_when_mixpanel_project_token_is_set(mocker, environment_vars_fixtures):
    mocked_current_app_logger_warning_fxn = mocker.patch("flask.current_app.logger.warning")
    NotifyMixpanel()

    mocked_current_app_logger_warning_fxn.assert_not_called()


def test_track_mixpanel_user_profile_when_user_is_not_present(mocker, environment_vars_fixtures):
    mocked_mixpanel_people_set_fxn = mocker.patch("mixpanel.Mixpanel.people_set")
    NotifyMixpanel().track_user_profile(None)

    mocked_mixpanel_people_set_fxn.assert_not_called()


def test_track_mixpanel_user_profile(mocker, active_user_with_permissions, environment_vars_fixtures):
    mocked_mixpanel_people_set_fxn = mocker.patch("mixpanel.Mixpanel.people_set")
    user = User(active_user_with_permissions)
    NotifyMixpanel().track_user_profile(user)

    mocked_mixpanel_people_set_fxn.assert_called_once()


def test_track_mixpanel_event_when_user_is_not_present(mocker, environment_vars_fixtures):
    mocked_mixpanel_track_fxn = mocker.patch("mixpanel.Mixpanel.track")
    NotifyMixpanel().track_event(None)

    mocked_mixpanel_track_fxn.assert_not_called()


def test_track_mixpanel_event(mocker, active_user_with_permissions, environment_vars_fixtures):
    mocked_mixpanel_track_fxn = mocker.patch("mixpanel.Mixpanel.track")
    user = User(active_user_with_permissions)
    NotifyMixpanel().track_event(user)

    mocked_mixpanel_track_fxn.assert_called_once()
