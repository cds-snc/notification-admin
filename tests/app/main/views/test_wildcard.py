from bs4 import BeautifulSoup
import requests_mock


def test_should_return_wildcard_route_page(
    client,
):
    page = "gc-articles-page"
    nav_response = [{ "name": "GC Articles", "url" : page}]
    content_response = [
        {"title": {"rendered": "GC Articles"}, "content": {"rendered": "We’ve found the page"}},
    ]
    
    base_endpoint = "articles.cdssandbox.xyz/notification-gc-notify"
    nav_endpoint = f"https://{base_endpoint}/wp-json/menus/v1/menus/notify-admin"
    content_endpoint = f"https://{base_endpoint}/wp-json/wp/v2/pages?slug={page}"

    with requests_mock.mock() as rmock:
        rmock.request(
            "GET",
            nav_endpoint,
            json=nav_response,
            status_code=200,
        )

        rmock.request(
            "GET",
            content_endpoint,
            json=content_response,
            status_code=200,
        )

    # todo hook thus up properly
    response = client.get(page)
    assert response.status_code == 200

    page = BeautifulSoup(response.data.decode("utf-8"), "html.parser")
    message = page.find_all("p")[1].text
    assert message == "We’ve found the page!"
