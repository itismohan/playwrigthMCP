from src.models.user import db
from datetime import datetime

class Comment(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    content = db.Column(db.Text, nullable=False)
    author_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    question_id = db.Column(db.Integer, db.ForeignKey('question.id'), nullable=True)
    answer_id = db.Column(db.Integer, db.ForeignKey('answer.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Add constraint to ensure comment is either on question or answer, not both
    __table_args__ = (
        db.CheckConstraint(
            '(question_id IS NOT NULL AND answer_id IS NULL) OR (question_id IS NULL AND answer_id IS NOT NULL)',
            name='comment_target_check'
        ),
    )

    def __repr__(self):
        target = f"Question {self.question_id}" if self.question_id else f"Answer {self.answer_id}"
        return f'<Comment on {target}>'

    def to_dict(self):
        """Convert comment to dictionary for JSON response"""
        return {
            'id': self.id,
            'content': self.content,
            'author': self.author.to_dict() if self.author else None,
            'question_id': self.question_id,
            'answer_id': self.answer_id,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

