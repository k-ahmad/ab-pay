from datetime import datetime, timezone
from app.extensions import db


class AuditLog(db.Model):
    __tablename__ = "audit_logs"

    id = db.Column(db.Integer, primary_key=True)
    actor_user_id = db.Column(
        db.Integer, db.ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True, index=True
    )
    action = db.Column(db.String(100), nullable=False, index=True)
    entity_type = db.Column(db.String(60), nullable=True, index=True)
    entity_id = db.Column(db.String(64), nullable=True, index=True)
    details = db.Column(db.JSON, nullable=True)
    ip_address = db.Column(db.String(45), nullable=True)
    created_at = db.Column(
        db.DateTime(timezone=True), nullable=False,
        default=lambda: datetime.now(timezone.utc), index=True
    )

    actor = db.relationship("User", backref="audit_logs")
