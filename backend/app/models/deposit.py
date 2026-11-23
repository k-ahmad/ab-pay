from datetime import datetime, timezone

from sqlalchemy import CheckConstraint
from app.extensions import db


class Deposit(db.Model):
    __tablename__ = "deposits"

    __table_args__ = (
        CheckConstraint(
            "amount >= 100 AND amount <= 200000",
            name="ck_deposit_amount_range"
        ),
    )

    id = db.Column(db.Integer, primary_key=True)

    public_id = db.Column(
        db.String(40),
        unique=True,
        nullable=False,
        index=True
    )

    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        index=True
    )

    payment_method = db.Column(
        db.String(32),
        nullable=False
    )

    amount = db.Column(
        db.Numeric(18, 2),
        nullable=False
    )

    sender_number = db.Column(
        db.String(64),
        nullable=False
    )

    provider_reference = db.Column(
        db.String(100),
        nullable=False,
        index=True
    )

    # Stops the same request from being saved twice (double click, retry).
    # Old rows have no key, so this column must stay nullable.
    idempotency_key = db.Column(
        db.String(100),
        unique=True,
        nullable=True
    )

    status = db.Column(
        db.String(20),
        nullable=False,
        default="pending",
        index=True
    )

    created_at = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        index=True
    )

    reviewed_at = db.Column(
        db.DateTime(timezone=True),
        nullable=True
    )

    reviewed_by_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True
    )

    review_note = db.Column(
        db.String(255),
        nullable=True
    )

    user = db.relationship(
        "User",
        foreign_keys=[user_id],
        backref="deposits"
    )

    reviewer = db.relationship(
        "User",
        foreign_keys=[reviewed_by_id]
    )
