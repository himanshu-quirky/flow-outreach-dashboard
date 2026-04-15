#!/usr/bin/env python3
"""Deploy all Harvey SDR workflows to n8n instance."""

import json
import os
import sys
import urllib.request
import glob

N8N_API_KEY = os.environ.get("N8N_API_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIzMTRkYTExOC1lNDcwLTQ5Y2EtYjU0ZC00MTZjNzYxOTk3MmEiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiY2ZkYzZkYWYtNWNmZC00ZmI3LWJmODgtMWIzOGZlZGE2ZjlmIiwiaWF0IjoxNzc1MTEzNzAwfQ.lRqNtlssI_E_8_z9hkUciVJ1i0jzLGbb86G5LyKwGUY")
N8N_URL = os.environ.get("N8N_URL", "https://primary-production-2f66e.up.railway.app")

def deploy_workflow(filepath):
    """Deploy a single workflow to n8n."""
    with open(filepath, 'r') as f:
        workflow = json.load(f)

    # Remove read-only fields
    workflow.pop('tags', None)
    workflow.pop('id', None)
    workflow.pop('createdAt', None)
    workflow.pop('updatedAt', None)

    payload = json.dumps(workflow).encode('utf-8')

    req = urllib.request.Request(
        f"{N8N_URL}/api/v1/workflows",
        data=payload,
        headers={
            'X-N8N-API-KEY': N8N_API_KEY,
            'Content-Type': 'application/json'
        },
        method='POST'
    )

    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            result = json.loads(resp.read().decode())
            return result.get('id'), result.get('name'), None
    except urllib.error.HTTPError as e:
        error_body = e.read().decode()
        return None, workflow.get('name'), f"HTTP {e.code}: {error_body}"
    except Exception as e:
        return None, workflow.get('name'), str(e)

def main():
    workflow_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'workflows')
    files = sorted(glob.glob(os.path.join(workflow_dir, '*.json')))

    if not files:
        print("No workflow files found!")
        sys.exit(1)

    print(f"Deploying {len(files)} workflows to {N8N_URL}...\n")

    success = 0
    failed = 0
    deployed = []

    for filepath in files:
        filename = os.path.basename(filepath)
        wf_id, name, error = deploy_workflow(filepath)

        if error:
            print(f"  FAIL  {filename}: {error}")
            failed += 1
        else:
            print(f"  OK    {filename} -> {wf_id} ({name})")
            success += 1
            deployed.append({'id': wf_id, 'name': name, 'file': filename})

    print(f"\nResults: {success} deployed, {failed} failed")

    if deployed:
        print("\nDeployed workflow IDs:")
        for d in deployed:
            print(f"  {d['id']}: {d['name']}")

    return 0 if failed == 0 else 1

if __name__ == '__main__':
    sys.exit(main())
