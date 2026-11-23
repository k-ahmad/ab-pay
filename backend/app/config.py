import os
from dotenv import load_dotenv

# Load environment variables before reading them into Config.
load_dotenv()


def _env_bool(name, default=False):
    value = os.getenv(name)

    if value is None:
        return default

    return value.strip().lower() in ("1", "true", "yes", "on")


def _env_int(name, default):
    try:
        return int(os.getenv(name, default))
    except (TypeError, ValueError):
        return default


database_url = os.getenv("DATABASE_URL", "sqlite:///ab_pay_dev.db")

# Use psycopg 3 with SQLAlchemy for PostgreSQL URLs.
if database_url.startswith("postgres://"):
    database_url = database_url.replace(
        "postgres://", "postgresql+psycopg://", 1
    )
elif database_url.startswith("postgresql://"):
    database_url = database_url.replace(
        "postgresql://", "postgresql+psycopg://", 1
    )


# "production" is the safe default. On your own computer, put
# APP_ENV=development in .env so the weak-secret check is skipped.
APP_ENV = os.getenv("APP_ENV", "production").strip().lower()

INSECURE_DEFAULT_SECRET = "dev-only-change-this-secret"


class Config:
    APP_ENV = APP_ENV

    SECRET_KEY = os.getenv("SECRET_KEY", INSECURE_DEFAULT_SECRET)
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", INSECURE_DEFAULT_SECRET)
    JWT_ACCESS_TOKEN_EXPIRES = 3600

    SQLALCHEMY_DATABASE_URI = database_url
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {"pool_pre_ping": True}

    FRONTEND_ORIGIN = os.getenv(
        "FRONTEND_ORIGIN", "http://localhost:5173"
    )

    # The admin "test balance credit" endpoint only works when BOTH
    # APP_ENV=development and ALLOW_TEST_CREDIT=true are set.
    ALLOW_TEST_CREDIT = (
        APP_ENV == "development" and _env_bool("ALLOW_TEST_CREDIT", False)
    )

    # Withdrawals are allowed only to a payout number that the admin has
    # verified. Set to false only for local testing.
    REQUIRE_VERIFIED_PAYOUT_NUMBER = _env_bool(
        "REQUIRE_VERIFIED_PAYOUT_NUMBER", True
    )

    # Login protection: after this many wrong passwords the account is
    # locked for LOGIN_LOCK_SECONDS.
    LOGIN_MAX_ATTEMPTS = _env_int("LOGIN_MAX_ATTEMPTS", 5)
    LOGIN_LOCK_SECONDS = _env_int("LOGIN_LOCK_SECONDS", 900)
