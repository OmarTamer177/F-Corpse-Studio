import os
import uuid
import logging
from flask import Blueprint, request, jsonify, current_app, send_from_directory
from werkzeug.utils import secure_filename
from flask_jwt_extended import jwt_required, get_jwt_identity

from extensions import db
from models import Document, ServiceRequest, User
from rbac import get_current_user, has_role, has_permission, ROLE_ADMIN, ROLE_EMPLOYEE

documents_bp = Blueprint('documents', __name__)

DEFAULT_ALLOWED_EXTENSIONS = {
    'pdf', 'doc', 'docx', 'txt', 'rtf', 'md', 'csv', 'xlsx',
    'png', 'jpg', 'jpeg', 'webp', 'svg', 'gif',
    'mp3', 'wav', 'ogg', 'flac',
    'zip', 'tar', 'gz', 'blend', 'fbx', 'obj'
}

STANDARD_CATEGORIES = [
    'General',
    'Project Brief',
    'Audio Asset',
    'Concept Art',
    'Documentation',
    'Contract',
    'Deliverable'
]


def get_upload_folder():
    """Retrieve and ensure upload directory exists."""
    folder = current_app.config.get(
        'UPLOAD_FOLDER',
        os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'uploads'))
    )
    os.makedirs(folder, exist_ok=True)
    return folder


def is_allowed_file(filename):
    """Verify file extension against configured whitelist."""
    allowed = current_app.config.get('ALLOWED_EXTENSIONS', DEFAULT_ALLOWED_EXTENSIONS)
    if '.' not in filename:
        return False
    ext = filename.rsplit('.', 1)[1].lower()
    return ext in allowed


# ── Metadata Endpoint ──

@documents_bp.route('/meta', methods=['GET'])
def get_documents_meta():
    """Returns supported formats, categories, and max file size."""
    allowed = current_app.config.get('ALLOWED_EXTENSIONS', DEFAULT_ALLOWED_EXTENSIONS)
    max_size = current_app.config.get('MAX_CONTENT_LENGTH', 25 * 1024 * 1024)
    return jsonify({
        "categories": STANDARD_CATEGORIES,
        "allowed_extensions": sorted(list(allowed)),
        "max_size_bytes": max_size,
        "max_size_formatted": "25 MB"
    }), 200


# ── Document Upload Endpoint ──

@documents_bp.route('/', methods=['POST'])
@documents_bp.route('/upload', methods=['POST'])
@jwt_required()
def upload_document():
    """
    Uploads a new file and persists document metadata.
    Accepts multipart/form-data:
      - file: binary file payload (required)
      - title: custom document label (optional)
      - category: document categorization (optional)
      - description: text notes (optional)
      - request_id: link to an existing ServiceRequest (optional)
    """
    user = get_current_user()
    if not user:
        return jsonify({"error": "Unauthorized. Authentication required."}), 401

    if 'file' not in request.files:
        return jsonify({"error": "No file part in the request."}), 400

    file = request.files['file']
    if not file or not file.filename or file.filename.strip() == '':
        return jsonify({"error": "No file selected for upload."}), 400

    original_filename = file.filename.strip()
    if not is_allowed_file(original_filename):
        ext = original_filename.rsplit('.', 1)[1].lower() if '.' in original_filename else 'unknown'
        return jsonify({
            "error": f"File type '.{ext}' is unsupported.",
            "message": "Supported formats include: PDF, DOCX, TXT, MD, PNG, JPG, MP3, WAV, ZIP, BLEND, FBX, OBJ."
        }), 400

    # Check for empty file
    file.seek(0, os.SEEK_END)
    file_size = file.tell()
    file.seek(0)

    if file_size == 0:
        return jsonify({"error": "Uploaded file is empty (0 bytes)."}), 400

    max_allowed_size = current_app.config.get('MAX_CONTENT_LENGTH', 25 * 1024 * 1024)
    if file_size > max_allowed_size:
        return jsonify({"error": "File size exceeds the 25MB limit."}), 413

    # Validate optional ServiceRequest association
    service_request_id = None
    raw_req_id = request.form.get('request_id')
    if raw_req_id:
        try:
            req_id_int = int(raw_req_id)
            sr = db.session.get(ServiceRequest, req_id_int)
            if not sr:
                return jsonify({"error": f"Service request #{req_id_int} does not exist."}), 404
            
            # Verify permission to attach: user must own request or be staff
            is_staff = has_role(user, ROLE_ADMIN, ROLE_EMPLOYEE) or user.is_admin
            is_owner = (sr.user_id == user.id) or (sr.email and sr.email.lower() == user.email.lower())
            if not is_staff and not is_owner:
                return jsonify({"error": "Unauthorized to attach files to this service request."}), 403
            
            service_request_id = sr.id
        except (ValueError, TypeError):
            return jsonify({"error": "Invalid service request ID format."}), 400

    # Generate secure unique stored filename
    upload_dir = get_upload_folder()
    ext = original_filename.rsplit('.', 1)[1].lower()
    safe_base = secure_filename(original_filename.rsplit('.', 1)[0]) or "document"
    stored_filename = f"{uuid.uuid4().hex}_{safe_base}.{ext}"
    full_path = os.path.join(upload_dir, stored_filename)

    try:
        file.save(full_path)
    except Exception as e:
        logging.getLogger(__name__).error(f"Failed to write file to disk: {e}")
        return jsonify({"error": "Failed to save file on storage system."}), 500

    # Extract metadata fields
    title = request.form.get('title', '').strip()
    if not title:
        title = original_filename
    if len(title) > 200:
        title = title[:200]

    category = request.form.get('category', 'General').strip()
    if not category:
        category = 'General'
    if len(category) > 50:
        category = category[:50]

    description = request.form.get('description', '').strip()

    try:
        new_document = Document(
            user_id=user.id,
            request_id=service_request_id,
            filename=original_filename,
            stored_filename=stored_filename,
            file_path=stored_filename,
            file_size=file_size,
            mime_type=file.content_type or 'application/octet-stream',
            file_extension=ext,
            title=title,
            description=description if description else None,
            category=category
        )
        db.session.add(new_document)
        db.session.commit()
        return jsonify(new_document.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        # Clean up disk file if DB commit failed
        if os.path.exists(full_path):
            try:
                os.remove(full_path)
            except Exception:
                pass
        logging.getLogger(__name__).error(f"Failed to record document in database: {e}")
        return jsonify({"error": "Database error while saving document record."}), 500


# ── Document Listing Endpoint ──

@documents_bp.route('/', methods=['GET'])
@jwt_required()
def list_documents():
    """
    Lists uploaded documents.
    Customers view their own documents; staff can view all documents (or specify ?scope=my).
    Supports ?category=..., ?request_id=..., ?search=..., and ?sort=...
    """
    user = get_current_user()
    if not user:
        return jsonify({"error": "Unauthorized. Authentication required."}), 401

    is_staff = has_role(user, ROLE_ADMIN, ROLE_EMPLOYEE) or user.is_admin
    scope = request.args.get('scope', '').strip().lower()

    if is_staff and scope != 'my':
        query = Document.query
        # Staff can optionally filter by specific user
        user_filter = request.args.get('user_id')
        if user_filter:
            try:
                query = query.filter_by(user_id=int(user_filter))
            except (ValueError, TypeError):
                pass
    else:
        query = Document.query.filter_by(user_id=user.id)

    # Filter by linked ServiceRequest
    req_id = request.args.get('request_id')
    if req_id:
        try:
            query = query.filter_by(request_id=int(req_id))
        except (ValueError, TypeError):
            pass

    # Filter by category
    category = request.args.get('category', '').strip()
    if category and category.lower() != 'all':
        query = query.filter(Document.category.ilike(category))

    # Keyword search across filename, title, description
    search = request.args.get('search', '').strip()
    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            (Document.title.ilike(search_pattern)) |
            (Document.filename.ilike(search_pattern)) |
            (Document.description.ilike(search_pattern))
        )

    # Sorting
    sort_by = request.args.get('sort', 'newest').strip().lower()
    if sort_by == 'oldest':
        query = query.order_by(Document.created_at.asc())
    elif sort_by == 'name':
        query = query.order_by(Document.filename.asc())
    elif sort_by == 'size':
        query = query.order_by(Document.file_size.desc())
    else:
        query = query.order_by(Document.created_at.desc())

    documents = query.all()
    return jsonify([d.to_dict() for d in documents]), 200


# ── Single Document Metadata ──

@documents_bp.route('/<int:doc_id>', methods=['GET'])
@jwt_required()
def get_document(doc_id):
    """Retrieves metadata for a single document."""
    user = get_current_user()
    if not user:
        return jsonify({"error": "Unauthorized."}), 401

    doc = db.session.get(Document, doc_id)
    if not doc:
        return jsonify({"error": "Document not found."}), 404

    is_staff = has_role(user, ROLE_ADMIN, ROLE_EMPLOYEE) or user.is_admin
    if doc.user_id != user.id and not is_staff:
        return jsonify({"error": "Forbidden: You do not have permission to view this document."}), 403

    return jsonify(doc.to_dict()), 200


# ── File Download & Streaming Endpoint ──

@documents_bp.route('/<int:doc_id>/download', methods=['GET'])
@jwt_required()
def download_document(doc_id):
    """
    Securely streams the binary file to the user.
    Enforces ownership or staff access.
    Pass ?inline=1 to display browser-renderable files (PDF, images) directly in a browser tab.
    """
    user = get_current_user()
    if not user:
        return jsonify({"error": "Unauthorized."}), 401

    doc = db.session.get(Document, doc_id)
    if not doc:
        return jsonify({"error": "Document not found."}), 404

    is_staff = has_role(user, ROLE_ADMIN, ROLE_EMPLOYEE) or user.is_admin
    if doc.user_id != user.id and not is_staff:
        return jsonify({"error": "Forbidden: You do not have permission to download this document."}), 403

    upload_dir = get_upload_folder()
    file_path = os.path.join(upload_dir, doc.stored_filename)

    if not os.path.exists(file_path):
        logging.getLogger(__name__).error(f"Stored file missing on disk: {file_path}")
        return jsonify({"error": "The requested file is no longer present on the server storage."}), 404

    inline = request.args.get('inline', '0').strip().lower() in ('1', 'true', 'yes')

    return send_from_directory(
        upload_dir,
        doc.stored_filename,
        as_attachment=not inline,
        download_name=doc.filename,
        mimetype=doc.mime_type
    )


# ── Update Document Metadata Endpoint ──

@documents_bp.route('/<int:doc_id>', methods=['PUT'])
@jwt_required()
def update_document(doc_id):
    """
    Updates document metadata (title, category, description, request_id).
    Permitted for the document owner or an Administrator.
    """
    user = get_current_user()
    if not user:
        return jsonify({"error": "Unauthorized."}), 401

    doc = db.session.get(Document, doc_id)
    if not doc:
        return jsonify({"error": "Document not found."}), 404

    is_admin = has_role(user, ROLE_ADMIN) or user.is_admin
    if doc.user_id != user.id and not is_admin:
        return jsonify({"error": "Forbidden: Only the document owner or administrator can edit this file."}), 403

    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({"error": "Invalid request payload format."}), 400

    try:
        if 'title' in data:
            title = str(data['title']).strip()
            if title:
                doc.title = title[:200]

        if 'category' in data:
            category = str(data['category']).strip()
            if category:
                doc.category = category[:50]

        if 'description' in data:
            desc = data['description']
            doc.description = str(desc).strip() if desc else None

        if 'request_id' in data:
            raw_req = data['request_id']
            if raw_req is None or raw_req == '':
                doc.request_id = None
            else:
                try:
                    sr_id = int(raw_req)
                    sr = db.session.get(ServiceRequest, sr_id)
                    if sr:
                        doc.request_id = sr.id
                except (ValueError, TypeError):
                    pass

        db.session.commit()
        return jsonify(doc.to_dict()), 200
    except Exception as e:
        db.session.rollback()
        logging.getLogger(__name__).error(f"Failed to update document metadata: {e}")
        return jsonify({"error": "Failed to update document details."}), 500


# ── Delete Document Endpoint ──

@documents_bp.route('/<int:doc_id>', methods=['DELETE'])
@jwt_required()
def delete_document(doc_id):
    """
    Deletes a document from the database and removes its physical file from disk.
    Allowed for the document owner or staff with delete permission.
    """
    user = get_current_user()
    if not user:
        return jsonify({"error": "Unauthorized."}), 401

    doc = db.session.get(Document, doc_id)
    if not doc:
        return jsonify({"error": "Document not found."}), 404

    can_delete = (
        (doc.user_id == user.id and has_permission(user, 'documents:delete_own')) or
        has_permission(user, 'documents:delete') or
        user.is_admin or
        has_role(user, ROLE_ADMIN)
    )

    if not can_delete:
        return jsonify({"error": "Forbidden: You do not have permission to delete this document."}), 403

    upload_dir = get_upload_folder()
    file_path = os.path.join(upload_dir, doc.stored_filename)

    try:
        # Remove physical file from disk
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
            except OSError as oe:
                logging.getLogger(__name__).warning(f"Could not unlink file on disk: {oe}")

        # Remove from database
        db.session.delete(doc)
        db.session.commit()
        return jsonify({
            "success": True,
            "message": f"Document '{doc.filename}' deleted successfully."
        }), 200
    except Exception as e:
        db.session.rollback()
        logging.getLogger(__name__).error(f"Failed to delete document: {e}")
        return jsonify({"error": "Failed to delete document."}), 500
