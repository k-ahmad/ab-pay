from datetime import datetime, timezone

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required
from sqlalchemy.exc import IntegrityError

from app.extensions import db
from app.models import PayoutNumber, User
from app.services.financial import add_audit_log
from app.services.validators import normalize_bd_phone, phone_variants


payout_number_bp = Blueprint(
    "payout_numbers",
    __name__,
    url_prefix="/api",
)

# Stored in lower case, as before.
PAYOUT_PROVIDERS = {"bkash", "nagad", "rocket", "upay"}


def get_current_user():
    try:
        user_id = int(get_jwt_identity())
    except (TypeError, ValueError):
        return None

    return db.session.get(User, user_id)


def get_admin():
    user = get_current_user()

    if not user or user.role != "admin":
        return None

    return user


def serialize_payout_number(item):
    return {
        "id": item.id,
        "user_id": item.user_id,
        "payment_method": item.payment_method,
        "phone_number": item.phone_number,
        "status": item.status,
        "is_default": item.is_default,
        "created_at": (
            item.created_at.isoformat() if item.created_at else None
        ),
        "verified_at": (
            item.verified_at.isoformat() if item.verified_at else None
        ),
        "verified_by_id": item.verified_by_id,
    }


@payout_number_bp.get("/wallet/payout-numbers")
@jwt_required()
def list_payout_numbers():
    user = get_current_user()

    if not user:
        return jsonify({"message": "User not found"}), 404

    items = (
        PayoutNumber.query
        .filter_by(user_id=user.id)
        .order_by(PayoutNumber.created_at.desc())
        .all()
    )

    return jsonify({
        "payout_numbers": [
            serialize_payout_number(item) for item in items
        ]
    }), 200


@payout_number_bp.post("/wallet/payout-numbers")
@jwt_required()
def add_payout_number():
    user = get_current_user()

    if not user:
        return jsonify({"message": "User not found"}), 404

    data = request.get_json(silent=True) or {}

    payment_method = str(data.get("payment_method") or "").strip().lower()

    if payment_method not in PAYOUT_PROVIDERS:
        return jsonify({
            "message": "Payment method must be one of: "
                       + ", ".join(sorted(PAYOUT_PROVIDERS))
        }), 400

    # One format only (01XXXXXXXXX). Without this, the same number written
    # as 01... and 8801... could be linked to two different accounts.
    phone_number = normalize_bd_phone(data.get("phone_number"))

    if not phone_number:
        return jsonify({
            "message": "Enter a valid Bangladeshi mobile number "
                       "(01XXXXXXXXX)"
        }), 400

    existing = PayoutNumber.query.filter(
        PayoutNumber.phone_number.in_(phone_variants(phone_number))
    ).first()

    if existing:
        return jsonify({
            "message": "This phone number is already linked to an account"
        }), 409

    item = PayoutNumber(
        user_id=user.id,
        payment_method=payment_method,
        phone_number=phone_number,
        status="pending",
        is_default=False,
    )

    try:
        db.session.add(item)
        db.session.flush()

        add_audit_log(
            actor_user_id=user.id,
            action="payout_number_added",
            entity_type="payout_number",
            entity_id=item.id,
            details={
                "payment_method": payment_method,
                "phone_number": phone_number,
            },
            ip_address=request.remote_addr,
        )

        db.session.commit()

        return jsonify({
            "message": "Payout number submitted for verification",
            "payout_number": serialize_payout_number(item),
        }), 201

    except IntegrityError:
        db.session.rollback()
        return jsonify({
            "message": "This phone number is already linked to an account"
        }), 409

    except Exception:
        db.session.rollback()
        return jsonify({
            "message": "Could not save payout number"
        }), 500


@payout_number_bp.patch(
    "/wallet/payout-numbers/<int:payout_number_id>/default"
)
@jwt_required()
def set_default_payout_number(payout_number_id):
    user = get_current_user()

    if not user:
        return jsonify({"message": "User not found"}), 404

    item = PayoutNumber.query.filter_by(
        id=payout_number_id,
        user_id=user.id,
        status="verified",
    ).first()

    if not item:
        return jsonify({
            "message": "Verified payout number not found"
        }), 404

    try:
        PayoutNumber.query.filter_by(
            user_id=user.id,
            payment_method=item.payment_method,
        ).update(
            {"is_default": False},
            synchronize_session=False,
        )

        item.is_default = True

        add_audit_log(
            actor_user_id=user.id,
            action="payout_number_default_changed",
            entity_type="payout_number",
            entity_id=item.id,
            details={
                "payment_method": item.payment_method,
                "phone_number": item.phone_number,
            },
            ip_address=request.remote_addr,
        )

        db.session.commit()

        return jsonify({
            "message": "Default payout number updated",
            "payout_number": serialize_payout_number(item),
        }), 200

    except Exception:
        db.session.rollback()
        return jsonify({
            "message": "Could not update default payout number"
        }), 500


@payout_number_bp.get("/admin/payout-numbers")
@jwt_required()
def admin_list_payout_numbers():
    admin = get_admin()

    if not admin:
        return jsonify({"message": "Admin access required"}), 403

    status = str(request.args.get("status", "pending")).strip().lower()

    query = PayoutNumber.query

    if status != "all":
        if status not in ("pending", "verified", "rejected"):
            return jsonify({"message": "Invalid status filter"}), 400

        query = query.filter_by(status=status)

    items = query.order_by(PayoutNumber.created_at.desc()).all()

    return jsonify({
        "payout_numbers": [
            serialize_payout_number(item) for item in items
        ]
    }), 200


@payout_number_bp.post(
    "/admin/payout-numbers/<int:payout_number_id>/review"
)
@jwt_required()
def review_payout_number(payout_number_id):
    admin = get_admin()

    if not admin:
        return jsonify({"message": "Admin access required"}), 403

    data = request.get_json(silent=True) or {}
    decision = str(data.get("status") or "").strip().lower()

    if decision not in ("verified", "rejected"):
        return jsonify({
            "message": "Status must be verified or rejected"
        }), 400

    item = db.session.get(PayoutNumber, payout_number_id)

    if not item:
        return jsonify({"message": "Payout number not found"}), 404

    if item.status != "pending":
        return jsonify({
            "message": "Only pending payout numbers can be reviewed"
        }), 409

    # An admin must not verify their own payout number.
    if item.user_id == admin.id:
        return jsonify({
            "message": "Admin cannot review own payout number"
        }), 403

    try:
        item.status = decision

        if decision == "verified":
            item.verified_at = datetime.now(timezone.utc)
            item.verified_by_id = admin.id

            first_verified = not PayoutNumber.query.filter_by(
                user_id=item.user_id,
                payment_method=item.payment_method,
                status="verified",
                is_default=True,
            ).first()

            if first_verified:
                item.is_default = True

        else:
            item.verified_at = None
            item.verified_by_id = admin.id
            item.is_default = False

        add_audit_log(
            actor_user_id=admin.id,
            action=f"payout_number_{decision}",
            entity_type="payout_number",
            entity_id=item.id,
            details={
                "user_id": item.user_id,
                "payment_method": item.payment_method,
                "phone_number": item.phone_number,
                "status": decision,
            },
            ip_address=request.remote_addr,
        )

        db.session.commit()

        return jsonify({
            "message": f"Payout number {decision} successfully",
            "payout_number": serialize_payout_number(item),
        }), 200

    except Exception:
        db.session.rollback()
        return jsonify({
            "message": "Could not review payout number"
        }), 500
