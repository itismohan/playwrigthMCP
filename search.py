from flask import Blueprint, request, jsonify
from src.models import db, Question, User, Tag
from sqlalchemy import or_, and_, func

search_bp = Blueprint('search', __name__)

@search_bp.route('/search', methods=['GET'])
def global_search():
    """Global search across questions, users, and tags"""
    try:
        query_param = request.args.get('q', '').strip()
        search_type = request.args.get('type', 'questions')  # questions, users, tags, all
        page = request.args.get('page', 1, type=int)
        limit = request.args.get('limit', 20, type=int)
        
        if not query_param:
            return jsonify({
                'results': [],
                'pagination': {
                    'page': page,
                    'limit': limit,
                    'total': 0,
                    'pages': 0
                }
            }), 200
        
        # Validate limit
        if limit > 100:
            limit = 100
        
        results = []
        total = 0
        
        if search_type in ['questions', 'all']:
            question_results, question_total = search_questions(query_param, page, limit)
            results.extend(question_results)
            total += question_total
        
        if search_type in ['users', 'all']:
            user_results, user_total = search_users(query_param, page, limit)
            results.extend(user_results)
            total += user_total
        
        if search_type in ['tags', 'all']:
            tag_results, tag_total = search_tags(query_param, page, limit)
            results.extend(tag_results)
            total += tag_total
        
        # Sort results by relevance score if searching all types
        if search_type == 'all':
            results.sort(key=lambda x: x.get('score', 0), reverse=True)
        
        # Paginate results for 'all' search
        if search_type == 'all':
            start = (page - 1) * limit
            end = start + limit
            results = results[start:end]
        
        pages = (total + limit - 1) // limit
        
        return jsonify({
            'results': results,
            'pagination': {
                'page': page,
                'limit': limit,
                'total': total,
                'pages': pages,
                'has_next': page < pages,
                'has_prev': page > 1
            }
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'Search failed',
            'error': str(e)
        }), 500

def search_questions(query_param, page, limit):
    """Search questions by title and body"""
    search_term = f"%{query_param}%"
    
    query = Question.query.filter(
        or_(
            Question.title.ilike(search_term),
            Question.body.ilike(search_term)
        )
    ).order_by(
        # Prioritize title matches, then by votes
        func.case(
            (Question.title.ilike(search_term), 1),
            else_=0
        ).desc(),
        (Question.upvotes - Question.downvotes).desc()
    )
    
    if page and limit:
        questions = query.paginate(page=page, per_page=limit, error_out=False)
        total = questions.total
        items = questions.items
    else:
        items = query.all()
        total = len(items)
    
    results = []
    for question in items:
        # Calculate relevance score
        score = 0.5  # Base score
        if query_param.lower() in question.title.lower():
            score += 0.4
        if query_param.lower() in question.body.lower():
            score += 0.1
        
        # Create snippet
        body_lower = question.body.lower()
        query_lower = query_param.lower()
        snippet_start = max(0, body_lower.find(query_lower) - 50)
        snippet_end = min(len(question.body), snippet_start + 200)
        snippet = question.body[snippet_start:snippet_end]
        if snippet_start > 0:
            snippet = "..." + snippet
        if snippet_end < len(question.body):
            snippet = snippet + "..."
        
        results.append({
            'type': 'question',
            'id': question.id,
            'title': question.title,
            'snippet': snippet,
            'author': question.author.to_dict() if question.author else None,
            'tags': [tag.to_dict() for tag in question.tags],
            'upvotes': question.upvotes,
            'downvotes': question.downvotes,
            'views': question.views,
            'is_answered': question.is_answered,
            'created_at': question.created_at.isoformat() if question.created_at else None,
            'score': score
        })
    
    return results, total

def search_users(query_param, page, limit):
    """Search users by username and bio"""
    search_term = f"%{query_param}%"
    
    query = User.query.filter(
        and_(
            User.is_active == True,
            or_(
                User.username.ilike(search_term),
                User.bio.ilike(search_term)
            )
        )
    ).order_by(
        # Prioritize username matches, then by reputation
        func.case(
            (User.username.ilike(search_term), 1),
            else_=0
        ).desc(),
        User.reputation.desc()
    )
    
    if page and limit:
        users = query.paginate(page=page, per_page=limit, error_out=False)
        total = users.total
        items = users.items
    else:
        items = query.all()
        total = len(items)
    
    results = []
    for user in items:
        # Calculate relevance score
        score = 0.3  # Base score
        if query_param.lower() in user.username.lower():
            score += 0.5
        if user.bio and query_param.lower() in user.bio.lower():
            score += 0.2
        
        user_data = user.to_dict()
        user_data.update({
            'type': 'user',
            'question_count': user.get_question_count(),
            'answer_count': user.get_answer_count(),
            'score': score
        })
        results.append(user_data)
    
    return results, total

def search_tags(query_param, page, limit):
    """Search tags by name and description"""
    search_term = f"%{query_param}%"
    
    query = Tag.query.filter(
        or_(
            Tag.name.ilike(search_term),
            Tag.description.ilike(search_term)
        )
    ).order_by(
        # Prioritize exact name matches, then by usage
        func.case(
            (Tag.name.ilike(f"{query_param}%"), 1),
            else_=0
        ).desc(),
        Tag.usage_count.desc()
    )
    
    if page and limit:
        tags = query.paginate(page=page, per_page=limit, error_out=False)
        total = tags.total
        items = tags.items
    else:
        items = query.all()
        total = len(items)
    
    results = []
    for tag in items:
        # Calculate relevance score
        score = 0.2  # Base score
        if query_param.lower() == tag.name.lower():
            score += 0.6
        elif query_param.lower() in tag.name.lower():
            score += 0.4
        if tag.description and query_param.lower() in tag.description.lower():
            score += 0.2
        
        tag_data = tag.to_dict()
        tag_data.update({
            'type': 'tag',
            'score': score
        })
        results.append(tag_data)
    
    return results, total

@search_bp.route('/search/suggestions', methods=['GET'])
def search_suggestions():
    """Get search suggestions based on query"""
    try:
        query_param = request.args.get('q', '').strip()
        limit = request.args.get('limit', 5, type=int)
        
        if not query_param or len(query_param) < 2:
            return jsonify({'suggestions': []}), 200
        
        # Validate limit
        if limit > 20:
            limit = 20
        
        suggestions = []
        
        # Get question title suggestions
        search_term = f"{query_param}%"
        questions = Question.query.filter(
            Question.title.ilike(search_term)
        ).order_by(Question.views.desc()).limit(limit).all()
        
        for question in questions:
            suggestions.append({
                'type': 'question',
                'text': question.title,
                'id': question.id
            })
        
        # Get tag suggestions
        tags = Tag.query.filter(
            Tag.name.like(search_term)
        ).order_by(Tag.usage_count.desc()).limit(limit).all()
        
        for tag in tags:
            suggestions.append({
                'type': 'tag',
                'text': tag.name,
                'id': tag.id
            })
        
        # Limit total suggestions
        suggestions = suggestions[:limit]
        
        return jsonify({'suggestions': suggestions}), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'Failed to get suggestions',
            'error': str(e)
        }), 500

