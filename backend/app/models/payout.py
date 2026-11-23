from datetime import datetime, timezone
from sqlalchemy import CheckConstraint, Index, text

from app.extensions import db


class Payout(db.Model):
    __tablename__ = "payouts"
    __table_args__ = (
        CheckConstraint("amount > 0", name="ck_payout_amount_positive"),
        Index(
            "uq_payouts_provider_reference",
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
    buy_order_id = db.Column(
        db.Integer, db.ForeignKey("buy_orders.id", ondelete="RESTRICT"),
        nullable=False, index=True
    )
    payout_number_id = db.Column(
        db.Integer, db.ForeignKey("payout_numbers.id", ondelete="RESTRICT"),
        nullable=False, index=True
    )
    amount = db.Column(db.Numeric(18, 2), nullable=False)
    provider_reference = db.Column(db.String(100), nullable=True)
    status = db.Column(db.String(20), nullable=False, default="pending", index=True)
    created_at = db.Column(
        db.DateTime(timezone=True), nullable=False,
        default=lambda: datetime.now(timezone.utc), index=True
    )
    completed_at = db.Column(db.DateTime(timezone=True), nullable=True)
    created_by_id = db.Column(
        db.Integer, db.ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    note = db.Column(db.String(255), nullable=True)

    user = db.relationship("User", foreign_keys=[user_id], backref="payouts")
    buy_order = db.relationship("BuyOrder", backref="payouts")
    payout_number = db.relationship("PayoutNumber", backref="payouts")
    creator = db.relationship("User", foreign_keys=[created_by_id])
