from unittest.mock import call

from app.salesforce import salesforce_account


def test_get_accounts_requests_correct_url(mocker, app_):
    with app_.app_context():
        mock_request = mocker.patch("app.salesforce.salesforce_account.requests.get")
    salesforce_account.get_accounts("www.test_url.ca", "secret_token", app_.logger)
    calls = [call("www.test_url.ca", headers={"Authorization": "token secret_token"})]
    mock_request.assert_has_calls(calls)


def test_get_accounts_sorts_alphabetically(mocker, app_):
    test_data = [
        {
            "id": "1234",
            "name_eng": "CDS",
            "name_fra": "SNC",
        },
        {
            "id": "2234",
            "name_eng": "TBS",
            "name_fra": "SCT",
        },
        {"id": "3456", "name_eng": "ABC", "name_fra": "ÉASDF"},
    ]
    with app_.app_context():
        mocker.patch("app.salesforce.salesforce_account.requests.get")
    mocker.patch("app.salesforce.salesforce_account.json.loads", return_value=test_data)
    accounts = salesforce_account.get_accounts("www.test_url.ca", "secret_token", app_.logger)
    assert accounts["all"] == test_data
    assert accounts["names"] == {"en": ["ABC", "CDS", "TBS"], "fr": ["ÉASDF", "SCT", "SNC"]}


def test_get_accounts_returns_empty_dict(mocker, app_):
    test_data = None
    with app_.app_context():
        mocker.patch("app.salesforce.salesforce_account.requests.get")
    mocker.patch("app.salesforce.salesforce_account.json.loads", return_value=test_data)
    accounts = salesforce_account.get_accounts("www.test_url.ca", "secret_token", app_.logger)
    assert accounts["all"] == []
    assert accounts["names"] == {}
