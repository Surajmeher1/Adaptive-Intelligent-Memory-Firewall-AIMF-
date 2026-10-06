import sys
import os
import json

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from scripts.jira_manager import jira_request

SURAJ_ID = '712020:a1aa9844-0466-44b1-a789-98d208a45317'
SOURAV_ID = '712020:576b655e-59d8-4482-bb6a-f26b06876a16'
LIPUN_ID = '712020:a9f993f2-d0b6-432d-8216-a13def46595b'

# 1. Update existing issues
assignments = {
    # Suraj
    'AIMF-12': SURAJ_ID,
    'AIMF-14': SURAJ_ID,
    'AIMF-15': SURAJ_ID,
    'AIMF-16': SURAJ_ID,
    'AIMF-22': SURAJ_ID,
    'AIMF-25': SURAJ_ID,
    'AIMF-28': SURAJ_ID,
    
    # Sourav
    'AIMF-13': SOURAV_ID,
    'AIMF-17': SOURAV_ID,
    'AIMF-18': SOURAV_ID,
    'AIMF-19': SOURAV_ID,
    'AIMF-20': SOURAV_ID,
    'AIMF-23': SOURAV_ID,
    'AIMF-24': SOURAV_ID,
    'AIMF-27': SOURAV_ID,
    'AIMF-29': SOURAV_ID,
    
    # Lipun
    'AIMF-21': LIPUN_ID,
    'AIMF-26': LIPUN_ID,
}

print("--- Updating existing assignments for 3-developer team ---")
for key, uid in assignments.items():
    jira_request(f'/rest/api/3/issue/{key}/assignee', method='PUT', data={'accountId': uid})
    if uid == SURAJ_ID:
        name = 'Suraj'
    elif uid == SOURAV_ID:
        name = 'Sourav'
    else:
        name = 'Lipun'
    print(f'Assigned {key} -> {name}')

# 2. Create specialized new tasks for Lipun
lipun_tasks = [
    {
        'summary': 'DevOps: Multi-stage Docker containerization & Docker Compose production setup',
        'desc': 'Build optimized multi-stage Dockerfiles for backend (Python 3.13) and frontend (Vite/Node 20), plus docker-compose production manifests.',
        'labels': ['infra', 'devops', 'docker'],
        'assignee': LIPUN_ID
    },
    {
        'summary': 'CI/CD: Automated GitHub Actions deployment pipeline to Cloud Run & Vercel',
        'desc': 'Configure end-to-end continuous integration and deployment with automated test verification and secrets management.',
        'labels': ['infra', 'ci-cd', 'github-actions'],
        'assignee': LIPUN_ID
    },
    {
        'summary': 'Observability: Prometheus metrics exporter & Grafana monitoring for AMGS pipeline',
        'desc': 'Implement Prometheus metrics collection endpoint (/metrics) for AMGS governance latency, factor distributions, and storage growth.',
        'labels': ['infra', 'monitoring', 'backend'],
        'assignee': LIPUN_ID
    }
]

print("\n--- Creating & Assigning New DevOps / Infra Tasks for Lipun ---")
for t in lipun_tasks:
    payload = {
        'fields': {
            'project': {'key': 'AIMF'},
            'summary': t['summary'],
            'description': {
                'type': 'doc',
                'version': 1,
                'content': [
                    {
                        'type': 'paragraph',
                        'content': [{'type': 'text', 'text': t['desc']}]
                    }
                ]
            },
            'issuetype': {'name': 'Task'},
            'labels': t['labels'],
            'assignee': {'accountId': t['assignee']}
        }
    }
    res = jira_request('/rest/api/3/issue', method='POST', data=payload)
    created_key = res.get('key')
    # transition to Selected for Development
    jira_request(f'/rest/api/3/issue/{created_key}/transitions', method='POST', data={'transition': {'id': '21'}})
    print(f"Created & Assigned {created_key} -> Lipun: {t['summary']}")
