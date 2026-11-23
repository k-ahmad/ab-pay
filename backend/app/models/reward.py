from datetime import datetime, timezone
from sqlalchemy import CheckConstraint
from app.extensions import db


class Reward(db.Model):
    __tablename__ = "rewards"
    __table_args__ = (
        CheckConstraint("amount >= 0", name="ck_reward_amount_nonnegative"),
    )

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(
        db.Integer, db.ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False, index=True
    )
    reward_type = db.Column(db.String(40), nullable=False, index=True)
    amount = db.Column(db.Numeric(18, 2), nullable=False)
    status = db.Column(db.String(20), nullable=False, default="pending", index=True)
    source_type = db.Column(db.String(32), nullable=True)
    source_id = db.Column(db.Integer, nullable=True)
    idempotency_key = db.Column(db.String(120), unique=True, nullable=True)
    created_at = db.Column(
        db.DateTime(timezone=True), nullable=False,
        default=lambda: datetime.now(timezone.utc), index=True
    )
    approved_at = db.Column(db.DateTime(timezone=True), nullable=True)

    user = db.relationship("User", backref="rewards")


class RewardRule(db.Model):
    __tablename__ = "reward_rules"

    id = db.Column(db.Integer, primary_key=True)
    rule_key = db.Column(db.String(80), unique=True, nullable=False)
    # JSON allows admin-configured rule values without hardcoding unconfirmed
    # reward amounts or percentages in the database schema.
    configuration = db.Column(db.JSON, nullable=False, default=dict)
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    updated_at = db.Column(
        db.DateTime(timezone=True), nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc)
    )
    updated_by_id = db.Column(
        db.Integer, db.ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    updater = db.relationship("User")
