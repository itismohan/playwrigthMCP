from src.models.user import db
from datetime import datetime

# Association table for many-to-many relationship between questions and tags
question_tags = db.Table('question_tags',
    db.Column('question_id', db.Integer, db.ForeignKey('question.id'), primary_key=True),
    db.Column('tag_id', db.Integer, db.ForeignKey('tag.id'), primary_key=True)
)

class Question(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(255), nullable=False)
    body = db.Column(db.Text, nullable=False)
    author_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    views = db.Column(db.Integer, default=0)
    upvotes = db.Column(db.Integer, default=0)
    downvotes = db.Column(db.Integer, default=0)
    bounty_points = db.Column(db.Integer, default=0)
    is_answered = db.Column(db.Boolean, default=False)
    accepted_answer_id = db.Column(db.Integer, db.ForeignKey('answer.id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    answers = db.relationship('Answer', backref='question', lazy=True, cascade='all, delete-orphan',
                             foreign_keys='Answer.question_id')
    comments = db.relationship('Comment', backref='question', lazy=True, cascade='all, delete-orphan',
                              primaryjoin='Question.id == Comment.question_id')
    votes = db.relationship('Vote', backref='question', lazy=True, cascade='all, delete-orphan',
                           primaryjoin='Question.id == Vote.question_id')
    tags = db.relationship('Tag', secondary=question_tags, lazy='subquery',
                          backref=db.backref('questions', lazy=True))
    accepted_answer = db.relationship('Answer', foreign_keys=[accepted_answer_id], post_update=True)

    def __repr__(self):
        return f'<Question {self.title[:50]}>'

    def to_dict(self, include_body=True, include_answers=False):
        """Convert question to dictionary for JSON response"""
        data = {
            'id': self.id,
            'title': self.title,
            'author': self.author.to_dict() if self.author else None,
            'tags': [tag.to_dict() for tag in self.tags],
            'upvotes': self.upvotes,
            'downvotes': self.downvotes,
            'views': self.views,
            'bounty_points': self.bounty_points,
            'is_answered': self.is_answered,
            'accepted_answer_id': self.accepted_answer_id,
            'answer_count': len(self.answers),
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
        
        if include_body:
            data['body'] = self.body
            
        if include_answers:
            data['answers'] = [answer.to_dict() for answer in self.answers]
            data['comments'] = [comment.to_dict() for comment in self.comments 
                               if comment.question_id == self.id]
            
        return data

    def increment_views(self):
        """Increment the view count for this question"""
        self.views += 1
        db.session.commit()

    def update_vote_counts(self):
        """Update upvote and downvote counts based on votes"""
        upvotes = sum(1 for vote in self.votes if vote.vote_type == 'upvote')
        downvotes = sum(1 for vote in self.votes if vote.vote_type == 'downvote')
        self.upvotes = upvotes
        self.downvotes = downvotes
        db.session.commit()

    def mark_as_answered(self, answer_id):
        """Mark this question as answered with the given answer"""
        self.is_answered = True
        self.accepted_answer_id = answer_id
        db.session.commit()

