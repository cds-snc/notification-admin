import os

from app.models.user import User
from mixpanel import Mixpanel  # type: ignore


class MixpanelInitializationError(Exception):
    """raised when MIXPANEL_PROJECT_TOKEN environment varaible is not set"""


class NotifyMixpanel:
    def __new__(klazz, user: User = None):
        if not os.environ.get("MIXPANEL_PROJECT_TOKEN"):
            raise MixpanelInitializationError

        return super(NotifyMixpanel, klazz).__new__(klazz)

    def __init__(self, user: User = None) -> None:
        super().__init__()

        self.mixpanel: Mixpanel = Mixpanel(os.environ.get("MIXPANEL_PROJECT_TOKEN"))
        self.user = user

    def track_event(self, msg="Notify: Sent message") -> None:
        if self.user:
            self.mixpanel.track(self.user.email_address, msg, {"product": "Notify"})

    def track_user_profile(self) -> None:
        if self.user:
            profile = {
                "$first_name": self.user.name.split()[0],
                "$last_name": self.user.name.split()[-1],
                "$email": self.user.email_address,
            }
            self.mixpanel.people_set(self.user.email_address, profile, meta={"product": "Notify"})
