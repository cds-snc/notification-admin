import os
import flask

from app.models.user import User
from mixpanel import Mixpanel  # type: ignore


class NotifyMixpanel:
    def _check_mixpanel() -> bool:
        if not os.environ.get("MIXPANEL_PROJECT_TOKEN"):
            flask.current_app.logger.warning(
                "MIXPANEL_PROJECT_TOKEN is not set. Mixpanel features will not be supported."
                "In order to enable Mixpanel, set MIXPANEL_PROJECT_TOKEN environment variable."
            )
            return False
        else:
            return True

    def __init__(self) -> None:
        super().__init__()

        self.mixpanel: Mixpanel = Mixpanel(os.environ.get("MIXPANEL_PROJECT_TOKEN", ""))
        self._enabled = self._check_mixpanel()

    def track_event(self, user: User, msg="Notify: Sent message") -> None:
        if self._enabled:
            self.mixpanel.track(user.email_address, msg, {"product": "Notify"})

    def track_user_profile(self, user: User) -> None:
        if self._enabled:
            profile = {
                "$first_name": user.name.split()[0],
                "$last_name": user.name.split()[-1],
                "$email": user.email_address,
            }
            self.mixpanel.people_set(user.email_address, profile, meta={"product": "Notify"})
