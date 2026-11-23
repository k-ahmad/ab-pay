import os
import re
from app.routes.payout_numbers import payout_number_bp
from dotenv import load_dotenv
from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from app.models.deposit import Deposit
from app.routes.deposits import deposit_bp
# Load .env before importing Config so its values are available.
load_dotenv()

from app.config import Config, INSECURE_DEFAULT_SECRET
from app.extensions import db, migrate
from app.routes.health import health_bp
from app.routes.auth import auth_bp
from app.routes.admin import admin_bp
from app.routes.withdrawals import withdrawal_bp


MIN_SECRET_LENGTH = 32


def check_secrets(app):
    """
    Refuse to start with the built-in default secret or a short secret.
    A known JWT secret lets anyone create a valid login token (even for an
    admin account). Skipped only when APP_ENV=development.
    """
    if app.config.get("APP_ENV") == "development":
        return

    problems = []

    for key in ("SECRET_KEY", "JWT_SECRET_KEY"):
        value = app.config.get(key) or ""

        if value == INSECURE_DEFAULT_SECRET or len(value) < MIN_SECRET_LENGTH:
            problems.append(key)

    if problems:
        raise RuntimeError(
            "Unsafe configuration: "
            + ", ".join(problems)
            + " must be set in the environment to a random value of at "
            f"least {MIN_SECRET_LENGTH} characters. "
            "Generate one with: python -c \"import secrets; "
            "print(secrets.token_urlsafe(48))\". "
            "For local development only, set APP_ENV=development."
        )


def create_app(config_class=Config):
    load_dotenv()

    app = Flask(
        __name__,
        instance_path="/tmp/ab-pay-instance"
    )
    os.makedirs(app.instance_path, exist_ok=True)

    app.config.from_object(config_class)

    check_secrets(app)

    db.init_app(app)
    migrate.init_app(app, db)
    JWTManager(app)

    allowed_origins = [
        app.config["FRONTEND_ORIGIN"],
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://ab-pay-two.vercel.app",
        re.compile(r"^https://ab-[a-z0-9-]+-kashi-9eb8\.vercel\.app$"),
    ]

    CORS(
        app,
        resources={
            r"/api/*": {
                "origins": allowed_origins,
                "methods": ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
                "allow_headers": ["Content-Type", "Authorization"],
            }
        },
    )

    # Import all models so Flask-Migrate can discover their metadata.
    from app import models  # noqa: F401

    app.register_blueprint(health_bp)
    app.register_blueprint(auth_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(withdrawal_bp)
    app.register_blueprint(payout_number_bp)
    app.register_blueprint(deposit_bp)

    @app.get("/")
    def index():
        return jsonify({
            "message": "AB PAY API is running",
            "health": "/api/health"
        })

    # Do not call db.create_all() here.
    # Schema changes must be applied through Flask-Migrate.

    return app
