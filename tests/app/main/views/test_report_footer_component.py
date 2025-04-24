from tests.conftest import normalize_spaces


def test_report_footer_example_1(client_request):
    """Test report_footer example 1: Component with 1 ready and 1 deleted report"""
    page = client_request.get("main.storybook", component="report-footer", _test_page_title=False)

    # Find the example using data-testid
    example_section = page.select('[data-testid="example-1"]')[0]

    # Check for status text showing 1 ready and 1 deleted report
    status_text = example_section.select_one(".text-gray-grey1")
    assert "1 ready and 1 deleted" in normalize_spaces(status_text.text)

    # Check that the button is enabled (not disabled)
    button = example_section.select_one("button")
    assert "Prepare report" in button.text
    assert "disabled" not in button.attrs
    assert example_section.select_one(".loading-spinner-large") is None


def test_report_footer_example_2(client_request):
    """Test report_footer example 2: Component when a report is being prepared"""
    page = client_request.get("main.storybook", component="report-footer", _test_page_title=False)

    # Find the example using data-testid
    example_section = page.select('[data-testid="example-2"]')[0]

    # Check for status text showing 1 preparing, 1 ready, and 1 deleted report
    status_text = example_section.select_one(".text-gray-grey1")
    assert "1 preparing, 1 ready and 1 deleted" in normalize_spaces(status_text.text)

    # Check that the button is disabled and the loading spinner is shown
    button = example_section.select_one("button")
    assert "disabled" in button.attrs
    assert example_section.select_one(".loading-spinner-large") is not None


def test_report_footer_example_3(client_request):
    """Test report_footer example 3: Component with reports preparing"""
    page = client_request.get("main.storybook", component="report-footer", _test_page_title=False)

    # Find the example using data-testid
    example_section = page.select('[data-testid="example-3"]')[0]

    # Check status text shows preparing reports
    status_text = example_section.select_one(".text-gray-grey1")
    assert status_text is not None
    assert "1 preparing and 2 ready" in normalize_spaces(status_text.text)

    # Check button state or other attributes specific to this example
    button = example_section.select_one("button")
    assert "disabled" in button.attrs
    assert example_section.select_one(".loading-spinner-large") is not None


def test_report_footer_example_4(client_request):
    """Test report_footer example 4: Component with no reports (empty state)"""
    page = client_request.get("main.storybook", component="report-footer", _test_page_title=False)

    # Find the example using data-testid
    example_section = page.select('[data-testid="example-4"]')[0]

    # Check that there's no status text when there are no reports
    status_text = example_section.select_one(".text-gray-grey1")
    assert status_text is None

    # Check that the button is enabled
    button = example_section.select_one("button")
    assert "disabled" not in button.attrs

    # Check that the loading spinner is not shown
    assert example_section.select_one(".loading-spinner-large") is None


def test_report_footer_example_5(client_request):
    """Test report_footer example 5: Component with 1 ready report"""
    page = client_request.get("main.storybook", component="report-footer", _test_page_title=False)

    # Find the example using data-testid
    example_section = page.select('[data-testid="example-5"]')[0]

    # Check for status text showing 1 ready report
    status_text = example_section.select_one(".text-gray-grey1")
    assert "1 ready" in normalize_spaces(status_text.text)

    # Check that the Visit delivery reports link is visible
    link = example_section.select_one("a")
    assert "Visit delivery reports" in link.text


def test_report_footer_example_6(client_request):
    """Test report_footer example 6: Component with 2 ready reports"""
    page = client_request.get("main.storybook", component="report-footer", _test_page_title=False)

    # Find the example using data-testid
    example_section = page.select('[data-testid="example-6"]')[0]

    # Check for status text showing 2 ready reports
    status_text = example_section.select_one(".text-gray-grey1")
    assert "2 ready" in normalize_spaces(status_text.text)

    # Check that the Visit delivery reports link is visible
    link = example_section.select_one("a")
    assert "Visit delivery reports" in link.text
