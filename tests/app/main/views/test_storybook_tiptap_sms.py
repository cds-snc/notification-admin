def test_storybook_tiptap_sms_renders_restricted_editor(client_request):
    page = client_request.get("main.storybook", component="text-editor-tiptap-sms", _test_page_title=False)

    assert page.select_one("#tiptap-editor-tiptap-editor-sms") is not None
    assert page.select_one("input#tiptap-editor-sms") is not None

    # The loader script must tell the React component to use the restricted "sms" mode
    scripts = " ".join(script.text for script in page.select("script"))
    assert "'sms'" in scripts
