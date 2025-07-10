import os
import sys
# DON'T CHANGE THIS !!!
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from flask import Flask, send_from_directory
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from datetime import timedelta

# Import all models to ensure they are registered with SQLAlchemy
from src.models import db, User, Question, Answer, Tag, Comment, Vote, Badge, UserBadge

# Import all route blueprints
from src.routes.auth import auth_bp
from src.routes.user import user_bp
from src.routes.question import question_bp
from src.routes.answer import answer_bp
from src.routes.tag import tag_bp
from src.routes.vote import vote_bp
from src.routes.comment import comment_bp
from src.routes.search import search_bp

app = Flask(__name__, static_folder=os.path.join(os.path.dirname(__file__), 'static'))

# Configuration
app.config['SECRET_KEY'] = 'asdf#FGSgvasgf$5$WGT'
app.config['JWT_SECRET_KEY'] = 'jwt-secret-string-change-in-production'
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=24)
app.config['SQLALCHEMY_DATABASE_URI'] = f"sqlite:///{os.path.join(os.path.dirname(__file__), 'database', 'app.db')}"
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Initialize extensions
jwt = JWTManager(app)
CORS(app, origins="*")  # Allow all origins for development

# Register blueprints
app.register_blueprint(auth_bp, url_prefix='/api/v1/auth')
app.register_blueprint(user_bp, url_prefix='/api/v1')
app.register_blueprint(question_bp, url_prefix='/api/v1')
app.register_blueprint(answer_bp, url_prefix='/api/v1')
app.register_blueprint(tag_bp, url_prefix='/api/v1')
app.register_blueprint(vote_bp, url_prefix='/api/v1')
app.register_blueprint(comment_bp, url_prefix='/api/v1')
app.register_blueprint(search_bp, url_prefix='/api/v1')

# Initialize database
db.init_app(app)

def create_default_badges():
    """Create default badges if they don't exist"""
    default_badges = [
        {
            'name': 'First Question',
            'description': 'Asked your first question',
            'badge_type': 'bronze',
            'criteria': 'Ask your first question'
        },
        {
            'name': 'First Answer',
            'description': 'Posted your first answer',
            'badge_type': 'bronze',
            'criteria': 'Post your first answer'
        },
        {
            'name': 'Popular Question',
            'description': 'Question with 100+ views',
            'badge_type': 'silver',
            'criteria': 'Question reaches 100 views'
        },
        {
            'name': 'Great Answer',
            'description': 'Answer with 10+ upvotes',
            'badge_type': 'silver',
            'criteria': 'Answer receives 10 or more upvotes'
        },
        {
            'name': 'Expert',
            'description': 'Reputation of 1000+',
            'badge_type': 'gold',
            'criteria': 'Reach 1000 reputation points'
        }
    ]
    
    for badge_data in default_badges:
        existing_badge = Badge.query.filter_by(name=badge_data['name']).first()
        if not existing_badge:
            badge = Badge(**badge_data)
            db.session.add(badge)
    
    db.session.commit()

with app.app_context():
    db.create_all()
    create_default_badges()

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    static_folder_path = app.static_folder
    if static_folder_path is None:
        return "Static folder not configured", 404

    if path != "" and os.path.exists(os.path.join(static_folder_path, path)):
        return send_from_directory(static_folder_path, path)
    else:
        index_path = os.path.join(static_folder_path, 'index.html')
        if os.path.exists(index_path):
            return send_from_directory(static_folder_path, 'index.html')
        else:
            return "index.html not found", 404

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)

