from decimal import Decimal

from app.extensions import db
from app.models.external_reference import ExternalReference
from app.models.ledger_entry import LedgerEntry
from app.models.audit_log import AuditLog


def register_external_reference(reference, record_type, record_id, user_id):
    """
    Register a payment-provider reference globally.
    Call inside the same DB transaction as the financial record.
    The database unique constraint prevents cross-table duplicates.
    """
    reference = str(reference or "").strip()

    if not reference:
        return None

    if len(reference) > 100:
        raise ValueError("Payment reference is too long")

    entry = ExternalReference(
        reference=reference,
        record_type=str(record_type),
        record_id=int(record_id),
        user_id=int(user_id),
    )

    db.session.add(entry)
    db.session.flush()
    return entry


def add_ledger_entry(
    wallet_id,
    amount,
    balance_after,
    entry_type,
    idempotency_key,
    transaction_id=None,
    source_type=None,
    source_id=None,
    note=None,
):
    """
    Add one immutable ledger record.
    Unique idempotency_key prevents the same movement being recorded twice.
    """
    amount = Decimal(str(amount))
    balance_after = Decimal(str(balance_after))
    idempotency_key = str(idempotency_key or "").strip()

    if amount <= 0:
        raise ValueError("Ledger amount must be greater than zero")

    if balance_after < 0:
        raise ValueError("Ledger balance cannot be negative")

    if not idempotency_key:
        raise ValueError("Ledger idempotency key is required")

    entry = LedgerEntry(
        wallet_id=wallet_id,
        transaction_id=transaction_id,
        source_type=source_type,
        source_id=source_id,
        entry_type=entry_type,
        amount=amount,
        balance_after=balance_after,
        idempotency_key=idempotency_key,
        note=note,
    )

    db.session.add(entry)
    db.session.flush()
    return entry


def add_audit_log(
    actor_user_id,
    action,
    entity_type,
    entity_id,
    details=None,
    ip_address=None,
):
    """Record an administrative or financial action for audit."""
    entry = AuditLog(
        actor_user_id=actor_user_id,
        action=action,
        entity_type=entity_type,
        entity_id=str(entity_id) if entity_id is not None else None,
        details=details,
        ip_address=ip_address,
    )

    db.session.add(entry)
    db.session.flush()
    return entry