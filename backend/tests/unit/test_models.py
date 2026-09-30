import unittest
from datetime import datetime
from app import create_app
from extensions import db
from models import User, Service, ServiceRequest


class TestModels(unittest.TestCase):
    def setUp(self):
        self.app = create_app({
            'TESTING': True,
            'SQLALCHEMY_DATABASE_URI': 'sqlite:///:memory:',
            'JWT_SECRET_KEY': 'test-secret-key-voltix-32byteslong'
        })
        self.app_context = self.app.app_context()
        self.app_context.push()
        db.create_all()

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.app_context.pop()

    def test_create_service_request_defaults(self):
        """Test creating a ServiceRequest with required fields and verifying defaults."""
        req = ServiceRequest(
            name="Alice Walker",
            email="alice@walker-games.com",
            service_title="Game Development",
            message="Looking for custom character controller and inventory mechanics."
        )
        db.session.add(req)
        db.session.commit()

        self.assertIsNotNone(req.id)
        self.assertEqual(req.status, "Pending")
        self.assertEqual(req.priority, "Normal")
        self.assertIsNone(req.user_id)
        self.assertIsNone(req.service_id)
        self.assertIsNone(req.phone)
        self.assertIsNone(req.company)
        self.assertIsNone(req.admin_notes)
        self.assertIsNone(req.estimated_cost)
        self.assertIsInstance(req.created_at, datetime)
        self.assertIsInstance(req.updated_at, datetime)

    def test_service_request_to_dict(self):
        """Test to_dict serialization of ServiceRequest."""
        req = ServiceRequest(
            name="Bob Martin",
            email="bob@martin-audio.io",
            phone="+1 555-443-2211",
            company="Martin Audio",
            service_title="Sound Design",
            priority="Urgent",
            message="Need 50 audio SFX for roguelike dungeon.",
            status="In Review",
            admin_notes="Assigned to lead audio engineer.",
            estimated_cost="$3,500"
        )
        db.session.add(req)
        db.session.commit()

        d = req.to_dict()
        self.assertEqual(d["id"], req.id)
        self.assertEqual(d["name"], "Bob Martin")
        self.assertEqual(d["email"], "bob@martin-audio.io")
        self.assertEqual(d["phone"], "+1 555-443-2211")
        self.assertEqual(d["company"], "Martin Audio")
        self.assertEqual(d["service_title"], "Sound Design")
        self.assertEqual(d["status"], "In Review")
        self.assertEqual(d["priority"], "Urgent")
        self.assertEqual(d["admin_notes"], "Assigned to lead audio engineer.")
        self.assertEqual(d["estimated_cost"], "$3,500")
        self.assertIn("created_at", d)
        self.assertIn("updated_at", d)
        self.assertIsNone(d["user_email"])

    def test_service_request_with_user_relationship(self):
        """Test linking ServiceRequest with registered User account."""
        user = User(
            email="client@example.com",
            first_name="Clara",
            last_name="Oswald"
        )
        user.set_password("pass123")
        db.session.add(user)
        db.session.commit()

        req = ServiceRequest(
            user_id=user.id,
            name="Clara Oswald",
            email="client@example.com",
            service_title="Art Direction",
            message="Concept sketches for ancient ruins biome."
        )
        db.session.add(req)
        db.session.commit()

        self.assertEqual(req.user.id, user.id)
        self.assertEqual(req.user.email, "client@example.com")
        self.assertEqual(req.to_dict()["user_email"], "client@example.com")
        self.assertIn(req, user.service_requests)

    def test_service_request_status_update(self):
        """Test transitioning request statuses."""
        req = ServiceRequest(
            name="Daniel Reed",
            email="daniel@reed.org",
            service_title="QA & Playtesting",
            message="Beta testing for our Steam demo release."
        )
        db.session.add(req)
        db.session.commit()

        self.assertEqual(req.status, "Pending")

        for next_status in ["In Review", "In Progress", "Completed", "Rejected"]:
            req.status = next_status
            db.session.commit()
            self.assertEqual(req.status, next_status)


if __name__ == '__main__':
    unittest.main()
