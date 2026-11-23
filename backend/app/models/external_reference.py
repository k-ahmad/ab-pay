from datetime import datetime, timezone
from app.extensions import db


class ExternalReference(db.Model):
    """
    Central registry for payment-provider references.

    Future Buy/Deposit/Payout API workflows should insert a row here in the
    same database transaction as the financial record. The unique reference
    then prevents reuse across different financial record types.
    """
    __tablename__ = "external_references"

    id = db.Column(db.Integer, primary_key=True)
    reference = db.Column(db.String(100), unique=True, nullable=False)
    record_type = db.Column(db.String(32), nullable=False)
    record_id = db.Column(db.Integer, nullable=False)
    user_id = db.Column(
        db.Integer, db.ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False, index=True
    )
    created_at = db.Column(
        db.DateTime(timezone=True), nullable=False,
        default=lambda: datetime.now(timezone.utc)
    )

    user = db.relationship("User", backref="external_references")
