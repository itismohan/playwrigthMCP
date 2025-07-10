from src.models.user import db
from datetime import datetime

class Badge(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), unique=True, nullable=False)
    description = db.Column(db.Text)
    icon = db.Column(db.String(100))
    badge_type = db.Column(db.String(20), nullable=False)  # 'bronze', 'silver', 'gold'
    criteria = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    user_badges = db.relationship('UserBadge', backref='badge', lazy=True, cascade='all, delete-orphan')

    # Add constraint for badge type
    __table_args__ = (
        db.CheckConstraint(
            "badge_type IN ('bronze', 'silver', 'gold')",
            name='badge_type_check'
        ),
    )

    def __repr__(self):
        return f'<Badge {self.name} ({self.badge_type})>'

    def to_dict(self):
        """Convert badge to dictionary for JSON response"""
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'icon': self.icon,
            'badge_type': self.badge_type,
            'criteria': self.criteria,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class UserBadge(db.Model):
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), primary_key=True)
    badge_id = db.Column(db.Integer, db.ForeignKey('badge.id'), primary_key=True)
    earned_at = db.Column(db.DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f'<UserBadge User {self.user_id} Badge {self.badge_id}>'

    def to_dict(self):
        """Convert user badge to dictionary for JSON response"""
        return {
            'user_id': self.user_id,
            'badge_id': self.badge_id,
            'badge': self.badge.to_dict() if self.badge else None,
            'earned_at': self.earned_at.isoformat() if self.earned_at else None
        }

