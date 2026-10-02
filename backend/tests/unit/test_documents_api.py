import unittest
import os
import shutil
import io
from flask_jwt_extended import create_access_token

from app import create_app
from extensions import db
from models import User, ServiceRequest, Document

class TestDocumentsAPI(unittest.TestCase):
    def setUp(self):
        self.test_upload_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'test_uploads_tmp'))
        os.makedirs(self.test_upload_dir, exist_ok=True)

        self.app = create_app({
            'TESTING': True,
            'SQLALCHEMY_DATABASE_URI': 'sqlite:///:memory:',
            'JWT_SECRET_KEY': 'test-secret-key-voltix-32byteslong',
            'UPLOAD_FOLDER': self.test_upload_dir
        })
        self.client = self.app.test_client()
        self.app_context = self.app.app_context()
        self.app_context.push()
        db.create_all()

        # Seed Users: Admin, Employee, Customer 1, Customer 2
        self.admin = User(
            email="admin@fcorpse.com",
            first_name="Admin",
            last_name="Owner",
            role="admin",
            is_admin=True
        )
        self.admin.set_password("admin123")
        db.session.add(self.admin)

        self.employee = User(
            email="employee@fcorpse.com",
            first_name="Staff",
            last_name="Member",
            role="employee"
        )
        self.employee.set_password("emp123")
        db.session.add(self.employee)

        self.customer1 = User(
            email="customer1@example.com",
            first_name="Alice",
            last_name="Developer",
            role="customer"
        )
        self.customer1.set_password("pass123")
        db.session.add(self.customer1)

        self.customer2 = User(
            email="customer2@example.com",
            first_name="Bob",
            last_name="Producer",
            role="customer"
        )
        self.customer2.set_password("pass456")
        db.session.add(self.customer2)

        # Seed Service Request for Customer 1
        self.request1 = ServiceRequest(
            user_id=None,
            service_title="Game Development",
            name="Alice Developer",
            email="customer1@example.com",
            message="Need full Unreal Engine 5 prototype.",
            status="Pending"
        )
        db.session.add(self.request1)
        db.session.commit()

        # Associate request1 with customer1's actual id
        self.request1.user_id = self.customer1.id
        db.session.commit()

        # Generate JWT Tokens
        self.admin_token = create_access_token(identity=str(self.admin.id))
        self.employee_token = create_access_token(identity=str(self.employee.id))
        self.customer1_token = create_access_token(identity=str(self.customer1.id))
        self.customer2_token = create_access_token(identity=str(self.customer2.id))

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.app_context.pop()
        # Clean up temporary test upload directory
        if os.path.exists(self.test_upload_dir):
            shutil.rmtree(self.test_upload_dir, ignore_errors=True)

    def test_meta_endpoint(self):
        """Test public /api/documents/meta returns categories and allowed extensions."""
        res = self.client.get('/api/documents/meta')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertIn("categories", data)
        self.assertIn("allowed_extensions", data)
        self.assertIn("pdf", data["allowed_extensions"])
        self.assertIn("wav", data["allowed_extensions"])
        self.assertIn("zip", data["allowed_extensions"])

    def test_unauthenticated_upload_fails(self):
        """Test uploading without a JWT returns 401 Unauthorized."""
        data = {'file': (io.BytesIO(b"dummy pdf content"), 'design_brief.pdf')}
        res = self.client.post('/api/documents/upload', data=data, content_type='multipart/form-data')
        self.assertEqual(res.status_code, 401)

    def test_upload_valid_document_success(self):
        """Test customer uploading a valid PDF document with title and category."""
        file_bytes = b"%PDF-1.4 simulated pdf document content for game studio"
        data = {
            'file': (io.BytesIO(file_bytes), 'game_concept.pdf'),
            'title': 'Core Design Spec',
            'category': 'Project Brief',
            'description': 'Preliminary game design document version 1.0.'
        }
        res = self.client.post(
            '/api/documents/upload',
            headers={'Authorization': f'Bearer {self.customer1_token}'},
            data=data,
            content_type='multipart/form-data'
        )
        self.assertEqual(res.status_code, 201)
        doc = res.get_json()
        self.assertEqual(doc['title'], 'Core Design Spec')
        self.assertEqual(doc['filename'], 'game_concept.pdf')
        self.assertEqual(doc['category'], 'Project Brief')
        self.assertEqual(doc['file_size'], len(file_bytes))
        self.assertEqual(doc['user_id'], self.customer1.id)
        self.assertEqual(doc['file_size_formatted'], f"{len(file_bytes)} B")

        # Verify physical file exists on disk
        stored_file = os.path.join(self.test_upload_dir, doc['file_extension'] and [f for f in os.listdir(self.test_upload_dir) if f.endswith('.pdf')][0])
        self.assertTrue(os.path.exists(stored_file))

    def test_upload_various_supported_types(self):
        """Test uploading images, audio assets, and archives."""
        test_files = [
            ('cover_art.png', b'\x89PNG\r\n\x1a\n' + b'mock_png_data', 'Concept Art'),
            ('theme_song.mp3', b'ID3' + b'mock_mp3_audio_bytes', 'Audio Asset'),
            ('3d_models.zip', b'PK\x03\x04' + b'mock_zip_archive', 'Deliverable')
        ]
        for filename, content, cat in test_files:
            data = {
                'file': (io.BytesIO(content), filename),
                'category': cat
            }
            res = self.client.post(
                '/api/documents/upload',
                headers={'Authorization': f'Bearer {self.customer1_token}'},
                data=data,
                content_type='multipart/form-data'
            )
            self.assertEqual(res.status_code, 201, f"Failed for {filename}")
            doc = res.get_json()
            self.assertEqual(doc['filename'], filename)
            self.assertEqual(doc['category'], cat)

    def test_upload_missing_file_fails(self):
        """Test uploading without file parameter returns 400."""
        res = self.client.post(
            '/api/documents/upload',
            headers={'Authorization': f'Bearer {self.customer1_token}'},
            data={'title': 'Empty payload'},
            content_type='multipart/form-data'
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn('No file part', res.get_json()['error'])

    def test_upload_empty_filename_fails(self):
        """Test uploading with an empty filename returns 400."""
        data = {'file': (io.BytesIO(b'some bytes'), '')}
        res = self.client.post(
            '/api/documents/upload',
            headers={'Authorization': f'Bearer {self.customer1_token}'},
            data=data,
            content_type='multipart/form-data'
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn('No file selected', res.get_json()['error'])

    def test_upload_empty_file_zero_bytes_fails(self):
        """Test uploading a 0-byte file returns 400."""
        data = {'file': (io.BytesIO(b''), 'empty.txt')}
        res = self.client.post(
            '/api/documents/upload',
            headers={'Authorization': f'Bearer {self.customer1_token}'},
            data=data,
            content_type='multipart/form-data'
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn('empty', res.get_json()['error'].lower())

    def test_upload_unsupported_extension_fails(self):
        """Test uploading an executable script (.exe, .py) is rejected with 400."""
        for dangerous_name in ['malware.exe', 'exploit.sh', 'backdoor.py', 'test.bat']:
            data = {'file': (io.BytesIO(b'binary data'), dangerous_name)}
            res = self.client.post(
                '/api/documents/upload',
                headers={'Authorization': f'Bearer {self.customer1_token}'},
                data=data,
                content_type='multipart/form-data'
            )
            self.assertEqual(res.status_code, 400)
            self.assertIn('unsupported', res.get_json()['error'].lower())

    def test_upload_linked_to_service_request(self):
        """Test linking an uploaded document to an existing ServiceRequest."""
        data = {
            'file': (io.BytesIO(b'GDD content'), 'gdd.docx'),
            'title': 'GDD Document',
            'request_id': str(self.request1.id)
        }
        res = self.client.post(
            '/api/documents/upload',
            headers={'Authorization': f'Bearer {self.customer1_token}'},
            data=data,
            content_type='multipart/form-data'
        )
        self.assertEqual(res.status_code, 201)
        doc = res.get_json()
        self.assertEqual(doc['request_id'], self.request1.id)
        self.assertEqual(doc['request_title'], 'Game Development')

        # Verify ServiceRequest to_dict() includes attached document
        sr_res = self.client.get(
            f'/api/requests/{self.request1.id}',
            headers={'Authorization': f'Bearer {self.customer1_token}'}
        )
        self.assertEqual(sr_res.status_code, 200)
        sr_data = sr_res.get_json()
        self.assertEqual(sr_data['documents_count'], 1)
        self.assertEqual(len(sr_data['documents']), 1)
        self.assertEqual(sr_data['documents'][0]['id'], doc['id'])

    def test_upload_link_to_nonexistent_service_request_fails(self):
        """Test linking to an invalid request_id returns 404."""
        data = {
            'file': (io.BytesIO(b'Some content'), 'test.pdf'),
            'request_id': '999999'
        }
        res = self.client.post(
            '/api/documents/upload',
            headers={'Authorization': f'Bearer {self.customer1_token}'},
            data=data,
            content_type='multipart/form-data'
        )
        self.assertEqual(res.status_code, 404)

    def test_upload_link_to_other_customer_request_forbidden(self):
        """Test Customer 2 cannot attach files to Customer 1's ServiceRequest."""
        data = {
            'file': (io.BytesIO(b'Infiltrate'), 'leak.pdf'),
            'request_id': str(self.request1.id)
        }
        res = self.client.post(
            '/api/documents/upload',
            headers={'Authorization': f'Bearer {self.customer2_token}'},
            data=data,
            content_type='multipart/form-data'
        )
        self.assertEqual(res.status_code, 403)

    def test_document_listing_isolation(self):
        """Test customer only sees their own documents, while staff can view all."""
        # Customer 1 uploads 2 files
        for i in range(2):
            self.client.post(
                '/api/documents/upload',
                headers={'Authorization': f'Bearer {self.customer1_token}'},
                data={'file': (io.BytesIO(b'alice file'), f'alice_{i}.pdf')},
                content_type='multipart/form-data'
            )
        # Customer 2 uploads 1 file
        self.client.post(
            '/api/documents/upload',
            headers={'Authorization': f'Bearer {self.customer2_token}'},
            data={'file': (io.BytesIO(b'bob file'), 'bob_doc.docx')},
            content_type='multipart/form-data'
        )

        # Customer 1 lists documents -> gets 2
        res1 = self.client.get('/api/documents', headers={'Authorization': f'Bearer {self.customer1_token}'})
        self.assertEqual(res1.status_code, 200)
        self.assertEqual(len(res1.get_json()), 2)

        # Customer 2 lists documents -> gets 1
        res2 = self.client.get('/api/documents', headers={'Authorization': f'Bearer {self.customer2_token}'})
        self.assertEqual(res2.status_code, 200)
        self.assertEqual(len(res2.get_json()), 1)

        # Admin lists documents -> gets all 3
        res_admin = self.client.get('/api/documents', headers={'Authorization': f'Bearer {self.admin_token}'})
        self.assertEqual(res_admin.status_code, 200)
        self.assertEqual(len(res_admin.get_json()), 3)

        # Admin filters by customer1 user_id -> gets 2
        res_admin_filter = self.client.get(
            f'/api/documents?user_id={self.customer1.id}',
            headers={'Authorization': f'Bearer {self.admin_token}'}
        )
        self.assertEqual(res_admin_filter.status_code, 200)
        self.assertEqual(len(res_admin_filter.get_json()), 2)

    def test_document_search_and_category_filter(self):
        """Test searching documents by title/name and filtering by category."""
        self.client.post(
            '/api/documents/upload',
            headers={'Authorization': f'Bearer {self.customer1_token}'},
            data={
                'file': (io.BytesIO(b'Track 1'), 'battle_theme.wav'),
                'title': 'Epic Boss Theme',
                'category': 'Audio Asset'
            },
            content_type='multipart/form-data'
        )
        self.client.post(
            '/api/documents/upload',
            headers={'Authorization': f'Bearer {self.customer1_token}'},
            data={
                'file': (io.BytesIO(b'Brief'), 'narrative_brief.pdf'),
                'title': 'Storyline Monograph',
                'category': 'Project Brief'
            },
            content_type='multipart/form-data'
        )

        # Filter by category = 'Audio Asset'
        res = self.client.get(
            '/api/documents?category=Audio Asset',
            headers={'Authorization': f'Bearer {self.customer1_token}'}
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.get_json()), 1)
        self.assertEqual(res.get_json()[0]['category'], 'Audio Asset')

        # Search by keyword 'Storyline'
        res_search = self.client.get(
            '/api/documents?search=Storyline',
            headers={'Authorization': f'Bearer {self.customer1_token}'}
        )
        self.assertEqual(res_search.status_code, 200)
        self.assertEqual(len(res_search.get_json()), 1)
        self.assertEqual(res_search.get_json()[0]['title'], 'Storyline Monograph')

    def test_document_download_permissions(self):
        """Test document download permissions: owner and staff allowed, other customer forbidden."""
        upload_res = self.client.post(
            '/api/documents/upload',
            headers={'Authorization': f'Bearer {self.customer1_token}'},
            data={'file': (io.BytesIO(b'Secret Design Blueprint'), 'secret_blueprint.pdf')},
            content_type='multipart/form-data'
        )
        doc_id = upload_res.get_json()['id']

        # Owner download succeeds
        res_owner = self.client.get(
            f'/api/documents/{doc_id}/download',
            headers={'Authorization': f'Bearer {self.customer1_token}'}
        )
        self.assertEqual(res_owner.status_code, 200)
        self.assertEqual(res_owner.data, b'Secret Design Blueprint')

        # Other customer download returns 403 Forbidden
        res_other = self.client.get(
            f'/api/documents/{doc_id}/download',
            headers={'Authorization': f'Bearer {self.customer2_token}'}
        )
        self.assertEqual(res_other.status_code, 403)

        # Admin download succeeds
        res_admin = self.client.get(
            f'/api/documents/{doc_id}/download',
            headers={'Authorization': f'Bearer {self.admin_token}'}
        )
        self.assertEqual(res_admin.status_code, 200)
        self.assertEqual(res_admin.data, b'Secret Design Blueprint')

    def test_update_document_metadata(self):
        """Test owner can update document title, category, and notes."""
        upload_res = self.client.post(
            '/api/documents/upload',
            headers={'Authorization': f'Bearer {self.customer1_token}'},
            data={'file': (io.BytesIO(b'data'), 'draft.txt')},
            content_type='multipart/form-data'
        )
        doc_id = upload_res.get_json()['id']

        # Update metadata
        update_res = self.client.put(
            f'/api/documents/{doc_id}',
            headers={'Authorization': f'Bearer {self.customer1_token}'},
            json={
                'title': 'Final Production Script',
                'category': 'Documentation',
                'description': 'Approved dialogue script.'
            }
        )
        self.assertEqual(update_res.status_code, 200)
        updated = update_res.get_json()
        self.assertEqual(updated['title'], 'Final Production Script')
        self.assertEqual(updated['category'], 'Documentation')
        self.assertEqual(updated['description'], 'Approved dialogue script.')

        # Customer 2 attempting to update receives 403
        forbidden_res = self.client.put(
            f'/api/documents/{doc_id}',
            headers={'Authorization': f'Bearer {self.customer2_token}'},
            json={'title': 'Hacked Title'}
        )
        self.assertEqual(forbidden_res.status_code, 403)

    def test_delete_document_success_and_disk_cleanup(self):
        """Test deleting a document removes it from DB and removes the file on disk."""
        upload_res = self.client.post(
            '/api/documents/upload',
            headers={'Authorization': f'Bearer {self.customer1_token}'},
            data={'file': (io.BytesIO(b'Temp file for deletion'), 'deleteme.pdf')},
            content_type='multipart/form-data'
        )
        doc_data = upload_res.get_json()
        doc_id = doc_data['id']

        # Verify disk file is present
        disk_files_before = os.listdir(self.test_upload_dir)
        self.assertEqual(len(disk_files_before), 1)

        # Other customer attempting to delete receives 403
        del_forbidden = self.client.delete(
            f'/api/documents/{doc_id}',
            headers={'Authorization': f'Bearer {self.customer2_token}'}
        )
        self.assertEqual(del_forbidden.status_code, 403)

        # Owner deletes document -> succeeds
        del_res = self.client.delete(
            f'/api/documents/{doc_id}',
            headers={'Authorization': f'Bearer {self.customer1_token}'}
        )
        self.assertEqual(del_res.status_code, 200)
        self.assertTrue(del_res.get_json()['success'])

        # Verify database record is gone
        get_res = self.client.get(
            f'/api/documents/{doc_id}',
            headers={'Authorization': f'Bearer {self.customer1_token}'}
        )
        self.assertEqual(get_res.status_code, 404)

        # Verify disk file was deleted
        disk_files_after = os.listdir(self.test_upload_dir)
        self.assertEqual(len(disk_files_after), 0)

    def test_admin_can_delete_any_document(self):
        """Test administrator has permissions to delete customer documents."""
        upload_res = self.client.post(
            '/api/documents/upload',
            headers={'Authorization': f'Bearer {self.customer1_token}'},
            data={'file': (io.BytesIO(b'Client contract'), 'contract.pdf')},
            content_type='multipart/form-data'
        )
        doc_id = upload_res.get_json()['id']

        del_res = self.client.delete(
            f'/api/documents/{doc_id}',
            headers={'Authorization': f'Bearer {self.admin_token}'}
        )
        self.assertEqual(del_res.status_code, 200)
        self.assertEqual(len(os.listdir(self.test_upload_dir)), 0)


if __name__ == '__main__':
    unittest.main()
