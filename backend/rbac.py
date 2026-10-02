from functools import wraps
from flask import jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from extensions import db

# Role Constants
ROLE_ADMIN = 'admin'
ROLE_EMPLOYEE = 'employee'
ROLE_CUSTOMER = 'customer'

ALL_ROLES = [ROLE_ADMIN, ROLE_EMPLOYEE, ROLE_CUSTOMER]

# Role Permissions Mapping
ROLE_PERMISSIONS = {
    ROLE_ADMIN: {
        'requests:view_all',
        'requests:view_stats',
        'requests:update',
        'requests:delete',
        'services:manage',
        'blogs:manage',
        'users:view',
        'users:manage_roles',
        'documents:view_all',
        'documents:upload',
        'documents:delete',
    },
    ROLE_EMPLOYEE: {
        'requests:view_all',
        'requests:view_stats',
        'requests:update',
        'users:view',
        'documents:view_all',
        'documents:upload',
    },
    ROLE_CUSTOMER: {
        'requests:create',
        'requests:view_own',
        'profile:manage',
        'documents:upload',
        'documents:view_own',
        'documents:delete_own',
    },
}


def get_user_role(user):
    """Resolve user's canonical role string with fallback to is_admin."""
    if not user:
        return None
    role = getattr(user, 'role', None)
    if role and role in ALL_ROLES:
        return role
    if getattr(user, 'is_admin', False):
        return ROLE_ADMIN
    return ROLE_CUSTOMER


def get_user_permissions(role_or_user):
    """Retrieve granted permissions for a role or User object."""
    if isinstance(role_or_user, str):
        role = role_or_user
    else:
        role = get_user_role(role_or_user)
    return set(ROLE_PERMISSIONS.get(role, []))


def has_role(user, *allowed_roles):
    """Check if the given user matches any of the specified roles."""
    if not user:
        return False
    role = get_user_role(user)
    # Admin always qualifies if admin is in allowed_roles or by default for staff roles
    return role in allowed_roles


def has_permission(user, permission):
    """Check if user has a specific permission."""
    if not user:
        return False
    role = get_user_role(user)
    if role == ROLE_ADMIN:
        return True
    perms = get_user_permissions(role)
    return permission in perms


def get_current_user():
    """Retrieve currently authenticated User instance from JWT identity."""
    from models import User
    identity = get_jwt_identity()
    if not identity:
        return None
    try:
        return db.session.get(User, int(identity))
    except (ValueError, TypeError):
        return None


def role_required(*allowed_roles):
    """
    Decorator to restrict endpoint access to specific user roles.
    Returns 401 if unauthenticated, 403 if role lacks permission.
    """
    def decorator(fn):
        @wraps(fn)
        @jwt_required()
        def wrapper(*args, **kwargs):
            user = get_current_user()
            if not user:
                return jsonify({"error": "User account not found."}), 404

            role = get_user_role(user)
            if role not in allowed_roles:
                return jsonify({
                    "error": "Forbidden: Insufficient role permissions.",
                    "required_roles": list(allowed_roles),
                    "current_role": role
                }), 403

            return fn(*args, **kwargs)
        return wrapper
    return decorator


def permission_required(permission):
    """
    Decorator to restrict endpoint access by granular permission.
    """
    def decorator(fn):
        @wraps(fn)
        @jwt_required()
        def wrapper(*args, **kwargs):
            user = get_current_user()
            if not user:
                return jsonify({"error": "User account not found."}), 404

            if not has_permission(user, permission):
                role = get_user_role(user)
                return jsonify({
                    "error": f"Forbidden: Missing '{permission}' permission.",
                    "required_permission": permission,
                    "current_role": role
                }), 403

            return fn(*args, **kwargs)
        return wrapper
    return decorator
