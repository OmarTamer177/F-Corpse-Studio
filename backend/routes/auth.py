from flask import Blueprint, request, jsonify
from models import User
from extensions import db
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Invalid request payload"}), 400

    email = (data.get('email') or '').strip()
    password = data.get('password') or ''
    first_name = (data.get('first_name') or '').strip()
    last_name = (data.get('last_name') or '').strip()
    age = data.get('age')
    phone = (data.get('phone') or '').strip() or None
    bio = (data.get('bio') or '').strip() or None

    # Validation
    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400
    if not first_name or not last_name:
        return jsonify({"error": "First name and last name are required"}), 400
    if len(first_name) > 50:
        return jsonify({"error": "First name must be 50 characters or fewer"}), 400
    if len(last_name) > 50:
        return jsonify({"error": "Last name must be 50 characters or fewer"}), 400
    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters"}), 400

    if age is not None:
        try:
            age = int(age)
            if age < 1 or age > 150:
                return jsonify({"error": "Age must be between 1 and 150"}), 400
        except (ValueError, TypeError):
            return jsonify({"error": "Age must be a valid number"}), 400

    if phone and len(phone) > 20:
        return jsonify({"error": "Phone must be 20 characters or fewer"}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({"error": "User with this email already exists"}), 400

    # Public registrations are strictly restricted to the customer role
    role = 'customer'

    new_user = User(
        email=email,
        first_name=first_name,
        last_name=last_name,
        age=age,
        phone=phone,
        bio=bio,
        role=role
    )
    new_user.set_password(password)

    try:
        db.session.add(new_user)
        db.session.commit()
        return jsonify({
            "success": True,
            "message": "User registered successfully",
            "user": new_user.to_dict()
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to register user"}), 500


@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json(silent=True)
    if not data or 'email' not in data or 'password' not in data:
        return jsonify({"error": "Email and password are required"}), 400

    email = data['email'].strip()
    password = data['password']

    user = User.query.filter_by(email=email).first()
    if not user or not user.check_password(password):
        return jsonify({"error": "Invalid email or password"}), 401

    canonical_role = user.role or ('admin' if user.is_admin else 'customer')
    access_token = create_access_token(
        identity=str(user.id),
        additional_claims={"role": canonical_role, "email": user.email}
    )
    return jsonify({
        "success": True,
        "access_token": access_token,
        "user": user.to_dict()
    }), 200


@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def me():
    current_user_id = get_jwt_identity()
    user = db.session.get(User, int(current_user_id)) if current_user_id else None
    if not user:
        return jsonify({"error": "User not found"}), 404
    return jsonify(user.to_dict()), 200


@auth_bp.route('/me', methods=['PUT'])
@jwt_required()
def update_profile():
    current_user_id = get_jwt_identity()
    user = db.session.get(User, int(current_user_id)) if current_user_id else None
    if not user:
        return jsonify({"error": "User not found"}), 404

    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Invalid request payload"}), 400

    # Validate and apply updates
    if 'first_name' in data:
        first_name = (data['first_name'] or '').strip()
        if not first_name:
            return jsonify({"error": "First name cannot be empty"}), 400
        if len(first_name) > 50:
            return jsonify({"error": "First name must be 50 characters or fewer"}), 400
        user.first_name = first_name

    if 'last_name' in data:
        last_name = (data['last_name'] or '').strip()
        if not last_name:
            return jsonify({"error": "Last name cannot be empty"}), 400
        if len(last_name) > 50:
            return jsonify({"error": "Last name must be 50 characters or fewer"}), 400
        user.last_name = last_name

    if 'age' in data:
        age = data['age']
        if age is not None and age != '':
            try:
                age = int(age)
                if age < 1 or age > 150:
                    return jsonify({"error": "Age must be between 1 and 150"}), 400
                user.age = age
            except (ValueError, TypeError):
                return jsonify({"error": "Age must be a valid number"}), 400
        else:
            user.age = None

    if 'phone' in data:
        phone = (data['phone'] or '').strip()
        if phone and len(phone) > 20:
            return jsonify({"error": "Phone must be 20 characters or fewer"}), 400
        user.phone = phone or None

    if 'bio' in data:
        user.bio = (data['bio'] or '').strip() or None

    try:
        db.session.commit()
        return jsonify({"success": True, "user": user.to_dict()}), 200
    except Exception:
        db.session.rollback()
        return jsonify({"error": "Failed to update profile"}), 500


@auth_bp.route('/roles', methods=['GET'])
def get_roles():
    """Returns all system roles and their permission mappings."""
    from rbac import ROLE_PERMISSIONS, ALL_ROLES
    return jsonify({
        "roles": ALL_ROLES,
        "role_permissions": {k: sorted(list(v)) for k, v in ROLE_PERMISSIONS.items()}
    }), 200


@auth_bp.route('/users', methods=['GET'])
@jwt_required()
def list_users():
    """
    List registered studio users.
    Accessible to Administrator and Employee.
    """
    from rbac import get_current_user, has_permission
    current_user = get_current_user()
    if not current_user or not has_permission(current_user, 'users:view'):
        return jsonify({"error": "Unauthorized. Staff role required to view users."}), 403

    users = User.query.order_by(User.id.asc()).all()
    return jsonify([u.to_dict() for u in users]), 200


@auth_bp.route('/users/<int:user_id>/role', methods=['PUT'])
@jwt_required()
def update_user_role(user_id):
    """
    Admin updates a user's role (admin, employee, customer).
    """
    from rbac import get_current_user, has_permission, ALL_ROLES, ROLE_ADMIN
    current_user = get_current_user()
    if not current_user or not has_permission(current_user, 'users:manage_roles'):
        return jsonify({"error": "Forbidden: Administrator privileges required to modify roles."}), 403

    target_user = db.session.get(User, user_id)
    if not target_user:
        return jsonify({"error": "Target user not found."}), 404

    data = request.get_json(silent=True) or {}
    new_role = (data.get('role') or '').strip().lower()

    if new_role not in ALL_ROLES:
        return jsonify({
            "error": f"Invalid role. Must be one of: {', '.join(ALL_ROLES)}"
        }), 400

    target_user.role = new_role
    target_user.is_admin = (new_role == ROLE_ADMIN)

    try:
        db.session.commit()
        return jsonify({
            "success": True,
            "message": f"User '{target_user.email}' role updated to '{new_role}'.",
            "user": target_user.to_dict()
        }), 200
    except Exception:
        db.session.rollback()
        return jsonify({"error": "Failed to update user role."}), 500


@auth_bp.route('/users', methods=['POST'])
@jwt_required()
def create_user_by_admin():
    """
    Administrator creates a new user directly with a specified role.
    """
    from rbac import get_current_user, has_permission, ALL_ROLES, ROLE_ADMIN
    current_user = get_current_user()
    if not current_user or not has_permission(current_user, 'users:manage_roles'):
        return jsonify({"error": "Forbidden: Administrator privileges required to create team members."}), 403

    data = request.get_json(silent=True) or {}
    email = (data.get('email') or '').strip().lower()
    password = data.get('password') or ''
    first_name = (data.get('first_name') or '').strip()
    last_name = (data.get('last_name') or '').strip()
    role = (data.get('role') or 'employee').strip().lower()
    phone = (data.get('phone') or '').strip() or None
    bio = (data.get('bio') or '').strip() or None

    if not email or not password:
        return jsonify({"error": "Email and password are required."}), 400
    if not first_name or not last_name:
        return jsonify({"error": "First name and last name are required."}), 400
    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters."}), 400
    if role not in ALL_ROLES:
        return jsonify({"error": f"Invalid role. Must be one of: {', '.join(ALL_ROLES)}"}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({"error": "User with this email already exists."}), 400

    new_user = User(
        email=email,
        first_name=first_name,
        last_name=last_name,
        role=role,
        phone=phone,
        bio=bio,
        is_admin=(role == ROLE_ADMIN)
    )
    new_user.set_password(password)

    try:
        db.session.add(new_user)
        db.session.commit()
        return jsonify({
            "success": True,
            "message": f"Successfully created {role} account for '{email}'.",
            "user": new_user.to_dict()
        }), 201
    except Exception:
        db.session.rollback()
        return jsonify({"error": "Failed to create user."}), 500


