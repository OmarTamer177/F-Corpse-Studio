from datetime import datetime, date
from flask import Blueprint, request, jsonify
from extensions import db
from models import Project, Client, User, ServiceRequest
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

projects_bp = Blueprint('projects', __name__)

ALLOWED_STATUSES = ['Not Started', 'In Progress', 'On Hold', 'Completed']


def parse_date(date_str):
    if not date_str:
        return None
    if isinstance(date_str, (date, datetime)):
        return date_str if isinstance(date_str, date) else date_str.date()
    try:
        return datetime.strptime(str(date_str).strip()[:10], '%Y-%m-%d').date()
    except (ValueError, TypeError):
        return None


def validate_project_payload(data, is_update=False):
    if not isinstance(data, dict):
        return None, "Invalid request payload format."

    cleaned = {}

    if not is_update or 'name' in data:
        name = data.get('name')
        if not isinstance(name, str) or not name.strip():
            return None, "Project title is required."
        name = name.strip()
        if len(name) > 200:
            return None, "Project name must be 200 characters or fewer."
        cleaned['name'] = name

    if 'code' in data:
        code = data.get('code')
        if code:
            code = str(code).strip().upper()
            if len(code) > 50:
                return None, "Project code must be 50 characters or fewer."
            cleaned['code'] = code
        elif not is_update:
            cleaned['code'] = None
    elif not is_update:
        cleaned['code'] = None

    if 'description' in data:
        desc = data.get('description')
        cleaned['description'] = str(desc).strip() if desc else None

    if 'status' in data:
        status = data.get('status')
        matched = next((s for s in ALLOWED_STATUSES if s.lower() == str(status).strip().lower()), None)
        if not matched:
            return None, f"Invalid status. Allowed values: {', '.join(ALLOWED_STATUSES)}."
        cleaned['status'] = matched
    elif not is_update:
        cleaned['status'] = 'Not Started'

    if not is_update or 'client_id' in data:
        cid = data.get('client_id')
        if cid is None or cid == '':
            return None, "Client assignment (client_id) is required."
        try:
            cid_int = int(cid)
        except (ValueError, TypeError):
            return None, "client_id must be a valid integer."
        client = db.session.get(Client, cid_int)
        if not client:
            return None, f"Assigned client #{cid_int} does not exist."
        cleaned['client_id'] = cid_int

    if 'service_request_id' in data:
        srid = data.get('service_request_id')
        if srid:
            try:
                srid_int = int(srid)
                sr = db.session.get(ServiceRequest, srid_int)
                if not sr:
                    return None, f"Service request #{srid_int} not found."
                cleaned['service_request_id'] = srid_int
            except (ValueError, TypeError):
                return None, "service_request_id must be a valid integer."
        else:
            cleaned['service_request_id'] = None

    if 'start_date' in data:
        s_date = data.get('start_date')
        if s_date:
            parsed = parse_date(s_date)
            if not parsed:
                return None, "start_date must be in YYYY-MM-DD format."
            cleaned['start_date'] = parsed
        else:
            cleaned['start_date'] = None

    if 'deadline' in data:
        d_date = data.get('deadline')
        if d_date:
            parsed = parse_date(d_date)
            if not parsed:
                return None, "deadline must be in YYYY-MM-DD format."
            cleaned['deadline'] = parsed
        else:
            cleaned['deadline'] = None

    if 'budget' in data:
        b = data.get('budget')
        if b:
            b_str = str(b).strip()
            if len(b_str) > 100:
                return None, "Budget string must be 100 characters or fewer."
            cleaned['budget'] = b_str
        else:
            cleaned['budget'] = None

    if 'team_member_ids' in data:
        mids = data.get('team_member_ids')
        if not isinstance(mids, list):
            return None, "team_member_ids must be a list of user IDs."
        valid_ids = []
        for mid in mids:
            try:
                mid_int = int(mid)
                u = db.session.get(User, mid_int)
                if not u:
                    return None, f"Team member #{mid_int} not found in user directory."
                valid_ids.append(mid_int)
            except (ValueError, TypeError):
                return None, "Each item in team_member_ids must be a valid integer ID."
        cleaned['team_member_ids'] = valid_ids

    return cleaned, None


@projects_bp.route('', methods=['GET'])
@jwt_required()
def list_projects():
    """List projects based on user permissions and optional query filters."""
    current_user = get_current_user()
    if not current_user:
        return jsonify({"error": "User account not found."}), 404

    role = get_user_role(current_user)
    query = Project.query.join(Client)

    if role == ROLE_CUSTOMER:
        # Customers only see projects contracted under their client entity
        query = query.filter(
            (Client.user_id == current_user.id) |
            (Client.email == current_user.email.lower())
        )

    # Optional filter: status
    status_filter = request.args.get('status', '').strip()
    if status_filter and status_filter.lower() != 'all':
        query = query.filter(Project.status.ilike(status_filter))

    # Optional filter: client_id
    client_id_filter = request.args.get('client_id', '').strip()
    if client_id_filter:
        try:
            cid = int(client_id_filter)
            query = query.filter(Project.client_id == cid)
        except ValueError:
            pass

    # Optional filter: search (name, code, description)
    search = request.args.get('search', '').strip()
    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            (Project.name.ilike(search_pattern)) |
            (Project.code.ilike(search_pattern)) |
            (Project.description.ilike(search_pattern)) |
            (Client.name.ilike(search_pattern)) |
            (Client.company.ilike(search_pattern))
        )

    projects = query.order_by(Project.created_at.desc()).all()
    return jsonify([p.to_dict() for p in projects]), 200


@projects_bp.route('/stats', methods=['GET'])
@jwt_required()
def project_stats():
    """Return aggregated KPI metrics for projects."""
    current_user = get_current_user()
    if not current_user:
        return jsonify({"error": "User account not found."}), 404

    role = get_user_role(current_user)
    query = Project.query.join(Client)

    if role == ROLE_CUSTOMER:
        query = query.filter(
            (Client.user_id == current_user.id) |
            (Client.email == current_user.email.lower())
        )

    all_projs = query.all()
    stats = {
        "total": len(all_projs),
        "not_started": sum(1 for p in all_projs if p.status == 'Not Started'),
        "in_progress": sum(1 for p in all_projs if p.status == 'In Progress'),
        "on_hold": sum(1 for p in all_projs if p.status == 'On Hold'),
        "completed": sum(1 for p in all_projs if p.status == 'Completed'),
    }
    return jsonify(stats), 200


@projects_bp.route('/<int:project_id>', methods=['GET'])
@jwt_required()
def get_project(project_id):
    """Retrieve single project by ID with client and assigned staff roster."""
    current_user = get_current_user()
    if not current_user:
        return jsonify({"error": "User account not found."}), 404

    project = db.session.get(Project, project_id)
    if not project:
        return jsonify({"error": f"Project #{project_id} not found."}), 404

    role = get_user_role(current_user)
    if role == ROLE_CUSTOMER:
        is_owner = (
            project.client and (
                project.client.user_id == current_user.id or
                project.client.email.lower() == current_user.email.lower()
            )
        )
        if not is_owner:
            return jsonify({"error": "Access denied to this project."}), 403

    return jsonify(project.to_dict()), 200


@projects_bp.route('', methods=['POST'])
@permission_required('projects:create')
def create_project():
    """Create a new project with client and team member assignments (Admin & Employee)."""
    current_user = get_current_user()
    if not current_user:
        return jsonify({"error": "User account not found."}), 404

    data = request.get_json(silent=True)
    cleaned, err = validate_project_payload(data, is_update=False)
    if err:
        return jsonify({"error": err}), 400

    # Auto-generate code if not explicitly given
    code = cleaned.get('code')
    if not code:
        count = Project.query.count() + 1
        code = f"PRJ-{count:02d}"

    new_project = Project(
        name=cleaned['name'],
        code=code,
        description=cleaned.get('description'),
        status=cleaned.get('status', 'Not Started'),
        client_id=cleaned['client_id'],
        service_request_id=cleaned.get('service_request_id'),
        start_date=cleaned.get('start_date'),
        deadline=cleaned.get('deadline'),
        budget=cleaned.get('budget')
    )

    # Assign team members
    if 'team_member_ids' in cleaned:
        assigned_users = User.query.filter(User.id.in_(cleaned['team_member_ids'])).all()
        new_project.team_members = assigned_users

    try:
        db.session.add(new_project)
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to create project.", "details": str(e)}), 500

    return jsonify({
        "message": "Project initiated successfully.",
        "project": new_project.to_dict()
    }), 201


@projects_bp.route('/<int:project_id>', methods=['PUT'])
@permission_required('projects:update')
def update_project(project_id):
    """Update project metadata, status transition, or assigned team members (Admin & Employee)."""
    project = db.session.get(Project, project_id)
    if not project:
        return jsonify({"error": f"Project #{project_id} not found."}), 404

    data = request.get_json(silent=True)
    cleaned, err = validate_project_payload(data, is_update=True)
    if err:
        return jsonify({"error": err}), 400

    if 'name' in cleaned:
        project.name = cleaned['name']
    if 'code' in cleaned and cleaned['code']:
        project.code = cleaned['code']
    if 'description' in cleaned:
        project.description = cleaned['description']
    if 'status' in cleaned:
        project.status = cleaned['status']
    if 'client_id' in cleaned:
        project.client_id = cleaned['client_id']
    if 'service_request_id' in cleaned:
        project.service_request_id = cleaned['service_request_id']
    if 'start_date' in cleaned:
        project.start_date = cleaned['start_date']
    if 'deadline' in cleaned:
        project.deadline = cleaned['deadline']
    if 'budget' in cleaned:
        project.budget = cleaned['budget']

    if 'team_member_ids' in cleaned:
        assigned_users = User.query.filter(User.id.in_(cleaned['team_member_ids'])).all()
        project.team_members = assigned_users

    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to update project.", "details": str(e)}), 500

    return jsonify({
        "message": "Project updated successfully.",
        "project": project.to_dict()
    }), 200


@projects_bp.route('/<int:project_id>', methods=['DELETE'])
@role_required(ROLE_ADMIN)
def delete_project(project_id):
    """Delete a project (Administrator clearance strictly required)."""
    project = db.session.get(Project, project_id)
    if not project:
        return jsonify({"error": f"Project #{project_id} not found."}), 404

    try:
        db.session.delete(project)
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to delete project.", "details": str(e)}), 500

    return jsonify({"message": f"Project #{project_id} deleted successfully."}), 200
