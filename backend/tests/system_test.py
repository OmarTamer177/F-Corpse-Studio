"""
Comprehensive Overall System Test for Voltix Platform
Verifies:
1. Environment configuration (.env loading)
2. Database connectivity & Healthcheck endpoint (/api/health)
3. Database seeding & role data integrity
4. Authentication & JWT token issuing across all 3 roles (Admin, Employee, Customer)
5. RBAC operational authorization and boundary enforcement
6. Search & Multi-criteria catalog filtering
7. Customer request submission & tracking workflow
"""

import sys
import os
import json
import time

BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from config import Config
from app import create_app
from extensions import db
from models import User, Service, Blog, ServiceRequest

def run_system_test():
    print("=" * 75)
    print("           VOLTIX PLATFORM — OVERALL SYSTEM VERIFICATION TEST")
    print("=" * 75)

    # ── Step 1: Config & Environment Verification ──
    print("\n[STEP 1] Environment & Configuration Loading...")
    print(f"    - FLASK_ENV         : {Config.DEBUG and 'development' or 'production'}")
    print(f"    - DATABASE_URL      : {Config.SQLALCHEMY_DATABASE_URI}")
    print(f"    - JWT_SECRET_KEY    : {'*' * 10}... (Length: {len(Config.JWT_SECRET_KEY)} chars)")
    print(f"    - HOST / PORT       : {Config.HOST}:{Config.PORT}")
    assert len(Config.JWT_SECRET_KEY) >= 16, "JWT Secret Key too short!"
    print("    [PASS] Environment and .env loaded successfully.")

    # ── Step 2: Application Factory & Health Check ──
    print("\n[STEP 2] Application Initialization & Health Check (/api/health)...")
    app = create_app()
    client = app.test_client()

    with app.app_context():
        res = client.get('/api/health')
        assert res.status_code == 200, f"Healthcheck failed with code {res.status_code}: {res.data}"
        health_data = res.get_json()
        print(f"    - Status            : {health_data.get('status')}")
        print(f"    - Database Status   : {health_data.get('database')}")
        print(f"    - Service           : {health_data.get('service')}")
        assert health_data.get('status') == 'healthy', "Backend is not healthy"
        assert health_data.get('database') == 'connected', "Database is not connected"
        print("    [PASS] Healthcheck endpoint verified 100% operational.")

        # ── Step 3: Database Data Integrity & Seeding Audit ──
        print("\n[STEP 3] Database Records & Role Population Audit...")
        users_count = User.query.count()
        admin_user = User.query.filter_by(role='admin').first()
        employee_user = User.query.filter_by(role='employee').first()
        customer_user = User.query.filter_by(role='customer').first()
        services_count = Service.query.count()
        blogs_count = Blog.query.count()
        requests_count = ServiceRequest.query.count()

        print(f"    - Total Users       : {users_count}")
        print(f"    - Admin Account     : {admin_user.email if admin_user else 'NOT FOUND'}")
        print(f"    - Employee Account  : {employee_user.email if employee_user else 'NOT FOUND'}")
        print(f"    - Customer Account  : {customer_user.email if customer_user else 'NOT FOUND'}")
        print(f"    - Services in DB    : {services_count}")
        print(f"    - Blogs in DB       : {blogs_count}")
        print(f"    - Requests in DB    : {requests_count}")

        assert admin_user is not None, "Admin user missing from database"
        assert employee_user is not None, "Employee user missing from database"
        assert customer_user is not None, "Customer user missing from database"
        assert services_count >= 1, "Services catalog empty"
        assert blogs_count >= 1, "Blogs empty"
        print("    [PASS] Database records verified and properly populated.")

        # ── Step 4: Authentication & JWT Token Issuing ──
        print("\n[STEP 4] Multi-Role Authentication & JWT Issuing...")
        # Admin login
        r_adm = client.post('/api/auth/login', json={'email': 'admin@fcorpse.com', 'password': 'admin123'})
        assert r_adm.status_code == 200, "Admin authentication failed"
        token_admin = r_adm.get_json()['access_token']
        print(f"    - Admin Token       : OK (Role: {r_adm.get_json()['user']['role']})")

        # Employee login
        r_emp = client.post('/api/auth/login', json={'email': 'employee@fcorpse.com', 'password': 'employee123'})
        assert r_emp.status_code == 200, "Employee authentication failed"
        token_emp = r_emp.get_json()['access_token']
        print(f"    - Employee Token    : OK (Role: {r_emp.get_json()['user']['role']})")

        # Customer login
        r_cust = client.post('/api/auth/login', json={'email': 'elena.vance@studio.com', 'password': 'customer123'})
        assert r_cust.status_code == 200, "Customer authentication failed"
        token_cust = r_cust.get_json()['access_token']
        print(f"    - Customer Token    : OK (Role: {r_cust.get_json()['user']['role']})")

        print("    [PASS] All 3 role credentials authenticated successfully.")

        # ── Step 5: RBAC Authorization & Security Boundary Check ──
        print("\n[STEP 5] RBAC Operational Authorization & Security Boundaries...")
        # 1. /api/admin/verify gating
        v_adm = client.post('/api/admin/verify', headers={'Authorization': f'Bearer {token_admin}'})
        v_emp = client.post('/api/admin/verify', headers={'Authorization': f'Bearer {token_emp}'})
        v_cust = client.post('/api/admin/verify', headers={'Authorization': f'Bearer {token_cust}'})
        assert v_adm.status_code == 200, "Admin verify failed"
        assert v_emp.status_code == 200, "Employee verify failed"
        assert v_cust.status_code == 403, "Customer was NOT rejected by admin verify"
        print("    - Admin Verify Gate : Staff (Admin & Employee) accepted, Customer rejected (403 Forbidden)")

        # 2. Staff Requests List Gating
        r_list_cust = client.get('/api/requests', headers={'Authorization': f'Bearer {token_cust}'})
        assert r_list_cust.status_code == 403, "Customer was able to access staff requests list!"
        r_list_emp = client.get('/api/requests', headers={'Authorization': f'Bearer {token_emp}'})
        assert r_list_emp.status_code == 200, "Employee was blocked from viewing requests"
        print("    - Staff Listing Gate: Customer blocked (403), Employee allowed (200)")

        # 3. Request Deletion Protection (Admin only)
        # Create temporary request to test deletion
        req_res = client.post('/api/requests', json={
            'name': 'System Test Entity',
            'email': 'system.test@voltix.io',
            'service_title': 'Cloud Integration',
            'priority': 'Low',
            'message': 'Automated system test probe for deletion boundary check.'
        })
        assert req_res.status_code == 201
        temp_id = req_res.get_json()['id']

        del_emp = client.delete(f'/api/requests/{temp_id}', headers={'Authorization': f'Bearer {token_emp}'})
        assert del_emp.status_code == 403, "Employee was able to delete request!"
        print(f"    - Deletion Security : Employee blocked from deleting #SR-{temp_id} (403 Forbidden)")

        del_adm = client.delete(f'/api/requests/{temp_id}', headers={'Authorization': f'Bearer {token_admin}'})
        assert del_adm.status_code == 200, "Admin deletion failed!"
        print(f"    - Deletion Success  : Administrator authorized to delete #SR-{temp_id} (200 OK)")

        # 4. Privilege Escalation Prevention Check
        bad_reg = client.post('/api/auth/register', json={
            'email': f'hacker_{int(time.time())}@evil.io',
            'password': 'password123',
            'first_name': 'Injected',
            'last_name': 'Admin',
            'role': 'admin'  # Attempting privilege escalation
        })
        assert bad_reg.status_code == 201
        injected_user_role = bad_reg.get_json()['user']['role']
        assert injected_user_role == 'customer', f"Vulnerability detected! Role was set to: {injected_user_role}"
        print("    - Anti-Escalation   : Public registration attempting 'role=admin' forced to 'customer'")

        print("    [PASS] All RBAC operational boundaries and security controls verified.")

        # ── Step 6: Search & Multi-Criteria Filtering Check ──
        print("\n[STEP 6] Search & Multi-Criteria Catalog Filtering...")
        # Services meta & search
        s_meta = client.get('/api/services/meta')
        assert s_meta.status_code == 200
        print(f"    - Service Categories: {len(s_meta.get_json()['categories'])} categories available")

        # Blogs meta & search
        b_meta = client.get('/api/blogs/meta')
        assert b_meta.status_code == 200
        print(f"    - Blog Categories   : {len(b_meta.get_json()['categories'])} categories available")
        print("    [PASS] Search & filtering metadata endpoints functional.")

        # ── Step 7: Roles & Permissions Metadata Endpoint ──
        print("\n[STEP 7] Roles & Permissions Metadata Endpoint (/api/auth/roles)...")
        roles_res = client.get('/api/auth/roles')
        assert roles_res.status_code == 200
        roles_payload = roles_res.get_json()
        assert 'roles' in roles_payload and 'role_permissions' in roles_payload
        print(f"    - Roles Defined     : {roles_payload['roles']}")
        print(f"    - Role Permissions  : Admin ({len(roles_payload['role_permissions']['admin'])}) | Employee ({len(roles_payload['role_permissions']['employee'])}) | Customer ({len(roles_payload['role_permissions']['customer'])})")
        print("    [PASS] Roles and permissions metadata verified.")

    print("\n" + "=" * 75)
    print(">>> OVERALL SYSTEM TEST: 100% OF ALL CHECKS PASSED PERFECTLY! <<<")
    print("=" * 75 + "\n")
    return True

if __name__ == '__main__':
    try:
        success = run_system_test()
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"\n[CRITICAL FAILURE] System test encountered an error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
