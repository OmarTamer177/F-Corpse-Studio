import urllib.request
import json

BASE = 'http://127.0.0.1:5000/api'

def req(url, method='GET', data=None, token=None):
    headers = {'Content-Type': 'application/json'}
    if token:
        headers['Authorization'] = f'Bearer {token}'
    req_obj = urllib.request.Request(url, method=method, headers=headers)
    if data:
        req_obj.data = json.dumps(data).encode('utf-8')
    try:
        with urllib.request.urlopen(req_obj) as resp:
            return resp.status, json.loads(resp.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode('utf-8'))

print('=== 1. TEST CUSTOMER REQUEST SUBMISSION ===')
st, res = req(f'{BASE}/requests', 'POST', {
    'name': 'Arthur Pendelton',
    'email': 'arthur@pendelton-games.com',
    'phone': '+1 555-888-2910',
    'company': 'Pendelton Interactive',
    'service_title': 'Game Development',
    'priority': 'Urgent',
    'message': 'Full custom dialogue system and procedural tree generation for an atmospheric mystery adventure.'
})
print('Submission Response:', st, res.get('id'), res.get('status'), res.get('service_title'))
assert st == 201
new_req_id = res['id']

print('\n=== 2. TEST CUSTOMER LOGIN & DASHBOARD TRACKING ===')
st, elena_auth = req(f'{BASE}/auth/login', 'POST', {'email': 'elena.vance@studio.com', 'password': 'customer123'})
elena_token = elena_auth['access_token']
st, elena_reqs = req(f'{BASE}/requests/my', 'GET', token=elena_token)
print('Elena Requests Count:', len(elena_reqs))
for r in elena_reqs:
    print(f" - #SR-{r['id']}: {r['service_title']} [{r['status']}] Priority: {r['priority']}")
assert st == 200
assert len(elena_reqs) >= 2

print('\n=== 3. TEST ADMIN LOGIN & MANAGEMENT ===')
st, admin_auth = req(f'{BASE}/auth/login', 'POST', {'email': 'admin@fcorpse.com', 'password': 'admin123'})
admin_token = admin_auth['access_token']

st, stats = req(f'{BASE}/requests/stats', 'GET', token=admin_token)
print('Live Admin Stats:', stats)
assert st == 200
assert stats['total'] >= 6

st, all_reqs = req(f'{BASE}/requests', 'GET', token=admin_token)
print('Admin Total Requests Count:', len(all_reqs))
assert st == 200

# Test search
st, search_res = req(f'{BASE}/requests?search=Pendelton', 'GET', token=admin_token)
print('Search "Pendelton":', len(search_res), search_res[0]['name'] if search_res else 'None')
assert len(search_res) >= 1

# Test status update
print('\n=== 4. TEST ADMIN UPDATE STATUS & QUOTE ===')
st, updated = req(f'{BASE}/requests/{new_req_id}', 'PUT', {
    'status': 'In Progress',
    'priority': 'Urgent',
    'admin_notes': 'Technical architecture approved. Commencing sprint 1.',
    'estimated_cost': '$15,000 - $20,000'
}, token=admin_token)
print('Updated Request:', st, updated['status'], updated['estimated_cost'], updated['admin_notes'])
assert st == 200
assert updated['status'] == 'In Progress'

# Verify stats updated
st, stats_after = req(f'{BASE}/requests/stats', 'GET', token=admin_token)
print('Stats after status update:', stats_after)
assert stats_after['in_progress'] >= 2

# Test customer viewing updated request
st, detail_res = req(f'{BASE}/requests/{new_req_id}', 'GET', token=admin_token)
print('Verified Request Detail:', detail_res['id'], detail_res['status'], detail_res['estimated_cost'])
assert detail_res['status'] == 'In Progress'
assert detail_res['estimated_cost'] == '$15,000 - $20,000'

print('\n=== ALL END-TO-END WORKFLOW TESTS SUCCEEDED PERFECTLY! ===')
