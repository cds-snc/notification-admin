def test_storybook_renders_tiptap_editor(app_):
    """Request the storybook page for the tiptap editor and assert it contains the editor mount."""
    with app_.test_client() as client:
        resp = client.get("/_storybook?component=text-editor-tiptap")
        assert resp.status_code == 200
        html = resp.get_data(as_text=True)

    # The storybook page uses the tiptap_editor macro which mounts an element with id 'tiptap-editor' or includes tiptap script
    assert "tiptap-editor-tiptap-editor" in html and "tiptap.min.js" in html
