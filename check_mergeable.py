import urllib.request
import json
import time

url = 'https://api.github.com/repos/dtc245220019-create/Project_TTCS_K7S3_N1_BusTicketing/pulls?state=open'
pulls = json.loads(urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})).read().decode('utf-8'))
print(f"Total open PRs: {len(pulls)}")
for p in pulls:
    d = json.loads(urllib.request.urlopen(urllib.request.Request(p['url'], headers={'User-Agent': 'Mozilla/5.0'})).read().decode('utf-8'))
    print(f"PR #{p['number']}: {p['head']['ref']} -> {p['base']['ref']} | mergeable: {d.get('mergeable')} (state: {d.get('mergeable_state')})")
    time.sleep(0.3)
