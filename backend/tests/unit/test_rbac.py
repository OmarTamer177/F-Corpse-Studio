import unittest
import json
from app import create_app
from extensions import db
from models import User, ServiceRequest
from flask_jwt_extended import create_access_token
from rbac import (
    ROLE_ADMIN,
    ROLE_EMPLOYEE,
    ROLE_CUSTOMER,
    get_user_role,
    get_user_permissions,
    has_role,
    has_permission
)


class TestRBAC(unittest.TestCase):
    def setUp(self):
        self.app = create_app({
            'TESTING': True,
            'SQLALCHEMY_DATABASE_URI': 'sqlite:///:memory:',
            'JWT_SECRET_KEY': 'test-rbac-key-voltix-32byteslong'
        })
        self.client = self.app.test_client()
        self.app_context = self.app.app_context()
        self.app_context.push()
        db.create_all()

        # Seed Administrator
        self.admin = User(
            email="admin@fcorpse.com",
            first_name="Admin",
            last_name="Studio",
            role=ROLE_ADMIN
        )
        self.admin.set_password("admin123")
        db.session.add(self.admin)

        # Seed Employee
        self.employee = User(
            email="employee@fcorpse.com",
            first_name="Marcus",
            last_name="Thorne",
            role=ROLE_EMPLOYEE
        )
        self.employee.set_password("employee123")
        db.session.add(self.employee)

        # Seed Customer
        self.customer = User(
            email="elena.vance@studio.com",
            first_name="Elena",
            last_name="Vance",
            role=ROLE_CUSTOMER
        )
        self.customer.set_password("customer123")
        db.session.add(self.customer)

        # Seed Sample Service Request
        self.sample_request = ServiceRequest(
            user_id=self.customer.id,
            name="Elena Vance",
            email="elena.vance@studio.com",
            service_title="Game Development",
            message="Initial scope inquiry for puzzle game.",
            status="Pending",
            priority="Normal"
        )
        db.session.add(self.sample_request)
        db.session.commit()

        # Generate JWT Tokens
        self.admin_token = create_access_token(identity=str(self.admin.id))
        self.employee_token = create_access_token(identity=str(self.employee.id))
        self.customer_token = create_access_token(identity=str(self.customer.id))

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.app_context.pop()

    # ── 1. Role & Permission Definitions ──

    def test_user_roles_and_permissions(self):
        """Verify role resolution and permission sets for each role type."""
        self.assertEqual(get_user_role(self.admin), ROLE_ADMIN)
        self.assertEqual(get_user_role(self.employee), ROLE_EMPLOYEE)
        self.assertEqual(get_user_role(self.customer), ROLE_CUSTOMER)

        self.assertTrue(self.admin.is_admin)
        self.assertFalse(self.employee.is_admin)
        self.assertFalse(self.customer.is_admin)

        # Admin permissions
        self.assertTrue(has_permission(self.admin, 'requests:delete'))
        self.assertTrue(has_permission(self.admin, 'users:manage_roles'))
        self.assertTrue(has_permission(self.admin, 'requests:update'))

        # Employee permissions
        self.assertTrue(has_permission(self.employee, 'requests:view_all'))
        self.assertTrue(has_permission(self.employee, 'requests:view_stats'))
        self.assertTrue(has_permission(self.employee, 'requests:update'))
        self.assertFalse(has_permission(self.employee, 'requests:delete'))
        self.assertFalse(has_permission(self.employee, 'users:manage_roles'))

        # Customer permissions
        self.assertFalse(has_permission(self.customer, 'requests:view_all'))
        self.assertFalse(has_permission(self.customer, 'requests:update'))
        self.assertFalse(has_permission(self.customer, 'requests:delete'))

    # ── 2. Staff Requests Management (Admin & Employee) ──

    def test_employee_can_view_all_requests_and_stats(self):
        """Employee role can access request listing and KPI stats."""
        res_list = self.client.get(
            '/api/requests',
            headers={'Authorization': f'Bearer {self.employee_token}'}
        )
        self.assertEqual(res_list.status_code, 200)
        self.assertEqual(len(res_list.get_json()), 1)

        res_stats = self.client.get(
            '/api/requests/stats',
            headers={'Authorization': f'Bearer {self.employee_token}'}
        )
        self.assertEqual(res_stats.status_code, 200)
        self.assertEqual(res_stats.get_json()["total"], 1)

    def test_employee_can_update_service_request(self):
        """Employee can update status, priority, admin notes, and estimate."""
        res = self.client.put(
            f'/api/requests/{self.sample_request.id}',
            headers={'Authorization': f'Bearer {self.employee_token}'},
            json={
                "status": "In Review",
                "priority": "High",
                "admin_notes": "Reviewed by Marcus Thorne.",
                "estimated_cost": "$12,000"
            }
        )
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data["status"], "In Review")
        self.assertEqual(data["priority"], "High")
        self.assertEqual(data["admin_notes"], "Reviewed by Marcus Thorne.")
        self.assertEqual(data["estimated_cost"], "$12,000")

    def test_employee_cannot_delete_service_request(self):
        """Employee is forbidden from deleting records (403)."""
        res = self.client.delete(
            f'/api/requests/{self.sample_request.id}',
            headers={'Authorization': f'Bearer {self.employee_token}'}
        )
        self.assertEqual(res.status_code, 403)
        self.assertIn("Admin access required", res.get_json()["error"])

        # Verify record still exists
        item = db.session.get(ServiceRequest, self.sample_request.id)
        self.assertIsNotNone(item)

    def test_admin_can_delete_service_request(self):
        """Administrator has delete permission and can remove records."""
        res = self.client.delete(
            f'/api/requests/{self.sample_request.id}',
            headers={'Authorization': f'Bearer {self.admin_token}'}
        )
        self.assertEqual(res.status_code, 200)
        item = db.session.get(ServiceRequest, self.sample_request.id)
        self.assertIsNone(item)

    # ── 3. Customer Isolation ──

    def test_customer_forbidden_from_staff_endpoints(self):
        """Customer cannot list all requests, view stats, or update requests."""
        # Cannot list all
        res_list = self.client.get(
            '/api/requests',
            headers={'Authorization': f'Bearer {self.customer_token}'}
        )
        self.assertEqual(res_list.status_code, 403)

        # Cannot view stats
        res_stats = self.client.get(
            '/api/requests/stats',
            headers={'Authorization': f'Bearer {self.customer_token}'}
        )
        self.assertEqual(res_stats.status_code, 403)

        # Cannot update
        res_update = self.client.put(
            f'/api/requests/{self.sample_request.id}',
            headers={'Authorization': f'Bearer {self.customer_token}'},
            json={"status": "Completed"}
        )
        self.assertEqual(res_update.status_code, 403)

    # ── 4. Admin Suite Verification Route ──

    def test_admin_verify_access_control(self):
        """Verify /api/admin/verify accepts Admin and Employee, rejects Customer."""
        res_admin = self.client.post(
            '/api/admin/verify',
            headers={'Authorization': f'Bearer {self.admin_token}'}
        )
        self.assertEqual(res_admin.status_code, 200)
        self.assertTrue(res_admin.get_json()["success"])

        res_employee = self.client.post(
            '/api/admin/verify',
            headers={'Authorization': f'Bearer {self.employee_token}'}
        )
        self.assertEqual(res_employee.status_code, 200)
        self.assertTrue(res_employee.get_json()["success"])

        res_customer = self.client.post(
            '/api/admin/verify',
            headers={'Authorization': f'Bearer {self.customer_token}'}
        )
        self.assertEqual(res_customer.status_code, 403)

    # ── 5. User Role Management ──

    def test_admin_can_update_user_role(self):
        """Admin can promote customer to employee."""
        res = self.client.put(
            f'/api/auth/users/{self.customer.id}/role',
            headers={'Authorization': f'Bearer {self.admin_token}'},
            json={"role": "employee"}
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.get_json()["user"]["role"], "employee")

        # Verify database reflection
        updated_customer = db.session.get(User, self.customer.id)
        self.assertEqual(updated_customer.role, "employee")

    def test_employee_cannot_update_user_role(self):
        """Employee cannot change user roles (403)."""
        res = self.client.put(
            f'/api/auth/users/{self.customer.id}/role',
            headers={'Authorization': f'Bearer {self.employee_token}'},
            json={"role": "admin"}
        )
        self.assertEqual(res.status_code, 403)

    def test_roles_metadata_endpoint(self):
        """Test GET /api/auth/roles returns role list and permissions."""
        res = self.client.get('/api/auth/roles')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertIn("roles", data)
        self.assertIn("role_permissions", data)
        self.assertIn("admin", data["roles"])
        self.assertIn("employee", data["roles"])
        self.assertIn("customer", data["roles"])


if __name__ == '__main__':
    unittest.main()
