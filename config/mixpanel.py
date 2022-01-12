import os

from flask import current_app
from mixpanel import Mixpanel  # type: ignore

from app.models.user import User


class NotifyMixpanel:

    def __check_mixpanel(cls):  # type: ignore
        if not os.environ.get("MIXPANEL_PROJECT_TOKEN"):
            current_app.logger.warning(
                "MIXPANEL_PROJECT_TOKEN is not set. Mixpanel features will not be supported."
                "In order to enable Mixpanel, set MIXPANEL_PROJECT_TOKEN environment variable."
            )
            return False
        else:
            return True

    __enabled = __check_mixpanel()

    def __init__(self) -> None:
        super().__init__()

        self.mixpanel: Mixpanel = Mixpanel(os.environ.get("MIXPANEL_PROJECT_TOKEN", ""))

    def __mixpanel_enabled(callable):
        def wrapper(*args, **kwargs):
            if NotifyMixpanel.__enabled:
                callable(*args, **kwargs)

        return wrapper

    @__mixpanel_enabled  # type: ignore
    def track_event(self, user: User, msg="Notify: Sent message") -> None:
        self.mixpanel.track(user.email_address, msg, {"product": "Notify"})

    @__mixpanel_enabled  # type: ignore
    def track_user_profile(self, user: User) -> None:
        profile = {
            "$first_name": user.name.split()[0],
            "$last_name": user.name.split()[-1],
            "$email": user.email_address,
        }
        self.mixpanel.people_set(user.email_address, profile, meta={"product": "Notify"})
