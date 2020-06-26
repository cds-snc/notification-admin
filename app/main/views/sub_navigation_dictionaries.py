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
                {
                    "name": "Template Formatting",
                    "link": "main.features_templates",
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
    ]
