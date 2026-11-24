import secrets

from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation

from flask import Blueprint, current_app, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from sqlalchemy.exc import IntegrityError

from app.extensions import db

from app.models.user import User
from app.models.wallet import Wallet
from app.models.deposit import Deposit
from app.models.transaction import Transaction
from app.models.external_reference import ExternalReference

from app.services.financial import (
    add_audit_log,
    add_ledger_entry,
    register_external_reference,
)
from app.services.validators import normalize_bd_phone


deposit_bp = Blueprint(
    "deposits",
    __name__,
    url_prefix="/api"
)


PROVIDERS = {"bKash", "Nagad", "Rocket", "UPay"}


def current_user():
    try:
        user_id = int(get_jwt_identity())
    except (TypeError, ValueError):
        return None

    return db.session.get(User, user_id)


def current_admin():
    user = current_user()

    if not user or user.role != "admin":
        return None

    return user


def make_id():
    return "ABP-DEP-" + secrets.token_hex(8).upper()


@deposit_bp.post("/wallet/deposits")
@jwt_required()
def create_deposit():

    user = current_user()

    if not user or user.status != "active":
        return jsonify({
            "message": "Active account required"
        }), 403

    data = request.get_json(silent=True) or {}

    try:
        amount = Decimal(str(data.get("amount", "")))

        if (
            not amount.is_finite()
            or amount < Decimal("100")
            or amount > Decimal("200000")
            or amount != amount.quantize(Decimal("0.01"))
        ):
            raise ValueError

    except (InvalidOperation, ValueError):
        return jsonify({
            "message": "Deposit amount must be between 100 and 200000"
        }), 400

    provider = str(
        data.get("payment_method", "")
    ).strip()

    # Saved as 01XXXXXXXXX whether the user typed 01..., 8801... or +8801...
    sender_number = normalize_bd_phone(
        data.get("sender_number", "")
    )

    reference = str(
        data.get("provider_reference", "")
    ).strip()

    idempotency_key = str(
        data.get("idempotency_key", "")
    ).strip()

    if provider not in PROVIDERS:
        return jsonify({
            "message": "Invalid payment provider"
        }), 400

    if not sender_number:
        return jsonify({
            "message": "Invalid Bangladeshi mobile number"
        }), 400

    if not 4 <= len(reference) <= 100:
        return jsonify({
            "message": "Invalid transaction reference"
        }), 400

    if not idempotency_key or len(idempotency_key) > 100:
        return jsonify({
            "message": "Valid idempotency key is required"
        }), 400

    try:
        # The same request sent again (double click, retry) gets the
        # original answer back instead of creating a second deposit.
        existing_key = Deposit.query.filter_by(
            idempotency_key=idempotency_key
        ).first()

        if existing_key:
            if (
                existing_key.user_id != user.id
                or existing_key.amount != amount
                or existing_key.provider_reference != reference
            ):
                return jsonify({
                    "message": "Idempotency key already used"
                }), 409

            return jsonify({
                "message": "Deposit request already submitted",
                "deposit_id": existing_key.public_id,
                "amount": str(existing_key.amount),
                "status": existing_key.status
            }), 200

        # A transaction reference can be used only once, by anyone.
        if ExternalReference.query.filter_by(
            reference=reference
        ).first():
            return jsonify({
                "message": "Transaction reference already submitted"
            }), 409

        deposit = Deposit(
            public_id=make_id(),
            user_id=user.id,
            payment_method=provider,
            amount=amount,
            sender_number=sender_number,
            provider_reference=reference,
            idempotency_key=idempotency_key,
            status="pending"
        )

        db.session.add(deposit)
        db.session.flush()

        register_external_reference(
            reference=reference,
            record_type="deposit",
            record_id=deposit.id,
            user_id=user.id
        )

        add_audit_log(
            actor_user_id=user.id,
            action="deposit_requested",
            entity_type="deposit",
            entity_id=deposit.public_id,
            details={
                "amount": str(amount),
                "payment_method": provider,
                "status": "pending"
            },
            ip_address=request.remote_addr
        )

        db.session.commit()

        return jsonify({
            "message": "Deposit request submitted for verification",
            "deposit_id": deposit.public_id,
            "amount": str(amount),
            "status": deposit.status
        }), 201

    except IntegrityError:
        db.session.rollback()

        return jsonify({
            "message": "Duplicate transaction reference or request"
        }), 409

    except Exception:
        db.session.rollback()
        current_app.logger.exception("deposit route failed")

        return jsonify({
            "message": "Deposit request failed"
        }), 500


@deposit_bp.get("/wallet/deposits")
@jwt_required()
def my_deposits():

    user = current_user()

    if not user:
        return jsonify({
            "message": "User not found"
        }), 404

    deposits = Deposit.query.filter_by(
        user_id=user.id
    ).order_by(
        Deposit.created_at.desc()
    ).all()

    return jsonify({
        "deposits": [
            {
                "id": item.public_id,
                "amount": str(item.amount),
                "payment_method": item.payment_method,
                "sender_number": item.sender_number,
                "reference": item.provider_reference,
                "status": item.status,
                "created_at": item.created_at.isoformat()
                if item.created_at else None,
                "review_note": item.review_note
            }
            for item in deposits
        ]
    }), 200


@deposit_bp.get("/admin/deposits")
@jwt_required()
def admin_deposits():

    if not current_admin():
        return jsonify({
            "message": "Admin access required"
        }), 403

    status_filter = request.args.get(
        "status", "all"
    ).strip().lower()

    query = Deposit.query

    if status_filter != "all":
        if status_filter not in {
            "pending", "approved", "rejected"
        }:
            return jsonify({
                "message": "Invalid status"
            }), 400

        query = query.filter_by(status=status_filter)

    rows = query.order_by(
        Deposit.created_at.desc()
    ).all()

    phones = {
        user.id: user.phone
        for user in User.query.filter(
            User.id.in_({item.user_id for item in rows})
        ).all()
    } if rows else {}

    return jsonify({
        "deposits": [
            {
                "id": item.public_id,
                "user_id": item.user_id,
                "phone": phones.get(item.user_id),
                "amount": str(item.amount),
                "payment_method": item.payment_method,
                "sender_number": item.sender_number,
                "reference": item.provider_reference,
                "status": item.status,
                "created_at": item.created_at.isoformat()
                if item.created_at else None,
                "reviewed_at": item.reviewed_at.isoformat()
                if item.reviewed_at else None,
                "review_note": item.review_note
            }
            for item in rows
        ],
        "count": len(rows)
    }), 200


@deposit_bp.post("/admin/deposits/<string:public_id>/review")
@jwt_required()
def review_deposit(public_id):

    admin = current_admin()

    if not admin:
        return jsonify({
            "message": "Admin access required"
        }), 403

    data = request.get_json(silent=True) or {}

    action = str(
        data.get("action", "")
    ).strip().lower()

    note = str(
        data.get("reason", "")
    ).strip()[:255]

    if action not in {"approve", "reject"}:
        return jsonify({
            "message": "Action must be approve or reject"
        }), 400

    if not note:
        return jsonify({
            "message": "Review reason is required"
        }), 400

    try:
        deposit = Deposit.query.filter_by(
            public_id=public_id
        ).with_for_update().first()

        if not deposit:
            return jsonify({
                "message": "Deposit not found"
            }), 404

        if deposit.status != "pending":
            return jsonify({
                "message": "Deposit already reviewed"
            }), 409

        if deposit.user_id == admin.id:
            return jsonify({
                "message": "Admin cannot review own deposit"
            }), 403

        reviewed_at = datetime.now(timezone.utc)

        deposit.reviewed_at = reviewed_at
        deposit.reviewed_by_id = admin.id
        deposit.review_note = note

        if action == "reject":
            deposit.status = "rejected"

            add_audit_log(
                actor_user_id=admin.id,
                action="deposit_reject",
                entity_type="deposit",
                entity_id=deposit.public_id,
                details={
                    "user_id": deposit.user_id,
                    "amount": str(deposit.amount),
                    "reason": note,
                    "status": "rejected"
                },
                ip_address=request.remote_addr
            )

            db.session.commit()

            return jsonify({
                "message": "Deposit rejected",
                "status": "rejected"
            }), 200

        wallet = Wallet.query.filter_by(
            user_id=deposit.user_id
        ).with_for_update().first()

        if not wallet:
            db.session.rollback()

            return jsonify({
                "message": "Wallet not found"
            }), 404

        transaction = Transaction(
            public_id="ABP-" + secrets.token_hex(8).upper(),
            user_id=deposit.user_id,
            transaction_type="deposit",
            payment_method=deposit.payment_method,
            amount=deposit.amount,
            status="successful",
            sender_or_recipient=deposit.sender_number,
            provider_reference=deposit.provider_reference,
            idempotency_key=f"deposit:{deposit.id}:approved",
            reviewed_at=reviewed_at,
            reviewed_by_id=admin.id,
            review_note=note
        )

        db.session.add(transaction)
        db.session.flush()

        new_balance = wallet.available_balance + deposit.amount

        wallet.available_balance = new_balance

        add_ledger_entry(
            wallet_id=wallet.id,
            transaction_id=transaction.id,
            entry_type="credit",
            amount=deposit.amount,
            balance_after=new_balance,
            idempotency_key=f"deposit:{deposit.id}:ledger",
            source_type="deposit",
            source_id=deposit.id,
            note="Verified deposit approved by admin"
        )

        deposit.status = "approved"

        add_audit_log(
            actor_user_id=admin.id,
            action="deposit_approve",
            entity_type="deposit",
            entity_id=deposit.public_id,
            details={
                "user_id": deposit.user_id,
                "amount": str(deposit.amount),
                "reason": note,
                "status": "approved"
            },
            ip_address=request.remote_addr
        )

        db.session.commit()

        return jsonify({
            "message": "Deposit approved and wallet credited",
            "deposit_id": deposit.public_id,
            "amount": str(deposit.amount),
            "available_balance": str(new_balance),
            "status": "approved"
        }), 200

    except IntegrityError:
        db.session.rollback()

        return jsonify({
            "message": "Duplicate financial operation prevented"
        }), 409

    except Exception:
        db.session.rollback()
        current_app.logger.exception("deposit route failed")

        return jsonify({
            "message": "Deposit review failed"
        }), 500