
import re

from flask import Flask, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from flask_jwt_extended import JWTManager

from app.config import Config
from app.extensions import db, migrate
from app.routes.health import health_bp
from app.routes.auth import auth_bp
from app.routes.admin import admin_bp
from app.routes.withdrawals import withdrawal_bp


def create_app(config_class=Config):
    load_dotenv()

    # Vercel filesystem is read-only except /tmp
    app = Flask(
        __name__,
        instance_path="/tmp/ab-pay-instance"
    )

    app.config.from_object(config_class)

    db.init_app(app)
    migrate.init_app(app, db)
    JWTManager(app)

    # Allowed frontend origins
    allowed_origins = [
        app.config["FRONTEND_ORIGIN"],

        # Local development
        "http://localhost:5173",
        "http://127.0.0.1:5173",

        # Production frontend
        "https://ab-pay-two.vercel.app",

        # Vercel preview deployments for AB PAY
        re.compile(
            r"^https://ab-[a-z0-9-]+-kashi-9eb8\.vercel\.app$"
        ),
    ]

    CORS(
        app,
        resources={
            r"/api/*": {
                "origins": allowed_origins,
                "methods": [
                    "GET",
                    "POST",
                    "PUT",
                    "PATCH",
                    "DELETE",
                    "OPTIONS"
                ],
                "allow_headers": [
                    "Content-Type",
                    "Authorization"
                ]
            }
        }
    )

    # Import models for SQLAlchemy
    from app import models

    # Register API routes
    app.register_blueprint(health_bp)
    app.register_blueprint(auth_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(withdrawal_bp)

    @app.get("/")
    def index():
        return jsonify({
            "message": "AB PAY API is running",
            "health": "/api/health"
        })

    with app.app_context():
        db.create_all()

    return app
