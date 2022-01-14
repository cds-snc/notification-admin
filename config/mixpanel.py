import os

from flask import current_app
from mixpanel import Mixpanel  # type: ignore

from app.models.user import User


class NotifyMixpanel():

    enabled = False

    def __init__(self) -> None:
        super().__init__()
        self.token = os.environ.get("MIXPANEL_PROJECT_TOKEN")
        self.mixpanel = Mixpanel(self.token)
        if not self.token:
            current_app.logger.warning(
                "MIXPANEL_PROJECT_TOKEN is not set. Mixpanel features will not be supported."
                "In order to enable Mixpanel, set MIXPANEL_PROJECT_TOKEN environment variable."
            )
            NotifyMixpanel.enabled = False
        else:
            NotifyMixpanel.enabled = True

    def __mixpanel_enabled(callable):
        def wrapper(*args, **kwargs):
            if NotifyMixpanel.enabled:
                callable(*args, **kwargs)
        return wrapper

    @__mixpanel_enabled  # type: ignore
    def track_event(self, user: User, msg="Notify: Sent message") -> None:
        if user:
            self.mixpanel.track(user.email_address, msg, {"product": "Notify"})

    @__mixpanel_enabled  # type: ignore
    def track_user_profile(self, user: User) -> None:
        if user:
            profile = {
                "$first_name": user.name.split()[0],
                "$last_name": user.name.split()[-1],
                "$email": user.email_address,
            }
            self.mixpanel.people_set(user.email_address, profile, meta={"product": "Notify"})
