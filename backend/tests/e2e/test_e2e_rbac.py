"""
End-to-End RBAC Verification Script
Validates all Role-Based Access Control requirements for Task 9:
- Multi-role permission hierarchy: Admin, Employee, Customer
- Backend verification of roles and permissions on protected operations
- Restricted operational capabilities for Employee (view & update, no delete)
- Full administrative capabilities for Admin (manage, update, delete, role assignment)
- Customer protection boundary (restricted to own resources)
"""

import sys
import os

BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from app import create_app
from extensions import db
from models import User, ServiceRequest

app = create_app()

def run_rbac_e2e():
    print("=" * 70)
    print("FCORPSE STUDIO — END-TO-END RBAC VERIFICATION")
    print("Task 9: Role-Based Access Control (RBAC)")
    print("=" * 70)

    client = app.test_client()

    with app.app_context():
        # 1. Login with Admin
        print("\n[1] Authenticating Administrator (admin@fcorpse.com)...")
        res_admin = client.post('/api/auth/login', json={'email': 'admin@fcorpse.com', 'password': 'admin123'})
        assert res_admin.status_code == 200, f"Admin login failed: {res_admin.status_code}"
        admin_data = res_admin.get_json()
        admin_token = admin_data['access_token']
        print(f"    [OK] Admin Token issued | Role: '{admin_data['user']['role']}' | is_admin: {admin_data['user']['is_admin']}")

        # 2. Login with Employee
        print("\n[2] Authenticating Regular Employee (employee@fcorpse.com)...")
        res_emp = client.post('/api/auth/login', json={'email': 'employee@fcorpse.com', 'password': 'employee123'})
        assert res_emp.status_code == 200, f"Employee login failed: {res_emp.status_code}"
        emp_data = res_emp.get_json()
        emp_token = emp_data['access_token']
        print(f"    [OK] Employee Token issued | Role: '{emp_data['user']['role']}' | is_admin: {emp_data['user']['is_admin']}")

        # 3. Login with Customer
        print("\n[3] Authenticating Client Customer (elena.vance@studio.com)...")
        res_cust = client.post('/api/auth/login', json={'email': 'elena.vance@studio.com', 'password': 'customer123'})
        assert res_cust.status_code == 200, f"Customer login failed: {res_cust.status_code}"
        cust_data = res_cust.get_json()
        cust_token = cust_data['access_token']
        print(f"    [OK] Customer Token issued | Role: '{cust_data['user']['role']}' | is_admin: {cust_data['user']['is_admin']}")

        # 4. Verify /api/admin/verify Route Gating
        print("\n[4] Testing /api/admin/verify Gating...")
        res_v_admin = client.post('/api/admin/verify', headers={'Authorization': f'Bearer {admin_token}'})
        assert res_v_admin.status_code == 200, "Admin verify failed"
        print("    [OK] Administrator access granted (200 OK)")

        res_v_emp = client.post('/api/admin/verify', headers={'Authorization': f'Bearer {emp_token}'})
        assert res_v_emp.status_code == 200, "Employee verify failed"
        print("    [OK] Regular Employee access granted (200 OK)")

        res_v_cust = client.post('/api/admin/verify', headers={'Authorization': f'Bearer {cust_token}'})
        assert res_v_cust.status_code == 403, "Customer should be rejected from admin verification"
        print(f"    [OK] Customer blocked with 403: {res_v_cust.get_json()['error']}")

        # 5. Customer Attempts to Access Staff Endpoints
        print("\n[5] Testing Customer Isolation on Protected Staff Endpoints...")
        res_cust_reqs = client.get('/api/requests', headers={'Authorization': f'Bearer {cust_token}'})
        assert res_cust_reqs.status_code == 403, "Customer should not list all requests"
        print(f"    [OK] Customer blocked from GET /api/requests (403): {res_cust_reqs.get_json()['error']}")

        res_cust_stats = client.get('/api/requests/stats', headers={'Authorization': f'Bearer {cust_token}'})
        assert res_cust_stats.status_code == 403, "Customer should not view stats"
        print(f"    [OK] Customer blocked from GET /api/requests/stats (403): {res_cust_stats.get_json()['error']}")

        # 6. Employee Views All Requests & Stats
        print("\n[6] Testing Employee Operational Permissions (View & Stats)...")
        res_emp_reqs = client.get('/api/requests', headers={'Authorization': f'Bearer {emp_token}'})
        assert res_emp_reqs.status_code == 200, "Employee should list all requests"
        requests_list = res_emp_reqs.get_json()
        print(f"    [OK] Employee retrieved {len(requests_list)} service requests successfully")

        res_emp_stats = client.get('/api/requests/stats', headers={'Authorization': f'Bearer {emp_token}'})
        assert res_emp_stats.status_code == 200, "Employee should access stats"
        stats = res_emp_stats.get_json()
        print(f"    [OK] Employee retrieved stats: Total={stats['total']}, Pending={stats['pending']}, In Progress={stats['in_progress']}")

        # 7. Create a Temporary Request to Test Update & Deletion Constraints
        print("\n[7] Creating test request for permission enforcement...")
        res_new = client.post('/api/requests', json={
            'name': 'Test Client',
            'email': 'client@test-studios.com',
            'service_title': 'Custom Shaders',
            'priority': 'High',
            'message': 'Testing RBAC update and deletion permission gates.'
        })
        assert res_new.status_code == 201, "Failed to create test request"
        test_req_id = res_new.get_json()['id']
        print(f"    [OK] Created test request #SR-{test_req_id}")

        # 8. Employee Updates Request (Permitted)
        print("\n[8] Testing Employee Updating Request Status & Notes (Permitted)...")
        res_emp_update = client.put(f'/api/requests/{test_req_id}', headers={'Authorization': f'Bearer {emp_token}'}, json={
            'status': 'In Progress',
            'admin_notes': 'Marcus Thorne reviewed scope and assigned technical pipeline lead.',
            'estimated_cost': '$6,500'
        })
        assert res_emp_update.status_code == 200, "Employee update should succeed"
        updated_data = res_emp_update.get_json()
        print(f"    [OK] Employee successfully updated #SR-{test_req_id}: Status='{updated_data['status']}', Cost='{updated_data['estimated_cost']}'")

        # 9. Employee Attempts to Delete Request (Forbidden)
        print("\n[9] Testing Employee Deleting Request (Forbidden)...")
        res_emp_del = client.delete(f'/api/requests/{test_req_id}', headers={'Authorization': f'Bearer {emp_token}'})
        assert res_emp_del.status_code == 403, "Employee must not delete requests"
        print(f"    [OK] Employee deletion blocked (403): {res_emp_del.get_json()['error']}")

        # 10. Administrator Deletes Request (Permitted)
        print("\n[10] Testing Administrator Deleting Request (Permitted)...")
        res_admin_del = client.delete(f'/api/requests/{test_req_id}', headers={'Authorization': f'Bearer {admin_token}'})
        assert res_admin_del.status_code == 200, "Admin delete should succeed"
        print(f"    [OK] Administrator successfully deleted #SR-{test_req_id}")

        # 11. Testing User Role Reassignment (Admin Only)
        print("\n[11] Testing Role Management (Admin only)...")
        # List users
        res_users = client.get('/api/auth/users', headers={'Authorization': f'Bearer {admin_token}'})
        assert res_users.status_code == 200, "Admin can list users"
        print(f"    [OK] Admin retrieved {len(res_users.get_json())} users")

        # Employee tries to change role
        cust_user_id = cust_data['user']['id']
        res_emp_promote = client.put(f'/api/auth/users/{cust_user_id}/role', headers={'Authorization': f'Bearer {emp_token}'}, json={'role': 'employee'})
        assert res_emp_promote.status_code == 403, "Employee cannot manage roles"
        print(f"    [OK] Employee role change blocked (403): {res_emp_promote.get_json()['error']}")

        # Admin changes customer to employee
        res_admin_promote = client.put(f'/api/auth/users/{cust_user_id}/role', headers={'Authorization': f'Bearer {admin_token}'}, json={'role': 'employee'})
        assert res_admin_promote.status_code == 200, "Admin can update role"
        print(f"    [OK] Admin promoted Elena to 'employee'")

        # Revert Elena back to customer
        res_revert = client.put(f'/api/auth/users/{cust_user_id}/role', headers={'Authorization': f'Bearer {admin_token}'}, json={'role': 'customer'})
        assert res_revert.status_code == 200, "Admin can revert role"
        print(f"    [OK] Admin reverted Elena back to 'customer'")

        # 12. Check Roles Metadata
        print("\n[12] Checking Roles & Permissions Metadata (/api/auth/roles)...")
        res_meta = client.get('/api/auth/roles')
        assert res_meta.status_code == 200, "Roles meta should return 200"
        roles_info = res_meta.get_json()
        print(f"    [OK] Available Roles: {roles_info['roles']}")
        for r, perms in roles_info['role_permissions'].items():
            print(f"       - {r.upper()} ({len(perms)} permissions): {', '.join(perms[:4])}...")

    print("\n" + "=" * 70)
    print(">>> ALL RBAC END-TO-END VERIFICATION CHECKS PASSED PERFECTLY! <<<")
    print("=" * 70)

if __name__ == '__main__':
    run_rbac_e2e()
