import sys
import os

BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from app import create_app
import json

app = create_app()
client = app.test_client()

print("=" * 70)
print("TASK 8: END-TO-END SEARCH & FILTERING VERIFICATION")
print("=" * 70)

# 1. Services Metadata
res = client.get('/api/services/meta')
assert res.status_code == 200, f"Expected 200, got {res.status_code}"
meta = res.get_json()
print("[OK] /api/services/meta:", meta['categories'])
assert len(meta['categories']) >= 3
assert len(meta['pricing_options']) >= 3
assert len(meta['sort_options']) >= 4

# 2. Public Services Unfiltered
res = client.get('/api/services')
assert res.status_code == 200
all_services = res.get_json()
print(f"[OK] All Services Count: {len(all_services)}")
assert len(all_services) >= 4

# 3. Services Search Keyword
res = client.get('/api/services?search=Shader')
assert res.status_code == 200
shader_services = res.get_json()
print(f"[OK] Services Search 'Shader': {len(shader_services)} items -> {[s['title'] for s in shader_services]}")
assert len(shader_services) >= 1
assert any("Shader" in s['title'] or "Shader" in s['description'] for s in shader_services)

# 4. Services Filter by Category (Criterion 1)
res = client.get('/api/services?category=Game+Engineering')
assert res.status_code == 200
eng_services = res.get_json()
print(f"[OK] Services Category 'Game Engineering': {len(eng_services)} items")
assert len(eng_services) >= 1
for s in eng_services:
    assert s['category'] == 'Game Engineering'

# 5. Services Filter by Pricing Model (Criterion 2)
res = client.get('/api/services?pricing=quote')
assert res.status_code == 200
quote_services = res.get_json()
print(f"[OK] Services Pricing 'quote' (Custom Commission/Contact): {len(quote_services)} items")
assert len(quote_services) >= 1

res = client.get('/api/services?pricing=fixed')
assert res.status_code == 200
fixed_services = res.get_json()
print(f"[OK] Services Pricing 'fixed' (Tiered/Price Tag): {len(fixed_services)} items")
assert len(fixed_services) >= 1

# 6. Services Multi-Criteria Filter (Category + Pricing + Sort)
res = client.get('/api/services?category=Game+Engineering&pricing=quote&sort=alpha_asc')
assert res.status_code == 200
multi_services = res.get_json()
print(f"[OK] Multi-Criteria Services (Game Engineering + Quote + A-Z): {len(multi_services)} items -> {[s['title'] for s in multi_services]}")
assert len(multi_services) >= 1
titles = [s['title'] for s in multi_services]
assert titles == sorted(titles)

# 7. Services Combined Search + Multi-Criteria Filters
res = client.get('/api/services?search=custom&category=Game+Engineering&pricing=quote')
assert res.status_code == 200
combined_services = res.get_json()
print(f"[OK] Search + Multi-Criteria Filter: {len(combined_services)} items")
assert len(combined_services) >= 1

# 8. Services Empty Result Case
res = client.get('/api/services?search=xyznonexistentterm999')
assert res.status_code == 200
empty_services = res.get_json()
print(f"[OK] Nonexistent search returns empty list: {empty_services}")
assert empty_services == []

# 9. Blogs Metadata
res = client.get('/api/blogs/meta')
assert res.status_code == 200
blog_meta = res.get_json()
print("[OK] /api/blogs/meta Categories:", blog_meta['categories'])
print("[OK] /api/blogs/meta Authors:", blog_meta['authors'])
assert len(blog_meta['categories']) >= 2
assert len(blog_meta['authors']) >= 2

# 10. Blogs Unfiltered
res = client.get('/api/blogs')
assert res.status_code == 200
all_blogs = res.get_json()
print(f"[OK] All Blogs Count: {len(all_blogs)}")
assert len(all_blogs) >= 3

# 11. Blogs Keyword Search
res = client.get('/api/blogs?search=foliage')
assert res.status_code == 200
foliage_blogs = res.get_json()
print(f"[OK] Blogs Search 'foliage': {len(foliage_blogs)} items -> {[b['title'] for b in foliage_blogs]}")
assert len(foliage_blogs) >= 1

# 12. Blogs Multi-Criteria Filter (Category + Author + Sort)
res = client.get('/api/blogs?category=Engineering&author=Elena+Vance&sort=newest')
assert res.status_code == 200
elena_eng_blogs = res.get_json()
print(f"[OK] Multi-Criteria Blogs (Engineering + Elena Vance + Newest): {len(elena_eng_blogs)} items")
assert len(elena_eng_blogs) >= 1
for b in elena_eng_blogs:
    assert b['category'] == 'Engineering'
    assert b['author'] == 'Elena Vance'

# 13. Blogs Chronological Sorting
res_old = client.get('/api/blogs?sort=oldest')
assert res_old.status_code == 200
old_blogs = res_old.get_json()
res_new = client.get('/api/blogs?sort=newest')
assert res_new.status_code == 200
new_blogs = res_new.get_json()
print("[OK] Blogs Sorting: Oldest First:", old_blogs[0]['title'], "| Newest First:", new_blogs[0]['title'])
assert old_blogs[0]['id'] != new_blogs[0]['id']

print("\n" + "=" * 70)
print(">>> ALL E2E SEARCH & MULTI-CRITERIA FILTERING VERIFICATIONS PASSED! <<<")
print("=" * 70)
