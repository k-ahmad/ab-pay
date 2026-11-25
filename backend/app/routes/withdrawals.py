import secrets
from decimal import Decimal, InvalidOperation

from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy.exc import IntegrityError

from app.extensions import db
from app.models.user import User
from app.models.wallet import Wallet
from app.models.transaction import Transaction
from app.models.payout_number import PayoutNumber
from app.services.financial import add_ledger_entry, add_audit_log
from app.services.validators import normalize_phone


withdrawal_bp = Blueprint(
    "withdrawals",
    __name__,
    url_prefix="/api/wallet"
)


def current_user_id():
    try:
        return int(get_jwt_identity())
    except (TypeError, ValueError):
        return None


def is_verified_payout_number(user_id, payment_method, recipient):
    """
    True only if `recipient` is a payout number of this user that an admin
    has verified for the same payment provider.
    """
    wanted_phone = normalize_phone(recipient)

    if not wanted_phone:
        return False

    verified = PayoutNumber.query.filter_by(
        user_id=user_id,
        status="verified"
    ).all()

    for item in verified:
        if (
            item.payment_method.strip().lower()
            == payment_method.strip().lower()
            and normalize_phone(item.phone_number) == wanted_phone
        ):
            return True

    return False


def serialize_transaction(item):
    return {
        "id": item.public_id,
        "transaction_id": item.public_id,
        "type": item.transaction_type,
        "amount": str(item.amount),
        "payment_method": item.payment_method,
        "recipient": item.sender_or_recipient,
        "provider_reference": item.provider_reference,
        "trx_id": (
            item.provider_reference
            if item.transaction_type == "withdrawal" and item.status == "paid"
            else None
        ),
        "status": item.status,
        "created_at": (
            item.created_at.isoformat() if item.created_at else None
        ),
        "reviewed_at": (
            item.reviewed_at.isoformat() if item.reviewed_at else None
        ),
        "review_note": item.review_note
    }


def read_page_args():
    try:
        limit = int(request.args.get("limit", 50))
        offset = int(request.args.get("offset", 0))
    except (TypeError, ValueError):
        return None, None

    return max(1, min(limit, 200)), max(0, offset)


@withdrawal_bp.post("/withdrawals")
@jwt_required()
def create_withdrawal():

    user_id = current_user_id()

    if user_id is None:
        return jsonify({"message": "Invalid session"}), 401

    data = request.get_json(silent=True) or {}

    # Validate amount
    try:
        amount = Decimal(str(data.get("amount", "")))

        if (
            not amount.is_finite()
            or amount < Decimal("100.00")
            or amount != amount.quantize(Decimal("0.01"))
        ):
            raise ValueError()

    except (InvalidOperation, ValueError):
        return jsonify({
            "message": "Withdrawal amount must be at least 100.00"
        }), 400

    payment_method = str(data.get("payment_method", "")).strip()
    recipient = str(data.get("recipient", "")).strip()
    idempotency_key = str(
        data.get("idempotency_key", "")
    ).strip() or None

    if not payment_method or not recipient:
        return jsonify({
            "message": "Payment method and recipient are required"
        }), 400

    if len(payment_method) > 32 or len(recipient) > 64:
        return jsonify({
            "message": "Payment details are too long"
        }), 400

    if idempotency_key and len(idempotency_key) > 100:
        return jsonify({
            "message": "Invalid idempotency key"
        }), 400

    # Check duplicate request
    if idempotency_key:
        existing = Transaction.query.filter_by(
            idempotency_key=idempotency_key
        ).first()

        if existing:
            if (
                existing.user_id != user_id
                or existing.transaction_type != "withdrawal"
                or existing.amount != amount
            ):
                return jsonify({
                    "message": "Idempotency key already used"
                }), 409

            return jsonify({
                "message": "Withdrawal request already submitted",
                "transaction_id": existing.public_id,
                "status": existing.status
            }), 200

    user = db.session.get(User, user_id)

    if not user or user.status != "active":
        return jsonify({
            "message": "Active account required"
        }), 403

    # Money can only be sent to a number the admin has verified as yours.
    if current_app.config.get("REQUIRE_VERIFIED_PAYOUT_NUMBER", True):
        if not is_verified_payout_number(
            user_id, payment_method, recipient
        ):
            return jsonify({
                "message": (
                    "Recipient must be one of your verified payout "
                    "numbers for this payment method"
                )
            }), 400

    try:
        wallet = Wallet.query.filter_by(
            user_id=user_id
        ).with_for_update().first()

        if not wallet:
            return jsonify({
                "message": "Wallet not found"
            }), 404

        if amount > wallet.available_balance:
            return jsonify({
                "message": "Insufficient wallet balance",
                "available_balance": str(wallet.available_balance)
            }), 400

        new_available = wallet.available_balance - amount
        new_reserved = wallet.reserved_balance + amount

        transaction = Transaction(
            public_id="ABP-" + secrets.token_hex(8).upper(),
            user_id=user_id,
            transaction_type="withdrawal",
            payment_method=payment_method,
            amount=amount,
            status="pending",
            sender_or_recipient=recipient,
            idempotency_key=idempotency_key,
            review_note="Withdrawal request submitted"
        )

        db.session.add(transaction)
        db.session.flush()

        wallet.available_balance = new_available
        wallet.reserved_balance = new_reserved

        add_ledger_entry(
            wallet_id=wallet.id,
            transaction_id=transaction.id,
            entry_type="debit",
            amount=amount,
            balance_after=new_available,
            idempotency_key=f"withdrawal:{transaction.public_id}:reserve",
            note="Withdrawal amount moved from available to reserved balance"
        )

        add_audit_log(
            actor_user_id=user_id,
            action="withdrawal_requested",
            entity_type="transaction",
            entity_id=transaction.public_id,
            details={
                "amount": str(amount),
                "payment_method": payment_method,
                "status": "pending"
            },
            ip_address=request.remote_addr
        )

        db.session.commit()

        return jsonify({
            "message": "Withdrawal request submitted successfully",
            "transaction_id": transaction.public_id,
            "amount": str(amount),
            "status": "pending",
            "available_balance": str(new_available),
            "reserved_balance": str(new_reserved)
        }), 201

    except IntegrityError:
        db.session.rollback()
        return jsonify({
            "message": "Duplicate financial request detected"
        }), 409

    except Exception:
        db.session.rollback()
        return jsonify({
            "message": "Withdrawal request failed"
        }), 500


@withdrawal_bp.get("/withdrawals")
@jwt_required()
def my_withdrawals():
    """The logged-in user's own withdrawal requests, newest first."""

    user_id = current_user_id()

    if user_id is None:
        return jsonify({"message": "Invalid session"}), 401

    limit, offset = read_page_args()

    if limit is None:
        return jsonify({"message": "Invalid limit or offset"}), 400

    items = (
        Transaction.query
        .filter_by(user_id=user_id, transaction_type="withdrawal")
        .order_by(Transaction.created_at.desc())
        .limit(limit)
        .offset(offset)
        .all()
    )

    return jsonify({
        "withdrawals": [serialize_transaction(item) for item in items],
        "count": len(items),
        "limit": limit,
        "offset": offset
    }), 200


@withdrawal_bp.get("/transactions")
@jwt_required()
def my_transactions():
    """
    The logged-in user's own wallet transactions (deposits credited and
    withdrawals), newest first. Optional filters: type, status.
    """

    user_id = current_user_id()

    if user_id is None:
        return jsonify({"message": "Invalid session"}), 401

    limit, offset = read_page_args()

    if limit is None:
        return jsonify({"message": "Invalid limit or offset"}), 400

    query = Transaction.query.filter_by(user_id=user_id)

    type_filter = request.args.get("type", "").strip().lower()
    status_filter = request.args.get("status", "").strip().lower()

    if type_filter:
        query = query.filter(Transaction.transaction_type == type_filter)

    if status_filter:
        query = query.filter(Transaction.status == status_filter)

    items = (
        query
        .order_by(Transaction.created_at.desc())
        .limit(limit)
        .offset(offset)
        .all()
    )

    return jsonify({
        "transactions": [serialize_transaction(item) for item in items],
        "count": len(items),
        "limit": limit,
        "offset": offset
    }), 200
