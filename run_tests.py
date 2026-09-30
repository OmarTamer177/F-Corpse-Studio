"""
Root test runner wrapper.
Delegates to backend/run_tests.py to support existing developer workflows and CI triggers.
"""
import sys
import os

os.environ.setdefault('FLASK_ENV', 'testing')
os.environ.setdefault('DATABASE_URL', 'sqlite:///:memory:')

BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), 'backend'))
sys.path.insert(0, BACKEND_DIR)

from run_tests import main

if __name__ == '__main__':
    sys.exit(main())
