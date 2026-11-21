from datetime import datetime, timezone
from decimal import Decimal
from app.extensions import db

class Transaction(db.Model):
    __tablename__ = "transactions"

    id = db.Column(db.Integer, primary_key=True)
    public_id = db.Column(db.String(40), unique=True, nullable=False, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    transaction_type = db.Column(db.String(16), nullable=False)  # deposit / withdrawal / reward
    payment_method = db.Column(db.String(32), nullable=True)
    amount = db.Column(db.Numeric(18, 2), nullable=False)
    status = db.Column(db.String(20), nullable=False, default="pending")
    sender_or_recipient = db.Column(db.String(64), nullable=True)
    provider_reference = db.Column(db.String(100), nullable=True, index=True)
    idempotency_key = db.Column(db.String(100), unique=True, nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    reviewed_at = db.Column(db.DateTime(timezone=True), nullable=True)
    review_note = db.Column(db.String(255), nullable=True)
