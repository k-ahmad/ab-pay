
import os


database_url = os.getenv(
    "DATABASE_URL",
    "sqlite:///ab_pay_dev.db"
)

# Use psycopg 3 driver with SQLAlchemy
if database_url.startswith("postgres://"):
    database_url = database_url.replace(
        "postgres://",
        "postgresql+psycopg://",
        1
    )
elif database_url.startswith("postgresql://"):
    database_url = database_url.replace(
        "postgresql://",
        "postgresql+psycopg://",
        1
    )


class Config:
    SECRET_KEY = os.getenv(
        "SECRET_KEY",
        "dev-only-change-this-secret"
    )

    JWT_SECRET_KEY = os.getenv(
        "JWT_SECRET_KEY",
        "dev-only-change-this-secret"
    )

    JWT_ACCESS_TOKEN_EXPIRES = 3600

    SQLALCHEMY_DATABASE_URI = database_url
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    SQLALCHEMY_ENGINE_OPTIONS = {
        "pool_pre_ping": True
    }

    FRONTEND_ORIGIN = os.getenv(
        "FRONTEND_ORIGIN",
        "http://localhost:5173"
    )
