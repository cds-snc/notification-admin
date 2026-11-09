from enum import Enum

# Status codes that have a matching template in app/templates/error/
ERROR_TEMPLATE_STATUS_CODES = (400, 401, 403, 404, 410, 413, 418, 500)


class NotifyEnv(Enum):
    DEVELOPMENT = "development"
    TEST = "test"
    STAGING = "staging"
    PRODUCTION = "production"
    PRODUCTION_FF = "production_FF"
    SCRATCH = "scratch"
    DEV = "dev"
