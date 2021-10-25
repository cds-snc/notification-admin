import os
from typing import List

from dotenv import load_dotenv

load_dotenv()


if os.environ.get("VCAP_APPLICATION"):
    # on cloudfoundry, config is a json blob in VCAP_APPLICATION - unpack it, and populate
    # standard environment variables from it
    from app.cloudfoundry_config import extract_cloudfoundry_config

    extract_cloudfoundry_config()


class Config(object):
    LANGUAGES = ["en", "fr"]
    ADMIN_CLIENT_SECRET = os.environ.get("ADMIN_CLIENT_SECRET")
    API_HOST_NAME = os.environ.get("API_HOST_NAME")
    SECRET_KEY = os.environ.get("SECRET_KEY")
    DANGEROUS_SALT = os.environ.get("DANGEROUS_SALT")
    ZENDESK_API_KEY = os.environ.get("ZENDESK_API_KEY")
    CONTACT_EMAIL = os.environ.get("CONTACT_EMAIL", "assistance+notification@cds-snc.ca")
    SECURITY_EMAIL = os.environ.get("SECURITY_EMAIL", "security-securite@cds-snc.ca")
    SENDING_DOMAIN = os.environ.get("SENDING_DOMAIN", "notification.alpha.canada.ca")

    if os.environ.get("HEROKU_APP_NAME", "") != "":
        ADMIN_BASE_URL = "https://" + os.environ.get("HEROKU_APP_NAME", "") + ".herokuapp.com"
    else:
        ADMIN_BASE_URL = os.environ.get("ADMIN_BASE_URL", "http://localhost:6012")

    DOCUMENTATION_DOMAIN = os.getenv("DOCUMENTATION_DOMAIN", "documentation.notification.canada.ca")
    TEMPLATE_PREVIEW_API_HOST = os.environ.get("TEMPLATE_PREVIEW_API_HOST", "http://localhost:6013")
    TEMPLATE_PREVIEW_API_KEY = os.environ.get("TEMPLATE_PREVIEW_API_KEY", "my-secret-key")
    NOTIFY_SERVICE_ID = "d6aa2c68-a2d9-4437-ab19-3ae8eb202553"
    NOTIFY_USER_ID = "6af522d0-2915-4e52-83a3-3690455a5fe6"
    NOTIFY_TEMPLATE_PREFILL_SERVICE_ID = "93305b36-b0a0-4a34-9ab2-c1b7bb5ca489"
    NOTIFY_BAD_FILLER_UUID = "00000000-0000-0000-0000-000000000000"

    # List of allowed service IDs that are allowed to send HTML through their
    # templates.
    ALLOW_HTML_SERVICE_IDS: List[str] = [id.strip() for id in os.getenv("ALLOW_HTML_SERVICE_IDS", "").split(",")]

    # Hosted graphite statsd prefix
    STATSD_HOST = os.getenv("STATSD_HOST")
    STATSD_ENABLED = bool(STATSD_HOST)
    STATSD_PORT = 8_125
    STATSD_PREFIX = os.getenv("STATSD_PREFIX")

    # Logging
    DEBUG = False
    NOTIFY_LOG_PATH = os.getenv("NOTIFY_LOG_PATH")

    ADMIN_CLIENT_USER_NAME = "notify-admin"

    ANTIVIRUS_API_HOST = os.environ.get("ANTIVIRUS_API_HOST")
    ANTIVIRUS_API_KEY = os.environ.get("ANTIVIRUS_API_KEY")

    ASSETS_DEBUG = False
    AWS_REGION = os.environ.get("AWS_REGION", "us-east-1")
    DEFAULT_LIVE_SERVICE_LIMIT = int(os.environ.get("DEFAULT_LIVE_SERVICE_LIMIT", 10_000))
    DEFAULT_SERVICE_LIMIT = int(os.environ.get("DEFAULT_SERVICE_LIMIT", 50))
    DEFAULT_FREE_SMS_FRAGMENT_LIMITS = {
        "central": 25_000,
        "local": 25_000,
        "nhs_central": 250_000,
        "nhs_local": 25_000,
        "nhs_gp": 25_000,
        "emergency_service": 25_000,
        "school_or_college": 25_000,
        "other": 25_000,
    }
    EMAIL_EXPIRY_SECONDS = 3600  # 1 hour
    INVITATION_EXPIRY_SECONDS = 3_600 * 24 * 2  # 2 days - also set on api
    EMAIL_2FA_EXPIRY_SECONDS = 1_800  # 30 Minutes
    HEADER_COLOUR = "#FFBF47"  # $yellow
    HTTP_PROTOCOL = "http"
    MAX_FAILED_LOGIN_COUNT = 10
    NOTIFY_APP_NAME = "admin"
    NOTIFY_LOG_LEVEL = "DEBUG"
    PERMANENT_SESSION_LIFETIME = 20 * 60 * 60  # 20 hours
    SEND_FILE_MAX_AGE_DEFAULT = 365 * 24 * 60 * 60  # 1 year
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_NAME = "notify_admin_session"
    SESSION_COOKIE_SECURE = True
    SESSION_REFRESH_EACH_REQUEST = True
    SHOW_STYLEGUIDE = os.getenv("SHOW_STYLEGUIDE", "False")
    WTF_CSRF_ENABLED = True
    WTF_CSRF_TIME_LIMIT = None
    CSV_UPLOAD_BUCKET_NAME = os.getenv("CSV_UPLOAD_BUCKET_NAME", "notification-alpha-canada-ca-csv-upload")
    ACTIVITY_STATS_LIMIT_DAYS = 7
    TEST_MESSAGE_FILENAME = "Report"
    NOTIFY_ENVIRONMENT = "development"
    LOGO_UPLOAD_BUCKET_NAME = os.getenv("ASSET_UPLOAD_BUCKET_NAME", "notification-alpha-canada-ca-asset-upload")
    ASSET_DOMAIN = os.getenv("ASSET_DOMAIN", "assets.notification.canada.ca")
    MOU_BUCKET_NAME = os.getenv("MOU_BUCKET_NAME", "")
    ROUTE_SECRET_KEY_1 = os.environ.get("ROUTE_SECRET_KEY_1", "")
    ROUTE_SECRET_KEY_2 = os.environ.get("ROUTE_SECRET_KEY_2", "")
    CHECK_PROXY_HEADER = False

    REDIS_URL = os.environ.get("REDIS_URL")
    REDIS_ENABLED = os.environ.get("REDIS_ENABLED") == "1"
    ASSET_PATH = "/static/"

    NOTIFY_LOG_PATH = ""

    HIPB_ENABLED = True

    IP_GEOLOCATE_SERVICE = os.environ.get("IP_GEOLOCATE_SERVICE", "").rstrip("/")

    BULK_SEND_AWS_BUCKET = os.getenv("BULK_SEND_AWS_BUCKET")
    HC_EN_SERVICE_ID = os.getenv("HC_EN_SERVICE_ID")
    HC_FR_SERVICE_ID = os.getenv("HC_FR_SERVICE_ID")
    BULK_SEND_TEST_SERVICE_ID = os.getenv("BULK_SEND_TEST_SERVICE_ID")
    CSV_MAX_ROWS = os.getenv("CSV_MAX_ROWS", 50_000)
    CSV_MAX_ROWS_BULK_SEND = os.getenv("CSV_MAX_ROWS_BULK_SEND", 100_000)

    FREE_YEARLY_SMS_LIMIT = int(os.getenv("FREE_YEARLY_SMS_LIMIT", 25_000))
    FREE_YEARLY_EMAIL_LIMIT = int(os.getenv("FREE_YEARLY_EMAIL_LIMIT", 10_000_000))

    # Feature Flags
    BULK_INSERTION = os.getenv("BULK_INSERTION", False)


class Development(Config):
    DEBUG = True
    SESSION_COOKIE_SECURE = False
    SESSION_PROTECTION = None
    MOU_BUCKET_NAME = "notify.tools-mou"
    ADMIN_CLIENT_SECRET = os.environ.get("ADMIN_CLIENT_SECRET", "dev-notify-secret-key")
    API_HOST_NAME = os.environ.get("API_HOST_NAME", "http://localhost:6011")
    DANGEROUS_SALT = os.environ.get("DANGEROUS_SALT", "dev-notify-salt")
    SECRET_KEY = os.environ.get("SECRET_KEY", "dev-notify-secret-key")
    ANTIVIRUS_API_HOST = "http://localhost:6016"
    ANTIVIRUS_API_KEY = "test-key"
    REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379/0")


class Test(Development):
    DEBUG = True
    TESTING = True
    WTF_CSRF_ENABLED = False
    MOU_BUCKET_NAME = "test-mou"
    NOTIFY_ENVIRONMENT = "test"
    ADMIN_CLIENT_SECRET = os.environ.get("ADMIN_CLIENT_SECRET", "dev-notify-secret-key")
    API_HOST_NAME = os.environ.get("API_HOST_NAME", "http://localhost:6011")
    DANGEROUS_SALT = os.environ.get("DANGEROUS_SALT", "dev-notify-salt")
    SECRET_KEY = "dev-notify-secret-key"
    TEMPLATE_PREVIEW_API_HOST = "http://localhost:9999"
    TEMPLATE_PREVIEW_API_KEY = "dev-notify-secret-key"
    ANTIVIRUS_API_HOST = "https://test-antivirus"
    ANTIVIRUS_API_KEY = "test-antivirus-secret"
    ASSET_DOMAIN = "static.example.com"


class Production(Config):
    HEADER_COLOUR = "#26374A"  # blue.default
    HTTP_PROTOCOL = "https"
    NOTIFY_ENVIRONMENT = "production"
    CHECK_PROXY_HEADER = False


class Staging(Production):
    NOTIFY_ENVIRONMENT = "staging"


configs = {
    "development": Development,
    "test": Test,
    "staging": Staging,
    "production": Production,
}
