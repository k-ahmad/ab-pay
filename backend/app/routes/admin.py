
import secrets
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation

from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy.exc import IntegrityError

from app.extensions import db
from app.models.user import User
from app.models.wallet import Wallet
from app.models.transaction import Transaction

from app.services.financial import (
    add_ledger_entry,
    add_audit_log,
)


admin_bp = Blueprint("admin", __name__, url_prefix="/api/admin")


def get_admin():
    """Return authenticated admin user."""
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

    if not get_admin():
        return jsonify({"message": "Admin access required"}), 403

    status_filter = request.args.get("status", "all").strip().lower()

    allowed_statuses = {
        "all",
        "pending",
        "approved",
        "paid",
        "rejected"
    }

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
            query = query.filter(
                Transaction.status == status_filter
            )

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
                "trx_id": transaction.provider_reference if transaction.status == "paid" else None,
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

    # Development-only tool. It is switched off unless the server runs with
    # APP_ENV=development and ALLOW_TEST_CREDIT=true. When off, the route
    # behaves as if it does not exist.
    if not current_app.config.get("ALLOW_TEST_CREDIT"):
        return jsonify({"message": "Not found"}), 404

    admin = get_admin()

    if not admin:
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

    try:
        wallet = Wallet.query.filter_by(
            user_id=user_id
        ).with_for_update().first()

        if not wallet:
            return jsonify({"message": "Wallet not found"}), 404

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

        add_ledger_entry(
            wallet_id=wallet.id,
            transaction_id=transaction.id,
            amount=amount,
            balance_after=new_balance,
            entry_type="credit",
            idempotency_key=f"admin-credit:{transaction.public_id}",
            note="Admin test balance credit"
        )

        add_audit_log(
            actor_user_id=admin.id,
            action="wallet_test_credit",
            entity_type="transaction",
            entity_id=transaction.public_id,
            details={
                "user_id": user_id,
                "amount": str(amount)
            },
            ip_address=request.remote_addr
        )

        db.session.commit()

        return jsonify({
            "message": "Test balance added successfully",
            "user_id": user_id,
            "credited_amount": str(amount),
            "available_balance": str(new_balance)
        }), 200

    except IntegrityError:
        db.session.rollback()
        return jsonify({
            "message": "Duplicate financial entry"
        }), 409

    except Exception:
        db.session.rollback()
        return jsonify({
            "message": "Balance credit failed"
        }), 500


@admin_bp.post("/withdrawals/<string:public_id>/review")
@jwt_required()
def review_withdrawal(public_id):

    admin = get_admin()

    if not admin:
        return jsonify({"message": "Admin access required"}), 403

    data = request.get_json(silent=True) or {}
    action = str(data.get("action", "")).strip().lower()

    reason = str(data.get("reason") or "").strip()[:200]

    if action not in ("approve", "reject"):
        return jsonify({
            "message": "Action must be approve or reject"
        }), 400

    if not reason:
        return jsonify({
            "message": "Review reason is required"
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

        # An admin must not approve or reject their own withdrawal.
        if transaction.user_id == admin.id:
            return jsonify({
                "message": "Admin cannot review own withdrawal"
            }), 403

        wallet = Wallet.query.filter_by(
            user_id=transaction.user_id
        ).with_for_update().first()

        if not wallet:
            return jsonify({"message": "Wallet not found"}), 404

        if action == "approve":

            if wallet.reserved_balance < transaction.amount:
                return jsonify({
                    "message": "Reserved balance is insufficient"
                }), 409

            # Keep funds reserved until actual payout is confirmed.
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
            transaction.review_note = (
                "Rejected by admin; funds refunded"
            )

            add_ledger_entry(
                wallet_id=wallet.id,
                transaction_id=transaction.id,
                amount=transaction.amount,
                balance_after=wallet.available_balance,
                entry_type="credit",
                idempotency_key=(
                    f"withdrawal:{transaction.public_id}:refund"
                ),
                note="Rejected withdrawal refunded"
            )

        if reason:
            transaction.review_note = (
                f"{transaction.review_note} Reason: {reason}"
            )[:255]

        transaction.reviewed_at = datetime.now(timezone.utc)
        transaction.reviewed_by_id = admin.id

        add_audit_log(
            actor_user_id=admin.id,
            action=f"withdrawal_{action}",
            entity_type="transaction",
            entity_id=transaction.public_id,
            details={
                "user_id": transaction.user_id,
                "amount": str(transaction.amount),
                "status": transaction.status,
                "reason": reason or None
            },
            ip_address=request.remote_addr
        )

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

    except IntegrityError:
        db.session.rollback()
        return jsonify({
            "message": "Duplicate financial entry"
        }), 409

    except Exception:
        db.session.rollback()
        return jsonify({
            "message": "Withdrawal review failed"
        }), 500


@admin_bp.post("/withdrawals/<string:public_id>/mark-paid")
@jwt_required()
def mark_withdrawal_paid(public_id):
    """Record a completed external payout against an approved withdrawal."""
    admin = get_admin()
    if not admin:
        return jsonify({"message": "Admin access required"}), 403

    data = request.get_json(silent=True) or {}
    trx_id = str(data.get("trx_id") or "").strip()
    if not 4 <= len(trx_id) <= 100:
        return jsonify({"message": "Enter a valid payout Transaction ID (4 to 100 characters)"}), 400

    try:
        transaction = Transaction.query.filter_by(
            public_id=public_id,
            transaction_type="withdrawal"
        ).with_for_update().first()

        if not transaction:
            return jsonify({"message": "Withdrawal not found"}), 404
        if transaction.user_id == admin.id:
            return jsonify({"message": "Admin cannot mark own withdrawal as paid"}), 403
        if transaction.status != "approved":
            return jsonify({
                "message": "Only approved withdrawals can be marked as paid",
                "status": transaction.status
            }), 409
        if transaction.provider_reference:
            return jsonify({"message": "A payout Transaction ID is already recorded"}), 409

        wallet = Wallet.query.filter_by(
            user_id=transaction.user_id
        ).with_for_update().first()
        if not wallet:
            return jsonify({"message": "Wallet not found"}), 404
        if wallet.reserved_balance < transaction.amount:
            return jsonify({"message": "Reserved balance is insufficient"}), 409

        wallet.reserved_balance -= transaction.amount
        transaction.provider_reference = trx_id
        transaction.status = "paid"
        transaction.reviewed_at = datetime.now(timezone.utc)
        transaction.reviewed_by_id = admin.id
        transaction.review_note = f"Payout completed. TrxID: {trx_id}"[:255]

        add_ledger_entry(
            wallet_id=wallet.id,
            transaction_id=transaction.id,
            amount=transaction.amount,
            balance_after=wallet.available_balance,
            entry_type="debit",
            idempotency_key=f"withdrawal:{transaction.public_id}:paid",
            note="Approved withdrawal payout confirmed; reserved funds settled"
        )

        add_audit_log(
            actor_user_id=admin.id,
            action="withdrawal_marked_paid",
            entity_type="transaction",
            entity_id=transaction.public_id,
            details={
                "user_id": transaction.user_id,
                "amount": str(transaction.amount),
                "trx_id": trx_id,
                "status": "paid"
            },
            ip_address=request.remote_addr
        )

        db.session.commit()
        return jsonify({
            "message": "Withdrawal marked as paid successfully",
            "transaction_id": transaction.public_id,
            "trx_id": transaction.provider_reference,
            "status": transaction.status,
            "available_balance": str(wallet.available_balance),
            "reserved_balance": str(wallet.reserved_balance)
        }), 200

    except IntegrityError:
        db.session.rollback()
        return jsonify({"message": "This payout Transaction ID is already in use"}), 409
    except Exception:
        db.session.rollback()
        current_app.logger.exception("Could not mark withdrawal as paid")
        return jsonify({"message": "Could not mark withdrawal as paid"}), 500


def _like_pattern(text):
    """Escape % and _ so a search text is matched literally."""
    cleaned = (
        text.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
    )
    return f"%{cleaned}%"


@admin_bp.get("/users")
@jwt_required()
def list_users():
    if not get_admin():
        return jsonify({"message": "Admin access required"}), 403

    status = request.args.get("status", "all").strip().lower()

    if status not in {"all", "active", "suspended"}:
        return jsonify({"message": "Invalid status filter"}), 400

    try:
        limit = int(request.args.get("limit", 100))
        offset = int(request.args.get("offset", 0))
    except ValueError:
        return jsonify({"message": "limit and offset must be numbers"}), 400

    limit = max(1, min(limit, 200))
    offset = max(0, offset)

    query = User.query

    if status != "all":
        query = query.filter(User.status == status)

    search = request.args.get("search", "").strip()[:60]

    if search:
        pattern = _like_pattern(search)
        query = query.filter(
            User.phone.ilike(pattern, escape="\\")
            | User.name.ilike(pattern, escape="\\")
        )

    total = query.count()
    users = (
        query.order_by(User.created_at.desc(), User.id.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    wallets = {
        wallet.user_id: wallet
        for wallet in Wallet.query.filter(
            Wallet.user_id.in_([user.id for user in users])
        ).all()
    } if users else {}

    return jsonify({
        "count": len(users),
        "total": total,
        "users": [
            {
                "id": user.id,
                "name": user.name,
                "phone": user.phone,
                "role": user.role,
                "status": user.status,
                "created_at": (
                    user.created_at.isoformat() if user.created_at else None
                ),
                "available_balance": str(
                    wallets[user.id].available_balance
                ) if user.id in wallets else "0.00",
                "reserved_balance": str(
                    wallets[user.id].reserved_balance
                ) if user.id in wallets else "0.00",
            }
            for user in users
        ],
    }), 200


@admin_bp.post("/users/<int:user_id>/status")
@jwt_required()
def set_user_status(user_id):
    """Suspend or re-activate a user account (reason required)."""
    admin = get_admin()

    if not admin:
        return jsonify({"message": "Admin access required"}), 403

    data = request.get_json(silent=True) or {}
    target = str(data.get("status") or "").strip().lower()
    reason = str(data.get("reason") or "").strip()

    if target not in ("active", "suspended"):
        return jsonify({
            "message": "Status must be active or suspended"
        }), 400

    if not 3 <= len(reason) <= 500:
        return jsonify({
            "message": "A reason (3 to 500 characters) is required"
        }), 400

    try:
        user = User.query.filter_by(id=user_id).with_for_update().first()

        if not user:
            return jsonify({"message": "User not found"}), 404

        if user.id == admin.id:
            return jsonify({
                "message": "You cannot change your own account status"
            }), 403

        if user.role == "admin":
            return jsonify({
                "message": "Admin accounts cannot be suspended here"
            }), 403

        if user.status == target:
            return jsonify({
                "message": f"User is already {target}"
            }), 409

        previous = user.status
        user.status = target

        add_audit_log(
            actor_user_id=admin.id,
            action="user_suspended" if target == "suspended" else "user_activated",
            entity_type="user",
            entity_id=user.id,
            details={
                "previous_status": previous,
                "status": target,
                "reason": reason,
            },
            ip_address=request.remote_addr,
        )

        db.session.commit()

        return jsonify({
            "message": (
                "User suspended. Their active sessions have been closed."
                if target == "suspended"
                else "User account re-activated."
            ),
            "user": {
                "id": user.id,
                "phone": user.phone,
                "status": user.status,
            },
        }), 200

    except Exception:
        db.session.rollback()
        current_app.logger.exception("Could not change user status")
        return jsonify({"message": "Could not change user status"}), 500
