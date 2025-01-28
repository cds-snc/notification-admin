from app.s3_client.s3_gc_organisations_client import parse_gc_organisations_data


def test_parse_gc_organisations_data_sorts_alphabetically(mocker, app_):
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
    parsed_data = parse_gc_organisations_data(test_data)
    assert parsed_data["all"] == test_data
    assert parsed_data["names"] == {"en": ["ABC", "CDS", "TBS"], "fr": ["ÉASDF", "SCT", "SNC"]}


def test_parse_gc_organisations_data_returns_empty_dict(mocker, app_):
    test_data = None
    parsed_data = parse_gc_organisations_data(test_data)
    assert parsed_data["all"] == []
    assert parsed_data["names"] == {}
