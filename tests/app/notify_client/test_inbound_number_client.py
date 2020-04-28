from app.notify_client.inbound_number_client import InboundNumberClient


def test_add_inbound_sms_number(mocker, api_user_active):
    inbound_number = '12345678901'
    expected_url = '/inbound-number/add'
    client = InboundNumberClient()

    mock_post = mocker.patch('app.notify_client.inbound_number_client.InboundNumberClient.post')

    client.add_inbound_sms_number(inbound_number)
    mock_post.assert_called_once_with(
        url=expected_url,
        data={'inbound_number': inbound_number}
    )
