from enum import Enum


class NotifyEnv(Enum):
    DEVELOPMENT = "development"
    TEST = "test"
    STAGING = "staging"
    PRODUCTION = "production"
    PRODUCTION_FF = "production_FF"
    SCRATCH = "scratch"
    DEV = "dev"
