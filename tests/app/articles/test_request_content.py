import requests_mock
from flask import current_app

from app.articles import request_content


# pytest ./tests/app/articles/test_request_content.py -k test_request_content
def test_request_content(app_, mocker, capsys):
    with app_.test_request_context():
        mocker.patch("app.get_current_locale", return_value="en")
        mocker.patch.dict("app.current_app.config", values={"GC_ARTICLES_API": "articles.cdssandbox.xyz/notification-gc-notify"})
        with requests_mock.mock() as mock:
            base_endpoint = current_app.config["GC_ARTICLES_API"]
            endpoint = "pages"
            response_json = {"title": {"rendered": "The Title"}, "content": {"rendered": "The Content"}}
            mock.request("GET", endpoint, json=response_json, status_code=200)

            response = request_content(endpoint, {"slug": "mypage"})

            print(response)

            assert mock.called
            assert mock.request_history[0].url == f"https://{base_endpoint}/wp-json/{endpoint}?slug=mypage"

            if response is not None:
                assert response["title"]["rendered"] == "The Title"
                assert response["content"]["rendered"] == "The Content"
