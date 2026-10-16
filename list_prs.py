import urllib.request
import json
import sys
import time

sys.stdout.reconfigure(encoding='utf-8')

url = 'https://api.github.com/repos/dtc245220019-create/Project_TTCS_K7S3_N1_BusTicketing/pulls?state=open'
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
with urllib.request.urlopen(req) as resp:
    pulls = json.loads(resp.read().decode('utf-8'))
    print(f"Total open PRs: {len(pulls)}")
    for p in pulls:
        num = p['number']
        detail_url = f"https://api.github.com/repos/dtc245220019-create/Project_TTCS_K7S3_N1_BusTicketing/pulls/{num}"
        d_req = urllib.request.Request(detail_url, headers={'User-Agent': 'Mozilla/5.0'})
        try:
            with urllib.request.urlopen(d_req) as d_resp:
                det = json.loads(d_resp.read().decode('utf-8'))
                print(f"PR #{num}: {det['title']}")
                print(f"   {det['head']['ref']} -> {det['base']['ref']}")
                print(f"   Mergeable: {det.get('mergeable')} (state: {det.get('mergeable_state')})")
        except Exception as e:
            print(f"PR #{num}: error {e}")
        time.sleep(0.5)

