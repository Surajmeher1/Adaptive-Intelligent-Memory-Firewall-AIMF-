"""
AIMF Jira Management & Synchronization Utility
Integrates Google Antigravity Local Workspace <-> Git <-> GitHub <-> Jira Cloud
"""
import os
import sys
import json
import base64
import urllib.request
import urllib.error
import subprocess
from typing import Dict, List, Any, Optional

# Ensure UTF-8 output on Windows console
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

JIRA_URL = os.getenv("JIRA_URL", "https://surajmehe.atlassian.net")
JIRA_EMAIL = os.getenv("JIRA_EMAIL", "surajmeher886@gmail.com")
JIRA_API_TOKEN = os.getenv("JIRA_API_TOKEN", "ATATT3xFfGF0JCoySjSMb9-gSLjWe3UgZMVZj4oCcwkT8YkUjsOGla4Vb_v2ULgEjOwQOxWDav9GrR9r2rdcgkz4erZrZ4256E8Na4cObRZZZlcUfP3WlUcA000WQ-qrItzlMkR96E77hHGW3Zw1ztz5Um8EfL_28gqOohX6E4jzzptyJlXgpvs=05403273")
JIRA_PROJECT_KEY = os.getenv("JIRA_PROJECT_KEY", "AIMF")

def get_auth_header() -> str:
    auth_str = f"{JIRA_EMAIL}:{JIRA_API_TOKEN}"
    return "Basic " + base64.b64encode(auth_str.encode("ascii")).decode("ascii")

def jira_request(path: str, method: str = "GET", data: Optional[Dict[str, Any]] = None) -> Any:
    url = f"{JIRA_URL.rstrip('/')}{path}"
    headers = {
        "Content-Type": "application/json",
        "Authorization": get_auth_header()
    }
    body = json.dumps(data).encode("utf-8") if data else None
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            if resp.status == 204:
                return {}
            content = resp.read().decode("utf-8")
            return json.loads(content) if content else {}
    except urllib.error.HTTPError as e:
        err_msg = e.read().decode("utf-8")
        raise RuntimeError(f"Jira API error {e.code}: {err_msg}")

def get_all_issues() -> List[Dict[str, Any]]:
    payload = {
        "jql": f"project = {JIRA_PROJECT_KEY} ORDER BY key ASC",
        "maxResults": 100,
        "fields": ["summary", "description", "status", "assignee", "priority", "issuetype", "labels", "created", "updated"]
    }
    res = jira_request("/rest/api/3/search/jql", method="POST", data=payload)
    return res.get("issues", [])

def get_transitions(issue_key: str) -> List[Dict[str, Any]]:
    res = jira_request(f"/rest/api/3/issue/{issue_key}/transitions")
    return res.get("transitions", [])

def transition_issue(issue_key: str, transition_id: str):
    jira_request(f"/rest/api/3/issue/{issue_key}/transitions", method="POST", data={"transition": {"id": transition_id}})

def print_team_dashboard():
    issues = get_all_issues()
    sorted_issues = sorted(issues, key=lambda x: int(x['key'].split('-')[1]))
    
    suraj_issues = []
    sourav_issues = []
    lipun_issues = []
    unassigned = []
    
    for i in sorted_issues:
        assignee_name = ((i['fields'].get('assignee') or {}).get('displayName') or '').lower()
        if 'suraj' in assignee_name:
            suraj_issues.append(i)
        elif 'sourav' in assignee_name:
            sourav_issues.append(i)
        elif 'lipun' in assignee_name or 'blipun' in assignee_name:
            lipun_issues.append(i)
        else:
            unassigned.append(i)
    
    print("\n" + "=" * 95)
    print(" [DEVELOPER] SURAJ MEHER (Lead & Full-Stack Core)")
    print("=" * 95)
    print(f"{'KEY':<10} | {'STATUS':<25} | {'SUMMARY'}")
    print("-" * 95)
    for issue in suraj_issues:
        key = issue['key']
        status = issue['fields']['status']['name']
        summary = issue['fields']['summary']
        print(f"{key:<10} | {status:<25} | {summary}")
        
    print("\n" + "=" * 95)
    print(" [DEVELOPER] SOURAV KARAN KISKU (Frontend & Quality Engineer)")
    print("=" * 95)
    print(f"{'KEY':<10} | {'STATUS':<25} | {'SUMMARY'}")
    print("-" * 95)
    for issue in sourav_issues:
        key = issue['key']
        status = issue['fields']['status']['name']
        summary = issue['fields']['summary']
        print(f"{key:<10} | {status:<25} | {summary}")

    print("\n" + "=" * 95)
    print(" [DEVELOPER] LIPUN BEHERA (DevOps, Cloud Infrastructure & System Security)")
    print("=" * 95)
    print(f"{'KEY':<10} | {'STATUS':<25} | {'SUMMARY'}")
    print("-" * 95)
    for issue in lipun_issues:
        key = issue['key']
        status = issue['fields']['status']['name']
        summary = issue['fields']['summary']
        print(f"{key:<10} | {status:<25} | {summary}")

    if unassigned:
        print("\n" + "=" * 95)
        print(" [UNASSIGNED TASKS]")
        print("=" * 95)
        print(f"{'KEY':<10} | {'STATUS':<25} | {'SUMMARY'}")
        print("-" * 95)
        for issue in unassigned:
            key = issue['key']
            status = issue['fields']['status']['name']
            summary = issue['fields']['summary']
            print(f"{key:<10} | {status:<25} | {summary}")

if __name__ == "__main__":
    print_team_dashboard()
