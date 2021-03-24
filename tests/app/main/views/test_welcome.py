from bs4 import BeautifulSoup
from flask import url_for


def test_should_render_welcome(
    client,
    mocker,
    api_user_active,
    mock_get_user_by_email,
    mock_send_verify_email,
):
    with client.session_transaction() as session:
        session['user_details'] = {
            'id': api_user_active['id'],
            'email': api_user_active['email_address']}
    response = client.get(url_for('main.welcome'))
    assert response.status_code == 200

    page = BeautifulSoup(response.data.decode('utf-8'), 'html.parser')

    assert page.h1.string == 'Welcome to GC Notify'
    expected = "Create your first service"
    link_text = page.find_all('a', {'class': 'button'})[0].text
    assert link_text == expected
