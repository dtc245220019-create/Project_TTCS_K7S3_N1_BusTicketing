import subprocess
import sys

branches = [
    'feature/be-notification-US20',
    'feature/fe-auth-seats',
    'feature/fe-ticket-verify-cancel',
    'feature/fe3-us17-us18-us08-us21',
    'feature/fe1-chatbot-ai',
    'feature/US18-update-voucher-modal',
    'feature/fe-update-us08',
    'feature/fe-updat-homepage',
    'feature/be3-voucher-feedback',
    'feature/be-audit-discount-approval'
]

subprocess.run(['git', 'fetch', 'origin'])

for b in branches:
    # Use git merge-base to find common ancestor
    base = subprocess.run(['git', 'merge-base', 'origin/develop', f'origin/{b}'], capture_output=True, text=True, encoding='utf-8', errors='ignore').stdout.strip()
    res = subprocess.run(['git', 'merge-tree', base, 'origin/develop', f'origin/{b}'], capture_output=True, text=True, encoding='utf-8', errors='ignore')

    has_conflict = '<<<<<<<' in res.stdout or '+<<<<<<<' in res.stdout
    status = "CONFLICT" if has_conflict else "CLEAN"
    print(f"{b}: {status}")
    if has_conflict:
        # print conflict lines
        for line in res.stdout.splitlines():
            if 'conflict' in line.lower() or '<<<<<<<' in line or 'changed in both' in line:
                print("   ", line)
