
import secrets
from decimal import Decimal, InvalidOperation

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from app.extensions import db
from app.models.user import User
from app.models.wallet import Wallet
from app.models.transaction import Transaction
from app.models.ledger_entry import LedgerEntry


withdrawal_bp = Blueprint(
    "withdrawals",
    __name__,
    url_prefix="/api/wallet"
)


@withdrawal_bp.post("/withdrawals")
@jwt_required()
def create_withdrawal():

    user_id = int(get_jwt_identity())

    data = request.get_json(silent=True) or {}

    # Validate amount
    try:
        amount = Decimal(str(data.get("amount", "")))

        if not amount.is_finite() or amount <= 0:
            raise ValueError()

        if amount != amount.quantize(Decimal("0.01")):
            raise ValueError()

    except (InvalidOperation, ValueError):
        return jsonify({"message": "Invalid withdrawal amount"}), 400

    # Validate payment details
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

    # Prevent duplicate requests
    if idempotency_key:
        existing = Transaction.query.filter_by(
            idempotency_key=idempotency_key
        ).first()

        if existing:
            if existing.user_id != user_id:
                return jsonify({
                    "message": "Invalid idempotency key"
                }), 409

            return jsonify({
                "message": "Withdrawal request already submitted",
                "transaction_id": existing.public_id,
                "status": existing.status
            }), 200

    user = db.session.get(User, user_id)

    if not user or user.status != "active":
        return jsonify({"message": "Active account required"}), 403

    wallet = Wallet.query.filter_by(
        user_id=user_id
    ).with_for_update().first()

    if not wallet:
        return jsonify({"message": "Wallet not found"}), 404

    if amount > wallet.available_balance:
        return jsonify({
            "message": "Insufficient wallet balance",
            "available_balance": str(wallet.available_balance)
        }), 400

    try:
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

        ledger = LedgerEntry(
            wallet_id=wallet.id,
            transaction_id=transaction.id,
            entry_type="debit",
            amount=amount,
            balance_after=new_available,
            note="Withdrawal amount reserved"
        )

        db.session.add(ledger)
        db.session.commit()

        return jsonify({
            "message": "Withdrawal request submitted successfully",
            "transaction_id": transaction.public_id,
            "amount": str(amount),
            "status": "pending",
            "available_balance": str(new_available),
            "reserved_balance": str(new_reserved)
        }), 201

    except Exception:
        db.session.rollback()
        return jsonify({
            "message": "Withdrawal request failed"
        }), 500
