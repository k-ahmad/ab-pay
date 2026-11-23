from datetime import datetime, timezone
from sqlalchemy import CheckConstraint, Index, text

from app.extensions import db


class Transaction(db.Model):
    __tablename__ = "transactions"
    __table_args__ = (
        CheckConstraint("amount > 0", name="ck_transaction_amount_positive"),
        # A provider reference may be NULL for transaction types that do not
        # use one. Non-empty references must be unique within this table.
        Index(
            "uq_transactions_provider_reference",
            "provider_reference",
            unique=True,
            sqlite_where=text("provider_reference IS NOT NULL AND provider_reference != ''"),
            postgresql_where=text("provider_reference IS NOT NULL AND provider_reference != ''"),
        ),
    )

    id = db.Column(db.Integer, primary_key=True)
    public_id = db.Column(db.String(40), unique=True, nullable=False, index=True)
    user_id = db.Column(
        db.Integer, db.ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False, index=True
    )
    transaction_type = db.Column(db.String(24), nullable=False, index=True)
    payment_method = db.Column(db.String(32), nullable=True)
    amount = db.Column(db.Numeric(18, 2), nullable=False)
    status = db.Column(db.String(20), nullable=False, default="pending", index=True)
    sender_or_recipient = db.Column(db.String(64), nullable=True)
    provider_reference = db.Column(db.String(100), nullable=True)
    idempotency_key = db.Column(db.String(100), unique=True, nullable=True)
    created_at = db.Column(
        db.DateTime(timezone=True), nullable=False,
        default=lambda: datetime.now(timezone.utc), index=True
    )
    reviewed_at = db.Column(db.DateTime(timezone=True), nullable=True)
    reviewed_by_id = db.Column(
        db.Integer, db.ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    review_note = db.Column(db.String(255), nullable=True)

    user = db.relationship(
        "User", foreign_keys=[user_id], backref="transactions"
    )
    reviewer = db.relationship("User", foreign_keys=[reviewed_by_id])
