from decimal import Decimal
from app.extensions import db

class Wallet(db.Model):
    __tablename__ = "wallets"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), unique=True, nullable=False)
    currency = db.Column(db.String(8), nullable=False, default="BDT")
    available_balance = db.Column(db.Numeric(18, 2), nullable=False, default=Decimal("0.00"))
    pending_balance = db.Column(db.Numeric(18, 2), nullable=False, default=Decimal("0.00"))
    reserved_balance = db.Column(db.Numeric(18, 2), nullable=False, default=Decimal("0.00"))

    user = db.relationship("User", back_populates="wallet")
