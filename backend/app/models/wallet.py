from decimal import Decimal

from sqlalchemy import CheckConstraint
from app.extensions import db


class Wallet(db.Model):
    __tablename__ = "wallets"
    __table_args__ = (
        CheckConstraint("available_balance >= 0", name="ck_wallet_available_nonnegative"),
        CheckConstraint("pending_balance >= 0", name="ck_wallet_pending_nonnegative"),
        CheckConstraint("reserved_balance >= 0", name="ck_wallet_reserved_nonnegative"),
    )

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(
        db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"),
        unique=True, nullable=False
    )
    currency = db.Column(db.String(8), nullable=False, default="BDT")
    available_balance = db.Column(
        db.Numeric(18, 2), nullable=False, default=Decimal("0.00")
    )
    pending_balance = db.Column(
        db.Numeric(18, 2), nullable=False, default=Decimal("0.00")
    )
    reserved_balance = db.Column(
        db.Numeric(18, 2), nullable=False, default=Decimal("0.00")
    )

    user = db.relationship("User", back_populates="wallet")
