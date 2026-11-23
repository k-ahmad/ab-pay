
import secrets
import string
from datetime import datetime, timedelta, timezone

from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import (
    create_access_token,
    jwt_required,
    get_jwt_identity
)
from sqlalchemy.exc import IntegrityError
from werkzeug.security import generate_password_hash, check_password_hash

from app.extensions import db
from app.models import User, Wallet
from app.services.validators import normalize_bd_phone, phone_variants


auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")

# Used to spend the same time on unknown phone numbers as on real ones,
# so response time does not reveal which numbers are registered.
_DUMMY_PASSWORD_HASH = generate_password_hash("not-a-real-password")


def generate_referral_code():
    characters = string.ascii_uppercase + string.digits

    while True:
        code = "AB" + "".join(
            secrets.choice(characters) for _ in range(8)
        )

        if not User.query.filter_by(referral_code=code).first():
            return code


def as_utc(value):
    """SQLite returns naive datetimes; treat them as UTC."""
    if value is not None and value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)

    return value


def user_payload(user):
    return {
        "id": user.id,
        "name": user.name,
        "phone": user.phone,
        "referral_code": user.referral_code,
        "role": user.role
    }


@auth_bp.post("/register")
def register():
    data = request.get_json(silent=True) or {}

    raw_phone = str(data.get("phone", "")).strip()
    password = data.get("password", "")
    referral_code = str(data.get("referral_code", "")).strip().upper()
    name = str(data.get("name") or "").strip()

    if not raw_phone or not password:
        return jsonify({
            "message": "Phone number and password are required"
        }), 400

    # Saved in one format (01XXXXXXXXX) whatever the user typed.
    phone = normalize_bd_phone(raw_phone)

    if not phone:
        return jsonify({
            "message": "Enter a valid Bangladeshi mobile number "
                       "(01XXXXXXXXX)"
        }), 400

    if not isinstance(password, str) or len(password) < 8:
        return jsonify({
            "message": "Password must be at least 8 characters"
        }), 400

    if len(password) > 128:
        return jsonify({
            "message": "Password must be at most 128 characters"
        }), 400

    # Name is optional for now so the current frontend keeps working.
    # Make it required after the frontend sends it (Phase 2).
    if name and not 2 <= len(name) <= 120:
        return jsonify({
            "message": "Name must be between 2 and 120 characters"
        }), 400

    # Older accounts may have been saved as 8801XXXXXXXXX, so check
    # every spelling of the same number.
    if User.query.filter(User.phone.in_(phone_variants(phone))).first():
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
        name=name or None,
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
            "user": user_payload(user),
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


def find_user_for_login(raw_phone):
    normalized = normalize_bd_phone(raw_phone)

    candidates = []

    if normalized:
        candidates.extend(phone_variants(normalized))

    # Accounts created before phone numbers were standardised.
    if raw_phone not in candidates:
        candidates.append(raw_phone)

    for candidate in candidates:
        user = User.query.filter_by(phone=candidate).first()

        if user:
            return user

    return None


@auth_bp.post("/login")
def login():
    data = request.get_json(silent=True) or {}

    raw_phone = str(data.get("phone", "")).strip()
    password = data.get("password", "")

    if not raw_phone or not password or not isinstance(password, str):
        return jsonify({
            "message": "Phone number and password are required"
        }), 400

    max_attempts = current_app.config["LOGIN_MAX_ATTEMPTS"]
    lock_seconds = current_app.config["LOGIN_LOCK_SECONDS"]
    now = datetime.now(timezone.utc)

    user = find_user_for_login(raw_phone)

    if user:
        locked_until = as_utc(user.locked_until)

        if locked_until and locked_until > now:
            retry_after = int((locked_until - now).total_seconds()) + 1

            return jsonify({
                "message": "Too many failed login attempts. "
                           "Please try again later.",
                "retry_after_seconds": retry_after
            }), 429

    password_ok = (
        user.check_password(password)
        if user
        else check_password_hash(_DUMMY_PASSWORD_HASH, password)
    )

    if not user or not password_ok:
        if user:
            try:
                user.failed_login_attempts = (
                    user.failed_login_attempts or 0
                ) + 1

                if user.failed_login_attempts >= max_attempts:
                    user.locked_until = now + timedelta(seconds=lock_seconds)
                    user.failed_login_attempts = 0

                db.session.commit()

            except Exception:
                db.session.rollback()

        return jsonify({
            "message": "Invalid phone number or password"
        }), 401

    if user.status != "active":
        return jsonify({
            "message": "Account is not active"
        }), 403

    if user.failed_login_attempts or user.locked_until:
        try:
            user.failed_login_attempts = 0
            user.locked_until = None
            db.session.commit()

        except Exception:
            db.session.rollback()

    token = create_access_token(identity=str(user.id))

    return jsonify({
        "message": "Login successful",
        "user": user_payload(user),
        "access_token": token
    }), 200


@auth_bp.get("/me")
@jwt_required()
def get_profile():
    try:
        user_id = int(get_jwt_identity())
    except (TypeError, ValueError):
        return jsonify({"message": "User not found"}), 404

    user = db.session.get(User, user_id)

    if not user:
        return jsonify({"message": "User not found"}), 404

    wallet = user.wallet

    return jsonify({
        "user": {
            "id": user.id,
            "name": user.name,
            "phone": user.phone,
            "referral_code": user.referral_code,
            "role": user.role,
            "status": user.status
        },
        "wallet": {
            "currency": wallet.currency if wallet else "BDT",
            "available_balance": str(
                wallet.available_balance if wallet else "0.00"
            ),
            "pending_balance": str(
                wallet.pending_balance if wallet else "0.00"
            ),
            "reserved_balance": str(
                wallet.reserved_balance if wallet else "0.00"
            )
        }
    }), 200
