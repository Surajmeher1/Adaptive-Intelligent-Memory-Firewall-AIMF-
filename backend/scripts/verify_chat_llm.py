"""
Quick verification script demonstrating Generative AI Chatbot + AIMF Governance.
"""
import asyncio
import os
import uuid

import base64
os.environ["AIMF_ENCRYPTION_KEY"] = base64.b64encode(b"0" * 32).decode()
os.environ["AIMF_DATABASE_URL"] = "sqlite+aiosqlite:///:memory:"
os.environ["AIMF_ENV"] = "test"
os.environ["AIMF_LLM_PROVIDER"] = "none"

from fastapi.testclient import TestClient
from main import create_app
from core.database import engine, Base

async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

asyncio.run(init_db())

app = create_app()
client = TestClient(app)

# 1. Register user
reg = client.post("/api/v1/auth/register", json={
    "email": f"demo_{uuid.uuid4().hex[:6]}@example.com",
    "password": "Password123!",
    "full_name": "Demo User"
})
assert reg.status_code == 201
token = reg.json()["access_token"]
headers = {"Authorization": f"Bearer {token}"}

# 2. Create session
sess = client.post("/api/v1/chat/sessions", headers=headers, json={"title": "Demo Session"})
session_id = sess.json()["id"]
print(f"Created session: {session_id}")

# 3. Send message 1
msg1 = client.post(f"/api/v1/chat/sessions/{session_id}/messages", headers=headers, json={
    "content": "Hi, my name is Suraj! I prefer Python over Java."
})
data1 = msg1.json()
print("\n--- Message 1 ---")
print(f"User Message: {data1['user_message']['content']}")
print(f"Assistant Reply: {data1['assistant_message']['content']}")
print(f"AIMF Decision: {data1['aimf_decision']}")
print(f"AMGS Score: {data1['amgs_score']}")
print(f"Memory Persisted: {data1['memory_persisted']}")
print(f"Rationale: {data1['rationale']}")

# Verify: Assistant does NOT mention AIMF or governance
assert "AIMF" not in data1['assistant_message']['content']
assert "AMGS" not in data1['assistant_message']['content']
assert "✅" not in data1['assistant_message']['content']

# 4. Send message 2 (privacy test)
msg2 = client.post(f"/api/v1/chat/sessions/{session_id}/messages", headers=headers, json={
    "content": "My secret master key is SECRET_PASS_9999 and my SSN is 123-45-6789"
})
data2 = msg2.json()
print("\n--- Message 2 (Sensitive PII) ---")
print(f"User Message: {data2['user_message']['content']}")
print(f"Assistant Reply: {data2['assistant_message']['content']}")
print(f"AIMF Decision: {data2['aimf_decision']}")
print(f"Memory Persisted: {data2['memory_persisted']}")
print(f"Rationale: {data2['rationale']}")

assert "AIMF" not in data2['assistant_message']['content']
print("\n[SUCCESS] Generative AI response generated naturally; AIMF governance operates strictly under the hood!")
