from datetime import datetime, timezone
from sqlalchemy import CheckConstraint, UniqueConstraint
from app.extensions import db


class ReferralEarning(db.Model):
    __tablename__ = "referral_earnings"
    __table_args__ = (
        CheckConstraint("amount >= 0", name="ck_referral_earning_nonnegative"),
        UniqueConstraint("buy_order_id", name="uq_referral_earning_buy_order"),
    )

    id = db.Column(db.Integer, primary_key=True)
    referrer_user_id = db.Column(
        db.Integer, db.ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False, index=True
    )
    referred_user_id = db.Column(
        db.Integer, db.ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False, index=True
    )
    buy_order_id = db.Column(
        db.Integer, db.ForeignKey("buy_orders.id", ondelete="RESTRICT"),
        nullable=False
    )
    percentage = db.Column(db.Numeric(7, 4), nullable=True)
    amount = db.Column(db.Numeric(18, 2), nullable=False)
    status = db.Column(db.String(20), nullable=False, default="pending", index=True)
    created_at = db.Column(
        db.DateTime(timezone=True), nullable=False,
        default=lambda: datetime.now(timezone.utc)
    )

    referrer = db.relationship("User", foreign_keys=[referrer_user_id])
    referred_user = db.relationship("User", foreign_keys=[referred_user_id])
    buy_order = db.relationship("BuyOrder", backref="referral_earning")
