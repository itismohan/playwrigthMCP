from src.models.user import db
from datetime import datetime

class Vote(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    question_id = db.Column(db.Integer, db.ForeignKey('question.id'), nullable=True)
    answer_id = db.Column(db.Integer, db.ForeignKey('answer.id'), nullable=True)
    vote_type = db.Column(db.String(10), nullable=False)  # 'upvote' or 'downvote'
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Add constraints
    __table_args__ = (
        db.CheckConstraint(
            '(question_id IS NOT NULL AND answer_id IS NULL) OR (question_id IS NULL AND answer_id IS NOT NULL)',
            name='vote_target_check'
        ),
        db.CheckConstraint(
            "vote_type IN ('upvote', 'downvote')",
            name='vote_type_check'
        ),
        db.UniqueConstraint('user_id', 'question_id', 'answer_id', name='unique_user_vote')
    )

    def __repr__(self):
        target = f"Question {self.question_id}" if self.question_id else f"Answer {self.answer_id}"
        return f'<Vote {self.vote_type} on {target} by User {self.user_id}>'

    def to_dict(self):
        """Convert vote to dictionary for JSON response"""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'question_id': self.question_id,
            'answer_id': self.answer_id,
            'vote_type': self.vote_type,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

