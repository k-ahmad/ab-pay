from datetime import datetime, timezone
from app.extensions import db


class Notification(db.Model):
    __tablename__ = "notifications"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(
        db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    title = db.Column(db.String(160), nullable=False)
    message = db.Column(db.String(1000), nullable=False)
    notification_type = db.Column(db.String(40), nullable=True)
    is_read = db.Column(db.Boolean, nullable=False, default=False, index=True)
    created_at = db.Column(
        db.DateTime(timezone=True), nullable=False,
        default=lambda: datetime.now(timezone.utc), index=True
    )
    read_at = db.Column(db.DateTime(timezone=True), nullable=True)

    user = db.relationship("User", backref="notifications")
