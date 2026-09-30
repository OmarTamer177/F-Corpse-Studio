import unittest
import json
from app import create_app
from extensions import db
from models import User, Service, ServiceRequest
from flask_jwt_extended import create_access_token


class TestRequestsAPI(unittest.TestCase):
    def setUp(self):
        self.app = create_app({
            'TESTING': True,
            'SQLALCHEMY_DATABASE_URI': 'sqlite:///:memory:',
            'JWT_SECRET_KEY': 'test-secret-key-voltix-32byteslong'
        })
        self.client = self.app.test_client()
        self.app_context = self.app.app_context()
        self.app_context.push()
        db.create_all()

        # Seed admin user
        self.admin = User(
            email="admin@fcorpse.com",
            first_name="Admin",
            last_name="Studio",
            is_admin=True
        )
        self.admin.set_password("admin123")
        db.session.add(self.admin)

        # Seed customer user
        self.customer = User(
            email="elena.vance@studio.com",
            first_name="Elena",
            last_name="Vance",
            is_admin=False
        )
        self.customer.set_password("customer123")
        db.session.add(self.customer)

        # Seed second customer user (to test ownership permissions)
        self.other_customer = User(
            email="other@studio.com",
            first_name="Other",
            last_name="User",
            is_admin=False
        )
        self.other_customer.set_password("pass123")
        db.session.add(self.other_customer)

        # Seed standard service
        self.service = Service(
            title="Game Development",
            description="Full-cycle game development."
        )
        db.session.add(self.service)
        db.session.commit()

        # Generate JWT tokens
        self.admin_token = create_access_token(identity=str(self.admin.id))
        self.customer_token = create_access_token(identity=str(self.customer.id))
        self.other_token = create_access_token(identity=str(self.other_customer.id))

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.app_context.pop()

    # ── 1. Submission Tests ──

    def test_submit_request_guest_success(self):
        """Test guest submission without JWT creates a Pending request."""
        payload = {
            "name": "Marcus Thorne",
            "email": "marcus@aetheria.io",
            "phone": "+1 555-223-1122",
            "company": "Aetheria Studios",
            "service_title": "Sound Design",
            "priority": "Urgent",
            "message": "Need 40 audio SFX for our roguelike title."
        }
        res = self.client.post('/api/requests', json=payload)
        self.assertEqual(res.status_code, 201)
        data = res.get_json()
        self.assertEqual(data["name"], "Marcus Thorne")
        self.assertEqual(data["email"], "marcus@aetheria.io")
        self.assertEqual(data["status"], "Pending")
        self.assertEqual(data["priority"], "Urgent")
        self.assertIsNone(data["user_id"])

    def test_submit_request_authenticated_member(self):
        """Test authenticated user submission automatically associates user_id."""
        payload = {
            "name": "Elena Vance",
            "email": "elena.vance@studio.com",
            "service_title": "Game Development",
            "priority": "High",
            "message": "Custom procedural dungeon generator for Godot engine."
        }
        res = self.client.post(
            '/api/requests',
            json=payload,
            headers={'Authorization': f'Bearer {self.customer_token}'}
        )
        self.assertEqual(res.status_code, 201)
        data = res.get_json()
        self.assertEqual(data["user_id"], self.customer.id)
        self.assertEqual(data["status"], "Pending")

    def test_submit_request_missing_required_fields(self):
        """Test validation fails when required fields are missing."""
        # Missing name
        res = self.client.post('/api/requests', json={
            "email": "a@b.com", "service_title": "Art", "message": "Test project scope"
        })
        self.assertEqual(res.status_code, 400)
        self.assertIn("name", res.get_json()["error"].lower())

        # Missing email
        res = self.client.post('/api/requests', json={
            "name": "Test", "service_title": "Art", "message": "Test project scope"
        })
        self.assertEqual(res.status_code, 400)
        self.assertIn("email", res.get_json()["error"].lower())

        # Missing service_title
        res = self.client.post('/api/requests', json={
            "name": "Test", "email": "a@b.com", "message": "Test project scope"
        })
        self.assertEqual(res.status_code, 400)
        self.assertIn("service title", res.get_json()["error"].lower())

        # Missing or too short message
        res = self.client.post('/api/requests', json={
            "name": "Test", "email": "a@b.com", "service_title": "Art", "message": "hi"
        })
        self.assertEqual(res.status_code, 400)

    def test_submit_request_invalid_email(self):
        """Test validation fails for malformed email."""
        res = self.client.post('/api/requests', json={
            "name": "Test",
            "email": "not-an-email",
            "service_title": "Art",
            "message": "Test project scope"
        })
        self.assertEqual(res.status_code, 400)
        self.assertIn("valid email", res.get_json()["error"].lower())

    def test_submit_request_priority_fallback(self):
        """Test unrecognized priority falls back to 'Normal'."""
        res = self.client.post('/api/requests', json={
            "name": "Test",
            "email": "test@example.com",
            "service_title": "Art",
            "priority": "ExtremeSuperPriority",
            "message": "Need character design for fantasy protagonist."
        })
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.get_json()["priority"], "Normal")

    # ── 2. Customer Dashboard & Ownership Tests ──

    def test_get_my_requests_authenticated(self):
        """Test logged-in customer retrieves only their requests."""
        # Create request for Elena
        req1 = ServiceRequest(
            user_id=self.customer.id,
            name="Elena Vance",
            email="elena.vance@studio.com",
            service_title="Game Development",
            message="Scope 1"
        )
        # Create request for other user
        req2 = ServiceRequest(
            user_id=self.other_customer.id,
            name="Other",
            email="other@studio.com",
            service_title="Art",
            message="Scope 2"
        )
        db.session.add_all([req1, req2])
        db.session.commit()

        res = self.client.get(
            '/api/requests/my',
            headers={'Authorization': f'Bearer {self.customer_token}'}
        )
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]["id"], req1.id)
        self.assertEqual(data[0]["service_title"], "Game Development")

    def test_get_my_requests_unauthenticated_fails(self):
        """Test calling /api/requests/my without token returns 401."""
        res = self.client.get('/api/requests/my')
        self.assertEqual(res.status_code, 401)

    def test_get_request_detail_permissions(self):
        """Test request owner and admin can view detail, but other user is blocked."""
        req = ServiceRequest(
            user_id=self.customer.id,
            name="Elena Vance",
            email="elena.vance@studio.com",
            service_title="Game Dev",
            message="Confidential game specification"
        )
        db.session.add(req)
        db.session.commit()

        # Owner can view
        res = self.client.get(
            f'/api/requests/{req.id}',
            headers={'Authorization': f'Bearer {self.customer_token}'}
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.get_json()["id"], req.id)

        # Admin can view
        res_admin = self.client.get(
            f'/api/requests/{req.id}',
            headers={'Authorization': f'Bearer {self.admin_token}'}
        )
        self.assertEqual(res_admin.status_code, 200)

        # Other customer is forbidden (403)
        res_other = self.client.get(
            f'/api/requests/{req.id}',
            headers={'Authorization': f'Bearer {self.other_token}'}
        )
        self.assertEqual(res_other.status_code, 403)

    # ── 3. Company Admin Management Tests ──

    def test_admin_list_requests_and_protection(self):
        """Test only admin can access /api/requests list."""
        # Unauthenticated -> 401
        res_no_auth = self.client.get('/api/requests')
        self.assertEqual(res_no_auth.status_code, 401)

        # Non-admin -> 403
        res_non_admin = self.client.get(
            '/api/requests',
            headers={'Authorization': f'Bearer {self.customer_token}'}
        )
        self.assertEqual(res_non_admin.status_code, 403)

        # Admin -> 200
        res_admin = self.client.get(
            '/api/requests',
            headers={'Authorization': f'Bearer {self.admin_token}'}
        )
        self.assertEqual(res_admin.status_code, 200)

    def test_admin_stats(self):
        """Test /api/requests/stats calculates accurate counts across all statuses."""
        requests = [
            ServiceRequest(name="A", email="a@b.com", service_title="S1", message="M1", status="Pending", priority="Normal"),
            ServiceRequest(name="B", email="b@b.com", service_title="S2", message="M2", status="Pending", priority="Urgent"),
            ServiceRequest(name="C", email="c@b.com", service_title="S3", message="M3", status="In Review", priority="High"),
            ServiceRequest(name="D", email="d@b.com", service_title="S4", message="M4", status="In Progress", priority="Normal"),
            ServiceRequest(name="E", email="e@b.com", service_title="S5", message="M5", status="Completed", priority="Normal"),
            ServiceRequest(name="F", email="f@b.com", service_title="S6", message="M6", status="Rejected", priority="Low"),
        ]
        db.session.add_all(requests)
        db.session.commit()

        res = self.client.get(
            '/api/requests/stats',
            headers={'Authorization': f'Bearer {self.admin_token}'}
        )
        self.assertEqual(res.status_code, 200)
        stats = res.get_json()
        self.assertEqual(stats["total"], 6)
        self.assertEqual(stats["pending"], 2)
        self.assertEqual(stats["in_review"], 1)
        self.assertEqual(stats["in_progress"], 1)
        self.assertEqual(stats["completed"], 1)
        self.assertEqual(stats["rejected"], 1)
        self.assertEqual(stats["urgent"], 1)

    def test_admin_filter_and_search(self):
        """Test status filtering, priority filtering, and keyword search."""
        req1 = ServiceRequest(name="Arthur Dent", email="arthur@galaxy.org", company="Deep Thought", service_title="Audio Suite", message="Need sound effects", status="Pending", priority="Urgent")
        req2 = ServiceRequest(name="Ford Prefect", email="ford@galaxy.org", company="Megadodo", service_title="Game Porting", message="Porting to consoles", status="Completed", priority="Normal")
        db.session.add_all([req1, req2])
        db.session.commit()

        # Status filter
        res = self.client.get('/api/requests?status=Pending', headers={'Authorization': f'Bearer {self.admin_token}'})
        self.assertEqual(len(res.get_json()), 1)
        self.assertEqual(res.get_json()[0]["name"], "Arthur Dent")

        # Priority filter
        res_pri = self.client.get('/api/requests?priority=Urgent', headers={'Authorization': f'Bearer {self.admin_token}'})
        self.assertEqual(len(res_pri.get_json()), 1)
        self.assertEqual(res_pri.get_json()[0]["priority"], "Urgent")

        # Keyword search (matching company)
        res_search = self.client.get('/api/requests?search=Megadodo', headers={'Authorization': f'Bearer {self.admin_token}'})
        self.assertEqual(len(res_search.get_json()), 1)
        self.assertEqual(res_search.get_json()[0]["name"], "Ford Prefect")

    def test_admin_update_request_status_and_notes(self):
        """Test admin updating status, priority, admin notes, and estimated cost."""
        req = ServiceRequest(
            name="Zaphod",
            email="zaphod@prez.org",
            service_title="Art Direction",
            message="Two-headed character portraits",
            status="Pending",
            priority="Normal"
        )
        db.session.add(req)
        db.session.commit()

        update_payload = {
            "status": "In Progress",
            "priority": "High",
            "admin_notes": "Concept art phase approved by creative director.",
            "estimated_cost": "$8,500"
        }
        res = self.client.put(
            f'/api/requests/{req.id}',
            json=update_payload,
            headers={'Authorization': f'Bearer {self.admin_token}'}
        )
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data["status"], "In Progress")
        self.assertEqual(data["priority"], "High")
        self.assertEqual(data["admin_notes"], "Concept art phase approved by creative director.")
        self.assertEqual(data["estimated_cost"], "$8,500")

    def test_admin_update_invalid_status_fails(self):
        """Test updating with invalid status returns 400."""
        req = ServiceRequest(name="T", email="t@t.com", service_title="S", message="Scope")
        db.session.add(req)
        db.session.commit()

        res = self.client.put(
            f'/api/requests/{req.id}',
            json={"status": "NonExistentStatus"},
            headers={'Authorization': f'Bearer {self.admin_token}'}
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn("Invalid status", res.get_json()["error"])

    def test_admin_delete_request(self):
        """Test admin can delete request, and non-admin is blocked."""
        req = ServiceRequest(name="To Delete", email="del@del.com", service_title="S", message="Scope")
        db.session.add(req)
        db.session.commit()

        # Non-admin cannot delete
        res_blocked = self.client.delete(
            f'/api/requests/{req.id}',
            headers={'Authorization': f'Bearer {self.customer_token}'}
        )
        self.assertEqual(res_blocked.status_code, 403)

        # Admin deletes successfully
        res_ok = self.client.delete(
            f'/api/requests/{req.id}',
            headers={'Authorization': f'Bearer {self.admin_token}'}
        )
        self.assertEqual(res_ok.status_code, 200)
        self.assertTrue(res_ok.get_json()["success"])

        # Check it is gone
        self.assertIsNone(db.session.get(ServiceRequest, req.id))


if __name__ == '__main__':
    unittest.main()
