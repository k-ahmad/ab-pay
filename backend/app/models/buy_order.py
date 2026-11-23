from datetime import datetime, timezone
from sqlalchemy import CheckConstraint, Index, text

from app.extensions import db


class BuyOrder(db.Model):
    __tablename__ = "buy_orders"
    __table_args__ = (
        CheckConstraint("package_amount > 0", name="ck_buy_package_amount_positive"),
        CheckConstraint("reward_amount >= 0", name="ck_buy_reward_amount_nonnegative"),
        CheckConstraint("total_payable > 0", name="ck_buy_total_payable_positive"),
        Index(
            "uq_buy_orders_provider_reference",
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
    package_id = db.Column(
        db.Integer, db.ForeignKey("packages.id", ondelete="RESTRICT"),
        nullable=False, index=True
    )
    package_amount = db.Column(db.Numeric(18, 2), nullable=False)
    reward_percentage = db.Column(db.Numeric(7, 4), nullable=True)
    reward_amount = db.Column(db.Numeric(18, 2), nullable=False, default=0)
    total_payable = db.Column(db.Numeric(18, 2), nullable=False)
    payment_method = db.Column(db.String(32), nullable=False)
    recipient_label = db.Column(db.String(80), nullable=True)
    recipient_number = db.Column(db.String(64), nullable=True)
    sender_number = db.Column(db.String(64), nullable=False)
    provider_reference = db.Column(db.String(100), nullable=True)
    status = db.Column(db.String(20), nullable=False, default="pending", index=True)
    created_at = db.Column(
        db.DateTime(timezone=True), nullable=False,
        default=lambda: datetime.now(timezone.utc), index=True
    )
    reviewed_at = db.Column(db.DateTime(timezone=True), nullable=True)
    reviewed_by_id = db.Column(
        db.Integer, db.ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    review_note = db.Column(db.String(255), nullable=True)

    user = db.relationship("User", foreign_keys=[user_id], backref="buy_orders")
    package = db.relationship("Package", backref="buy_orders")
    reviewer = db.relationship("User", foreign_keys=[reviewed_by_id])
