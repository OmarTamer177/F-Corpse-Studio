from flask import Flask, jsonify, request
import os
from extensions import db, jwt, cors
from config import config_by_name

def create_app(config_name_or_dict=None):
    app = Flask(__name__)
    app.url_map.strict_slashes = False

    # Apply configuration
    env_name = os.environ.get('FLASK_ENV', 'development')
    default_cfg = config_by_name.get(env_name, config_by_name['default'])
    app.config.from_object(default_cfg)

    if isinstance(config_name_or_dict, str):
        cfg = config_by_name.get(config_name_or_dict, default_cfg)
        app.config.from_object(cfg)
    elif isinstance(config_name_or_dict, dict):
        app.config.update(config_name_or_dict)
    
    # Initialize extensions
    db.init_app(app)
    jwt.init_app(app)
    cors_origins = os.environ.get('CORS_ORIGINS', '*')
    if cors_origins != '*':
        cors_origins = [o.strip() for o in cors_origins.split(',')]
    cors.init_app(app, resources={r"/api/*": {"origins": cors_origins}}, supports_credentials=True,
                  allow_headers=["Content-Type", "Authorization"])
    
    # Import blueprints
    from routes.auth import auth_bp
    from routes.blogs import blogs_bp
    from routes.contact import contact_bp
    from routes.services import services_bp
    from routes.requests import requests_bp
    from routes.documents import documents_bp
    
    # Register blueprints
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(blogs_bp, url_prefix='/api/blogs')
    app.register_blueprint(contact_bp, url_prefix='/api/contact')
    app.register_blueprint(services_bp, url_prefix='/api/services')
    app.register_blueprint(requests_bp, url_prefix='/api/requests')
    app.register_blueprint(documents_bp, url_prefix='/api/documents')

    # Ensure upload directory exists
    upload_folder = app.config.get('UPLOAD_FOLDER')
    if upload_folder:
        os.makedirs(upload_folder, exist_ok=True)

    # Global handler for file uploads exceeding MAX_CONTENT_LENGTH
    @app.errorhandler(413)
    def request_entity_too_large(error):
        return jsonify({
            "error": "File size exceeds the 25MB limit.",
            "message": "Please reduce the file size or compress your asset before uploading."
        }), 413
    
    # Create tables & migrate schema if needed
    if not app.config.get('TESTING'):
        with app.app_context():
            try:
                import models
                db.create_all()
                with db.engine.connect() as conn:
                    db_uri = app.config.get('SQLALCHEMY_DATABASE_URI', '')
                    if 'postgresql' in db_uri:
                        conn.execute(db.text('ALTER TABLE "user" ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT \'customer\' NOT NULL;'))
                        conn.execute(db.text("UPDATE \"user\" SET role = 'admin' WHERE is_admin = true AND (role IS NULL OR role = 'customer');"))
                        conn.commit()
            except Exception as e:
                import logging
                logging.getLogger(__name__).warning(f"Database initialization deferred or skipped: {e}")

    # Health Check Endpoint for Docker & Orchestration
    @app.route('/api/health', methods=['GET'])
    def health_check():
        db_healthy = True
        db_error = None
        try:
            db.session.execute(db.text('SELECT 1'))
        except Exception as e:
            db_healthy = False
            db_error = str(e)
            
        status_code = 200 if db_healthy else 503
        return jsonify({
            "status": "healthy" if db_healthy else "unhealthy",
            "service": "voltix-backend",
            "database": "connected" if db_healthy else f"disconnected: {db_error}"
        }), status_code

    # Admin / Staff Verification Endpoint
    @app.route('/api/admin/verify', methods=['POST', 'OPTIONS'])
    def verify_admin():
        if request.method == 'OPTIONS':
            return jsonify({"success": True}), 200
        from flask_jwt_extended import verify_jwt_in_request
        from rbac import get_current_user, has_role, ROLE_ADMIN, ROLE_EMPLOYEE
        try:
            verify_jwt_in_request()
        except Exception:
            return jsonify({"error": "Unauthorized. Authentication required."}), 401

        user = get_current_user()
        if not user:
            return jsonify({"error": "Unauthorized. User account not found."}), 401
        if not (has_role(user, ROLE_ADMIN, ROLE_EMPLOYEE) or user.is_admin):
            return jsonify({"error": "Forbidden: Staff or Administrator privileges required."}), 403
        return jsonify({
            "success": True,
            "role": user.role,
            "is_admin": user.is_admin
        }), 200

    return app

app = create_app()

if __name__ == '__main__':
    host = app.config.get('HOST', '0.0.0.0')
    port = app.config.get('PORT', 5000)
    debug = app.config.get('DEBUG', True)
    app.run(debug=debug, host=host, port=port)
