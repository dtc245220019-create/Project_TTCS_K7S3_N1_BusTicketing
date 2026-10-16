import urllib.request
import json
import sys
import time

sys.stdout.reconfigure(encoding='utf-8')

pr_numbers = [42, 41, 40, 38, 37, 35, 34, 32, 31, 30]
for num in pr_numbers:
    url = f'https://api.github.com/repos/dtc245220019-create/Project_TTCS_K7S3_N1_BusTicketing/pulls/{num}'
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        with urllib.request.urlopen(req) as resp:
            p = json.loads(resp.read().decode('utf-8'))
            print(f"PR #{p['number']}: {p['title']}")
            print(f"   Head: {p['head']['ref']} | Mergeable: {p.get('mergeable')} (state: {p.get('mergeable_state')})")
    except Exception as e:
        print(f"Error {num}: {e}")
