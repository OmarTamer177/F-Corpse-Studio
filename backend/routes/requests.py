import re
from flask import Blueprint, request, jsonify
from extensions import db
from models import ServiceRequest, User
from flask_jwt_extended import jwt_required, get_jwt_identity

requests_bp = Blueprint('requests', __name__)

EMAIL_REGEX = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
ALLOWED_STATUSES = ['Pending', 'In Review', 'In Progress', 'Completed', 'Rejected']
ALLOWED_PRIORITIES = ['Low', 'Normal', 'High', 'Urgent']

from rbac import get_current_user, has_permission, has_role, ROLE_ADMIN, ROLE_EMPLOYEE

def is_admin_user():
    user = get_current_user()
    return bool(user and (user.is_admin or getattr(user, 'role', None) == ROLE_ADMIN))



def validate_request_payload(data):
    if not isinstance(data, dict):
        return None, "Invalid request payload format."

    cleaned = {}

    name = data.get('name')
    if not isinstance(name, str) or not name.strip():
        return None, "Full name is required."
    name = name.strip()
    if len(name) > 100:
        return None, "Name must be 100 characters or fewer."
    cleaned['name'] = name

    email = data.get('email')
    if not isinstance(email, str) or not email.strip():
        return None, "Email address is required."
    email = email.strip().lower()
    if len(email) > 120 or not EMAIL_REGEX.match(email):
        return None, "A valid email address is required."
    cleaned['email'] = email

    service_title = data.get('service_title')
    if not isinstance(service_title, str) or not service_title.strip():
        return None, "Service title is required."
    service_title = service_title.strip()
    if len(service_title) > 200:
        return None, "Service title must be 200 characters or fewer."
    cleaned['service_title'] = service_title

    message = data.get('message')
    if not isinstance(message, str) or not message.strip():
        return None, "Project description / message is required."
    message = message.strip()
    if len(message) < 5:
        return None, "Please provide at least a brief description of your request."
    cleaned['message'] = message

    # Optional fields
    phone = data.get('phone')
    if phone is not None:
        if not isinstance(phone, str):
            return None, "Phone number must be text."
        phone = phone.strip()
        if len(phone) > 50:
            return None, "Phone number must be 50 characters or fewer."
    cleaned['phone'] = phone or None

    company = data.get('company')
    if company is not None:
        if not isinstance(company, str):
            return None, "Company name must be text."
        company = company.strip()
        if len(company) > 150:
            return None, "Company name must be 150 characters or fewer."
    cleaned['company'] = company or None

    priority = data.get('priority', 'Normal')
    if priority not in ALLOWED_PRIORITIES:
        priority = 'Normal'
    cleaned['priority'] = priority

    service_id = data.get('service_id')
    if service_id is not None:
        try:
            cleaned['service_id'] = int(service_id)
        except (ValueError, TypeError):
            cleaned['service_id'] = None
    else:
        cleaned['service_id'] = None

    return cleaned, None


# ── Customer / Public Endpoints ──

@requests_bp.route('/', methods=['POST'])
@jwt_required(optional=True)
def submit_request():
    """
    Submits a new customer service request.
    Publicly accessible; automatically attaches user_id if token is present.
    """
    data = request.get_json(silent=True)
    cleaned, error = validate_request_payload(data)
    if error:
        return jsonify({"error": error}), 400

    current_user_id = get_jwt_identity()
    user_id = None
    if current_user_id:
        try:
            user = db.session.get(User, int(current_user_id))
            if user:
                user_id = user.id
        except (ValueError, TypeError):
            user_id = None

    try:
        new_request = ServiceRequest(
            user_id=user_id,
            service_id=cleaned.get('service_id'),
            service_title=cleaned['service_title'],
            name=cleaned['name'],
            email=cleaned['email'],
            phone=cleaned.get('phone'),
            company=cleaned.get('company'),
            message=cleaned['message'],
            priority=cleaned.get('priority', 'Normal'),
            status='Pending'
        )
        db.session.add(new_request)
        db.session.commit()
        return jsonify(new_request.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to record service request in database."}), 500


@requests_bp.route('/my', methods=['GET'])
@jwt_required()
def get_my_requests():
    """
    Retrieves all service requests for the logged-in customer.
    Matches by user_id OR user's account email.
    """
    current_user_id = get_jwt_identity()
    user = db.session.get(User, int(current_user_id)) if current_user_id else None
    if not user:
        return jsonify({"error": "User account not found."}), 404

    requests_list = ServiceRequest.query.filter(
        (ServiceRequest.user_id == user.id) | (ServiceRequest.email == user.email)
    ).order_by(ServiceRequest.created_at.desc()).all()

    return jsonify([r.to_dict() for r in requests_list]), 200


@requests_bp.route('/<int:request_id>', methods=['GET'])
@jwt_required()
def get_request_detail(request_id):
    """
    View full request details. Allowed for Admin or Request owner.
    """
    user = get_current_user()
    if not user:
        return jsonify({"error": "Unauthorized."}), 401

    item = db.session.get(ServiceRequest, request_id)
    if not item:
        return jsonify({"error": "Service request not found."}), 404

    # Allow if staff (Admin or Employee) OR if requester matches this user
    is_staff = has_role(user, ROLE_ADMIN, ROLE_EMPLOYEE) or user.is_admin
    is_owner = (item.user_id == user.id) or (item.email.lower() == user.email.lower())
    if not is_staff and not is_owner:
        return jsonify({"error": "Unauthorized access to this request."}), 403

    return jsonify(item.to_dict()), 200


# ── Company / Admin Endpoints ──

@requests_bp.route('/', methods=['GET'])
@jwt_required()
def list_all_requests():
    """
    Lists all service requests for company staff management.
    Supports filtering by ?status=... and text search with ?search=...
    """
    user = get_current_user()
    if not user or not (has_permission(user, 'requests:view_all') or user.is_admin):
        return jsonify({"error": "Unauthorized. Staff access required."}), 403

    query = ServiceRequest.query

    # Status filter
    status_filter = request.args.get('status', '').strip()
    if status_filter and status_filter.lower() != 'all':
        query = query.filter(ServiceRequest.status.ilike(status_filter))

    # Priority filter
    priority_filter = request.args.get('priority', '').strip()
    if priority_filter and priority_filter.lower() != 'all':
        query = query.filter(ServiceRequest.priority.ilike(priority_filter))

    # Keyword search across name, email, company, service_title, message
    search = request.args.get('search', '').strip()
    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            (ServiceRequest.name.ilike(search_pattern)) |
            (ServiceRequest.email.ilike(search_pattern)) |
            (ServiceRequest.company.ilike(search_pattern)) |
            (ServiceRequest.service_title.ilike(search_pattern)) |
            (ServiceRequest.message.ilike(search_pattern))
        )

    requests_list = query.order_by(ServiceRequest.created_at.desc()).all()
    return jsonify([r.to_dict() for r in requests_list]), 200


@requests_bp.route('/stats', methods=['GET'])
@jwt_required()
def get_request_stats():
    """
    Returns summary counts for company dashboard KPI cards.
    Accessible to Administrator and Employee.
    """
    user = get_current_user()
    if not user or not (has_permission(user, 'requests:view_stats') or user.is_admin):
        return jsonify({"error": "Unauthorized. Staff access required."}), 403

    total = ServiceRequest.query.count()
    pending = ServiceRequest.query.filter_by(status='Pending').count()
    in_review = ServiceRequest.query.filter_by(status='In Review').count()
    in_progress = ServiceRequest.query.filter_by(status='In Progress').count()
    completed = ServiceRequest.query.filter_by(status='Completed').count()
    rejected = ServiceRequest.query.filter_by(status='Rejected').count()
    urgent = ServiceRequest.query.filter_by(priority='Urgent').count()

    return jsonify({
        "total": total,
        "pending": pending,
        "in_review": in_review,
        "in_progress": in_progress,
        "completed": completed,
        "rejected": rejected,
        "urgent": urgent
    }), 200


@requests_bp.route('/<int:request_id>', methods=['PUT'])
@jwt_required()
def update_request(request_id):
    """
    Staff (Administrator or Employee) updates request status, priority, admin notes, or estimated cost.
    """
    user = get_current_user()
    if not user or not (has_permission(user, 'requests:update') or user.is_admin):
        return jsonify({"error": "Unauthorized. Staff access required."}), 403

    item = db.session.get(ServiceRequest, request_id)
    if not item:
        return jsonify({"error": "Service request not found."}), 404

    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({"error": "Invalid request payload format."}), 400

    try:
        if 'status' in data:
            status = data['status']
            if status not in ALLOWED_STATUSES:
                return jsonify({"error": f"Invalid status. Must be one of: {', '.join(ALLOWED_STATUSES)}"}), 400
            item.status = status

        if 'priority' in data:
            priority = data['priority']
            if priority not in ALLOWED_PRIORITIES:
                return jsonify({"error": f"Invalid priority. Must be one of: {', '.join(ALLOWED_PRIORITIES)}"}), 400
            item.priority = priority

        if 'admin_notes' in data:
            notes = data['admin_notes']
            item.admin_notes = notes.strip() if isinstance(notes, str) else None

        if 'estimated_cost' in data:
            cost = data['estimated_cost']
            item.estimated_cost = cost.strip() if isinstance(cost, str) else None

        db.session.commit()
        return jsonify(item.to_dict()), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to update service request."}), 500


@requests_bp.route('/<int:request_id>', methods=['DELETE'])
@jwt_required()
def delete_request(request_id):
    """
    Administrator deletes a service request record.
    Employees and Customers are forbidden.
    """
    user = get_current_user()
    if not user or not (has_permission(user, 'requests:delete') or user.is_admin):
        return jsonify({"error": "Unauthorized. Admin access required."}), 403

    item = db.session.get(ServiceRequest, request_id)
    if not item:
        return jsonify({"error": "Service request not found."}), 404

    try:
        db.session.delete(item)
        db.session.commit()
        return jsonify({"success": True, "message": "Service request deleted."}), 200
    except Exception:
        db.session.rollback()
        return jsonify({"error": "Failed to delete service request."}), 500
