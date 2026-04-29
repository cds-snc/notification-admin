import re
from typing import Optional
from urllib.parse import urlparse

from locust.clients import HttpSession

CSRF_TOKEN_PATTERN = re.compile(r'name=["\']csrf_token["\'][^>]*value=["\']([^"\']+)["\']', re.IGNORECASE)


class AuthError(RuntimeError):
    pass


def _extract_csrf_token(html: str) -> Optional[str]:
    # Some app environments/templates do not render CSRF hidden inputs.
    # For those cases we continue without a token.
    match = CSRF_TOKEN_PATTERN.search(html)
    if match:
        return match.group(1)
    return None


def _path_only(url: str) -> str:
    parsed = urlparse(url)
    return parsed.path + (f"?{parsed.query}" if parsed.query else "")


def _compact_html_snippet(html: str, max_len: int = 220) -> str:
    return " ".join(html.split())[:max_len]


def login_admin_session(
    client: HttpSession,
    email: str,
    password: str,
    two_factor_code: str,
    require_csrf: bool = True,
) -> None:
    landing_path = "/accounts"
    csrf_2fa = None

    sign_in_page = client.get("/sign-in", name="auth:GET /sign-in")
    if sign_in_page.status_code != 200:
        raise AuthError(f"Unexpected /sign-in response status={sign_in_page.status_code}")

    csrf = _extract_csrf_token(sign_in_page.text)
    if require_csrf and not csrf:
        snippet = _compact_html_snippet(sign_in_page.text)
        raise AuthError(
            "Missing csrf_token on /sign-in page. "
            f"url={sign_in_page.url} status={sign_in_page.status_code} body_snippet='{snippet}'"
        )

    sign_in_data = {
        "email_address": email,
        "password": password,
    }
    if csrf:
        sign_in_data["csrf_token"] = csrf

    sign_in_resp = client.post(
        "/sign-in",
        data=sign_in_data,
        allow_redirects=False,
        name="auth:POST /sign-in",
    )

    if sign_in_resp.status_code not in (302, 303):
        raise AuthError(f"Sign-in did not redirect as expected, status={sign_in_resp.status_code}")

    location = sign_in_resp.headers.get("Location", "")
    if not location:
        raise AuthError("Sign-in redirect location missing")

    if "/two-factor-" in location:
        challenge_path = _path_only(location)
        challenge_page = client.get(challenge_path, name="auth:GET 2FA challenge")
        csrf_2fa = _extract_csrf_token(challenge_page.text)
        if require_csrf and not csrf_2fa:
            snippet = _compact_html_snippet(challenge_page.text)
            raise AuthError(
                "Missing csrf_token on 2FA challenge page. "
                f"path={challenge_path} status={challenge_page.status_code} body_snippet='{snippet}'"
            )

        verify_data = {
            "two_factor_code": two_factor_code,
        }
        if csrf_2fa:
            verify_data["csrf_token"] = csrf_2fa

        verify_resp = client.post(
            challenge_path,
            data=verify_data,
            allow_redirects=False,
            name="auth:POST 2FA verify",
        )

        if verify_resp.status_code not in (302, 303, 200):
            raise AuthError(f"2FA verification failed, status={verify_resp.status_code}")

    # Follow requested sequence: sign-in -> 2FA -> agree-terms -> dashboard.
    # First try with the most recently issued form token from 2FA.
    agree_data = {"next": landing_path}
    if csrf_2fa:
        agree_data["csrf_token"] = csrf_2fa

    agree_resp = client.post(
        "/agree-terms",
        data=agree_data,
        allow_redirects=False,
        name="auth:POST /agree-terms",
    )

    # Some environments may require a fresh CSRF token from the terms-rendered page.
    if agree_resp.status_code == 400:
        landing_page = client.get(landing_path, name="auth:GET accounts pre-terms")
        terms_csrf = _extract_csrf_token(landing_page.text)
        if require_csrf and not terms_csrf:
            snippet = _compact_html_snippet(landing_page.text)
            raise AuthError(
                "Agree-terms rejected and no csrf_token found on terms prompt page. "
                f"path={landing_path} status={landing_page.status_code} body_snippet='{snippet}'"
            )

        retry_agree_data = {"next": landing_path}
        if terms_csrf:
            retry_agree_data["csrf_token"] = terms_csrf
        agree_resp = client.post(
            "/agree-terms",
            data=retry_agree_data,
            allow_redirects=False,
            name="auth:POST /agree-terms (retry)",
        )

    if agree_resp.status_code not in (200, 302, 303):
        raise AuthError(f"Agree terms failed, status={agree_resp.status_code}")

    final = client.get(landing_path, name="auth:GET accounts verify")
    if final.status_code != 200:
        raise AuthError(f"Session verification failed on accounts page, status={final.status_code}")
