# API Specification

## Base URL
```
http://localhost:5000/api/v1
```

## Authentication
- JWT tokens for authenticated requests
- Include `Authorization: Bearer <token>` header for protected endpoints

## User Authentication Endpoints

### POST /auth/register
Register a new user
```json
{
  "username": "string",
  "email": "string", 
  "password": "string"
}
```
Response:
```json
{
  "success": true,
  "message": "User registered successfully",
  "user": {
    "id": 1,
    "username": "john_doe",
    "email": "john@example.com",
    "reputation": 0
  },
  "token": "jwt_token_here"
}
```

### POST /auth/login
Login user
```json
{
  "email": "string",
  "password": "string"
}
```
Response:
```json
{
  "success": true,
  "message": "Login successful",
  "user": {
    "id": 1,
    "username": "john_doe",
    "email": "john@example.com",
    "reputation": 150
  },
  "token": "jwt_token_here"
}
```

### GET /auth/me
Get current user profile (Protected)
Response:
```json
{
  "id": 1,
  "username": "john_doe",
  "email": "john@example.com",
  "bio": "Software developer",
  "reputation": 150,
  "avatar_url": "https://example.com/avatar.jpg",
  "created_at": "2024-01-01T00:00:00Z"
}
```

## User Endpoints

### GET /users/{user_id}
Get user profile
Response:
```json
{
  "id": 1,
  "username": "john_doe",
  "bio": "Software developer",
  "reputation": 150,
  "avatar_url": "https://example.com/avatar.jpg",
  "badges": [
    {
      "id": 1,
      "name": "First Question",
      "badge_type": "bronze",
      "earned_at": "2024-01-01T00:00:00Z"
    }
  ],
  "question_count": 5,
  "answer_count": 12,
  "created_at": "2024-01-01T00:00:00Z"
}
```

### PUT /users/profile
Update user profile (Protected)
```json
{
  "bio": "string",
  "avatar_url": "string"
}
```

## Question Endpoints

### GET /questions
Get questions with pagination and filtering
Query parameters:
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)
- `sort`: Sort by (newest, oldest, votes, views)
- `tags`: Comma-separated tag names
- `search`: Search query
- `unanswered`: Boolean (only unanswered questions)

Response:
```json
{
  "questions": [
    {
      "id": 1,
      "title": "How to implement authentication in Flask?",
      "body": "I'm trying to implement...",
      "author": {
        "id": 1,
        "username": "john_doe",
        "reputation": 150
      },
      "tags": [
        {
          "id": 1,
          "name": "flask",
          "color": "#007acc"
        }
      ],
      "upvotes": 5,
      "downvotes": 0,
      "views": 100,
      "answer_count": 3,
      "is_answered": true,
      "created_at": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "pages": 5
  }
}
```

### GET /questions/{question_id}
Get question details with answers
Response:
```json
{
  "id": 1,
  "title": "How to implement authentication in Flask?",
  "body": "I'm trying to implement...",
  "author": {
    "id": 1,
    "username": "john_doe",
    "reputation": 150
  },
  "tags": [
    {
      "id": 1,
      "name": "flask",
      "color": "#007acc"
    }
  ],
  "upvotes": 5,
  "downvotes": 0,
  "views": 100,
  "bounty_points": 0,
  "is_answered": true,
  "accepted_answer_id": 2,
  "answers": [
    {
      "id": 2,
      "content": "You can use Flask-Login...",
      "author": {
        "id": 2,
        "username": "jane_doe",
        "reputation": 200
      },
      "upvotes": 8,
      "downvotes": 0,
      "is_accepted": true,
      "created_at": "2024-01-01T01:00:00Z"
    }
  ],
  "comments": [
    {
      "id": 1,
      "content": "Great question!",
      "author": {
        "id": 3,
        "username": "bob_smith",
        "reputation": 50
      },
      "created_at": "2024-01-01T00:30:00Z"
    }
  ],
  "created_at": "2024-01-01T00:00:00Z"
}
```

### POST /questions
Create new question (Protected)
```json
{
  "title": "string",
  "body": "string",
  "tags": ["tag1", "tag2"],
  "bounty_points": 0
}
```

### PUT /questions/{question_id}
Update question (Protected, author only)
```json
{
  "title": "string",
  "body": "string",
  "tags": ["tag1", "tag2"]
}
```

### DELETE /questions/{question_id}
Delete question (Protected, author only)

## Answer Endpoints

### POST /questions/{question_id}/answers
Create new answer (Protected)
```json
{
  "content": "string"
}
```

### PUT /answers/{answer_id}
Update answer (Protected, author only)
```json
{
  "content": "string"
}
```

### DELETE /answers/{answer_id}
Delete answer (Protected, author only)

### POST /answers/{answer_id}/accept
Accept answer (Protected, question author only)

## Voting Endpoints

### POST /questions/{question_id}/vote
Vote on question (Protected)
```json
{
  "vote_type": "upvote" | "downvote"
}
```

### POST /answers/{answer_id}/vote
Vote on answer (Protected)
```json
{
  "vote_type": "upvote" | "downvote"
}
```

### DELETE /questions/{question_id}/vote
Remove vote from question (Protected)

### DELETE /answers/{answer_id}/vote
Remove vote from answer (Protected)

## Comment Endpoints

### POST /questions/{question_id}/comments
Add comment to question (Protected)
```json
{
  "content": "string"
}
```

### POST /answers/{answer_id}/comments
Add comment to answer (Protected)
```json
{
  "content": "string"
}
```

### DELETE /comments/{comment_id}
Delete comment (Protected, author only)

## Tag Endpoints

### GET /tags
Get all tags with usage statistics
Query parameters:
- `search`: Search tag names
- `sort`: Sort by (name, usage)
- `limit`: Number of tags to return

Response:
```json
{
  "tags": [
    {
      "id": 1,
      "name": "flask",
      "description": "Python web framework",
      "color": "#007acc",
      "usage_count": 150
    }
  ]
}
```

### GET /tags/{tag_name}/questions
Get questions by tag (same format as GET /questions)

## Search Endpoints

### GET /search
Global search across questions
Query parameters:
- `q`: Search query
- `type`: Search type (questions, users, tags)
- `page`: Page number
- `limit`: Items per page

Response:
```json
{
  "results": [
    {
      "type": "question",
      "id": 1,
      "title": "How to implement authentication in Flask?",
      "snippet": "I'm trying to implement authentication...",
      "score": 0.95
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 50
  }
}
```

## Error Responses

All endpoints return errors in this format:
```json
{
  "success": false,
  "message": "Error description",
  "errors": {
    "field_name": ["Validation error message"]
  }
}
```

Common HTTP status codes:
- 200: Success
- 201: Created
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 422: Validation Error
- 500: Internal Server Error

