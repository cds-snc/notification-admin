from werkzeug.routing import BaseConverter


class SafeIdConverter(BaseConverter):
    """Restricts a URL segment to safe identifier characters (letters, digits, hyphens, underscores).

    Used for path segments (e.g. subscriber_id) that are opaque tokens rather than free text, so that
    encoded/malformed values (query strings, path traversal, etc.) are rejected with a 404 at the
    routing level instead of being passed through to view functions and downstream API calls.
    """

    regex = r"[A-Za-z0-9_-]+"
