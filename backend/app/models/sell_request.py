from datetime import datetime, timezone
from sqlalchemy import CheckConstraint

from app.extensions import db


class SellRequest(db.Model):
    __tablename__ = "sell_requests"
    __table_args__ = (
        CheckConstraint("amount > 0", name="ck_sell_amount_positive"),
    )

    id = db.Column(db.Integer, primary_key=True)
    public_id = db.Column(db.String(40), unique=True, nullable=False, index=True)
    user_id = db.Column(
        db.Integer, db.ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False, index=True
    )
    amount = db.Column(db.Numeric(18, 2), nullable=False)
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

    user = db.relationship("User", foreign_keys=[user_id], backref="sell_requests")
    reviewer = db.relationship("User", foreign_keys=[reviewed_by_id])
