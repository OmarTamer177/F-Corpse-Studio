import re
from flask import Blueprint, request, jsonify
from extensions import db
from models import Client, User
from flask_jwt_extended import jwt_required
from rbac import (
    get_current_user,
    get_user_role,
    permission_required,
    role_required,
    ROLE_ADMIN,
    ROLE_EMPLOYEE,
    ROLE_CUSTOMER
)

clients_bp = Blueprint('clients', __name__)
EMAIL_REGEX = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def validate_client_payload(data, is_update=False):
    if not isinstance(data, dict):
        return None, "Invalid request payload format."

    cleaned = {}

    if not is_update or 'name' in data:
        name = data.get('name')
        if not isinstance(name, str) or not name.strip():
            return None, "Client or contact name is required."
        name = name.strip()
        if len(name) > 150:
            return None, "Name must be 150 characters or fewer."
        cleaned['name'] = name

    if not is_update or 'email' in data:
        email = data.get('email')
        if not isinstance(email, str) or not email.strip():
            return None, "Email address is required."
        email = email.strip().lower()
        if len(email) > 120 or not EMAIL_REGEX.match(email):
            return None, "A valid email address is required."
        cleaned['email'] = email

    if 'company' in data:
        company = data.get('company')
        if company:
            company = str(company).strip()
            if len(company) > 150:
                return None, "Company name must be 150 characters or fewer."
            cleaned['company'] = company
        else:
            cleaned['company'] = None

    if 'phone' in data:
        phone = data.get('phone')
        if phone:
            phone = str(phone).strip()
            if len(phone) > 50:
                return None, "Phone number must be 50 characters or fewer."
            cleaned['phone'] = phone
        else:
            cleaned['phone'] = None

    if 'notes' in data:
        notes = data.get('notes')
        cleaned['notes'] = str(notes).strip() if notes else None

    if 'user_id' in data:
        uid = data.get('user_id')
        if uid is not None and uid != '':
            try:
                cleaned['user_id'] = int(uid)
            except (ValueError, TypeError):
                return None, "User ID must be an integer."
        else:
            cleaned['user_id'] = None

    return cleaned, None


@clients_bp.route('', methods=['GET'])
@jwt_required()
def list_clients():
    """List clients. Staff sees all; customers see their own client record."""
    current_user = get_current_user()
    if not current_user:
        return jsonify({"error": "User account not found."}), 404

    role = get_user_role(current_user)

    if role in [ROLE_ADMIN, ROLE_EMPLOYEE]:
        query = Client.query
        search = request.args.get('search', '').strip()
        if search:
            search_pattern = f"%{search}%"
            query = query.filter(
                (Client.name.ilike(search_pattern)) |
                (Client.company.ilike(search_pattern)) |
                (Client.email.ilike(search_pattern))
            )
        clients = query.order_by(Client.name.asc()).all()
    else:
        # Customer sees their linked client record(s)
        clients = Client.query.filter(
            (Client.user_id == current_user.id) |
            (Client.email == current_user.email.lower())
        ).order_by(Client.name.asc()).all()

    return jsonify([c.to_dict() for c in clients]), 200


@clients_bp.route('/<int:client_id>', methods=['GET'])
@jwt_required()
def get_client(client_id):
    """Retrieve single client details including project history."""
    current_user = get_current_user()
    if not current_user:
        return jsonify({"error": "User account not found."}), 404

    client = db.session.get(Client, client_id)
    if not client:
        return jsonify({"error": f"Client #{client_id} not found."}), 404

    role = get_user_role(current_user)
    if role == ROLE_CUSTOMER:
        if client.user_id != current_user.id and client.email.lower() != current_user.email.lower():
            return jsonify({"error": "Access denied to this client record."}), 403

    return jsonify(client.to_dict(include_projects=True)), 200


@clients_bp.route('', methods=['POST'])
@permission_required('clients:manage')
def create_client():
    """Create a new client profile (Staff & Admin)."""
    current_user = get_current_user()
    if not current_user:
        return jsonify({"error": "User account not found."}), 404

    data = request.get_json(silent=True)
    cleaned, err = validate_client_payload(data, is_update=False)
    if err:
        return jsonify({"error": err}), 400

    # Optional user_id validation
    if cleaned.get('user_id'):
        target_user = db.session.get(User, cleaned['user_id'])
        if not target_user:
            return jsonify({"error": f"Linked user #{cleaned['user_id']} does not exist."}), 404

    new_client = Client(
        name=cleaned['name'],
        company=cleaned.get('company'),
        email=cleaned['email'],
        phone=cleaned.get('phone'),
        notes=cleaned.get('notes'),
        user_id=cleaned.get('user_id')
    )

    try:
        db.session.add(new_client)
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to create client.", "details": str(e)}), 500

    return jsonify({
        "message": "Client profile created successfully.",
        "client": new_client.to_dict(include_projects=True)
    }), 201


@clients_bp.route('/<int:client_id>', methods=['PUT'])
@permission_required('clients:manage')
def update_client(client_id):
    """Update client profile attributes (Staff & Admin)."""
    client = db.session.get(Client, client_id)
    if not client:
        return jsonify({"error": f"Client #{client_id} not found."}), 404

    data = request.get_json(silent=True)
    cleaned, err = validate_client_payload(data, is_update=True)
    if err:
        return jsonify({"error": err}), 400

    if 'name' in cleaned:
        client.name = cleaned['name']
    if 'email' in cleaned:
        client.email = cleaned['email']
    if 'company' in cleaned:
        client.company = cleaned['company']
    if 'phone' in cleaned:
        client.phone = cleaned['phone']
    if 'notes' in cleaned:
        client.notes = cleaned['notes']
    if 'user_id' in cleaned:
        if cleaned['user_id'] is not None:
            target_user = db.session.get(User, cleaned['user_id'])
            if not target_user:
                return jsonify({"error": f"Linked user #{cleaned['user_id']} does not exist."}), 404
        client.user_id = cleaned['user_id']

    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to update client profile.", "details": str(e)}), 500

    return jsonify({
        "message": "Client profile updated successfully.",
        "client": client.to_dict(include_projects=True)
    }), 200


@clients_bp.route('/<int:client_id>', methods=['DELETE'])
@role_required(ROLE_ADMIN)
def delete_client(client_id):
    """Delete a client entity (Administrator clearance required)."""
    client = db.session.get(Client, client_id)
    if not client:
        return jsonify({"error": f"Client #{client_id} not found."}), 404

    try:
        db.session.delete(client)
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to delete client.", "details": str(e)}), 500

    return jsonify({"message": f"Client #{client_id} and associated projects deleted successfully."}), 200
