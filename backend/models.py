from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from extensions import db

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    role = db.Column(db.String(50), default='customer', nullable=False)  # 'admin', 'employee', 'customer'
    is_admin = db.Column(db.Boolean, default=False, nullable=False)
    first_name = db.Column(db.String(50), nullable=False)
    last_name = db.Column(db.String(50), nullable=False)
    age = db.Column(db.Integer, nullable=True)
    phone = db.Column(db.String(20), nullable=True)
    bio = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    def __init__(self, **kwargs):
        # Sync role and is_admin seamlessly
        if 'role' in kwargs and 'is_admin' not in kwargs:
            kwargs['is_admin'] = (kwargs['role'] == 'admin')
        elif 'is_admin' in kwargs and 'role' not in kwargs:
            kwargs['role'] = 'admin' if kwargs['is_admin'] else 'customer'
        elif 'role' not in kwargs and 'is_admin' not in kwargs:
            kwargs['role'] = 'customer'
            kwargs['is_admin'] = False
        super().__init__(**kwargs)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    @property
    def permissions(self):
        from rbac import get_user_permissions
        canonical_role = self.role or ('admin' if self.is_admin else 'customer')
        return get_user_permissions(canonical_role)

    def to_dict(self):
        canonical_role = self.role or ('admin' if self.is_admin else 'customer')
        return {
            "id": self.id,
            "email": self.email,
            "first_name": self.first_name,
            "last_name": self.last_name,
            "age": self.age,
            "phone": self.phone,
            "bio": self.bio,
            "role": canonical_role,
            "permissions": sorted(list(self.permissions)),
            "is_admin": bool(self.is_admin or (canonical_role == 'admin')),
            "created_at": self.created_at.isoformat()
        }


class Inquiry(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), nullable=False)
    subject = db.Column(db.String(200), nullable=False)
    message = db.Column(db.Text, nullable=False)


class Blog(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    author = db.Column(db.String(100), nullable=True)
    category = db.Column(db.String(50), nullable=True, default='General')
    content = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "author": self.author,
            "category": self.category or 'General',
            "content": self.content,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }


class Service(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=False)
    icon = db.Column(db.String(50), nullable=True)
    price = db.Column(db.String(100), nullable=True)
    category = db.Column(db.String(50), nullable=True, default='General')
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "icon": self.icon,
            "price": self.price,
            "category": self.category or 'General',
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }


class ServiceRequest(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id', ondelete='SET NULL'), nullable=True)
    service_id = db.Column(db.Integer, nullable=True)
    service_title = db.Column(db.String(200), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), nullable=False)
    phone = db.Column(db.String(50), nullable=True)
    company = db.Column(db.String(150), nullable=True)
    message = db.Column(db.Text, nullable=False)
    status = db.Column(db.String(50), default='Pending', nullable=False)  # 'Pending', 'In Review', 'In Progress', 'Completed', 'Rejected'
    priority = db.Column(db.String(20), default='Normal', nullable=False)  # 'Low', 'Normal', 'High', 'Urgent'
    admin_notes = db.Column(db.Text, nullable=True)
    estimated_cost = db.Column(db.String(100), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    user = db.relationship('User', backref=db.backref('service_requests', lazy=True))

    def to_dict(self, include_documents=True):
        data = {
            "id": self.id,
            "user_id": self.user_id,
            "service_id": self.service_id,
            "service_title": self.service_title,
            "name": self.name,
            "email": self.email,
            "phone": self.phone,
            "company": self.company,
            "message": self.message,
            "status": self.status,
            "priority": self.priority,
            "admin_notes": self.admin_notes,
            "estimated_cost": self.estimated_cost,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
            "user_email": self.user.email if self.user else None,
            "documents_count": len(self.documents) if hasattr(self, 'documents') and self.documents else 0
        }
        if include_documents and hasattr(self, 'documents') and self.documents:
            data["documents"] = [d.to_dict() for d in self.documents]
        else:
            data["documents"] = []
        return data


class Document(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id', ondelete='CASCADE'), nullable=False)
    request_id = db.Column(db.Integer, db.ForeignKey('service_request.id', ondelete='SET NULL'), nullable=True)
    filename = db.Column(db.String(255), nullable=False)
    stored_filename = db.Column(db.String(255), nullable=False, unique=True)
    file_path = db.Column(db.String(500), nullable=False)
    file_size = db.Column(db.Integer, nullable=False)  # size in bytes
    mime_type = db.Column(db.String(100), nullable=True)
    file_extension = db.Column(db.String(20), nullable=False)
    title = db.Column(db.String(200), nullable=True)
    description = db.Column(db.Text, nullable=True)
    category = db.Column(db.String(50), default='General', nullable=False)  # 'Brief', 'Audio Asset', 'Concept Art', 'Contract', 'Documentation', 'Deliverable', 'General'
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    user = db.relationship('User', backref=db.backref('documents', lazy=True, cascade='all, delete-orphan'))
    service_request = db.relationship('ServiceRequest', backref=db.backref('documents', lazy=True, order_by='Document.created_at.desc()'))

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "request_id": self.request_id,
            "filename": self.filename,
            "file_size": self.file_size,
            "file_size_formatted": self.format_file_size(self.file_size),
            "mime_type": self.mime_type,
            "file_extension": self.file_extension,
            "title": self.title or self.filename,
            "description": self.description or '',
            "category": self.category or 'General',
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
            "uploader_email": self.user.email if self.user else None,
            "uploader_name": f"{self.user.first_name} {self.user.last_name}" if self.user else None,
            "request_title": self.service_request.service_title if self.service_request else None
        }

    @staticmethod
    def format_file_size(bytes_size):
        if not bytes_size:
            return "0 B"
        try:
            size = float(bytes_size)
            for unit in ['B', 'KB', 'MB', 'GB']:
                if size < 1024.0:
                    return f"{size:.1f} {unit}" if unit != 'B' else f"{int(size)} B"
                size /= 1024.0
            return f"{size:.1f} TB"
        except (ValueError, TypeError):
            return "0 B"


