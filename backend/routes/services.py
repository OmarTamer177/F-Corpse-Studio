from flask import Blueprint, request, jsonify
from models import Service, User
from extensions import db
from flask_jwt_extended import jwt_required, get_jwt_identity

services_bp = Blueprint('services', __name__)

from rbac import get_current_user, ROLE_ADMIN

def is_admin_user():
    user = get_current_user()
    return bool(user and (user.is_admin or getattr(user, 'role', None) == ROLE_ADMIN))


def validate_service_payload(data, partial=False):
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

    if 'description' in data or not partial:
        description = data.get('description')
        if not isinstance(description, str) or not description.strip():
            return None, "Description is required."
        cleaned['description'] = description.strip()

    if 'icon' in data:
        icon = data.get('icon')
        if icon is not None and not isinstance(icon, str):
            return None, "Icon must be text."
        icon = (icon or '').strip()
        if len(icon) > 50:
            return None, "Icon must be 50 characters or fewer."
        cleaned['icon'] = icon or None

    if 'price' in data:
        price = data.get('price')
        if price is not None and not isinstance(price, str):
            return None, "Price must be text."
        price = (price or '').strip()
        if len(price) > 100:
            return None, "Price must be 100 characters or fewer."
        cleaned['price'] = price or None

    if 'category' in data:
        cat = data.get('category')
        if cat is not None and not isinstance(cat, str):
            return None, "Category must be text."
        cat = (cat or '').strip()
        if len(cat) > 50:
            return None, "Category must be 50 characters or fewer."
        cleaned['category'] = cat or 'General'

    return cleaned, None


# Public endpoints — no authentication required

@services_bp.route('/', methods=['GET'])
def list_services():
    """
    List services with backend-powered search and multi-criteria filtering.
    Supported query params:
      - search / q: Substring match across title and description
      - category: Filter by discipline / category (case-insensitive, or 'all')
      - pricing: Filter by pricing model ('all', 'quote'/'commission', 'fixed'/'tiered')
      - sort: 'newest' (default), 'oldest', 'alpha_asc', 'alpha_desc'
    """
    query = Service.query

    # Keyword search across title and description
    search = (request.args.get('search') or request.args.get('q') or '').strip()
    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            (Service.title.ilike(search_pattern)) |
            (Service.description.ilike(search_pattern))
        )

    # Category filter (Criterion 1)
    category = request.args.get('category', '').strip()
    if category and category.lower() != 'all':
        query = query.filter(Service.category.ilike(category))

    # Pricing filter (Criterion 2)
    pricing = request.args.get('pricing', '').strip().lower()
    if pricing and pricing != 'all':
        if pricing in ['quote', 'commission', 'bespoke']:
            query = query.filter(
                (Service.price.ilike('%contact%')) |
                (Service.price.ilike('%quote%')) |
                (Service.price.ilike('%commission%')) |
                (Service.price.ilike('%bespoke%'))
            )
        elif pricing in ['fixed', 'tiered', 'priced']:
            query = query.filter(
                (Service.price.ilike('%$%')) |
                (Service.price.ilike('%fixed%')) |
                (Service.price.ilike('%from%'))
            )
        else:
            query = query.filter(Service.price.ilike(f"%{pricing}%"))

    # Sorting (Criterion 3)
    sort_by = request.args.get('sort', 'newest').strip().lower()
    if sort_by == 'oldest':
        query = query.order_by(Service.created_at.asc())
    elif sort_by == 'alpha_asc':
        query = query.order_by(Service.title.asc())
    elif sort_by == 'alpha_desc':
        query = query.order_by(Service.title.desc())
    else:  # 'newest' or default
        query = query.order_by(Service.created_at.desc())

    services = query.all()
    return jsonify([s.to_dict() for s in services]), 200


@services_bp.route('/meta', methods=['GET'])
def get_services_meta():
    """
    Returns available dynamic filter criteria (categories and pricing options)
    from current database records.
    """
    raw_cats = db.session.query(Service.category).distinct().all()
    categories = sorted(list(set(c[0] for c in raw_cats if c[0])))

    return jsonify({
        "categories": categories,
        "pricing_options": [
            {"id": "all", "label": "All Pricing Models"},
            {"id": "quote", "label": "Custom Quote / Commission"},
            {"id": "fixed", "label": "Fixed / Tiered Pricing"}
        ],
        "sort_options": [
            {"id": "newest", "label": "Newest First"},
            {"id": "oldest", "label": "Oldest First"},
            {"id": "alpha_asc", "label": "Alphabetical (A–Z)"},
            {"id": "alpha_desc", "label": "Alphabetical (Z–A)"}
        ]
    }), 200


@services_bp.route('/<int:service_id>', methods=['GET'])
def get_service(service_id):
    service = db.session.get(Service, service_id)
    if not service:
        return jsonify({"error": "Service not found."}), 404
    return jsonify(service.to_dict()), 200


# Admin-only endpoints

@services_bp.route('/', methods=['POST'])
@jwt_required()
def create_service():
    if not is_admin_user():
        return jsonify({"error": "Unauthorized. Admin access required."}), 403

    data = request.get_json(silent=True)
    cleaned, error = validate_service_payload(data)
    if error:
        return jsonify({"error": error}), 400

    try:
        service = Service(
            title=cleaned['title'],
            description=cleaned['description'],
            icon=cleaned.get('icon'),
            price=cleaned.get('price'),
            category=cleaned.get('category', 'General')
        )
        db.session.add(service)
        db.session.commit()
        return jsonify(service.to_dict()), 201
    except Exception:
        db.session.rollback()
        return jsonify({"error": "An error occurred while saving to the database."}), 500


@services_bp.route('/<int:service_id>', methods=['PUT'])
@jwt_required()
def update_service(service_id):
    if not is_admin_user():
        return jsonify({"error": "Unauthorized. Admin access required."}), 403

    service = db.session.get(Service, service_id)
    if not service:
        return jsonify({"error": "Service not found."}), 404

    data = request.get_json(silent=True)
    cleaned, error = validate_service_payload(data, partial=True)
    if error:
        return jsonify({"error": error}), 400
    if not cleaned:
        return jsonify({"error": "No fields provided to update."}), 400

    try:
        if 'title' in cleaned:
            service.title = cleaned['title']
        if 'description' in cleaned:
            service.description = cleaned['description']
        if 'icon' in cleaned:
            service.icon = cleaned['icon']
        if 'price' in cleaned:
            service.price = cleaned['price']
        if 'category' in cleaned:
            service.category = cleaned['category']
        db.session.commit()
        return jsonify(service.to_dict()), 200
    except Exception:
        db.session.rollback()
        return jsonify({"error": "An error occurred while updating the database."}), 500


@services_bp.route('/<int:service_id>', methods=['DELETE'])
@jwt_required()
def delete_service(service_id):
    if not is_admin_user():
        return jsonify({"error": "Unauthorized. Admin access required."}), 403

    service = db.session.get(Service, service_id)
    if not service:
        return jsonify({"error": "Service not found."}), 404

    try:
        db.session.delete(service)
        db.session.commit()
        return jsonify({"success": True, "message": "Service deleted."}), 200
    except Exception:
        db.session.rollback()
        return jsonify({"error": "An error occurred while deleting the record."}), 500
