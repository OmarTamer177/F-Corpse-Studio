import os
from datetime import timedelta
from dotenv import load_dotenv

# Automatically load .env from root workspace or backend folder
root_env = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '.env'))
backend_env = os.path.abspath(os.path.join(os.path.dirname(__file__), '.env'))
if os.path.exists(root_env):
    load_dotenv(root_env)
elif os.path.exists(backend_env):
    load_dotenv(backend_env)
else:
    load_dotenv()

class Config:
    """Base configuration."""
    SECRET_KEY = os.environ.get('SECRET_KEY', 'voltix-session-secret-key-prod-replace')
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'change-this-jwt-secret-key-123-voltix-security-key')
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=24)
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        'DATABASE_URL', 'postgresql://postgres:123456@localhost:5432/voltix_task'
    )
    HOST = os.environ.get('HOST', '0.0.0.0')
    PORT = int(os.environ.get('PORT', 5000))
    DEBUG = False
    TESTING = False
    # File & Document Upload Configurations (Task 10)
    UPLOAD_FOLDER = os.environ.get(
        'UPLOAD_FOLDER', os.path.abspath(os.path.join(os.path.dirname(__file__), 'uploads'))
    )
    MAX_CONTENT_LENGTH = 25 * 1024 * 1024  # 25 MB max file upload size
    ALLOWED_EXTENSIONS = {
        # Documents & text
        'pdf', 'doc', 'docx', 'txt', 'rtf', 'md', 'csv', 'xlsx',
        # Visual media & concept art
        'png', 'jpg', 'jpeg', 'webp', 'svg', 'gif',
        # Audio assets & stems
        'mp3', 'wav', 'ogg', 'flac',
        # Archives & 3D models
        'zip', 'tar', 'gz', 'blend', 'fbx', 'obj'
    }

class DevelopmentConfig(Config):
    """Development configuration."""
    DEBUG = True

class TestingConfig(Config):
    """Testing configuration with hermetic in-memory SQLite."""
    TESTING = True
    DEBUG = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
    JWT_SECRET_KEY = 'test-rbac-key-voltix-32byteslong'
    UPLOAD_FOLDER = os.path.abspath(os.path.join(os.path.dirname(__file__), 'test_uploads'))

class ProductionConfig(Config):
    """Production configuration."""
    DEBUG = False

config_by_name = {
    'development': DevelopmentConfig,
    'testing': TestingConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}
