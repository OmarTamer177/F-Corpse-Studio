from flask import Blueprint, request, jsonify
from models import Blog, User
from extensions import db
from flask_jwt_extended import jwt_required, get_jwt_identity

blogs_bp = Blueprint('blogs', __name__)

from rbac import get_current_user, ROLE_ADMIN

def is_admin_user():
    user = get_current_user()
    return bool(user and (user.is_admin or getattr(user, 'role', None) == ROLE_ADMIN))


def validate_blog_payload(data, partial=False):
    if not isinstance(data, dict):
        return None, "Invalid request payload"

    cleaned = {}

    if 'title' in data or not partial:
        title = data.get('title')
        if not isinstance(title, str) or not title.strip():
            return None, "Title is required."
        title = title.strip()
        if len(title) > 200:
            return None, "Title must be 200 characters or fewer."
        cleaned['title'] = title

    if 'content' in data or not partial:
        content = data.get('content')
        if not isinstance(content, str) or not content.strip():
            return None, "Content is required."
        cleaned['content'] = content.strip()

    if 'author' in data:
        author = data.get('author')
        if author is not None and not isinstance(author, str):
            return None, "Author must be text."
        author = (author or '').strip()
        if len(author) > 100:
            return None, "Author must be 100 characters or fewer."
        cleaned['author'] = author or None

    if 'category' in data:
        cat = data.get('category')
        if cat is not None and not isinstance(cat, str):
            return None, "Category must be text."
        cat = (cat or '').strip()
        if len(cat) > 50:
            return None, "Category must be 50 characters or fewer."
        cleaned['category'] = cat or 'General'

    return cleaned, None


@blogs_bp.route('/', methods=['GET'])
def list_blogs():
    """
    List blog posts with backend-powered search and multi-criteria filtering.
    Supported query params:
      - search / q: Substring match across title, content, and author
      - category: Filter by discipline / category (case-insensitive, or 'all')
      - author: Filter by author name (case-insensitive, or 'all')
      - sort: 'newest' (default), 'oldest', 'alpha_asc'
    """
    query = Blog.query

    # Keyword search across title, content, and author
    search = (request.args.get('search') or request.args.get('q') or '').strip()
    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            (Blog.title.ilike(search_pattern)) |
            (Blog.content.ilike(search_pattern)) |
            (Blog.author.ilike(search_pattern))
        )

    # Category filter (Criterion 1)
    category = request.args.get('category', '').strip()
    if category and category.lower() != 'all':
        query = query.filter(Blog.category.ilike(category))

    # Author filter (Criterion 2)
    author = request.args.get('author', '').strip()
    if author and author.lower() != 'all':
        query = query.filter(Blog.author.ilike(author))

    # Sorting (Criterion 3)
    sort_by = request.args.get('sort', 'newest').strip().lower()
    if sort_by == 'oldest':
        query = query.order_by(Blog.created_at.asc())
    elif sort_by == 'alpha_asc':
        query = query.order_by(Blog.title.asc())
    else:  # 'newest' or default
        query = query.order_by(Blog.created_at.desc())

    blogs = query.all()
    return jsonify([b.to_dict() for b in blogs]), 200


@blogs_bp.route('/meta', methods=['GET'])
def get_blogs_meta():
    """
    Returns available dynamic filter criteria (categories, authors, and sort options)
    from current database records.
    """
    raw_cats = db.session.query(Blog.category).distinct().all()
    categories = sorted(list(set(c[0] for c in raw_cats if c[0])))

    raw_authors = db.session.query(Blog.author).distinct().all()
    authors = sorted(list(set(a[0] for a in raw_authors if a[0])))

    return jsonify({
        "categories": categories,
        "authors": authors,
        "sort_options": [
            {"id": "newest", "label": "Newest First"},
            {"id": "oldest", "label": "Oldest First"},
            {"id": "alpha_asc", "label": "Alphabetical (A–Z)"}
        ]
    }), 200


@blogs_bp.route('/<int:blog_id>', methods=['GET'])
def get_blog(blog_id):
    blog = db.session.get(Blog, blog_id)
    if not blog:
        return jsonify({"error": "Blog post not found."}), 404
    return jsonify(blog.to_dict()), 200


@blogs_bp.route('/', methods=['POST'])
@jwt_required()
def create_blog():
    if not is_admin_user():
        return jsonify({"error": "Unauthorized. Admin access required."}), 403
        
    data = request.get_json(silent=True)
    cleaned, error = validate_blog_payload(data)
    if error:
        return jsonify({"error": error}), 400

    try:
        blog = Blog(
            title=cleaned['title'],
            content=cleaned['content'],
            author=cleaned.get('author'),
            category=cleaned.get('category', 'General')
        )
        db.session.add(blog)
        db.session.commit()
        return jsonify(blog.to_dict()), 201
    except Exception:
        db.session.rollback()
        return jsonify({"error": "An error occurred while saving to the database."}), 500


@blogs_bp.route('/<int:blog_id>', methods=['PUT'])
@jwt_required()
def update_blog(blog_id):
    if not is_admin_user():
        return jsonify({"error": "Unauthorized. Admin access required."}), 403
        
    blog = db.session.get(Blog, blog_id)
    if not blog:
        return jsonify({"error": "Blog post not found."}), 404

    data = request.get_json(silent=True)
    cleaned, error = validate_blog_payload(data, partial=True)
    if error:
        return jsonify({"error": error}), 400
    if not cleaned:
        return jsonify({"error": "No fields provided to update."}), 400

    try:
        if 'title' in cleaned:
            blog.title = cleaned['title']
        if 'content' in cleaned:
            blog.content = cleaned['content']
        if 'author' in cleaned:
            blog.author = cleaned['author']
        if 'category' in cleaned:
            blog.category = cleaned['category']
        db.session.commit()
        return jsonify(blog.to_dict()), 200
    except Exception:
        db.session.rollback()
        return jsonify({"error": "An error occurred while updating the database."}), 500


@blogs_bp.route('/<int:blog_id>', methods=['DELETE'])
@jwt_required()
def delete_blog(blog_id):
    if not is_admin_user():
        return jsonify({"error": "Unauthorized. Admin access required."}), 403
        
    blog = db.session.get(Blog, blog_id)
    if not blog:
        return jsonify({"error": "Blog post not found."}), 404

    try:
        db.session.delete(blog)
        db.session.commit()
        return jsonify({"success": True, "message": "Blog post deleted."}), 200
    except Exception:
        db.session.rollback()
        return jsonify({"error": "An error occurred while deleting the record."}), 500
