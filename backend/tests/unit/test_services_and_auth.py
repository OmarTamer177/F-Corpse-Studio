import unittest
from app import create_app
from extensions import db
from models import User, Service
from flask_jwt_extended import create_access_token


class TestServicesAndAuth(unittest.TestCase):
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

        # Seed admin
        self.admin = User(
            email="admin@fcorpse.com",
            first_name="Admin",
            last_name="Studio",
            is_admin=True
        )
        self.admin.set_password("admin123")
        db.session.add(self.admin)

        # Seed standard service
        self.service = Service(
            title="Art Direction",
            description="Botanical visual identities.",
            icon="🎨",
            price="Contact Us"
        )
        db.session.add(self.service)
        db.session.commit()

        self.admin_token = create_access_token(identity=str(self.admin.id))

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.app_context.pop()

    def test_list_services_public(self):
        """Test public retrieval of services."""
        res = self.client.get('/api/services')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]["title"], "Art Direction")

    def test_admin_create_service(self):
        """Test admin can create a new service."""
        payload = {
            "title": "Sound Engineering",
            "description": "Custom spatial audio landscapes.",
            "icon": "🎵",
            "price": "From $2,000"
        }
        res = self.client.post(
            '/api/services',
            json=payload,
            headers={'Authorization': f'Bearer {self.admin_token}'}
        )
        self.assertEqual(res.status_code, 201)
        data = res.get_json()
        self.assertEqual(data["title"], "Sound Engineering")
        self.assertEqual(data["icon"], "🎵")

    def test_auth_login_and_me(self):
        """Test authentication flow and profile retrieval."""
        res = self.client.post('/api/auth/login', json={
            "email": "admin@fcorpse.com",
            "password": "admin123"
        })
        self.assertEqual(res.status_code, 200)
        token = res.get_json()["access_token"]

        me_res = self.client.get('/api/auth/me', headers={'Authorization': f'Bearer {token}'})
        self.assertEqual(me_res.status_code, 200)
        self.assertEqual(me_res.get_json()["email"], "admin@fcorpse.com")
        self.assertTrue(me_res.get_json()["is_admin"])


if __name__ == '__main__':
    unittest.main()
