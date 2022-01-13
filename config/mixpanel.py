import os

from flask import current_app
from mixpanel import Mixpanel  # type: ignore

from app.models.user import User


class MixpanelConf(type):
    def __new__(klazz, name, bases, namespace):
        conf = super().__new__(klazz, name, bases, namespace)
        if not os.environ.get("MIXPANEL_PROJECT_TOKEN"):
            current_app.logger.warning(
                "MIXPANEL_PROJECT_TOKEN is not set. Mixpanel features will not be supported."
                "In order to enable Mixpanel, set MIXPANEL_PROJECT_TOKEN environment variable."
            )
            conf.enabled = False
        else:
            conf.enabled = True

        return conf


class NotifyMixpanel(metaclass=MixpanelConf):
    def __init__(self) -> None:
        super().__init__()

        self.mixpanel: Mixpanel = Mixpanel(os.environ.get("MIXPANEL_PROJECT_TOKEN", ""))

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
