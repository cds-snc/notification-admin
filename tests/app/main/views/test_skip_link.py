def test_gc_header_skip_link_present(
    client_request,
):
    """Test that gc_header partial contains a functioning skip link."""
    # Test on a simple page that doesn't require API calls
    page = client_request.get("main.welcome")

    # Find skip link in gc_header partial
    skip_link = page.find("a", href="#main_content")

    assert skip_link is not None, "Skip link not found in gc_header"
    assert "Skip to main content" in skip_link.get_text()
    assert "skiplink" in skip_link.get("class", [])

    # Verify the target exists
    main_content = page.find(id="main_content")
    assert main_content is not None, "Skip link target '#main_content' not found"
