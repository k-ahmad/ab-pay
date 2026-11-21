import secrets
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from app.extensions import db
from app.models.user import User
from app.models.wallet import Wallet
from app.models.transaction import Transaction
from app.models.ledger_entry import LedgerEntry


admin_bp = Blueprint("admin", __name__, url_prefix="/api/admin")


def get_admin():
    """Return the authenticated admin user, or None for non-admin users."""
    try:
        admin_id = int(get_jwt_identity())
    except (TypeError, ValueError):
        return None

    admin = db.session.get(User, admin_id)

    if not admin or admin.role != "admin":
        return None

    return admin


@admin_bp.get("/withdrawals")
@jwt_required()
def get_withdrawals():
    """
    Return withdrawal requests for the admin panel.

    Optional query parameter:
      ?status=pending
      ?status=approved
      ?status=rejected
      ?status=all
    """
    if not get_admin():
        return jsonify({"message": "Admin access required"}), 403

    status_filter = request.args.get("status", "all").strip().lower()

    allowed_statuses = {"all", "pending", "approved", "rejected"}

    if status_filter not in allowed_statuses:
        return jsonify({
            "message": "Invalid status filter",
            "allowed_statuses": sorted(allowed_statuses)
        }), 400

    try:
        query = (
            db.session.query(Transaction, User)
            .join(User, User.id == Transaction.user_id)
            .filter(Transaction.transaction_type == "withdrawal")
        )

        if status_filter != "all":
            query = query.filter(Transaction.status == status_filter)

        withdrawals = query.order_by(
            Transaction.created_at.desc()
        ).all()

        results = []

        for transaction, user in withdrawals:
            results.append({
                "id": transaction.id,
                "transaction_id": transaction.public_id,
                "public_id": transaction.public_id,
                "user_id": transaction.user_id,
                "phone": user.phone,
                "amount": str(transaction.amount),
                "payment_method": transaction.payment_method,
                "recipient": transaction.sender_or_recipient,
                "sender_or_recipient": transaction.sender_or_recipient,
                "provider_reference": transaction.provider_reference,
                "status": transaction.status,
                "created_at": (
                    transaction.created_at.isoformat()
                    if transaction.created_at else None
                ),
                "reviewed_at": (
                    transaction.reviewed_at.isoformat()
                    if transaction.reviewed_at else None
                ),
                "review_note": transaction.review_note
            })

        return jsonify({
            "withdrawals": results,
            "count": len(results),
            "status_filter": status_filter
        }), 200

    except Exception:
        db.session.rollback()
        return jsonify({
            "message": "Could not fetch withdrawal requests"
        }), 500


@admin_bp.post("/users/<int:user_id>/wallet/credit")
@jwt_required()
def credit_wallet(user_id):

    if not get_admin():
        return jsonify({"message": "Admin access required"}), 403

    data = request.get_json(silent=True) or {}

    try:
        amount = Decimal(str(data.get("amount", "")))

        if not amount.is_finite() or amount <= 0:
            raise ValueError()

        if amount != amount.quantize(Decimal("0.01")):
            raise ValueError()

        if amount > Decimal("1000000.00"):
            raise ValueError()

    except (InvalidOperation, ValueError):
        return jsonify({"message": "Invalid amount"}), 400

    target_user = db.session.get(User, user_id)

    if not target_user:
        return jsonify({"message": "User not found"}), 404

    wallet = Wallet.query.filter_by(user_id=user_id).first()

    if not wallet:
        return jsonify({"message": "Wallet not found"}), 404

    try:
        new_balance = wallet.available_balance + amount

        transaction = Transaction(
            public_id="ABP-" + secrets.token_hex(8).upper(),
            user_id=user_id,
            transaction_type="deposit",
            payment_method="admin_adjustment",
            amount=amount,
            status="successful",
            review_note="Development test balance credit"
        )

        db.session.add(transaction)
        db.session.flush()

        wallet.available_balance = new_balance

        ledger = LedgerEntry(
            wallet_id=wallet.id,
            transaction_id=transaction.id,
            entry_type="credit",
            amount=amount,
            balance_after=new_balance,
            note="Admin test balance credit"
        )

        db.session.add(ledger)
        db.session.commit()

        return jsonify({
            "message": "Test balance added successfully",
            "user_id": user_id,
            "credited_amount": str(amount),
            "available_balance": str(new_balance)
        }), 200

    except Exception:
        db.session.rollback()
        return jsonify({"message": "Balance credit failed"}), 500


@admin_bp.post("/withdrawals/<string:public_id>/review")
@jwt_required()
def review_withdrawal(public_id):

    if not get_admin():
        return jsonify({"message": "Admin access required"}), 403

    data = request.get_json(silent=True) or {}
    action = str(data.get("action", "")).strip().lower()

    if action not in ("approve", "reject"):
        return jsonify({
            "message": "Action must be approve or reject"
        }), 400

    try:
        transaction = Transaction.query.filter_by(
            public_id=public_id,
            transaction_type="withdrawal"
        ).with_for_update().first()

        if not transaction:
            return jsonify({"message": "Withdrawal not found"}), 404

        if transaction.status != "pending":
            return jsonify({
                "message": "Withdrawal has already been reviewed",
                "status": transaction.status
            }), 409

        wallet = Wallet.query.filter_by(
            user_id=transaction.user_id
        ).with_for_update().first()

        if not wallet:
            return jsonify({"message": "Wallet not found"}), 404

        if action == "approve":

            # Funds remain reserved until payout is actually confirmed.
            transaction.status = "approved"
            transaction.review_note = (
                "Approved by admin; awaiting payout confirmation"
            )

        else:

            if wallet.reserved_balance < transaction.amount:
                return jsonify({
                    "message": "Reserved balance is insufficient"
                }), 409

            wallet.reserved_balance -= transaction.amount
            wallet.available_balance += transaction.amount

            transaction.status = "rejected"
            transaction.review_note = "Rejected by admin; funds refunded"

            ledger = LedgerEntry(
                wallet_id=wallet.id,
                transaction_id=transaction.id,
                entry_type="credit",
                amount=transaction.amount,
                balance_after=wallet.available_balance,
                note="Rejected withdrawal refunded to available balance"
            )

            db.session.add(ledger)

        transaction.reviewed_at = datetime.now(timezone.utc)

        db.session.commit()

        return jsonify({
            "message": (
                "Withdrawal approved successfully"
                if action == "approve"
                else "Withdrawal rejected successfully"
            ),
            "transaction_id": transaction.public_id,
            "status": transaction.status,
            "available_balance": str(wallet.available_balance),
            "reserved_balance": str(wallet.reserved_balance)
        }), 200

    except Exception:
        db.session.rollback()
        return jsonify({
            "message": "Withdrawal review failed"
        }), 500
