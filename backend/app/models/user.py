from datetime import datetime, timezone

from werkzeug.security import generate_password_hash, check_password_hash
from app.extensions import db


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    # Nullable temporarily to preserve existing test accounts. Registration
    # validation can make this mandatory when the auth API is updated.
    name = db.Column(db.String(120), nullable=True)
    phone = db.Column(db.String(32), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    referral_code = db.Column(db.String(24), unique=True, nullable=False, index=True)
    referred_by_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    role = db.Column(db.String(16), nullable=False, default="user", index=True)
    status = db.Column(db.String(16), nullable=False, default="active", index=True)

    # Login protection (wrong-password counter and temporary lock).
    failed_login_attempts = db.Column(
        db.Integer, nullable=False, default=0, server_default="0"
    )
    locked_until = db.Column(db.DateTime(timezone=True), nullable=True)

    created_at = db.Column(
        db.DateTime(timezone=True), nullable=False,
        default=lambda: datetime.now(timezone.utc)
    )
    updated_at = db.Column(
        db.DateTime(timezone=True), nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc)
    )

    referred_by = db.relationship(
        "User", remote_side=[id], backref="referrals"
    )
    wallet = db.relationship(
        "Wallet", back_populates="user", uselist=False,
        cascade="all, delete-orphan"
    )

    def set_password(self, password: str) -> None:
        self.password_hash = generate_password_hash(password)

    def check_password(self, password: str) -> bool:
        return check_password_hash(self.password_hash, password)
