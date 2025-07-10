from src.models.user import db
from datetime import datetime

class Answer(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    content = db.Column(db.Text, nullable=False)
    question_id = db.Column(db.Integer, db.ForeignKey('question.id'), nullable=False)
    author_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    upvotes = db.Column(db.Integer, default=0)
    downvotes = db.Column(db.Integer, default=0)
    is_accepted = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    comments = db.relationship('Comment', backref='answer', lazy=True, cascade='all, delete-orphan',
                              primaryjoin='Answer.id == Comment.answer_id')
    votes = db.relationship('Vote', backref='answer', lazy=True, cascade='all, delete-orphan',
                           primaryjoin='Answer.id == Vote.answer_id')

    def __repr__(self):
        return f'<Answer {self.id} for Question {self.question_id}>'

    def to_dict(self):
        """Convert answer to dictionary for JSON response"""
        return {
            'id': self.id,
            'content': self.content,
            'question_id': self.question_id,
            'author': self.author.to_dict() if self.author else None,
            'upvotes': self.upvotes,
            'downvotes': self.downvotes,
            'is_accepted': self.is_accepted,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

    def update_vote_counts(self):
        """Update upvote and downvote counts based on votes"""
        upvotes = sum(1 for vote in self.votes if vote.vote_type == 'upvote')
        downvotes = sum(1 for vote in self.votes if vote.vote_type == 'downvote')
        self.upvotes = upvotes
        self.downvotes = downvotes
        db.session.commit()

    def accept(self):
        """Mark this answer as accepted"""
        # First, unaccept any other answers for this question
        other_answers = Answer.query.filter_by(question_id=self.question_id, is_accepted=True).all()
        for answer in other_answers:
            answer.is_accepted = False
        
        # Accept this answer
        self.is_accepted = True
        
        # Update the question
        from src.models.question import Question
        question = Question.query.get(self.question_id)
        if question:
            question.mark_as_answered(self.id)
        
        db.session.commit()

