service = [{'service_id': 1, 'service_name': 'jessie the oak tree',
            'organisation_name': 'Forest', 'consent_to_research': True,
            'contact_name': 'Forest fairy', 'organisation_type': 'Ecosystem',
            'contact_email': 'forest.fairy@digital.cabinet-office.canada.ca',
            'contact_mobile': '+16132532223', 'live_date': 'Sat, 29 Mar 2014 00:00:00 GMT',
            'sms_volume_intent': 100, 'email_volume_intent': 50, 'letter_volume_intent': 20,
            'sms_totals': 300, 'email_totals': 1200, 'letter_totals': 0,
            'free_sms_fragment_limit': 100}]


def test_owasp_useful_headers_set(
    client,
    mocker,
    mock_get_service_and_organisation_counts,
):
    mocker.patch('app.get_logo_cdn_domain', return_value='static-logos.test.com')
    mocker.patch(
        'app.service_api_client.get_live_services_data',
        return_value={'data': service}
    )
    mocker.patch(
        'app.service_api_client.get_stats_by_month',
        return_value={'data': [('2020-11-01', 'email', 20)]}
    )
    response = client.get('/')

    assert response.status_code == 200
    assert response.headers['X-Frame-Options'] == 'deny'
    assert response.headers['X-Content-Type-Options'] == 'nosniff'
    assert response.headers['X-XSS-Protection'] == '1; mode=block'
    assert response.headers['Content-Security-Policy'] == (
        "default-src 'self' static.example.com 'unsafe-inline';"
        "script-src 'self' static.example.com *.google-analytics.com *.googletagmanager.com 'unsafe-inline' 'unsafe-eval' data:;"
        "connect-src 'self' *.google-analytics.com;"
        "object-src 'self';"
        "style-src 'self' *.googleapis.com 'unsafe-inline';"
        "font-src 'self' static.example.com *.googleapis.com *.gstatic.com data:;"
        "img-src "
        "'self' static.example.com *.google-analytics.com *.notifications.service.gov.uk static-logos.test.com notification-alpha-canada-ca-cdn.s3.amazonaws.com data:;"  # noqa: E501
        "frame-src 'self' www.youtube.com;"
    )


def test_headers_non_ascii_characters_are_replaced(
    client,
    mocker,
    mock_get_service_and_organisation_counts,
):
    mocker.patch('app.get_logo_cdn_domain', return_value='static-logos€æ.test.com')
    mocker.patch('app.service_api_client.get_live_services_data', return_value={'data': service})
    mocker.patch(
        'app.service_api_client.get_stats_by_month',
        return_value={'data': [('2020-11-01', 'email', 20)]}
    )
    response = client.get('/')

    assert response.status_code == 200
    assert response.headers['Content-Security-Policy'] == (
        "default-src 'self' static.example.com 'unsafe-inline';"
        "script-src 'self' static.example.com *.google-analytics.com *.googletagmanager.com 'unsafe-inline' 'unsafe-eval' data:;"
        "connect-src 'self' *.google-analytics.com;"
        "object-src 'self';"
        "style-src 'self' *.googleapis.com 'unsafe-inline';"
        "font-src 'self' static.example.com *.googleapis.com *.gstatic.com data:;"
        "img-src "
        "'self' static.example.com *.google-analytics.com *.notifications.service.gov.uk static-logos??.test.com notification-alpha-canada-ca-cdn.s3.amazonaws.com data:;"  # noqa: E501
        "frame-src 'self' www.youtube.com;"
    )
