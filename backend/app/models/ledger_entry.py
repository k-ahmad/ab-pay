from datetime import datetime, timezone

from sqlalchemy import CheckConstraint
from app.extensions import db


class LedgerEntry(db.Model):
    __tablename__ = "ledger_entries"
    __table_args__ = (
        CheckConstraint("amount > 0", name="ck_ledger_amount_positive"),
        CheckConstraint("balance_after >= 0", name="ck_ledger_balance_nonnegative"),
    )

    id = db.Column(db.Integer, primary_key=True)
    wallet_id = db.Column(
        db.Integer, db.ForeignKey("wallets.id", ondelete="RESTRICT"),
        nullable=False, index=True
    )
    transaction_id = db.Column(
        db.Integer, db.ForeignKey("transactions.id", ondelete="RESTRICT"),
        nullable=True, index=True
    )

    # Links ledger entries to non-Transaction financial records, such as
    # approved SellRequests or BuyOrder payout settlements.
    source_type = db.Column(db.String(32), nullable=True)
    source_id = db.Column(db.Integer, nullable=True)
    idempotency_key = db.Column(db.String(120), unique=True, nullable=True)

    entry_type = db.Column(db.String(32), nullable=False)
    amount = db.Column(db.Numeric(18, 2), nullable=False)
    balance_after = db.Column(db.Numeric(18, 2), nullable=False)
    note = db.Column(db.String(255), nullable=True)
    created_at = db.Column(
        db.DateTime(timezone=True), nullable=False,
        default=lambda: datetime.now(timezone.utc), index=True
    )

    wallet = db.relationship("Wallet", backref="ledger_entries")
    transaction = db.relationship("Transaction", backref="ledger_entries")
