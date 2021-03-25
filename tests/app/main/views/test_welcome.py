from bs4 import BeautifulSoup
from flask import url_for


def test_should_render_welcome(client):
    response = client.get(url_for('main.welcome'))
    assert response.status_code == 200

    page = BeautifulSoup(response.data.decode('utf-8'), 'html.parser')
    assert page.h1.string == 'Welcome to GC Notify'

    expected = "Create your first service"
    link_text = page.find_all('a', {'class': 'button'})[0].text
    assert link_text == expected
