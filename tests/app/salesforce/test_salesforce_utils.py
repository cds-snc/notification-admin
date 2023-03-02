from app.salesforce.salesforce_utils import get_name_parts


def test_get_name_parts():
    assert get_name_parts("Frodo Baggins") == {"first": "Frodo", "last": "Baggins"}
    assert get_name_parts("Smaug") == {"first": "Smaug", "last": None}
    assert get_name_parts("") == {"first": None, "last": None}
    assert get_name_parts("Gandalf The Grey") == {"first": "Gandalf", "last": "The Grey"}
