import pytest
from freezegun import freeze_time

from app.main.forms import ChooseTimeForm


@freeze_time("2016-01-01 11:09:00.061258")
def test_form_contains_next_24h(app_):
    choices = ChooseTimeForm().scheduled_for.choices

    # Friday
    assert choices[0] == ("", "Now")
    assert choices[1] == ("2016-01-01T12:00:00.061258", "Today at midday")
    assert choices[13] == ("2016-01-02T00:00:00.061258", "Today at midnight")

    # Saturday
    assert choices[14] == ("2016-01-02T01:00:00.061258", "Tomorrow at 1am")
    assert choices[37] == ("2016-01-03T00:00:00.061258", "Tomorrow at midnight")

    # Sunday
    assert choices[38] == ("2016-01-03T01:00:00.061258", "Sunday at 1am")

    # Monday
    assert choices[84] == ("2016-01-04T23:00:00.061258", "Monday at 11pm")
    assert choices[85] == ("2016-01-05T00:00:00.061258", "Monday at midnight")

    with pytest.raises(IndexError):
        assert choices[12 + (3 * 24) + 2]  # hours left in the day  # 3 days  # magic number


@freeze_time("2016-01-01 11:09:00.061258")
def test_form_defaults_to_now(app_):
    assert ChooseTimeForm().scheduled_for.data == ""


@freeze_time("2016-01-01 11:09:00.061258")
def test_form_contains_next_three_days(app_):
    assert ChooseTimeForm().scheduled_for.categories == [
        "Later today",
        "Tomorrow",
        "Sunday",
        "Monday",
    ]
