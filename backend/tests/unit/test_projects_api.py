import unittest
import json
from app import create_app
from extensions import db
from models import User, Client, Project, ServiceRequest
from flask_jwt_extended import create_access_token
from rbac import ROLE_ADMIN, ROLE_EMPLOYEE, ROLE_CUSTOMER


class TestProjectsAPI(unittest.TestCase):
    def setUp(self):
        self.app = create_app({
            'TESTING': True,
            'SQLALCHEMY_DATABASE_URI': 'sqlite:///:memory:',
            'JWT_SECRET_KEY': 'test-projects-secret-key-32byteslong'
        })
        self.client = self.app.test_client()
        self.app_context = self.app.app_context()
        self.app_context.push()
        db.create_all()

        # Seed Admin
        self.admin = User(
            email="admin@fcorpse.com",
            first_name="Admin",
            last_name="Director",
            role=ROLE_ADMIN
        )
        self.admin.set_password("admin123")
        db.session.add(self.admin)

        # Seed Employee
        self.employee = User(
            email="employee@fcorpse.com",
            first_name="Marcus",
            last_name="Engineer",
            role=ROLE_EMPLOYEE
        )
        self.employee.set_password("employee123")
        db.session.add(self.employee)

        # Seed Customer 1
        self.customer1 = User(
            email="client1@apex.com",
            first_name="Sarah",
            last_name="Connor",
            role=ROLE_CUSTOMER
        )
        self.customer1.set_password("client123")
        db.session.add(self.customer1)

        # Seed Customer 2
        self.customer2 = User(
            email="client2@nova.com",
            first_name="John",
            last_name="Smith",
            role=ROLE_CUSTOMER
        )
        self.customer2.set_password("client123")
        db.session.add(self.customer2)

        db.session.commit()

        # Tokens
        self.admin_token = create_access_token(identity=str(self.admin.id))
        self.employee_token = create_access_token(identity=str(self.employee.id))
        self.customer1_token = create_access_token(identity=str(self.customer1.id))
        self.customer2_token = create_access_token(identity=str(self.customer2.id))

        # Seed Sample Clients
        self.client1 = Client(
            name="Apex Interactive",
            company="Apex Corp",
            email="client1@apex.com",
            phone="+1-555-0199",
            user_id=self.customer1.id
        )
        self.client2 = Client(
            name="Nova Entertainment",
            company="Nova Studios",
            email="client2@nova.com",
            phone="+1-555-0288",
            user_id=self.customer2.id
        )
        db.session.add_all([self.client1, self.client2])
        db.session.commit()

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.app_context.pop()

    def _auth_header(self, token):
        return {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}

    # ─────────────────────────────────────────────────────────────
    # Client CRUD & RBAC Tests
    # ─────────────────────────────────────────────────────────────

    def test_client_crud(self):
        # Admin creates new client
        payload = {
            "name": "Orbital Works",
            "company": "Orbital Games Ltd",
            "email": "contact@orbital.io",
            "phone": "+44-20-7946",
            "notes": "Indie publisher partner"
        }
        res = self.client.post('/api/clients', headers=self._auth_header(self.admin_token), data=json.dumps(payload))
        self.assertEqual(res.status_code, 201)
        created = res.get_json()['client']
        client_id = created['id']
        self.assertEqual(created['name'], "Orbital Works")

        # Employee lists clients
        res = self.client.get('/api/clients', headers=self._auth_header(self.employee_token))
        self.assertEqual(res.status_code, 200)
        clients = res.get_json()
        self.assertGreaterEqual(len(clients), 3)

        # Update client
        update_payload = {"company": "Orbital Global Ltd"}
        res = self.client.put(f'/api/clients/{client_id}', headers=self._auth_header(self.employee_token), data=json.dumps(update_payload))
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.get_json()['client']['company'], "Orbital Global Ltd")

        # Admin deletes client
        res = self.client.delete(f'/api/clients/{client_id}', headers=self._auth_header(self.admin_token))
        self.assertEqual(res.status_code, 200)

        # Verify deletion
        res = self.client.get(f'/api/clients/{client_id}', headers=self._auth_header(self.admin_token))
        self.assertEqual(res.status_code, 404)

    def test_client_rbac_restrictions(self):
        # Employee cannot delete client (Admin only)
        res = self.client.delete(f'/api/clients/{self.client1.id}', headers=self._auth_header(self.employee_token))
        self.assertEqual(res.status_code, 403)

        # Customer cannot create client
        payload = {"name": "Hacker Corp", "email": "hack@corp.com"}
        res = self.client.post('/api/clients', headers=self._auth_header(self.customer1_token), data=json.dumps(payload))
        self.assertEqual(res.status_code, 403)

        # Customer sees only their own client
        res = self.client.get('/api/clients', headers=self._auth_header(self.customer1_token))
        self.assertEqual(res.status_code, 200)
        customer_clients = res.get_json()
        self.assertEqual(len(customer_clients), 1)
        self.assertEqual(customer_clients[0]['email'], "client1@apex.com")

    # ─────────────────────────────────────────────────────────────
    # Project CRUD, Assignments & Status Tests
    # ─────────────────────────────────────────────────────────────

    def test_project_creation_and_multi_team_assignment(self):
        payload = {
            "name": "Chronicles of Aethelgard",
            "code": "PRJ-01",
            "description": "Exploration RPG mechanics and shader system.",
            "status": "In Progress",
            "client_id": self.client1.id,
            "start_date": "2026-11-01",
            "deadline": "2027-04-30",
            "budget": "$35,000 USD",
            "team_member_ids": [self.admin.id, self.employee.id]
        }
        res = self.client.post('/api/projects', headers=self._auth_header(self.employee_token), data=json.dumps(payload))
        self.assertEqual(res.status_code, 201)
        data = res.get_json()['project']

        self.assertEqual(data['name'], "Chronicles of Aethelgard")
        self.assertEqual(data['code'], "PRJ-01")
        self.assertEqual(data['status'], "In Progress")
        self.assertEqual(data['client']['name'], "Apex Interactive")
        self.assertEqual(len(data['team_members']), 2)

        proj_id = data['id']

        # Get Project by ID
        res = self.client.get(f'/api/projects/{proj_id}', headers=self._auth_header(self.admin_token))
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.get_json()['id'], proj_id)

    def test_project_status_transitions(self):
        # Create project with default 'Not Started'
        payload = {
            "name": "Soundscape Engine",
            "client_id": self.client1.id
        }
        res = self.client.post('/api/projects', headers=self._auth_header(self.admin_token), data=json.dumps(payload))
        self.assertEqual(res.status_code, 201)
        proj_id = res.get_json()['project']['id']
        self.assertEqual(res.get_json()['project']['status'], "Not Started")

        # Transition to 'In Progress'
        res = self.client.put(f'/api/projects/{proj_id}', headers=self._auth_header(self.employee_token), data=json.dumps({"status": "In Progress"}))
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.get_json()['project']['status'], "In Progress")

        # Transition to 'On Hold'
        res = self.client.put(f'/api/projects/{proj_id}', headers=self._auth_header(self.employee_token), data=json.dumps({"status": "On Hold"}))
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.get_json()['project']['status'], "On Hold")

        # Transition to 'Completed'
        res = self.client.put(f'/api/projects/{proj_id}', headers=self._auth_header(self.employee_token), data=json.dumps({"status": "Completed"}))
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.get_json()['project']['status'], "Completed")

        # Invalid status rejected
        res = self.client.put(f'/api/projects/{proj_id}', headers=self._auth_header(self.employee_token), data=json.dumps({"status": "Unknown Status"}))
        self.assertEqual(res.status_code, 400)

    def test_project_listing_rbac(self):
        # Create Project for Client 1
        p1 = Project(name="Project Apex 1", code="PRJ-A1", client_id=self.client1.id, status="In Progress")
        p2 = Project(name="Project Nova 1", code="PRJ-N1", client_id=self.client2.id, status="Not Started")
        db.session.add_all([p1, p2])
        db.session.commit()

        # Admin sees all 2 projects
        res = self.client.get('/api/projects', headers=self._auth_header(self.admin_token))
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.get_json()), 2)

        # Employee sees all 2 projects
        res = self.client.get('/api/projects', headers=self._auth_header(self.employee_token))
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.get_json()), 2)

        # Customer 1 sees only Project Apex 1
        res = self.client.get('/api/projects', headers=self._auth_header(self.customer1_token))
        self.assertEqual(res.status_code, 200)
        c1_projs = res.get_json()
        self.assertEqual(len(c1_projs), 1)
        self.assertEqual(c1_projs[0]['name'], "Project Apex 1")

        # Customer 2 sees only Project Nova 1
        res = self.client.get('/api/projects', headers=self._auth_header(self.customer2_token))
        self.assertEqual(res.status_code, 200)
        c2_projs = res.get_json()
        self.assertEqual(len(c2_projs), 1)
        self.assertEqual(c2_projs[0]['name'], "Project Nova 1")

        # Customer 1 cannot inspect Project Nova 1 (403)
        res = self.client.get(f'/api/projects/{p2.id}', headers=self._auth_header(self.customer1_token))
        self.assertEqual(res.status_code, 403)

    def test_employee_cannot_delete_project(self):
        proj = Project(name="Protected Project", code="PRJ-09", client_id=self.client1.id)
        db.session.add(proj)
        db.session.commit()

        res = self.client.delete(f'/api/projects/{proj.id}', headers=self._auth_header(self.employee_token))
        self.assertEqual(res.status_code, 403)

    def test_admin_can_delete_project(self):
        proj = Project(name="Admin Project", code="PRJ-10", client_id=self.client1.id)
        db.session.add(proj)
        db.session.commit()

        res = self.client.delete(f'/api/projects/{proj.id}', headers=self._auth_header(self.admin_token))
        self.assertEqual(res.status_code, 200)

        # Confirm deleted
        res = self.client.get(f'/api/projects/{proj.id}', headers=self._auth_header(self.admin_token))
        self.assertEqual(res.status_code, 404)

    def test_unauthenticated_access_blocked(self):
        res = self.client.get('/api/projects')
        self.assertEqual(res.status_code, 401)

        res = self.client.post('/api/projects', data=json.dumps({"name": "Test"}))
        self.assertEqual(res.status_code, 401)

    def test_project_kpi_stats(self):
        db.session.add_all([
            Project(name="P1", code="PRJ-1", client_id=self.client1.id, status="Not Started"),
            Project(name="P2", code="PRJ-2", client_id=self.client1.id, status="In Progress"),
            Project(name="P3", code="PRJ-3", client_id=self.client1.id, status="In Progress"),
            Project(name="P4", code="PRJ-4", client_id=self.client1.id, status="On Hold"),
            Project(name="P5", code="PRJ-5", client_id=self.client1.id, status="Completed"),
        ])
        db.session.commit()

        res = self.client.get('/api/projects/stats', headers=self._auth_header(self.admin_token))
        self.assertEqual(res.status_code, 200)
        stats = res.get_json()

        self.assertEqual(stats['total'], 5)
        self.assertEqual(stats['not_started'], 1)
        self.assertEqual(stats['in_progress'], 2)
        self.assertEqual(stats['on_hold'], 1)
        self.assertEqual(stats['completed'], 1)

    def test_project_query_filtering(self):
        p_active = Project(name="Cyber Samurai", code="PRJ-CS", client_id=self.client1.id, status="In Progress")
        p_hold = Project(name="Medieval Siege", code="PRJ-MS", client_id=self.client2.id, status="On Hold")
        db.session.add_all([p_active, p_hold])
        db.session.commit()

        # Filter by status
        res = self.client.get('/api/projects?status=In%20Progress', headers=self._auth_header(self.admin_token))
        self.assertEqual(res.status_code, 200)
        results = res.get_json()
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['code'], "PRJ-CS")

        # Search by keyword
        res = self.client.get('/api/projects?search=Medieval', headers=self._auth_header(self.admin_token))
        self.assertEqual(res.status_code, 200)
        results = res.get_json()
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['code'], "PRJ-MS")


if __name__ == '__main__':
    unittest.main()
