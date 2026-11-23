from datetime import datetime, timezone

from sqlalchemy import UniqueConstraint

from app.extensions import db


class PayoutNumber(db.Model):
    __tablename__ = "payout_numbers"

    __table_args__ = (
        UniqueConstraint(
            "phone_number",
            name="uq_payout_number_global_phone",
        ),
    )

    id = db.Column(db.Integer, primary_key=True)

    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    payment_method = db.Column(db.String(32), nullable=False)
    phone_number = db.Column(db.String(64), nullable=False)

    status = db.Column(
        db.String(20),
        nullable=False,
        default="pending",
        index=True,
    )

    is_default = db.Column(
        db.Boolean,
        nullable=False,
        default=False,
    )

    created_at = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    verified_at = db.Column(
        db.DateTime(timezone=True),
        nullable=True,
    )

    verified_by_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    user = db.relationship(
        "User",
        foreign_keys=[user_id],
        backref="payout_numbers",
    )

    verifier = db.relationship(
        "User",
        foreign_keys=[verified_by_id],
    )
