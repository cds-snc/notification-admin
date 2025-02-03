from app.s3_client.s3_gc_organisations_client import get_gc_organisations_from_s3, parse_gc_organisations_data
from tests.conftest import set_config


def test_parse_gc_organisations_data_sorts_alphabetically():
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


def test_parse_gc_organisations_data_returns_empty_dict():
    test_data = None
    parsed_data = parse_gc_organisations_data(test_data)
    assert parsed_data["all"] == []
    assert parsed_data["names"] == {}


def test_get_gc_organisations_from_s3_uses_fallback(app_):
    with set_config(app_, "GC_ORGANISATIONS_BUCKET_NAME", None):
        org_data = get_gc_organisations_from_s3(app_)
        assert len(org_data) > 0
        assert "Canadian Space Agency" in [x["name_eng"] for x in org_data]
        assert "Office des transports du Canada" in [x["name_fra"] for x in org_data]
