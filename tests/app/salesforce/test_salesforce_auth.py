from simple_salesforce.exceptions import SalesforceAuthenticationFailed

from app.salesforce.salesforce_auth import get_session


def test_get_session(mocker, app_):
    with app_.app_context():
        mocker.patch.dict(
            "flask.current_app.config",
            {
                "SALESFORCE_CLIENT_ID": "client_id",
                "SALESFORCE_USERNAME": "username",
                "SALESFORCE_CLIENT_KEY": "client_key",
                "SALESFORCE_CLIENT_PRIVATEKEY": "cHJpdmF0ZWtleQo=",
                "SALESFORCE_DOMAIN": "domain",
            },
        )
        mock_salesforce = mocker.patch("app.salesforce.salesforce_auth.Salesforce", return_value="sf")
        assert get_session() == mock_salesforce.return_value
        mock_salesforce.assert_called_with(
            client_id="client_id", username="username", consumer_key="client_key", privatekey=b"privatekey\n", domain="domain"
        )


def test_get_session_auth_failure(mocker, app_):
    with app_.app_context():
        mocker.patch("app.salesforce.salesforce_auth.Salesforce", side_effect=SalesforceAuthenticationFailed("aw", "dang"))
        assert get_session() == None


def test_get_session_uncaught_exception(mocker, app_):
    with app_.app_context():
        mocker.patch("app.salesforce.salesforce_auth.Salesforce", side_effect=ValueError())
        assert get_session() == None
