import unittest
from datetime import datetime, timedelta
from app import create_app
from extensions import db
from models import User, Service, Blog
from flask_jwt_extended import create_access_token


class TestSearchAndFilter(unittest.TestCase):
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
            last_name="FCorpse",
            is_admin=True
        )
        self.admin.set_password("admin123")
        db.session.add(self.admin)

        # Seed test services
        s1 = Service(
            title="Game Engine Development",
            description="Full-cycle custom game development and mechanics scripting.",
            icon="🎮",
            price="Custom Commission",
            category="Engineering",
            created_at=datetime.utcnow() - timedelta(days=3)
        )
        s2 = Service(
            title="Botanical Art Direction",
            description="Concept art, vegetation palettes, and visual identity monographs.",
            icon="🎨",
            price="From $4,500",
            category="Art Direction",
            created_at=datetime.utcnow() - timedelta(days=2)
        )
        s3 = Service(
            title="Spatial Sound Landscapes",
            description="Acoustic Foley recording, environmental ambiences, and SFX.",
            icon="🎵",
            price="From $2,800",
            category="Audio",
            created_at=datetime.utcnow() - timedelta(days=1)
        )
        s4 = Service(
            title="Procedural Shader Suite",
            description="High-performance graphics shaders and vegetation wind simulation.",
            icon="⚡",
            price="Custom Commission",
            category="Engineering",
            created_at=datetime.utcnow()
        )
        db.session.add_all([s1, s2, s3, s4])

        # Seed test blogs
        b1 = Blog(
            title="Real-Time Foliage Shaders",
            author="Elena Vance",
            category="Engineering",
            content="Detailed breakdown of custom vertex wind distortion algorithms.",
            created_at=datetime.utcnow() - timedelta(days=5)
        )
        b2 = Blog(
            title="Environmental Acoustics",
            author="Marcus Thorne",
            category="Audio",
            content="Negative space and resonance in subterranean sound landscapes.",
            created_at=datetime.utcnow() - timedelta(days=3)
        )
        b3 = Blog(
            title="Botanical Architecture Notes",
            author="Elena Vance",
            category="Art Direction",
            content="Principles of monograph composition and handmade textures.",
            created_at=datetime.utcnow() - timedelta(days=1)
        )
        db.session.add_all([b1, b2, b3])
        db.session.commit()

        self.admin_token = create_access_token(identity=str(self.admin.id))

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.app_context.pop()

    # ── Services Search & Filter Tests ──

    def test_services_search_by_keyword(self):
        """Test searching services by keyword matching title or description."""
        res = self.client.get('/api/services?search=shader')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]['title'], "Procedural Shader Suite")

        # Search matching description
        res2 = self.client.get('/api/services?search=Foley')
        self.assertEqual(res2.status_code, 200)
        data2 = res2.get_json()
        self.assertEqual(len(data2), 1)
        self.assertEqual(data2[0]['title'], "Spatial Sound Landscapes")

    def test_services_filter_by_category(self):
        """Test filtering services by single criterion: category."""
        res = self.client.get('/api/services?category=Engineering')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(len(data), 2)
        titles = [s['title'] for s in data]
        self.assertIn("Game Engine Development", titles)
        self.assertIn("Procedural Shader Suite", titles)

    def test_services_filter_by_pricing(self):
        """Test filtering services by pricing model (fixed vs quote)."""
        res = self.client.get('/api/services?pricing=fixed')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(len(data), 2)
        titles = [s['title'] for s in data]
        self.assertIn("Botanical Art Direction", titles)
        self.assertIn("Spatial Sound Landscapes", titles)

        res_quote = self.client.get('/api/services?pricing=quote')
        self.assertEqual(res_quote.status_code, 200)
        data_quote = res_quote.get_json()
        self.assertEqual(len(data_quote), 2)

    def test_services_multi_criteria_filtering(self):
        """Test filtering services using more than one criterion (category + pricing)."""
        # Category=Engineering and Pricing=quote -> 2 items
        res = self.client.get('/api/services?category=Engineering&pricing=quote')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(len(data), 2)

        # Category=Engineering and Pricing=fixed -> 0 items
        res2 = self.client.get('/api/services?category=Engineering&pricing=fixed')
        self.assertEqual(res2.status_code, 200)
        data2 = res2.get_json()
        self.assertEqual(len(data2), 0)

    def test_services_combined_search_filter_sort(self):
        """Test combining keyword search, multiple filters, and sort order."""
        # Search for "development" in category "Engineering" with pricing "quote" and sort alpha_asc
        res = self.client.get('/api/services?search=development&category=Engineering&pricing=quote&sort=alpha_asc')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]['title'], "Game Engine Development")

    def test_services_sorting_alphabetical_and_chronological(self):
        """Test sorting services ascending, descending, newest, oldest."""
        res_asc = self.client.get('/api/services?sort=alpha_asc')
        self.assertEqual(res_asc.status_code, 200)
        titles_asc = [s['title'] for s in res_asc.get_json()]
        self.assertEqual(titles_asc, sorted(titles_asc))

        res_oldest = self.client.get('/api/services?sort=oldest')
        self.assertEqual(res_oldest.status_code, 200)
        data_oldest = res_oldest.get_json()
        self.assertEqual(data_oldest[0]['title'], "Game Engine Development")

    def test_services_meta_endpoint(self):
        """Test dynamic /api/services/meta endpoint."""
        res = self.client.get('/api/services/meta')
        self.assertEqual(res.status_code, 200)
        meta = res.get_json()
        self.assertIn("categories", meta)
        self.assertIn("pricing_options", meta)
        self.assertIn("sort_options", meta)
        self.assertIn("Engineering", meta["categories"])
        self.assertIn("Art Direction", meta["categories"])
        self.assertIn("Audio", meta["categories"])

    # ── Blogs Search & Filter Tests ──

    def test_blogs_search_by_keyword(self):
        """Test searching blogs across title, content, and author."""
        # Search content
        res = self.client.get('/api/blogs?search=subterranean')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]['title'], "Environmental Acoustics")

        # Search author
        res_author = self.client.get('/api/blogs?search=Marcus')
        self.assertEqual(res_author.status_code, 200)
        self.assertEqual(len(res_author.get_json()), 1)

    def test_blogs_filter_by_category_and_author(self):
        """Test filtering blogs using multiple criteria: category AND author."""
        # Author Elena Vance has 2 posts (Engineering & Art Direction)
        res_elena = self.client.get('/api/blogs?author=Elena+Vance')
        self.assertEqual(res_elena.status_code, 200)
        self.assertEqual(len(res_elena.get_json()), 2)

        # Author Elena Vance + Category Engineering -> exactly 1 post
        res_multi = self.client.get('/api/blogs?author=Elena+Vance&category=Engineering')
        self.assertEqual(res_multi.status_code, 200)
        data_multi = res_multi.get_json()
        self.assertEqual(len(data_multi), 1)
        self.assertEqual(data_multi[0]['title'], "Real-Time Foliage Shaders")

    def test_blogs_sorting(self):
        """Test sorting blogs chronologically."""
        res_oldest = self.client.get('/api/blogs?sort=oldest')
        self.assertEqual(res_oldest.status_code, 200)
        data = res_oldest.get_json()
        self.assertEqual(data[0]['title'], "Real-Time Foliage Shaders")

        res_newest = self.client.get('/api/blogs?sort=newest')
        self.assertEqual(res_newest.status_code, 200)
        data_new = res_newest.get_json()
        self.assertEqual(data_new[0]['title'], "Botanical Architecture Notes")

    def test_blogs_meta_endpoint(self):
        """Test dynamic /api/blogs/meta endpoint."""
        res = self.client.get('/api/blogs/meta')
        self.assertEqual(res.status_code, 200)
        meta = res.get_json()
        self.assertIn("categories", meta)
        self.assertIn("authors", meta)
        self.assertIn("Elena Vance", meta["authors"])
        self.assertIn("Marcus Thorne", meta["authors"])
        self.assertIn("Engineering", meta["categories"])

    def test_admin_create_service_and_blog_with_category(self):
        """Test admin creating service and blog with explicit category."""
        svc_payload = {
            "title": "Audio Mastering Suite",
            "description": "Spatial 7.1 mixdowns and dynamic range compression.",
            "icon": "🎛️",
            "price": "From $1,200",
            "category": "Audio & Mastering"
        }
        res_svc = self.client.post(
            '/api/services',
            json=svc_payload,
            headers={'Authorization': f'Bearer {self.admin_token}'}
        )
        self.assertEqual(res_svc.status_code, 201)
        self.assertEqual(res_svc.get_json()['category'], "Audio & Mastering")

        blog_payload = {
            "title": "Mastering Dynamic Range for Indie Games",
            "content": "Why aggressive loudness war mastering ruins player immersion.",
            "author": "Marcus Thorne",
            "category": "Audio"
        }
        res_blog = self.client.post(
            '/api/blogs',
            json=blog_payload,
            headers={'Authorization': f'Bearer {self.admin_token}'}
        )
        self.assertEqual(res_blog.status_code, 201)
        self.assertEqual(res_blog.get_json()['category'], "Audio")


if __name__ == '__main__':
    unittest.main()
