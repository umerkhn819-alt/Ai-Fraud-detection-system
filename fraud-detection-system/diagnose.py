import requests, json

token = requests.post('http://127.0.0.1:8000/auth/login', json={'email':'admin@fraudguard.ai','password':'Admin@123456'}).json()['access_token']
h = {'Authorization': 'Bearer ' + token}

stats = requests.get('http://127.0.0.1:8000/dashboard/stats', headers=h).json()
print('=== STATS ===')
print(json.dumps(stats, indent=2))

hist = requests.get('http://127.0.0.1:8000/history/', headers=h, params={'page':1,'page_size':500}).json()
items = hist.get('items', [])
fraud_count = sum(1 for p in items if p['is_fraud'])
probs = [p['fraud_probability'] for p in items]
print('\n=== PREDICTION SUMMARY ===')
print('Total predictions:', len(items))
print('Fraud detected:', fraud_count)
if probs:
    print('Max prob:', round(max(probs), 6))
    print('Min prob:', round(min(probs), 6))
    print('Avg prob:', round(sum(probs)/len(probs), 6))
    above_thr = sum(1 for p in probs if p >= 0.3793)
    print('Above threshold 0.3793:', above_thr)

print('\n=== SAMPLE PREDICTIONS ===')
for p in items[:10]:
    print('  prob={} fraud={} sev={}'.format(round(p['fraud_probability'],4), p['is_fraud'], p['severity']))
