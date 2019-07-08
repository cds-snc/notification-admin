def features_nav():
    return [
        {
            "name": "Features",
            "link": "main.features",
            "sub_navigation_items": [
                {
                    "name": "Emails",
                    "link": "main.features_email",
                },
                {
                    "name": "Text messages",
                    "link": "main.features_sms",
                },
            ]
        }
    ]


def pricing_nav():
    return [
        {
            "name": "Pricing",
            "link": "main.pricing",
        },
        {
            "name": "How to pay",
            "link": "main.how_to_pay",
        },
    ]
