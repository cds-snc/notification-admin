import pytest

from app.models.user import User
from app.salesforce.salesforce_contact import create


@pytest.fixture
def user():
    return User(
        {
            "id": 2,
            "name": "Samwise Gamgee",
            "email_address": "samwise@fellowship.ca",
            "mobile_number": "123-456-7890",
            "platform_admin": False,
        }
    )


def test_create(mocker, app_, user):
    with app_.app_context():
        mock_get_session = mocker.patch("app.salesforce.salesforce_contact.get_session")
        mock_get_session.return_value.Contact.create.return_value = {"success": True}
        assert create(user) is True
        mock_get_session.return_value.Contact.create.assert_called_with(
            {
                "FirstName": "Samwise",
                "LastName": "Gamgee",
                "Email": "samwise@fellowship.ca",
                "Phone": "123-456-7890",
                "AccountId": None,
            }
        )


def test_create_no_session(mocker, app_, user):
    with app_.app_context():
        mocker.patch("app.salesforce.salesforce_contact.get_session", return_value=None)
        assert create(user) is False


def test_create_error(mocker, app_, user):
    with app_.app_context():
        mock_get_session = mocker.patch("app.salesforce.salesforce_contact.get_session")
        mock_get_session.return_value.Contact.create.return_value = {"success": False}
        assert create(user) is False


def test_create_exception(mocker, app_, user):
    with app_.app_context():
        mock_get_session = mocker.patch("app.salesforce.salesforce_contact.get_session")
        mock_get_session.return_value.Contact.create.side_effect = Exception()
        assert create(user) is False
