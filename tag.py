from src.models.user import db
from datetime import datetime

class Tag(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), unique=True, nullable=False)
    description = db.Column(db.Text)
    color = db.Column(db.String(7), default='#007acc')  # Hex color code
    usage_count = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f'<Tag {self.name}>'

    def to_dict(self):
        """Convert tag to dictionary for JSON response"""
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'color': self.color,
            'usage_count': self.usage_count,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

    def increment_usage(self):
        """Increment the usage count for this tag"""
        self.usage_count += 1
        db.session.commit()

    def decrement_usage(self):
        """Decrement the usage count for this tag"""
        if self.usage_count > 0:
            self.usage_count -= 1
            db.session.commit()

    @staticmethod
    def get_or_create(tag_name):
        """Get existing tag or create new one"""
        tag = Tag.query.filter_by(name=tag_name.lower()).first()
        if not tag:
            tag = Tag(name=tag_name.lower())
            db.session.add(tag)
            db.session.commit()
        return tag

