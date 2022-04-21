from flask import session

from app.models.user import User
from config.mixpanel import NotifyMixpanel


class Authenticator:
    def __init__(self, user_id):
        self.user = User.from_id(user_id)
        self.mixpanel = NotifyMixpanel()

    def __enter__(self) -> User:
        # the user will have a new current_session_id set by the API - store it in the cookie for future requests
        session["current_session_id"] = self.user.current_session_id

        # Check if coming from new password page
        if "password" in session.get("user_details", {}) and "loginData" in session.get("user_details", {}):
            self.user.update_password(session["user_details"]["password"], session["user_details"]["loginData"])

        self.user.activate()
        self.user.login()

        return self.user

    def __exit__(self, _exec_type, _exec_value, _traceback) -> None:
        self.mixpanel.track_user_profile(self.user)
        self.mixpanel.track_event(self.user, "Notify: Logged in")

        # get rid of anything in the session that we don't expect to have been set during register/sign in flow
        session.pop("user_details", None)
        session.pop("file_uploads", None)
