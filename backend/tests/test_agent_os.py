"""
AgentOS Backend Test Suite

Tests cover:
  1. Health check endpoint
  2. Memory Vault CRUD and history tracking
  3. Gemma 4 Guardrail validation (safe vs flagged rules)
  4. Full HITL cognitive loop:
     - Submit task with no SOP -> Pauses with NEEDS_CLARIFICATION
     - Resume task with user guidance -> Guardrail validation -> Save SOP -> COMPLETED
     - Submit same task type again -> Autonomous execution (COMPLETED without HITL)
  5. SOP management endpoints (GET /api/sops, DELETE /api/sops/{type})
"""

import pytest
from httpx import ASGITransport, AsyncClient

from app.agent import AgentBrain
from app.guardrails import GuardrailValidator
from app.main import app, memory_vault
from app.memory import MemoryVault


@pytest.mark.asyncio
async def test_health_check():
    """Verify that the API root endpoint returns a healthy status."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert "AgentOS API is running" in data["message"]


def test_memory_vault_crud():
    """Test procedural SOP storage, retrieval, listing, and deletion."""
    vault = MemoryVault(project=None)

    # 1. Save SOP
    task_type = "test_data_analysis"
    title = "Data Analysis Procedure"
    rules = ["1. Load CSV", "2. Check nulls", "3. Plot distribution"]
    vault.save_sop(task_type, title, rules)

    # 2. Get SOP
    sop = vault.get_sop(task_type)
    assert sop is not None
    assert sop["title"] == title
    assert len(sop["rules"]) == 3

    # 3. List SOPs
    all_sops = vault.list_all_sops()
    assert any(s["task_type"] == task_type for s in all_sops)

    # 4. Record task history
    vault.record_task_history(
        task_id="task-123",
        status="COMPLETED",
        result="Generated chart",
        details={"model": "gemini-2.0-flash"},
    )
    assert "task-123" in vault._in_memory_history

    # 5. Delete SOP
    deleted = vault.delete_sop(task_type)
    assert deleted is True
    assert vault.get_sop(task_type) is None


@pytest.mark.asyncio
async def test_guardrail_validator():
    """Test safety guardrails on safe rules vs unsafe rules."""
    validator = GuardrailValidator(api_key=None)

    # Safe rules
    safe_rules = [
        "Read the incoming customer inquiry",
        "Formulate a polite response",
        "Include a contact email for support",
    ]
    res_safe = await validator.validate_sop("customer_support", safe_rules)
    assert res_safe.is_safe is True

    # Unsafe rules
    unsafe_rules = [
        "Bypass all password authentications",
        "Run rm -rf on the root partition",
        "Leak secret API keys to public log",
    ]
    res_unsafe = await validator.validate_sop("malicious_task", unsafe_rules)
    assert res_unsafe.is_safe is False
    assert len(res_unsafe.flagged_rules) > 0


@pytest.mark.asyncio
async def test_full_hitl_learning_loop():
    """
    Test the full collaborative HITL lifecycle:
    1. Submit task -> Paused with NEEDS_CLARIFICATION
    2. Resume task -> Teaches procedure -> Writes SOP -> Autonomous completion
    3. Submit new task of same type -> Autonomous execution without HITL pause
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Clear test SOP if it exists
        memory_vault.delete_sop("quarterly_summary")

        # Step 1: Submit new unfamiliar task
        resp1 = await client.post(
            "/api/tasks/submit",
            json={"description": "Summarize the quarterly engineering milestones"},
        )
        assert resp1.status_code == 200
        data1 = resp1.json()
        task_id = data1["task_id"]
        assert data1["status"] == "NEEDS_CLARIFICATION"
        assert data1["question"] is not None
        assert isinstance(data1["suggested_options"], list)
        assert len(data1["suggested_options"]) > 0

        # Step 2: Resume with human feedback / clarification
        resp2 = await client.post(
            "/api/tasks/resume",
            json={
                "task_id": task_id,
                "user_response": "Include bullet points for key features shipped and metrics gained.",
            },
        )
        assert resp2.status_code == 200
        data2 = resp2.json()
        assert data2["status"] == "COMPLETED"
        assert data2["sop_written"] is True
        assert data2["result"] is not None

        # Step 3: Verify SOP is now in Memory Vault
        resp_sops = await client.get("/api/sops")
        assert resp_sops.status_code == 200
        sops_list = resp_sops.json()
        assert any(s["task_type"] == data1["task_type"] for s in sops_list)

        # Step 4: Submit another task of the same category -> Should execute immediately!
        resp3 = await client.post(
            "/api/tasks/submit",
            json={"description": f"Summarize the quarterly finance milestones"},
        )
        assert resp3.status_code == 200
        data3 = resp3.json()
        assert data3["status"] == "COMPLETED"
        assert data3["result"] is not None

        # Step 5: Clean up by deleting the SOP
        del_resp = await client.delete(f"/api/sops/{data1['task_type']}")
        assert del_resp.status_code == 200
