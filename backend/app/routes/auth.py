
import secrets
import string

from flask import Blueprint, request, jsonify
from flask_jwt_extended import (
    create_access_token,
    jwt_required,
    get_jwt_identity
)
from sqlalchemy.exc import IntegrityError

from app.extensions import db
from app.models import User, Wallet


auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")


def generate_referral_code():
    characters = string.ascii_uppercase + string.digits

    while True:
        code = "AB" + "".join(
            secrets.choice(characters) for _ in range(8)
        )

        if not User.query.filter_by(referral_code=code).first():
            return code


@auth_bp.post("/register")
def register():
    data = request.get_json(silent=True) or {}

    phone = str(data.get("phone", "")).strip()
    password = data.get("password", "")
    referral_code = str(data.get("referral_code", "")).strip().upper()

    if not phone or not password:
        return jsonify({
            "message": "Phone number and password are required"
        }), 400

    if len(phone) < 8 or len(phone) > 32:
        return jsonify({"message": "Invalid phone number"}), 400

    if not isinstance(password, str) or len(password) < 8:
        return jsonify({
            "message": "Password must be at least 8 characters"
        }), 400

    if User.query.filter_by(phone=phone).first():
        return jsonify({
            "message": "Phone number already registered"
        }), 409

    referred_by = None

    if referral_code:
        referred_by = User.query.filter_by(
            referral_code=referral_code
        ).first()

        if not referred_by:
            return jsonify({
                "message": "Invalid referral code"
            }), 400

    user = User(
        phone=phone,
        referral_code=generate_referral_code(),
        referred_by=referred_by
    )

    user.set_password(password)

    wallet = Wallet(
        user=user,
        currency="BDT",
        available_balance=0,
        pending_balance=0,
        reserved_balance=0
    )

    try:
        db.session.add(user)
        db.session.add(wallet)
        db.session.commit()

        token = create_access_token(identity=str(user.id))

        return jsonify({
            "message": "Registration successful",
            "user": {
                "id": user.id,
                "phone": user.phone,
                "referral_code": user.referral_code
            },
            "wallet": {
                "currency": wallet.currency,
                "available_balance": str(wallet.available_balance)
            },
            "access_token": token
        }), 201

    except IntegrityError:
        db.session.rollback()
        return jsonify({"message": "Registration conflict"}), 409

    except Exception:
        db.session.rollback()
        return jsonify({"message": "Registration failed"}), 500


@auth_bp.post("/login")
def login():
    data = request.get_json(silent=True) or {}

    phone = str(data.get("phone", "")).strip()
    password = data.get("password", "")

    if not phone or not password:
        return jsonify({
            "message": "Phone number and password are required"
        }), 400

    user = User.query.filter_by(phone=phone).first()

    if not user or not user.check_password(password):
        return jsonify({
            "message": "Invalid phone number or password"
        }), 401

    if user.status != "active":
        return jsonify({
            "message": "Account is not active"
        }), 403

    token = create_access_token(identity=str(user.id))

    return jsonify({
        "message": "Login successful",
        "user": {
            "id": user.id,
            "phone": user.phone,
            "referral_code": user.referral_code
        },
        "access_token": token
    }), 200


@auth_bp.get("/me")
@jwt_required()
def get_profile():
    user_id = get_jwt_identity()

    user = db.session.get(User, int(user_id))

    if not user:
        return jsonify({"message": "User not found"}), 404

    return jsonify({
        "user": {
            "id": user.id,
            "phone": user.phone,
            "referral_code": user.referral_code,
            "role": user.role,
            "status": user.status
        },
        "wallet": {
            "currency": user.wallet.currency,
            "available_balance": str(user.wallet.available_balance),
            "pending_balance": str(user.wallet.pending_balance),
            "reserved_balance": str(user.wallet.reserved_balance)
        }
    }), 200
