from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import CheckConstraint
from app.extensions import db


class Package(db.Model):
    __tablename__ = "packages"
    __table_args__ = (
        CheckConstraint("amount > 0", name="ck_package_amount_positive"),
        CheckConstraint(
            "reward_percentage IS NULL OR reward_percentage >= 0",
            name="ck_package_reward_percentage_nonnegative"
        ),
    )

    id = db.Column(db.Integer, primary_key=True)
    package_code = db.Column(db.String(40), unique=True, nullable=False)
    name = db.Column(db.String(120), nullable=False)
    amount = db.Column(db.Numeric(18, 2), nullable=False)
    reward_percentage = db.Column(db.Numeric(7, 4), nullable=True)
    payment_method = db.Column(db.String(32), nullable=True)
    recipient_label = db.Column(db.String(80), nullable=True)
    recipient_number = db.Column(db.String(64), nullable=True)
    is_active = db.Column(db.Boolean, nullable=False, default=True, index=True)
    created_at = db.Column(
        db.DateTime(timezone=True), nullable=False,
        default=lambda: datetime.now(timezone.utc)
    )
    updated_at = db.Column(
        db.DateTime(timezone=True), nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc)
    )
